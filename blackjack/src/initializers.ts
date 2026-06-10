import { createDeck, createCard, updateCardDeckOrder } from "wasp/client/operations";
import { cardList } from "./cardList";
import { Card } from "wasp/entities";

export const initializeCards = async () => {
  const tempCards: Card[] = [];
  try {
    for (const card of cardList) {
      tempCards.push(await createCard({ suit: card.suit, value: card.value, score: card.score }));
    }
  } catch (error) {
    console.error("Error creating card:", error);
    alert("Failed to create card.");
  }
  return tempCards;
}

export const initializeDecks = async (
  shuffledCards: Card[],
  setDrawDeckRef: React.Dispatch<React.SetStateAction<number>>,
  setDiscardDeckRef: React.Dispatch<React.SetStateAction<number>>,
  setPlayerDeckRef: React.Dispatch<React.SetStateAction<number>>,
  setDealerDeckRef: React.Dispatch<React.SetStateAction<number>>,
): Promise<{ drawId: number; discardId: number; playerId: number; dealerId: number }> => {
  const tempDrawDeckRef = await createDeck({ name: "drawDeck", cards: shuffledCards });
  setDrawDeckRef(tempDrawDeckRef.id);
  const tempDiscardDeckRef = await createDeck({ name: "discardDeck", cards: [] });
  setDiscardDeckRef(tempDiscardDeckRef.id);
  const tempPlayerDeckRef = await createDeck({ name: "playerDeck", cards: [] });
  setPlayerDeckRef(tempPlayerDeckRef.id);
  const tempDealerDeckRef = await createDeck({ name: "dealerDeck", cards: [] });
  setDealerDeckRef(tempDealerDeckRef.id);
  // Shuffle cards in draw deck
  const promises = shuffledCards.map((card, index) =>
    updateCardDeckOrder({ id: card.id, deckOrder: index })
  );
  await Promise.all(promises);

  return {
    drawId: tempDrawDeckRef.id,
    discardId: tempDiscardDeckRef.id,
    playerId: tempPlayerDeckRef.id,
    dealerId: tempDealerDeckRef.id
  };
}
