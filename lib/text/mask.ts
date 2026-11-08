/**
 * Sensitive Data Masking & PII Redaction Module for FATIN Security.
 * Replaces phone numbers (local & international E.164), emails,
 * credit/debit card numbers (13-19 digits), IBANs, crypto wallet addresses
 * (BTC, ETH/USDT, TRON), and OTP/PIN codes with privacy-preserving tokens.
 * URLs and surrounding keywords are kept strictly intact.
 */

import { convertDigitsToWestern } from "./normalize";

export interface MaskOptions {
  tokenStyle?: "semantic" | "redacted";
}

export interface MaskResult {
  maskedText: string;
  hasSensitiveData: boolean;
  maskedCounts: {
    phones: number;
    cards: number;
    emails: number;
    otps: number;
    crypto: number;
  };
}

export function maskSensitiveData(input: string, options?: MaskOptions): MaskResult {
  if (!input) {
    return {
      maskedText: "",
      hasSensitiveData: false,
      maskedCounts: { phones: 0, cards: 0, emails: 0, otps: 0, crypto: 0 },
    };
  }

  const isRedactedStyle = options?.tokenStyle === "redacted";
  const tokenEmail = isRedactedStyle ? "[REDACTED]" : "[بريد]";
  const tokenPhone = isRedactedStyle ? "[REDACTED]" : "[هاتف]";
  const tokenCard = isRedactedStyle ? "[REDACTED]" : "[بطاقة]";
  const tokenOtp = isRedactedStyle ? "[REDACTED]" : "[رمز]";
  const tokenCrypto = "[REDACTED]";

  // Convert all digits to Western digits first to handle Arabic-Indic numerals
  let working = convertDigitsToWestern(input);

  const counts = {
    phones: 0,
    cards: 0,
    emails: 0,
    otps: 0,
    crypto: 0,
  };

  // Step 1: Mask Emails FIRST -> [بريد] or [REDACTED]
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  working = working.replace(emailRegex, () => {
    counts.emails++;
    return tokenEmail;
  });

  // Step 2: Temporarily protect URLs so their digits and query params are not masked as cards/phones
  const urlPlaceholders: string[] = [];
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|iq|net|org|xyz|top|live|info|me|site|online|app)[^\s]*)/gi;

  working = working.replace(urlRegex, (url) => {
    const placeholder = `__URL_TOKEN_${urlPlaceholders.length}__`;
    urlPlaceholders.push(url);
    return placeholder;
  });

  // Step 3: Mask Crypto Wallet Addresses (BTC, ETH/USDT, TRON) -> [REDACTED]
  // BTC Legacy (1...), P2SH (3...), SegWit Bech32 (bc1...)
  const btcRegex = /\b(?:bc1[a-zA-HJ-NP-Z0-9]{25,65}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;
  working = working.replace(btcRegex, () => {
    counts.crypto++;
    return tokenCrypto;
  });

  // Ethereum / EVM (ETH, USDT ERC-20, etc.)
  const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;
  working = working.replace(ethRegex, () => {
    counts.crypto++;
    return tokenCrypto;
  });

  // TRON / USDT TRC-20
  const tronRegex = /\bT[a-km-zA-HJ-NP-Z1-9]{33}\b/g;
  working = working.replace(tronRegex, () => {
    counts.crypto++;
    return tokenCrypto;
  });

  // Step 4: Mask explicit international phone numbers with leading '+' (E.164: +1, +44, +971, +964, +966, etc.)
  // Matches formatted (+1 555 123 4567, +44 20 7946 0919, +964 770 123 4567) and compact (+15551234567, +9647701234567)
  const plusPhoneRegex = /\+[1-9]\d{0,3}[\s-.]?\(?\d{1,4}\)?[\s-.]?\d{2,4}[\s-.]?\d{2,6}\b/g;
  working = working.replace(plusPhoneRegex, () => {
    counts.phones++;
    return tokenPhone;
  });

  const compactE164Regex = /\+[1-9]\d{6,14}\b/g;
  working = working.replace(compactE164Regex, () => {
    counts.phones++;
    return tokenPhone;
  });

  // Step 5: Mask IBANs -> [بطاقة] or [REDACTED]
  const ibanRegex = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
  working = working.replace(ibanRegex, () => {
    counts.cards++;
    return tokenCard;
  });

  // Step 6: Mask Card-like numbers (13 to 19 digits with optional spaces or hyphens) -> [بطاقة] or [REDACTED]
  // e.g. 5200112233445566 or 4111 2222 3333 4444
  const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  working = working.replace(cardRegex, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      counts.cards++;
      return tokenCard;
    }
    return match;
  });

  // Step 7: Mask local Iraqi & regional phone numbers (10-11 digits starting with 07 or 05 etc.)
  const localMobileRegex = /\b07[3-9]\d[\s-]?\d{3}[\s-]?\d{4}\b/g;
  working = working.replace(localMobileRegex, () => {
    counts.phones++;
    return tokenPhone;
  });

  // Generic international numbers starting with 00 (e.g. 00971..., 001...)
  const doubleZeroPhone = /\b00[1-9]\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,6}\b/g;
  working = working.replace(doubleZeroPhone, () => {
    counts.phones++;
    return tokenPhone;
  });

  // Generic 10-11 digit local phone numbers starting with 0
  const genericLocalPhone = /\b0\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}\b/g;
  working = working.replace(genericLocalPhone, () => {
    counts.phones++;
    return tokenPhone;
  });

  // Step 8: Mask OTP and Verification Codes -> [رمز] or [REDACTED]
  // Matches Arabic words with prefixes and suffixes: "كود", "رمز", "ورمز", "ورمزي", "وكودك", "الرمز", etc.
  const otpContextRegex = /(?:[ولكب]?)(?:كود|رمز)(?:ك|ي|ه|ها|نا)?[\s:=-]*([0-9]{4,8})/gi;
  working = working.replace(otpContextRegex, (fullMatch, codeDigits) => {
    counts.otps++;
    return fullMatch.replace(codeDigits, tokenOtp);
  });

  const otpEnglishRegex = /\b(?:otp|pin|verification\s*code|code)[\s:=-]*([0-9]{4,8})/gi;
  working = working.replace(otpEnglishRegex, (fullMatch, codeDigits) => {
    counts.otps++;
    return fullMatch.replace(codeDigits, tokenOtp);
  });

  // Also standalone 4-8 digit numbers immediately after keywords like "هو 482910" or "is 5492"
  const otpSecondaryRegex = /(?:هو|is|:)\s*([0-9]{4,8})\b/gi;
  working = working.replace(otpSecondaryRegex, (fullMatch, digits) => {
    counts.otps++;
    return fullMatch.replace(digits, tokenOtp);
  });

  // Step 9: Restore protected URLs
  working = working.replace(/__URL_TOKEN_(\d+)__/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return urlPlaceholders[idx] || "";
  });

  const hasSensitiveData =
    counts.phones > 0 ||
    counts.cards > 0 ||
    counts.emails > 0 ||
    counts.otps > 0 ||
    counts.crypto > 0;

  return {
    maskedText: working,
    hasSensitiveData,
    maskedCounts: counts,
  };
}
