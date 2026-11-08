import React from "react";

interface HighlightedTextProps {
  text: string;
  phrases: string[];
}

export function HighlightedText({ text, phrases }: HighlightedTextProps) {
  if (!text) return null;
  if (!phrases || phrases.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/90">{text}</p>;
  }

  // Filter out empty or whitespace-only phrases, ensure they are exact substrings of the input text,
  // and sort by length descending to match longest phrases first
  const validPhrases = phrases
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && (text.includes(p) || text.toLowerCase().includes(p.toLowerCase())))
    .sort((a, b) => b.length - a.length);

  if (validPhrases.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/90">{text}</p>;
  }

  // Escape special regex characters in phrases
  const escapedPhrases = validPhrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escapedPhrases.join("|")})`, "gi");

  // Split text by regex while keeping delimiters
  const parts = text.split(regex);

  return (
    <p className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/90">
      {parts.map((part, index) => {
        const isMatch = validPhrases.some(
          (phrase) => phrase.toLowerCase() === part.toLowerCase()
        );

        if (isMatch) {
          return (
            <mark
              key={index}
              className="bg-verdict-danger/20 text-verdict-danger font-semibold px-1.5 py-0.5 rounded border border-verdict-danger/40 inline-block my-0.5"
            >
              {part}
            </mark>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
}
