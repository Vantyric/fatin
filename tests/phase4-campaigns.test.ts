import { describe, it, expect } from "vitest";
import { computeSimHash, hammingDistance, getLshBands } from "@/lib/campaigns/simhash";
import { recordCampaignObservation } from "@/lib/campaigns/memory";

describe("Phase 4: Privacy-Preserving SimHash & Campaign Memory", () => {
  it("computes deterministic 64-bit SimHash for Arabic text", () => {
    const text = "مبروك ربحت 1000 دولار من شركة زين العراق اتصل الآن لاستلام الجائزة";
    const hash1 = computeSimHash(text);
    const hash2 = computeSimHash(text);

    expect(hash1).toHaveLength(16);
    expect(hash1).toBe(hash2);
  });

  it("yields small Hamming distance for rephrased scam variants", () => {
    // Two variants of the same scam with rephrasing and different numbers
    const variantA = "مبروك ربحت 500 دولار من شركة زين ارسل الرمز 491029";
    const variantB = "مبروك فزت بـ 1000 دولار من شركه زين ارسل الكود 849201";

    const hashA = computeSimHash(variantA);
    const hashB = computeSimHash(variantB);
    const dist = hammingDistance(hashA, hashB);

    // Rephrased variants with same structure should have low distance
    expect(dist).toBeLessThanOrEqual(10);

    // Completely unrelated text
    const unrelated = "السلام عليكم ورحمة الله وبركاته، والدتي مريضة ونحتاج موعد مع الطبيب غداً";
    const hashUnrelated = computeSimHash(unrelated);
    const distUnrelated = hammingDistance(hashA, hashUnrelated);

    expect(distUnrelated).toBeGreaterThan(12);
  });

  it("splits SimHash into 4 LSH bands for indexing", () => {
    const hash = "1a2b3c4d5e6f7a8b";
    const bands = getLshBands(hash);

    expect(bands).toHaveLength(4);
    expect(bands[0]).toBe("1a2b");
    expect(bands[1]).toBe("3c4d");
    expect(bands[2]).toBe("5e6f");
    expect(bands[3]).toBe("7a8b");
  });

  it("tracks campaign observations, enforces subject rate-limit, and applies crowd bonus", async () => {
    const text = "مبروك تم اختيار حسابك للفوز بجائزة كبرى من اسياسيل اتصل بنا";
    const today = "2026-11-08";

    // Observation 1 from Subject 1
    const res1 = await recordCampaignObservation({
      text,
      isScam: true,
      subjectHash: "subject-1",
      todayDate: today,
    });
    expect(res1.seenCount).toBe(1);

    // Repeated observation from Subject 1 on SAME day -> rate limited, seenCount should remain 1
    const res1Repeat = await recordCampaignObservation({
      text,
      isScam: true,
      subjectHash: "subject-1",
      todayDate: today,
    });
    expect(res1Repeat.seenCount).toBe(1);

    // Observation 2 from Subject 2 on same day -> increments to 2
    const res2 = await recordCampaignObservation({
      text,
      isScam: true,
      subjectHash: "subject-2",
      todayDate: today,
    });
    expect(res2.seenCount).toBe(2);
    expect(res2.crowdRiskBonus).toBe(10); // 2 scam observations -> +10 bonus

    // Observation 3 from Subject 3 -> increments to 3 (known campaign!)
    const res3 = await recordCampaignObservation({
      text,
      isScam: true,
      subjectHash: "subject-3",
      todayDate: today,
    });
    expect(res3.seenCount).toBe(3);
    expect(res3.isKnownCampaign).toBe(true);
    expect(res3.crowdRiskBonus).toBe(15); // 3+ scam observations -> capped at +15
  });
});
