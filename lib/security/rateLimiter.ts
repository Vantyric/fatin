import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
  currentCount: number;
}

// In-memory fallback map for environments without Supabase configured
// Key: `${date}:${subject}` -> count
const inMemoryUsage = new Map<string, number>();

export function resetInMemoryUsageForTesting(): void {
  inMemoryUsage.clear();
}

export function getBaghdadDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getSecondsUntilBaghdadMidnight(): number {
  const now = new Date();
  const baghdadStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).format(now);
  const parts = baghdadStr.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  const secondsPassedToday = h * 3600 + m * 60 + s;
  return Math.max(1, 86400 - secondsPassedToday);
}

export function hashSubject(raw: string): string {
  const salt = process.env.RATE_LIMIT_SALT || "fatin-iraq-secure-salt-2026";
  return crypto.createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}

/**
 * Checks and increments rate limit for a subject (IP hash, device cookie, or user ID).
 * If limit is reached, returns allowed: false.
 */
export async function checkAndIncrementUsage(
  subject: string,
  limit: number
): Promise<RateLimitCheckResult> {
  const day = getBaghdadDateString();
  const resetSeconds = getSecondsUntilBaghdadMidnight();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const isConfigured = Boolean(
    supabaseUrl &&
    serviceKey &&
    !supabaseUrl.includes("your-project.supabase.co") &&
    !serviceKey.includes("your-service-role-key")
  );

  if (isConfigured && supabaseUrl && serviceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabaseAdmin.rpc("increment_usage", {
        p_day: day,
        p_subject: subject,
        p_limit: limit,
      });

      if (!error && data) {
        return {
          allowed: data.allowed,
          remaining: data.remaining,
          limit,
          resetSeconds,
          currentCount: data.current_count,
        };
      }
    } catch {
      // Fallback to in-memory on database connection issues
    }
  }

  // Fallback in-memory rate limiting
  const key = `${day}:${subject}`;
  const current = inMemoryUsage.get(key) || 0;

  if (current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetSeconds,
      currentCount: current,
    };
  }

  const newCount = current + 1;
  inMemoryUsage.set(key, newCount);

  return {
    allowed: true,
    remaining: Math.max(0, limit - newCount),
    limit,
    resetSeconds,
    currentCount: newCount,
  };
}

/**
 * Evaluates effective daily usage for a guest (IP hash AND device cookie hash, whichever is higher).
 */
export async function evaluateGuestUsage(
  ip: string,
  deviceId: string
): Promise<RateLimitCheckResult> {
  const guestLimit = 3;
  const ipSubject = `guest_ip:${hashSubject(ip || "unknown_ip")}`;
  const deviceSubject = `guest_dev:${hashSubject(deviceId || "unknown_dev")}`;

  // Evaluate both and apply the stricter (higher usage) one
  const ipResult = await checkAndIncrementUsage(ipSubject, guestLimit);
  const devResult = await checkAndIncrementUsage(deviceSubject, guestLimit);

  const allowed = ipResult.allowed && devResult.allowed;
  const remaining = Math.min(ipResult.remaining, devResult.remaining);
  const currentCount = Math.max(ipResult.currentCount, devResult.currentCount);

  return {
    allowed,
    remaining,
    limit: guestLimit,
    resetSeconds: ipResult.resetSeconds,
    currentCount,
  };
}
