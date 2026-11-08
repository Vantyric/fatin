import { normalizeArabic } from "../text/normalize";
import { FRAUD_RULES, LEGIT_GUARD_PATTERNS } from "./patterns";
import { RulesEngineResult, RuleMatch, ScamType } from "./types";

/**
 * Evaluates raw or masked input text against the data-driven fraud patterns.
 */
export function evaluateRules(text: string): RulesEngineResult {
  if (!text || text.trim().length === 0) {
    return {
      rulesScore: 0,
      scamType: "none",
      matches: [],
      suspiciousPhrases: [],
      reasons: [],
      hasHardFlag: false,
      isLegitGuarded: false,
    };
  }

  const normalized = normalizeArabic(text);

  // Check if this is a genuine security advisory notification (Legit guard)
  let isLegitGuarded = false;
  for (const guardPattern of LEGIT_GUARD_PATTERNS) {
    if (guardPattern.test(normalized)) {
      isLegitGuarded = true;
      break;
    }
  }

  const matches: RuleMatch[] = [];
  const suspiciousPhrases: string[] = [];
  const reasons: string[] = [];
  let hasHardFlag = false;

  for (const rule of FRAUD_RULES) {
    // If negative pattern matches, suppress this rule
    if (rule.negativePatterns) {
      const hasNegative = rule.negativePatterns.some((np) => np.test(normalized));
      if (hasNegative) {
        continue;
      }
    }

    const matchedPhrasesForRule: string[] = [];

    for (const pattern of rule.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const phrase = match[0];
        matchedPhrasesForRule.push(phrase);

        // Find best matching substring in original text to preserve exact user characters
        const originalSubstr = findOriginalSubstring(text, phrase);
        if (originalSubstr && !suspiciousPhrases.includes(originalSubstr)) {
          suspiciousPhrases.push(originalSubstr);
        }
      }
    }

    if (matchedPhrasesForRule.length > 0) {
      if (rule.isHardFlag) {
        hasHardFlag = true;
      }

      matches.push({
        ruleId: rule.id,
        scamType: rule.scamType,
        weight: rule.weight,
        isHardFlag: !!rule.isHardFlag,
        matchedPhrases: matchedPhrasesForRule,
        descriptionAr: rule.descriptionAr,
      });

      if (!reasons.includes(rule.descriptionAr)) {
        reasons.push(rule.descriptionAr);
      }
    }
  }

  // Calculate composite score
  let rulesScore = 0;
  let topScamType: ScamType = "none";

  if (matches.length > 0) {
    // Sort matches by weight descending
    matches.sort((a, b) => b.weight - a.weight);
    topScamType = matches[0].scamType;

    const baseWeight = matches[0].weight;
    // Add small additive weight for multiple corroborating fraud signals (+5 each, up to +15)
    const corroborationBonus = Math.min(15, (matches.length - 1) * 5);
    rulesScore = Math.min(100, baseWeight + corroborationBonus);

    // If a hard flag is present, score cannot be lower than 85
    if (hasHardFlag) {
      rulesScore = Math.max(85, rulesScore);
    }
  }

  // Legit Guard handling:
  // If the text is a genuine protective notification ("do not share this code")
  // and does NOT contain an explicit attacker request ("send me the code that arrived"),
  // drastically reduce score into safe territory (<20)
  if (isLegitGuarded && !hasHardFlag) {
    rulesScore = Math.min(15, rulesScore);
    topScamType = "none";
    suspiciousPhrases.length = 0;
    reasons.length = 0;
    reasons.push("تحتوي الرسالة على تنبيه بعدم مشاركة الرمز لحماية حسابك.");
    reasons.push("تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور");
  }

  return {
    rulesScore,
    scamType: topScamType,
    matches,
    suspiciousPhrases: suspiciousPhrases.slice(0, 8),
    reasons: reasons.slice(0, 5),
    hasHardFlag,
    isLegitGuarded,
  };
}

/**
 * Helper to locate the corresponding substring in the original un-normalized text.
 */
function findOriginalSubstring(originalText: string, normalizedPhrase: string): string | null {
  const normWords = normalizedPhrase.trim().split(/\s+/).filter(Boolean);
  if (normWords.length === 0) return null;

  // Simple sliding search for word boundary matches
  const origWords = originalText.split(/\s+/);
  for (let i = 0; i <= origWords.length - normWords.length; i++) {
    const candidateSlice = origWords.slice(i, i + normWords.length).join(" ");
    const normalizedCandidate = normalizeArabic(candidateSlice);
    if (normalizedCandidate.includes(normalizedPhrase) || normalizedPhrase.includes(normalizedCandidate)) {
      return candidateSlice;
    }
  }

  // Fallback: if single phrase occurs directly
  if (originalText.includes(normalizedPhrase)) {
    return normalizedPhrase;
  }

  return null;
}
