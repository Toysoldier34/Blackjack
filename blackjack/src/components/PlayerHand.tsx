import { Card } from "wasp/entities";
import { PlayingCard } from "./PlayingCard";

export interface PlayerHandProps { cards: Card[] | undefined; }

export const PlayerHand = ({cards}: PlayerHandProps) => {
  if (!cards || cards.length === 0) return;
  
  return (
    <div className="flex flex-wrap justify-center gap-4 my-6 w-full">
      {cards.map((card) => (
        <PlayingCard key={card.id} card={card}/>
      ))}
    </div>
  )
}
