import { Card } from "wasp/entities";
import { PlayingCard } from "./PlayingCard";

export interface DealerHandProps { cards: Card[] | undefined; hideDealerCard: boolean; }

export const DealerHand = ({ cards, hideDealerCard }: DealerHandProps) => {
  if (!cards || cards.length === 0) return null;

  const dealerCards = [...cards];
  const firstCard = dealerCards.shift(); 

  return (
    <div className="flex flex-wrap justify-center gap-4 my-6 w-full">
      {firstCard && (
        hideDealerCard ? (
          <PlayingCard key={firstCard.id} card={{...firstCard, suit: "", value: ""}} />
        ) : (
          <PlayingCard key={firstCard.id} card={firstCard} />
        )
      )}
      {dealerCards.map((card) => (
        <PlayingCard key={card.id} card={card} />
      ))}
    </div>
  );
};