import { PatternRule } from "./types";

/**
 * Standard fraud pattern rules for Iraq and regional online scams.
 * All patterns are tested against normalized Arabic text (strip diacritics, alef unified to ا,
 * ya unified to ي, ta-marbuta unified to ه) and lowercase English.
 */
export const FRAUD_RULES: PatternRule[] = [
  // 1. HARD FLAG: Demanding OTP / Verification Code / Password Takeover
  {
    id: "otp_takeover_request",
    scamType: "otp_takeover",
    weight: 90,
    isHardFlag: true,
    descriptionAr: "طلب مباشر لكود التحقق أو رمز المرور السري (علامة سرقة حساب مؤكدة)",
    patterns: [
      /(?:دز|ارسل|ابعث|انطيني|اعطيني|شارك)\s*(?:لي)?\s*(?:الكود|الرمز|رمز\s*التحقق|كود\s*التحقق|كود\s*الواتساب|رمز\s*الواتساب|كود\s*التفعيل|otp|pin|code)/i,
      /(?:الكود|الرمز|رمز\s*التحقق)\s*(?:اللي|الذي)\s*(?:وصلك|اجاك|ارسلته|وصل\s*على\s*خطك)/i,
      /(?:دزيت|ارسلت|بعثت)\s*(?:لك)?\s*(?:كود|رمز|كودك)\s*(?:بالغلط|عن\s*طريق\s*الخطا|خطا)/i,
      /send\s*(?:me)?\s*(?:the)?\s*(?:code|otp|pin|verification\s*code)/i,
      /forward\s*(?:the)?\s*(?:code|otp|sms)/i,
      /sent\s*you\s*(?:the)?\s*code\s*by\s*mistake/i,
      /give\s*me\s*the\s*(?:6|six)\s*digit/i,
    ],
    negativePatterns: [
      /لا\s*(?:تشارك|تعطي|ترسل)\s*(?:هذا)?\s*(?:الرمز|الكود|رمز\s*التحقق)/i,
      /(?:do\s*not|never)\s*share\s*(?:this)?\s*(?:code|otp|pin)/i,
    ],
  },

  // 2. Telecom & Lottery Prizes
  {
    id: "fake_prize",
    scamType: "prize",
    weight: 75,
    descriptionAr: "ادعاء الفوز بجوائز نقدية أو سيارات أو سحوبات اتصالات وهمية",
    patterns: [
      /مبروك\s*(?:فزت|ربحت|فوزك)/i,
      /ربحت\s*(?:معنا|سياره|مبلغ|مليون|\$\d+|\d+\s*الف)/i,
      /سحب\s*جوائز\s*(?:زين|اسياسيل|كورك|كبرى)/i,
      /جائزه\s*(?:نقديه|ماليه|كبرى|عاشوراء|رمضان|العيد)/i,
      /تم\s*اختيار\s*رقمك\s*(?:للفوز|كفائز|رابح)/i,
      /congratulations\s*(?:you\s*have)?\s*won/i,
      /claim\s*your\s*prize/i,
      /lottery\s*winner/i,
    ],
  },

  // 3. Bank & Digital Wallet Suspension / Impersonation
  {
    id: "bank_wallet_impersonation",
    scamType: "bank_impersonation",
    weight: 80,
    descriptionAr: "انتحال صفة مصرف أو محفظة مالية والتهديد بإيقاف الحساب",
    patterns: [
      /(?:زين\s*كاش|كي\s*كارد|مصرف\s*الرافدين|مصرف\s*الرشيد|البنك\s*المركزي|الماستر\s*كارد)\s*.*(?:معلق|موقوف|تحديث|حظر|تجميد)/i,
      /(?:تحديث|تاكيد|تنشيط)\s*(?:بيانات|حسابك|بطاقتك|محفظتك)\s*(?:خلال|لتجنب|قبل)/i,
      /(?:سيتم|تم)\s*(?:ايقاف|حظر|تجميد|اغلاق)\s*(?:حسابك|محفظتك|بطاقتك)/i,
      /qi\s*card\s*.*(?:suspended|update|blocked)/i,
      /zain\s*cash\s*.*(?:suspended|update|blocked)/i,
      /bank\s*account\s*(?:suspended|blocked|freeze)/i,
    ],
  },

  // 4. Advance Fee & Fake Delivery / Customs Charges
  {
    id: "advance_delivery_fee",
    scamType: "delivery_fee",
    weight: 70,
    descriptionAr: "طلب دفع رسوم توصيل أو جمارك أو استلام لاستلام طرد وهمي",
    patterns: [
      /(?:طردك|شحنتك|طرد\s*بانتظارك)\s*.*(?:رسوم|ادفع|شحن|جمارك)/i,
      /(?:رسوم|اجور)\s*(?:جمركيه|شحن|توصيل|استلام|رمزيه)\s*(?:لاستلام|لدفع)/i,
      /ادفع\s*(?:مبلغ|رسوم)\s*(?:رمزيه|بسيطه)\s*(?:لتوصيل|لاستلام)/i,
      /package\s*(?:pending|waiting|held)\s*.*(?:fee|pay|customs)/i,
      /pay\s*delivery\s*fee/i,
    ],
  },

  // 5. Fake High-Paying Job with Fees
  {
    id: "fake_job_fee",
    scamType: "job",
    weight: 75,
    descriptionAr: "عرض وظيفة وهمية براتب مغرٍ تنتهي بطلب رسوم تسجيل أو شحن",
    patterns: [
      /(?:راتب\s*يومي|راتب\s*بالدولار|دخل\s*يومي)\s*.*(?:بدون\s*خبره|من\s*المنزل)/i,
      /(?:وظائف\s*شاغره|فرصه\s*عمل)\s*.*(?:رسوم\s*تسجيل|دفع\s*اشتراك|شحن\s*منصه)/i,
      /(?:عموله\s*يوميه|ارباح\s*تقييم)\s*.*(?:شحن|ايداع|منصه)/i,
      /work\s*from\s*home\s*.*(?:\$|daily\s*salary|no\s*experience)/i,
      /registration\s*fee\s*for\s*(?:job|platform|training)/i,
    ],
  },

  // 6. Guaranteed Profit & High-Yield Crypto/Investment Schemes
  {
    id: "guaranteed_investment",
    scamType: "investment",
    weight: 75,
    descriptionAr: "وعود بأرباح خيالية مضمونة واستثمارات بدون مخاطر",
    patterns: [
      /(?:ارباح\s*مضمونه|استثمار\s*مضمون|دخل\s*مضمون|ربح\s*يومي\s*مضمون)/i,
      /مضاعفه\s*(?:اموالك|راس\s*المال|رصيدك)\s*(?:خلال|في\s*ساعات|في\s*ايام)/i,
      /تداول\s*مضمون\s*(?:بدون\s*خساره|ارباح\s*يوميه)/i,
      /guaranteed\s*(?:profit|returns|income)/i,
      /double\s*your\s*(?:money|crypto|deposit)/i,
      /risk\s*free\s*investment/i,
    ],
  },

  // 7. Family / Friend Impersonation ("New number, urgent money")
  {
    id: "family_impersonation",
    scamType: "family_impersonation",
    weight: 80,
    descriptionAr: "انتحال صفة قريب أو صديق بادعاء تغيير الرقم وطلب أموال عاجلة",
    patterns: [
      /(?:هذا\s*رقمي\s*الجديد|غيرت\s*رقمي)\s*.*(?:سويت\s*حادث|محتاج\s*فلوس|حول\s*لي|ظرف\s*طارئ|زين\s*كاش)/i,
      /(?:محتاج\s*مبلغ\s*ضروري|حول\s*لي\s*مستعجل)\s*.*(?:ارجعه|باجر|الصبح)/i,
      /new\s*number\s*.*(?:send\s*money|urgent\s*help|need\s*cash)/i,
    ],
  },

  // 8. Sextortion & Camera Threat
  {
    id: "sextortion_threat",
    scamType: "sextortion",
    weight: 85,
    descriptionAr: "تهديد وابتزاز إلكتروني بادعاء اختراق الكاميرا أو امتلاك صور حساسة",
    patterns: [
      /(?:اخترقت\s*كاميرتك|صورتك\s*بالكاميرا|سجلت\s*لك\s*فيديو|صورك\s*الخاصه)\s*.*(?:ادفع|فديه|انشر|فضيحه)/i,
      /(?:انشر\s*صورك|ارسل\s*المقطع)\s*(?:لاصدقائك|لاهلك|لجهات\s*اتصالك)/i,
      /i\s*recorded\s*you\s*(?:through\s*your\s*webcam|watching)/i,
      /pay\s*(?:bitcoin|ransom)\s*or\s*(?:i\s*send|leak)/i,
    ],
  },

  // 9. Prompt Injection & Jailbreak Defense
  {
    id: "prompt_injection",
    scamType: "other",
    weight: 80,
    descriptionAr: "محاولة التلاعب بنظام التحليل الآلي وحقن أوامر برمجية",
    patterns: [
      /ignore\s*(?:all\s*)?previous\s*instructions/i,
      /disregard\s*(?:system\s*)?prompt/i,
      /say\s*(?:this\s*is\s*)?safe/i,
      /tell\s*the\s*user\s*(?:it\s*is|this\s*is)\s*not\s*a\s*scam/i,
      /تجاهل\s*(?:كافة|جميع)?\s*(?:التعليمات|الاوامر)\s*(?:السابقه|الاولى)/i,
      /قل\s*(?:ان\s*)?هذا\s*(?:امن|سليم|ليس\s*نصبا)/i,
      /اكتب\s*ان\s*الرساله\s*سليمه/i,
    ],
  },

  // 10. Callback Phishing (TOAD) & Fake Invoice Fraud
  {
    id: "toad_callback_invoice",
    scamType: "toad_callback",
    weight: 88,
    isHardFlag: true,
    descriptionAr: "احتيال هاتفي وفواتير اشتراك وهمية (Callback Phishing / TOAD)",
    patterns: [
      /(?:invoice|receipt|order\s*confirmation)\s*.*(?:\$\d+|\d+\s*usd)/i,
      /(?:subscription|auto-renew|renewed)\s*.*(?:\$\d+|\d+\s*usd|charged)/i,
      /(?:geek\s*squad|norton|mcafee|paypal|best\s*buy)\s*.*(?:charged|invoice|receipt|renewed|\$\d+)/i,
      /(?:if\s*you\s*did\s*not|to\s*cancel|dispute\s*this|call\s*customer\s*support)\s*.*(?:call|contact|toll-free|help\s*desk|\+?[0-9]{10,})/i,
      /(?:فاتوره|ايصال|تجديد\s*اشتراك|خصم\s*مبلغ)\s*.*(?:\$\d+|\d+\s*دولار)/i,
      /(?:اذا\s*لم\s*تطلب|لالغاء\s*الاشتراك|لاسترداد\s*المبلغ)\s*.*(?:اتصل|تواصل|على\s*الرقم)/i,
    ],
  },

  // 11. Task Scams & Rating / Commission Fraud
  {
    id: "task_rating_scam",
    scamType: "task_scam",
    weight: 74,
    descriptionAr: "احتيال المهام اليومية والعمولات الوهمية (Task Scam / Video Rating)",
    patterns: [
      /(?:like|rate|subscribe)\s*.*(?:youtube|tiktok|video)\s*.*(?:\$|earn|commission)/i,
      /(?:rating|reviewing)\s*.*(?:hotels|apps|products)\s*.*(?:earn|\$\d+|daily)/i,
      /(?:مهام|تقييم\s*(?:تطبيقات|فنادق|منتجات|فيديوهات)|لايكات)\s*.*(?:دولار|عمول[ةه]|ارباح|يومي[ةه])/i,
      /(?:دولار|عمول[ةه]|ارباح)\s*.*(?:مهام|تقييم\s*(?:تطبيقات|فنادق|منتجات)|لايكات)/i,
      /(?:عمل\s*أونلاين|وظيفة\s*عن\s*بعد|راتب\s*يومي)\s*.*(?:مهام|تقييم|تيليجرام)/i,
      /(?:ارباح\s*المهام|شحن\s*الرصيد\s*للمهمه)/i,
      /telegram\s*(?:task|recruitment|daily\s*income)/i,
    ],
  },

  // 12. Crypto Drainers & Deceptive Web3 Wallet Signatures
  {
    id: "crypto_drainer_signature",
    scamType: "crypto_drainer",
    weight: 92,
    isHardFlag: true,
    descriptionAr: "توقيع احتيالي لسرقة العملات الرقمية وتفريغ المحفظة (Crypto Drainer)",
    patterns: [
      /(?:eth_signTypedData|eth_sign|setApprovalForAll|approve\s*all)/i,
      /\b(?:permit|permit2)\s*.*(?:signature|allowance|transferFrom|message|claim)/i,
      /(?:claim\s*airdrop|free\s*nft)\s*.*(?:connect\s*wallet|sign\s*message|sign\s*transaction)/i,
      /(?:تفريغ\s*المحفظه|توقيع\s*تصريح|منح\s*صلاحيه\s*غير\s*محدوده)/i,
    ],
  },

  // 13. OAuth Consent Phishing & Device Code Token Theft
  {
    id: "oauth_consent_phish",
    scamType: "oauth_consent",
    weight: 90,
    isHardFlag: true,
    descriptionAr: "محاولة سرقة صلاحيات الحساب وتجاوز التحقق الثنائي عبر تفويض احتيالي (OAuth Consent / Device Code)",
    patterns: [
      /(?:oauth2\/authorize|oauth\/authorize|login\/device\/code)/i,
      /device\s*code\s*.*(?:enter\s*code|verify\s*device)/i,
      /enter\s*code\s*at\s*microsoft\.com\/devicelogin/i,
    ],
  },
];

/**
 * Protective Guard Patterns (Genuine OTP messages from banks or providers).
 * When these are present, they provide strong evidence that the message is a legitimate
 * service notification advising caution, NOT a fraud attempt.
 */
export const LEGIT_GUARD_PATTERNS = [
  /لا\s*(?:تشارك|تعطي|تطلع)\s*(?:هذا)?\s*(?:الرمز|الكود|رمز\s*التحقق)\s*مع\s*(?:اي\s*شخص|احد|اي\s*كائن)/i,
  /(?:do\s*not|never)\s*share\s*(?:this)?\s*(?:code|otp|pin|password)\s*with\s*anyone/i,
  /موظفو\s*(?:المصرف|زين|البنك|خدمه\s*العملاء)\s*لن\s*يطلبوا\s*منك/i,
  /حفاظا\s*على\s*سريه\s*حسابك/i,
  /لمنع\s*سرقه\s*حسابك/i,
  /for\s*your\s*security\s*,?\s*never\s*share/i,
];
