export type ScamType =
  | "prize"
  | "job"
  | "otp_takeover"
  | "bank_impersonation"
  | "delivery_fee"
  | "investment"
  | "family_impersonation"
  | "sextortion"
  | "phishing_link"
  | "remote_access"
  | "malicious_app"
  | "ussd_forwarding"
  | "qr_phishing"
  | "fake_payment_proof"
  | "overpayment"
  | "romance_investment"
  | "advance_fee"
  | "toad_callback"
  | "brand_homoglyph"
  | "crypto_drainer"
  | "oauth_consent"
  | "task_scam"
  | "other"
  | "none";

export type Verdict = "safe" | "suspicious" | "scam";

export type Confidence = "high" | "medium" | "low";

export interface PatternRule {
  id: string;
  scamType: ScamType;
  weight: number;
  isHardFlag?: boolean;
  patterns: RegExp[];
  negativePatterns?: RegExp[];
  descriptionAr: string;
}

export interface RuleMatch {
  ruleId: string;
  scamType: ScamType;
  weight: number;
  isHardFlag: boolean;
  matchedPhrases: string[];
  descriptionAr: string;
}

export interface RulesEngineResult {
  rulesScore: number; // 0 to 100
  scamType: ScamType;
  matches: RuleMatch[];
  suspiciousPhrases: string[];
  reasons: string[];
  hasHardFlag: boolean;
  isLegitGuarded: boolean;
}
