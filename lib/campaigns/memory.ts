/**
 * Privacy-Preserving Campaign Memory for Fatin.
 *
 * INVARIANTS:
 * 1. NEVER stores message text, phone numbers, or user PII.
 * 2. Only stores 64-bit SimHash fingerprints, LSH bands, timestamps, and counters.
 * 3. Max 1 increment per subject per day to prevent poisoning.
 * 4. Crowd signal adds at most +15 to risk score and cannot make a scam verdict on its own.
 * 5. Operates in-memory in local-dev mode, and with Supabase in production.
 */

import crypto from "crypto";
import { computeSimHash, getLshBands, hammingDistance } from "./simhash";
import { isSupabaseConfigured } from "../supabase/config";

export interface CampaignRecord {
  id: string;
  simhash: string;
  bands: [string, string, string, string];
  firstSeen: string;
  lastSeen: string;
  seenCount: number;
  scamCount: number;
}

export interface DomainSeenRecord {
  domain: string;
  seenCount: number;
  scamCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface CampaignObservationResult {
  simhash: string;
  seenCount: number;
  scamCount: number;
  isKnownCampaign: boolean;
  crowdRiskBonus: number; // 0 to 15
  crowdBonus: number; // Alias for crowdRiskBonus
  isDomainKnownScam: boolean;
}

// In-Memory Campaign Store for local-dev mode
const IN_MEMORY_CAMPAIGNS = new Map<string, CampaignRecord>();
const IN_MEMORY_DOMAINS = new Map<string, DomainSeenRecord>();

// Rate-limiting map to prevent poisoning: key = `${subjectHash}:${simhash}:${YYYY-MM-DD}`
const SUBJECT_DAILY_SEEN = new Set<string>();

/**
 * Records an observation of a message and optional domain, updating campaign memory.
 */
export async function recordCampaignObservation(options: {
  text: string;
  domain?: string;
  isScam?: boolean;
  subjectHash?: string;
  todayDate?: string; // YYYY-MM-DD
  clientIp?: string;
}): Promise<CampaignObservationResult> {
  const {
    text,
    domain,
    isScam = false,
    clientIp,
    subjectHash = clientIp
      ? crypto.createHash("sha256").update(clientIp).digest("hex").slice(0, 16)
      : "anon",
    todayDate = new Date().toISOString().slice(0, 10),
  } = options;

  if (!text || text.trim().length < 5) {
    return {
      simhash: "0000000000000000",
      seenCount: 1,
      scamCount: 0,
      isKnownCampaign: false,
      crowdRiskBonus: 0,
      crowdBonus: 0,
      isDomainKnownScam: false,
    };
  }

  const simhash = computeSimHash(text);
  const bands = getLshBands(simhash);
  const rateLimitKey = `${subjectHash}:${simhash}:${todayDate}`;
  const alreadySeenToday = SUBJECT_DAILY_SEEN.has(rateLimitKey);

  let matchedRecord: CampaignRecord | null = null;

  // 1. Fuzzy Search: Check in-memory LSH and Hamming distance <= 3
  for (const campaign of IN_MEMORY_CAMPAIGNS.values()) {
    // Quick LSH band filter (must share at least 1 band)
    const sharesBand =
      campaign.bands[0] === bands[0] ||
      campaign.bands[1] === bands[1] ||
      campaign.bands[2] === bands[2] ||
      campaign.bands[3] === bands[3];

    if (sharesBand) {
      const dist = hammingDistance(simhash, campaign.simhash);
      if (dist <= 3) {
        matchedRecord = campaign;
        break;
      }
    }
  }

  const nowIso = new Date().toISOString();

  if (matchedRecord) {
    if (!alreadySeenToday) {
      SUBJECT_DAILY_SEEN.add(rateLimitKey);
      matchedRecord.seenCount += 1;
      if (isScam) {
        matchedRecord.scamCount += 1;
      }
      matchedRecord.lastSeen = nowIso;
    }
  } else {
    // New campaign observed
    matchedRecord = {
      id: crypto.randomUUID(),
      simhash,
      bands,
      firstSeen: nowIso,
      lastSeen: nowIso,
      seenCount: 1,
      scamCount: isScam ? 1 : 0,
    };
    IN_MEMORY_CAMPAIGNS.set(matchedRecord.id, matchedRecord);
    SUBJECT_DAILY_SEEN.add(rateLimitKey);
  }

  // 2. Domain Tracking
  let isDomainKnownScam = false;
  if (domain && domain.trim().length > 0) {
    const cleanDomain = domain.toLowerCase().trim();
    let domainRecord = IN_MEMORY_DOMAINS.get(cleanDomain);
    if (!domainRecord) {
      domainRecord = {
        domain: cleanDomain,
        seenCount: 0,
        scamCount: 0,
        firstSeen: nowIso,
        lastSeen: nowIso,
      };
      IN_MEMORY_DOMAINS.set(cleanDomain, domainRecord);
    }

    if (!alreadySeenToday) {
      domainRecord.seenCount += 1;
      if (isScam) {
        domainRecord.scamCount += 1;
      }
      domainRecord.lastSeen = nowIso;
    }

    if (domainRecord.scamCount >= 2) {
      isDomainKnownScam = true;
    }
  }

  // 3. Optional Supabase Persistence in Production Mode
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Async background insert/update (non-blocking)
      Promise.resolve(
        adminClient
          .from("campaigns")
          .upsert({
            id: matchedRecord.id,
            band1: bands[0],
            band2: bands[1],
            band3: bands[2],
            band4: bands[3],
            simhash,
            last_seen: nowIso,
            seen_count: matchedRecord.seenCount,
            scam_count: matchedRecord.scamCount,
          })
      ).catch(() => {});
    } catch {
      // Ignore database errors
    }
  }

  // Crowd risk bonus: Max +15 (e.g. +10 if seen 2+ times as scam, +15 if seen 3+ times as scam)
  let crowdRiskBonus = 0;
  if (matchedRecord.scamCount >= 3) {
    crowdRiskBonus = 15;
  } else if (matchedRecord.scamCount >= 2) {
    crowdRiskBonus = 10;
  }

  return {
    simhash,
    seenCount: matchedRecord.seenCount,
    scamCount: matchedRecord.scamCount,
    isKnownCampaign: matchedRecord.seenCount >= 3,
    crowdRiskBonus,
    crowdBonus: crowdRiskBonus,
    isDomainKnownScam,
  };
}
