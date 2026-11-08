/**
 * Privacy-Preserving 64-bit SimHash and Locality-Sensitive Hashing (LSH) for Fatin.
 *
 * Designed to detect coordinated spam and fraud campaigns across rephrased messages
 * WITHOUT storing raw message text or sensitive personal data.
 */

import crypto from "crypto";
import { deobfuscateAndNormalize } from "../text/advancedNormalize";

/**
 * Replaces dynamic variables (phone numbers, OTPs, amounts, dates, URLs) with generic tokens
 * before computing the SimHash fingerprint.
 */
export function anonymizeForFingerprinting(text: string): string {
  let normalized = deobfuscateAndNormalize(text);

  // Replace URLs
  normalized = normalized.replace(/https?:\/\/[^\s]+/gi, " رابط ");
  normalized = normalized.replace(/[\w-]+\.(com|iq|net|org|top|xyz|me|info)/gi, " رابط ");

  // Replace phone numbers (10+ digits or E.164)
  normalized = normalized.replace(/(?:\+?964|00964|0)?7[3-9]\d{8}/g, " هاتف ");
  normalized = normalized.replace(/\+?\d{8,15}/g, " هاتف ");

  // Replace money amounts
  normalized = normalized.replace(/(?:بـ|ب|بقيمة)?\s*\d+\s*(?:دولار|دينار|الف|ألف|مليون|\$)/gi, " مبلغ ");

  // Replace remaining standalone numbers (e.g. OTPs, dates)
  normalized = normalized.replace(/\d+/g, " رقم ");

  // Normalize common interchangeable scam synonyms (note: avoiding \b which fails on Arabic unicode)
  normalized = normalized.replace(/(^|\s)(?:فزت|كسبت|ربحت|فوز)($|\s)/g, "$1ربح$2");
  normalized = normalized.replace(/(^|\s)(?:ال)?(?:كود|رمز|otp|pin)($|\s)/gi, "$1رمز$2");

  return normalized.replace(/\s+/g, " ").trim();
}

/**
 * Computes a 64-bit SimHash of the anonymized text.
 * Returns a 16-character hexadecimal string representing the 64-bit fingerprint.
 */
export function computeSimHash(text: string): string {
  const anonymized = anonymizeForFingerprinting(text);
  const words = anonymized.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) {
    return "0000000000000000";
  }

  // 64-dimensional accumulator vector
  const v = new Array(64).fill(0);

  // Extract features: word unigrams + character 3-grams
  const tokens: string[] = [...words];

  // Character 3-grams over compressed text
  const compactText = anonymized.replace(/\s+/g, "");
  for (let i = 0; i <= compactText.length - 3; i++) {
    tokens.push(compactText.slice(i, i + 3));
  }

  for (const token of tokens) {
    // Hash token to 64-bit integer using MD5 prefix
    const hashHex = crypto.createHash("md5").update(token).digest("hex").slice(0, 16);
    const hashBigInt = BigInt(`0x${hashHex}`);

    for (let i = 0; i < 64; i++) {
      const bit = (hashBigInt >> BigInt(i)) & 1n;
      if (bit === 1n) {
        v[i] += 1;
      } else {
        v[i] -= 1;
      }
    }
  }

  // Construct final 64-bit SimHash
  let simHashBigInt = 0n;
  for (let i = 0; i < 64; i++) {
    if (v[i] > 0) {
      simHashBigInt |= 1n << BigInt(i);
    }
  }

  return simHashBigInt.toString(16).padStart(16, "0");
}

/**
 * Computes the Hamming distance (number of differing bits) between two 64-bit SimHash hex strings.
 */
export function hammingDistance(hexA: string, hexB: string): number {
  try {
    const a = BigInt(`0x${hexA}`);
    const b = BigInt(`0x${hexB}`);
    let xor = a ^ b;

    let dist = 0;
    while (xor > 0n) {
      if ((xor & 1n) === 1n) dist++;
      xor >>= 1n;
    }
    return dist;
  } catch {
    return 64;
  }
}

/**
 * Splits a 64-bit SimHash hex into 4 Locality-Sensitive Hashing (LSH) bands of 16 bits each.
 */
export function getLshBands(simHashHex: string): [string, string, string, string] {
  const padded = simHashHex.padStart(16, "0");
  return [
    padded.slice(0, 4),
    padded.slice(4, 8),
    padded.slice(8, 12),
    padded.slice(12, 16),
  ];
}
