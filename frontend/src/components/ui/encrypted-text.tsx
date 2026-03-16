"use client";

import { useEffect, useMemo, useState } from "react";

interface EncryptedTextProps {
  text: string;
  encryptedClassName?: string;
  revealedClassName?: string;
  revealDelayMs?: number;
  className?: string;
}

const GLYPHS = "█▓▒░#@/\\<>_-=+*";

export function EncryptedText({
  text,
  encryptedClassName = "text-neutral-500",
  revealedClassName = "text-white",
  revealDelayMs = 40,
  className = "",
}: EncryptedTextProps) {
  const letters = useMemo(() => text.split(""), [text]);
  const [revealed, setRevealed] = useState(0);
  const [scramble, setScramble] = useState<string[]>(() => letters.map(() => randomGlyph()));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const animate = () => {
      setScramble((prev) => prev.map(() => randomGlyph()));
    };
    interval = setInterval(animate, revealDelayMs);
    return () => clearInterval(interval);
  }, [revealDelayMs]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRevealed((prev) => Math.min(prev + 1, letters.length));
    }, revealDelayMs * 2);
    return () => clearTimeout(timeout);
  }, [revealed, letters.length, revealDelayMs]);

  return (
    <span className={className}>
      {letters.map((char, index) => {
        const isRevealed = index < revealed;
        return (
          <span
            key={index}
            className={isRevealed ? revealedClassName : encryptedClassName}
            aria-hidden={!isRevealed}
          >
            {isRevealed ? char : scramble[index]}
          </span>
        );
      })}
    </span>
  );
}

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}
