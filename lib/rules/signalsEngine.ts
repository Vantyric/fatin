/**
 * Signals Engine for Fatin.
 * Replaces the old rigid pattern matcher with an evidence-based signals provider.
 * Each signal has an ID, weight, category, and concrete extracted evidence text.
 * Signals act as hints for the Gemini intent reasoning engine.
 * Rules may RAISE risk on hard evidence (via floors) but never lower it or decide alone.
 */

import { ExtractedEntities } from "../text/entityExtractor";
import { FRAUD_RULES, LEGIT_GUARD_PATTERNS } from "./patterns";
import { deobfuscateAndNormalize } from "../text/advancedNormalize";

export interface EvidenceSignal {
  id: string;
  category:
    | "credential_theft"
    | "impersonation"
    | "malware"
    | "financial"
    | "telecom_fraud"
    | "threat"
    | "urgency"
    | "general";
  weight: number;
  isHardSignal: boolean;
  descriptionAr: string;
  evidence: string;
}

export interface SignalsReport {
  signals: EvidenceSignal[];
  hasHardSignal: boolean;
  hardSignalFloor: number;
  isLegitGuarded: boolean;
  suggestedScamType: string;
}

/**
 * Extracts all evidence signals from raw text and extracted entities.
 */
export function extractSignals(text: string, entities: ExtractedEntities): SignalsReport {
  const signals: EvidenceSignal[] = [];
  const normalized = deobfuscateAndNormalize(text);

  // 1. Check for Legit Guard (user receiving their own OTP with caution)
  let isLegitGuarded = false;
  for (const guardPattern of LEGIT_GUARD_PATTERNS) {
    if (guardPattern.test(normalized)) {
      isLegitGuarded = true;
      break;
    }
  }

  // 2. Hardware / Entity-based Hard Signals
  // 2a. Country vs Brand Contradiction (e.g. Nigerian/UK phone pretending to be Zain or Qi Card)
  if (entities.hasCountryBrandContradiction) {
    const foreignNumber = entities.phoneNumbers.find((p) => p.contradictsClaimedBrand);
    const claimedBrand = entities.claimedBrands.find((b) => b.isIraqi);
    signals.push({
      id: "brand_number_country_contradiction",
      category: "impersonation",
      weight: 90,
      isHardSignal: true,
      descriptionAr: `ادعاء تمثيل جهة عراقية (${claimedBrand?.nameAr || "شركة محلية"}) برقم اتصال من دولة أجنبية (${foreignNumber?.country || "خارج العراق"})`,
      evidence: foreignNumber?.e164 || foreignNumber?.raw || "رقم أجنبي",
    });
  }

  // 2b. Remote Access Tools (AnyDesk, TeamViewer, RustDesk)
  if (entities.remoteAccessApps.length > 0) {
    signals.push({
      id: "remote_access_tool_request",
      category: "malware",
      weight: 90,
      isHardSignal: true,
      descriptionAr: `طلب تثبيت برامج التحكم عن بعد (${entities.remoteAccessApps.join("، ")}) التي تتيح اختراق الهاتف وسرقة الحسابات المصرفية`,
      evidence: entities.remoteAccessApps.join(", "),
    });
  }

  // 2c. USSD Call-Forwarding Codes (*21*, *401*, etc.)
  if (entities.ussdCodes.length > 0) {
    signals.push({
      id: "ussd_call_forwarding",
      category: "telecom_fraud",
      weight: 92,
      isHardSignal: true,
      descriptionAr: "محاولة تفعيل ميزة تحويل المكالمات والرسائل لسرقة كودات الواتساب والمصارف عبر أكواد USSD",
      evidence: entities.ussdCodes.join(", "),
    });
  }

  // 2d. Dangerous File Types (.apk installer, .exe)
  if (entities.dangerousFileTypes.includes(".apk") || entities.dangerousFileTypes.includes(".exe")) {
    signals.push({
      id: "malicious_app_installer",
      category: "malware",
      weight: 88,
      isHardSignal: true,
      descriptionAr: "طلب تنزيل أو تثبيت ملف تطبيق خارجي (APK/EXE) غير موثق لخداع الضحية واختراق الجهاز",
      evidence: entities.dangerousFileTypes.join(", "),
    });
  }

  // 3. Pattern-based Behavioral Signals from Fraud Rules
  let hasOtpHardFlag = false;

  for (const rule of FRAUD_RULES) {
    if (rule.negativePatterns) {
      const hasNegative = rule.negativePatterns.some((np) => np.test(normalized));
      if (hasNegative) {
        continue;
      }
    }

    for (const pattern of rule.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const evidenceSnippet = match[0];
        const isHard = !!rule.isHardFlag;
        if (isHard) {
          hasOtpHardFlag = true;
        }

        signals.push({
          id: rule.id,
          category: mapScamTypeToCategory(rule.scamType),
          weight: rule.weight,
          isHardSignal: isHard,
          descriptionAr: rule.descriptionAr,
          evidence: evidenceSnippet,
        });
        break; // One match per rule is sufficient
      }
    }
  }

  // If legit guard is present and there is NO explicit attacker request to forward the code,
  // flag it as legit guarded so the model knows this is a normal notification
  if (isLegitGuarded && !hasOtpHardFlag) {
    // Keep isLegitGuarded true, signals remain for context but no hard floor
    hasOtpHardFlag = false;
  }

  const hasHardSignal = signals.some((s) => s.isHardSignal) && !(isLegitGuarded && !hasOtpHardFlag);
  const hardSignalFloor = hasHardSignal ? Math.max(...signals.filter((s) => s.isHardSignal).map((s) => s.weight)) : 0;

  // Determine suggested scam type based on highest weighted signal
  let suggestedScamType = "none";
  if (signals.length > 0) {
    const sorted = [...signals].sort((a, b) => b.weight - a.weight);
    suggestedScamType = mapCategoryToScamType(sorted[0]);
  }

  return {
    signals,
    hasHardSignal,
    hardSignalFloor,
    isLegitGuarded,
    suggestedScamType,
  };
}

function mapScamTypeToCategory(scamType: string): EvidenceSignal["category"] {
  switch (scamType) {
    case "otp_takeover":
    case "oauth_consent":
      return "credential_theft";
    case "bank_impersonation":
    case "family_impersonation":
    case "brand_homoglyph":
      return "impersonation";
    case "prize":
    case "job":
    case "delivery_fee":
    case "investment":
    case "toad_callback":
    case "crypto_drainer":
    case "task_scam":
      return "financial";
    case "remote_access":
    case "malicious_app":
      return "malware";
    case "ussd_forwarding":
      return "telecom_fraud";
    case "sextortion":
      return "threat";
    case "phishing_link":
      return "credential_theft";
    default:
      return "general";
  }
}

function mapCategoryToScamType(signal: EvidenceSignal): string {
  if (signal.id === "remote_access_tool_request") return "remote_access";
  if (signal.id === "ussd_call_forwarding") return "ussd_forwarding";
  if (signal.id === "malicious_app_installer") return "malicious_app";
  if (signal.id === "otp_takeover_request") return "otp_takeover";
  if (signal.id === "toad_callback_invoice") return "toad_callback";
  if (signal.id === "crypto_drainer_signature") return "crypto_drainer";
  if (signal.id === "oauth_consent_phish") return "oauth_consent";
  if (signal.id === "task_rating_scam") return "task_scam";
  if (signal.id === "brand_homoglyph_attack" || signal.id === "homoglyph_attack") return "brand_homoglyph";
  if (signal.id.includes("prize")) return "prize";
  if (signal.id.includes("job")) return "job";
  if (signal.id.includes("bank")) return "bank_impersonation";
  if (signal.id.includes("delivery")) return "delivery_fee";
  if (signal.id.includes("investment")) return "investment";
  if (signal.id.includes("family")) return "family_impersonation";
  if (signal.id.includes("sextortion")) return "sextortion";
  return "other";
}
