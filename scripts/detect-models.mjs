import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// 1. Read .env.local safely without printing key
const envPath = path.resolve("./.env.local");
let geminiKey = process.env.GEMINI_API_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === "GEMINI_API_KEY") geminiKey = val;
    }
  }
}

if (!geminiKey) {
  console.log("No GEMINI_API_KEY set. Defaulting to standard fast/deep pairing:");
  console.log("FAST: gemini-3.5-flash-lite");
  console.log("DEEP: gemini-3.5-flash");
  process.exit(0);
}

const ai = new GoogleGenAI({ apiKey: geminiKey });

async function detect() {
  console.log("Detecting available models for configured key...");

  const fastCandidates = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  const deepCandidates = [
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-2.5-pro",
    "gemini-3.5-flash-lite",
  ];

  let selectedFast = null;
  let selectedDeep = null;

  for (const model of fastCandidates) {
    try {
      const res = await Promise.race([
        ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: "OK" }] }],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000)),
      ]);
      if (res && res.text) {
        selectedFast = model;
        break;
      }
    } catch {
      // Try next
    }
  }

  for (const model of deepCandidates) {
    try {
      const res = await Promise.race([
        ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: "OK" }] }],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000)),
      ]);
      if (res && res.text) {
        selectedDeep = model;
        break;
      }
    } catch {
      // Try next
    }
  }

  selectedFast = selectedFast || "gemini-3.5-flash-lite";
  selectedDeep = selectedDeep || "gemini-3.5-flash";

  console.log("Model Detection Complete:");
  console.log(`  Selected GEMINI_MODEL_FAST: ${selectedFast}`);
  console.log(`  Selected GEMINI_MODEL_DEEP: ${selectedDeep}`);
}

detect();
