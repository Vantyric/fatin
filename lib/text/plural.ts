/**
 * Formats check counts with correct Arabic grammar rules:
 * - 1: "فحص واحد" / "فحص واحد متبقٍ اليوم"
 * - 2: "فحصان" / "فحصان متبقيان اليوم"
 * - 3 to 10: "3 فحوصات" / "3 فحوصات متبقية اليوم"
 * - >10: "15 فحصاً" / "15 فحصاً متبقياً اليوم"
 * - 0: "استنفدت فحوصاتك لهذا اليوم"
 */

export function formatChecksCount(count: number): string {
  if (count === 1) return "فحص واحد";
  if (count === 2) return "فحصان";
  if (count >= 3 && count <= 10) return `${count} فحوصات`;
  return `${count} فحصاً`;
}

export function formatRemainingChecks(count: number): string {
  if (count === 1) return "فحص واحد متبقٍ اليوم";
  if (count === 2) return "فحصان متبقيان اليوم";
  if (count >= 3 && count <= 10) return `باقي لك ${count} فحوصات اليوم`;
  if (count > 10) return `باقي لك ${count} فحصاً اليوم`;
  return "استنفدت فحوصاتك لهذا اليوم";
}
