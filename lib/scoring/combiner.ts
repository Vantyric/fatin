import { Confidence, ScamType, Verdict } from "../rules/types";

export interface HardFloorCondition {
  isLookalikeWithCredentials?: boolean;
  isYoungDomainWithCredentials?: boolean;
  isSafeBrowsingMatch?: boolean;
  isUnsolicitedOtp?: boolean;
  isRemoteAccessOrApk?: boolean;
  isUssdForwarding?: boolean;
  isHomoglyphOrBrandSpoof?: boolean;
  isToadInvoiceCallback?: boolean;
  isCryptoDrainer?: boolean;
}

export interface ScoreCombineParams {
  aiScore: number | null; // null if degraded/rules-only
  rulesScore: number;
  hasHardFlag?: boolean;
  aiScamType?: ScamType;
  rulesScamType?: ScamType;
  aiConfidence?: Confidence;
  urlRiskScore?: number;
  crowdBonus?: number; // +10 or +15 (capped at +15)
  hardFloors?: HardFloorCondition;
}

export interface CombinedScoreResult {
  finalScore: number;
  verdict: Verdict;
  verdictLabelAr: string;
  confidence: Confidence;
  scamType: ScamType;
  isHardFlag: boolean;
  appliedFloors: string[];
}

/**
 * Combines AI risk score and Rules score according to Fatin Phase 5 specifications:
 * - AI leads (Pass 2 if ran, else Pass 1).
 * - Rules provide supporting evidence and hard floors.
 * - Rules can RAISE the score, never lower it below the AI judgment.
 * - Crowd bonus: +10 or +15 if seen across multiple submitters (capped at 15).
 * - Hard floors:
 *    - lookalike + credential request -> score >= 85
 *    - domain < 30 days + credential -> score >= 80
 *    - Safe Browsing match -> score >= 90
 *    - unsolicited OTP / "أرسل الرمز" -> score >= 85
 *    - remote access tool (.apk / AnyDesk) -> score >= 85
 *    - USSD call forwarding code -> score >= 88
 *    - hasHardFlag -> score >= 85
 * Thresholds: < 30 safe, 30-69 suspicious, >= 70 scam.
 */
export function combineScores(params: ScoreCombineParams): CombinedScoreResult {
  const {
    aiScore,
    rulesScore,
    hasHardFlag = false,
    aiScamType,
    rulesScamType,
    aiConfidence,
    urlRiskScore = 0,
    crowdBonus = 0,
    hardFloors,
  } = params;

  // Integrate URL risk into rules weight
  const effectiveRulesScore = Math.max(rulesScore, urlRiskScore);

  let score: number;
  let confidence: Confidence = "medium";

  if (aiScore !== null && !isNaN(aiScore)) {
    // AI leads the evaluation
    let baseScore = aiScore;

    // Rules can RAISE the score, but NEVER lower it below the AI judgment
    if (effectiveRulesScore > aiScore) {
      // Calculate raised score with supporting rules evidence
      const blendedRaised = Math.round(0.55 * aiScore + 0.45 * effectiveRulesScore);
      baseScore = Math.max(aiScore, blendedRaised);
    }

    score = baseScore;

    // Assess confidence based on agreement
    const scoreDiff = Math.abs(aiScore - effectiveRulesScore);
    if (scoreDiff <= 20 && (aiConfidence === "high" || score >= 80 || score <= 20)) {
      confidence = "high";
    } else if (scoreDiff > 40) {
      confidence = "low";
    } else {
      confidence = aiConfidence || "medium";
    }
  } else {
    // Degraded mode: fallback to rules-only
    score = effectiveRulesScore;
    confidence = effectiveRulesScore >= 80 || effectiveRulesScore <= 15 ? "medium" : "low";
  }

  // Crowd bonus: +10 or +15 if seen across multiple submitters (capped at 15)
  if (crowdBonus > 0) {
    const cappedCrowdBonus = Math.min(crowdBonus, 15);
    score = Math.min(100, score + cappedCrowdBonus);
  }

  // Hard floor evaluation
  const appliedFloors: string[] = [];

  if (hasHardFlag) {
    score = Math.max(85, score);
    appliedFloors.push("مؤشر خطر قاطع");
  }

  if (hardFloors?.isLookalikeWithCredentials) {
    score = Math.max(85, score);
    appliedFloors.push("رابط منتحل يطلب بيانات سرية");
  }

  if (hardFloors?.isYoungDomainWithCredentials) {
    score = Math.max(80, score);
    appliedFloors.push("نطاق حديث جداً مع طلب بيانات");
  }

  if (hardFloors?.isSafeBrowsingMatch) {
    score = Math.max(90, score);
    appliedFloors.push("موقع مدرج في قوائم التهديد الأمنية");
  }

  if (hardFloors?.isUnsolicitedOtp) {
    score = Math.max(85, score);
    appliedFloors.push("طلب رمز التحقق السري (OTP)");
  }

  if (hardFloors?.isRemoteAccessOrApk) {
    score = Math.max(85, score);
    appliedFloors.push("تطبيق تحكم عن بعد أو ملف ضار");
  }

  if (hardFloors?.isUssdForwarding) {
    score = Math.max(88, score);
    appliedFloors.push("رمز تحويل المكالمات (USSD)");
  }

  if (hardFloors?.isHomoglyphOrBrandSpoof) {
    score = Math.max(90, score);
    appliedFloors.push("احتيال انتحال نطاق وعلامة تجارية (Brand Spoofing / Homoglyph Attack)");
  }

  if (hardFloors?.isToadInvoiceCallback) {
    score = Math.max(88, score);
    appliedFloors.push("احتيال هاتفي وفواتير وهمية (Callback Phishing / TOAD)");
  }

  if (hardFloors?.isCryptoDrainer) {
    score = Math.max(92, score);
    appliedFloors.push("توقيع احتيالي لسرقة المحفظة (Crypto Drainer / Permit Fraud)");
  }

  // Clamp within 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Thresholds: <30 safe, 30-69 suspicious, >=70 scam
  let verdict: Verdict;
  let verdictLabelAr: string;

  if (score < 30) {
    verdict = "safe";
    verdictLabelAr = "يبدو سليماً";
  } else if (score < 70) {
    verdict = "suspicious";
    verdictLabelAr = "مشبوه، انتبه";
  } else {
    verdict = "scam";
    verdictLabelAr = "نصب على الأغلب";
  }

  // Determine top scam type
  let scamType: ScamType = "none";
  if (verdict !== "safe") {
    if (rulesScamType && rulesScamType !== "none" && rulesScamType !== "other") {
      scamType = rulesScamType;
    } else if (aiScamType && aiScamType !== "none") {
      scamType = aiScamType;
    } else if (effectiveRulesScore >= 30) {
      scamType = "other";
    }
  }

  const isHardFlag = hasHardFlag || appliedFloors.length > 0;

  return {
    finalScore: score,
    verdict,
    verdictLabelAr,
    confidence,
    scamType,
    isHardFlag,
    appliedFloors,
  };
}
