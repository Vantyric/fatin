/**
 * Conversation Analyzer for Fatin.
 * Detects if the input looks like a chat transcript (multiple speakers, timestamps, or dialog turns),
 * analyzes the conversation trajectory (rapport building -> pivot to money/action -> urgency),
 * and identifies the exact turning-point quote where the fraud attempt emerges.
 */

export interface ConversationAnalysis {
  isConversation: boolean;
  speakerCount: number;
  trajectory: {
    hasRapportBuilding: boolean;
    hasPivot: boolean;
    hasUrgencyOrPressure: boolean;
    stages: Array<{
      stage: "rapport" | "pivot" | "urgency" | "casual";
      speaker?: string;
      line: string;
    }>;
  };
  turningPointQuote?: string;
  turningPointExplanationAr?: string;
}

const TIMESTAMP_REGEX = /(?:\[?\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|ص|م)?\]?)/i;
const SPEAKER_LABEL_REGEX = /(?:^|\n)\s*([^\n:]{2,20})\s*:\s*(.+)/i;

// Pivot triggers: moving to money, codes, external links, or other platforms
const PIVOT_TRIGGER_REGEX =
  /(?:دزلي|ارسل|حول|كود|رمز|رابط|محفظة|فلوس|دولار|زين\s*كاش|كي\s*كارد|تليجرام|واتساب|حسابك|بطاقة|سجل|اضغط|ادخل|anydesk|تطبيق)/i;

// Urgency triggers
const URGENCY_TRIGGER_REGEX =
  /(?:بسرعة|هسه|هسة|خلال\s*ساعة|قبل\s*ما|ضروري|مستعجل|توقف|تعليق|حظر|انشر|فضيحة)/i;

// Rapport building greetings
const RAPPORT_REGEX =
  /(?:سلام\s*عليكم|مرحبا|شلونك|شخبارك|صباح\s*الخير|مساء\s*الخير|اهلين|حبيبي|عيني|استاذ|اخي|فرصة\s*عمل|عرض\s*خاص)/i;

/**
 * Checks if raw text appears to be a chat conversation transcript.
 */
export function analyzeConversation(text: string): ConversationAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      isConversation: false,
      speakerCount: 0,
      trajectory: {
        hasRapportBuilding: false,
        hasPivot: false,
        hasUrgencyOrPressure: false,
        stages: [],
      },
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      isConversation: false,
      speakerCount: 1,
      trajectory: {
        hasRapportBuilding: false,
        hasPivot: false,
        hasUrgencyOrPressure: false,
        stages: [],
      },
    };
  }

  const speakersSet = new Set<string>();
  let timestampCount = 0;
  let speakerTurnCount = 0;

  for (const line of lines) {
    if (TIMESTAMP_REGEX.test(line)) {
      timestampCount++;
    }
    const speakerMatch = line.match(SPEAKER_LABEL_REGEX);
    if (speakerMatch) {
      const speakerName = speakerMatch[1].trim();
      // Ensure speaker label isn't just an arbitrary sentence ending with a colon
      if (speakerName.length <= 15 && !speakerName.includes(".")) {
        speakersSet.add(speakerName);
        speakerTurnCount++;
      }
    }
  }

  // Conversation heuristic:
  // - Multiple identified speakers, OR
  // - Multiple timestamps, OR
  // - 3+ lines with dialogue style markers
  const isConversation =
    speakersSet.size >= 2 ||
    timestampCount >= 2 ||
    (speakerTurnCount >= 2 && lines.length >= 3);

  if (!isConversation) {
    return {
      isConversation: false,
      speakerCount: speakersSet.size || 1,
      trajectory: {
        hasRapportBuilding: false,
        hasPivot: false,
        hasUrgencyOrPressure: false,
        stages: [],
      },
    };
  }

  // Analyze trajectory through the chat lines
  let hasRapportBuilding = false;
  let hasPivot = false;
  let hasUrgencyOrPressure = false;
  let turningPointQuote: string | undefined;
  let turningPointExplanationAr: string | undefined;

  const stages: ConversationAnalysis["trajectory"]["stages"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (RAPPORT_REGEX.test(line) && !hasPivot) {
      hasRapportBuilding = true;
      stages.push({ stage: "rapport", line });
    } else if (PIVOT_TRIGGER_REGEX.test(line)) {
      if (!hasPivot) {
        hasPivot = true;
        turningPointQuote = line;
        turningPointExplanationAr = "لحظة تحول المحادثة من الحديث الودي الاعتيادي إلى طلب بيانات حساسة أو تحويل أموال أو رموز";
      }
      stages.push({ stage: "pivot", line });
    } else if (URGENCY_TRIGGER_REGEX.test(line)) {
      hasUrgencyOrPressure = true;
      stages.push({ stage: "urgency", line });
    } else {
      stages.push({ stage: "casual", line });
    }
  }

  return {
    isConversation: true,
    speakerCount: Math.max(speakersSet.size, 2),
    trajectory: {
      hasRapportBuilding,
      hasPivot,
      hasUrgencyOrPressure,
      stages,
    },
    turningPointQuote,
    turningPointExplanationAr,
  };
}
