import { describe, it, expect } from "vitest";
import { formatChecksCount, formatRemainingChecks } from "./plural";

describe("formatChecksCount", () => {
  it("formats singular check count (1) correctly in Arabic", () => {
    expect(formatChecksCount(1)).toBe("فحص واحد");
  });

  it("formats dual check count (2) correctly in Arabic", () => {
    expect(formatChecksCount(2)).toBe("فحصان");
  });

  it("formats plural check counts (3 to 10) correctly with فحوصات", () => {
    expect(formatChecksCount(3)).toBe("3 فحوصات");
    expect(formatChecksCount(5)).toBe("5 فحوصات");
    expect(formatChecksCount(10)).toBe("10 فحوصات");
  });

  it("formats counts above 10 with accusative singular فحصاً", () => {
    expect(formatChecksCount(11)).toBe("11 فحصاً");
    expect(formatChecksCount(15)).toBe("15 فحصاً");
    expect(formatChecksCount(100)).toBe("100 فحصاً");
  });
});

describe("formatRemainingChecks", () => {
  it("formats 1 remaining check as 'فحص واحد متبقٍ اليوم'", () => {
    expect(formatRemainingChecks(1)).toBe("فحص واحد متبقٍ اليوم");
  });

  it("formats 2 remaining checks as 'فحصان متبقيان اليوم'", () => {
    expect(formatRemainingChecks(2)).toBe("فحصان متبقيان اليوم");
  });

  it("formats 3 to 10 remaining checks with 'فحوصات'", () => {
    expect(formatRemainingChecks(3)).toBe("باقي لك 3 فحوصات اليوم");
    expect(formatRemainingChecks(10)).toBe("باقي لك 10 فحوصات اليوم");
  });

  it("formats 11+ remaining checks with 'فحصاً'", () => {
    expect(formatRemainingChecks(11)).toBe("باقي لك 11 فحصاً اليوم");
    expect(formatRemainingChecks(25)).toBe("باقي لك 25 فحصاً اليوم");
  });

  it("formats 0 remaining checks correctly", () => {
    expect(formatRemainingChecks(0)).toBe("استنفدت فحوصاتك لهذا اليوم");
  });
});
