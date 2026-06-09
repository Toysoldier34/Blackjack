import React, { useRef, useState } from "react";

interface HyperplexedTextProps {
  text: string;
  className?: string;
}

export function HyperplexedText({ text, className = "" }: HyperplexedTextProps) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [displayText, setDisplayText] = useState(text);

  const handleMouseOver = () => {
    let iteration = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const scrambled = text
        .split("")
        .map((_, index) => {
          if (index < iteration) {
            return text[index];
          }
          return letters[Math.floor(Math.random() * 26)];
        })
        .join("");

      setDisplayText(scrambled);

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }

      iteration += 1 / 3;
    }, 30);
  };

  return (
    <h3 onMouseOver={handleMouseOver} className={className}>
      {displayText}
    </h3>
  );
}