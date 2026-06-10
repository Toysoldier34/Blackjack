import { Card } from "wasp/entities";

export function shuffle<Card>(cards: Card[]): Card[] {
  // Fisher-Yates shuffle algorithm
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateScore(cards: Card[]): number {
  if (!cards) return 0;
  let scoreTotal = 0;
  let acesPresent = 0;
  for (const card of cards) {
    scoreTotal += card.score;
    if (card.value === "A") acesPresent++;
  }
  for (let i: number = 0; i < acesPresent; i++) {
    if (scoreTotal > 21) (scoreTotal = scoreTotal - 10);
  }
  return scoreTotal;
}