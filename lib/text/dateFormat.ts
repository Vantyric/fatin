/**
 * Formats a date into YYYY/M/D using Western Arabic digits (0-9).
 * Example: 2026/11/8
 */
export function formatWesternDate(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}/${month}/${day}`;
}
