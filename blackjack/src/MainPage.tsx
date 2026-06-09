import React, { useRef, useState } from "react";
import "./Main.css";
import type { Card } from "wasp/entities";
import type { DeckWithCards } from "./queries";
import { getDecks, reassignCardDeck, useQuery, updateCardDeckOrder } from "wasp/client/operations";
import { createDeck, createCard } from "wasp/client/operations";
import { cardList } from "./cardList";

export function MainPage() {
  const [drawDeckRef, setDrawDeckRef] = useState(0);
  const [discardDeckRef, setDiscardDeckRef] = useState(0);
  const [playerDeckRef, setPlayerDeckRef] = useState(0);
  const [dealerDeckRef, setDealerDeckRef] = useState(0);
  
  const isProcessing = useRef(false);

  const { data: decks, isLoading, error } = useQuery(getDecks);

  const drawDeck = decks?.find((deck) => deck.id === drawDeckRef);
  const discardDeck = decks?.find((deck) => deck.id === discardDeckRef);
  const playerDeck = decks?.find((deck) => deck.id === playerDeckRef);
  const dealerDeck = decks?.find((deck) => deck.id === dealerDeckRef);

  const runGameAction = async (actionFunction: () => Promise<void>) => {
    if (isProcessing.current) return;
    try {
      isProcessing.current = true;
      await actionFunction();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      isProcessing.current = false;
    }
  };

  const handleNewGame = () => runGameAction(async () => {
    // Initialize cards
    const tempCards = await initializeCards();
    // Initialize decks and shuffle draw deck
    const shuffledCards = shuffle(tempCards);
    const deckIds = await initializeDecks(shuffledCards, setDrawDeckRef, setDiscardDeckRef, setPlayerDeckRef, setDealerDeckRef);
    // Initialize hands
    await initializeHandsAfterSetup(shuffledCards, deckIds.playerId, deckIds.dealerId);
  });

  const initializeHandsAfterSetup = async (cards: Card[], playerId: number, dealerId: number) => {
    await reassignCardDeck({ 
      id: cards[cards.length -1].id, 
      deckId: playerId, 
      deckOrder: 0 
    });
    await reassignCardDeck({ 
      id: cards[cards.length -2].id, 
      deckId: playerId, 
      deckOrder: 1 
    });
    await reassignCardDeck({ 
      id: cards[cards.length -3].id, 
      deckId: dealerId, 
      deckOrder: 0 
    });
    await reassignCardDeck({ 
      id: cards[cards.length -4].id, 
      deckId: dealerId, 
      deckOrder: 1 
    });
  }

  const handleDrawToDiscard = () => runGameAction(async () => {
    if (!drawDeck || !discardDeck) return;

    if (drawDeck.cards.length === 0) {
      await restockDrawDeck();
      return; 
    } else if (drawDeck.cards.length > 0) {
      const topCard = drawDeck.cards.find((card) => card.deckOrder === drawDeck.cards.length - 1);
      await reassignCardDeck({
        id: topCard!.id,
        deckId: discardDeck.id,
        deckOrder: discardDeck.cards.length
      });
    }
  });

  const drawToDeck = (destinationDeck: DeckWithCards) => runGameAction(async () => {
    if (!drawDeck || !destinationDeck) return;

    if (drawDeck.cards.length === 0) {
      await restockDrawDeck();
      return;
    }

    const topCard = drawDeck.cards.find((card) => card.deckOrder === drawDeck.cards.length - 1);
    if (topCard) {
      await reassignCardDeck({
        id: topCard.id,
        deckId: destinationDeck.id,
        deckOrder: destinationDeck.cards.length
      });
    }
  });

  const restockDrawDeck = async (extraCards: Card[] = []): Promise<Card[]> => {
    if (!discardDeck || !drawDeck) return [];

    const remainingDrawCards = [...drawDeck.cards];
    const allDiscardedCards = [...discardDeck.cards, ...extraCards];
    const shuffledDiscarded = shuffle(allDiscardedCards);
    const completeNewDeck = [...remainingDrawCards, ...shuffledDiscarded];

    const promises = completeNewDeck.map((card, index) => 
      reassignCardDeck({
        id: card.id,
        deckId: drawDeck.id,
        deckOrder: index,
      })
    );
    await Promise.all(promises);

    return completeNewDeck.map((card, index) => ({
      ...card,
      deckId: drawDeck.id,
      deckOrder: index
    }));
  }

  const handleEndRound = () => runGameAction(async () => {
    if (!discardDeck || !playerDeck || !dealerDeck || ! drawDeck) return;
    // Move hand cards to discard
    const cardsForDiscard: Card[] = [];
    for (const card of playerDeck.cards) {
      cardsForDiscard.push(card);
    }
    for (const card of dealerDeck.cards) {
      cardsForDiscard.push(card);
    }
    const discardSize = discardDeck.cards.length
    for (const card of cardsForDiscard) {
      await reassignCardDeck({
        id: card.id,
        deckId: discardDeck.id,
        deckOrder: (discardSize + cardsForDiscard.indexOf(card)),
      });
    }

    let stashedDeck = [...drawDeck.cards];

    if (stashedDeck.length < 4) {
      stashedDeck = await restockDrawDeck(cardsForDiscard)
    }

    // Initializes Hands
    if (stashedDeck.length >= 4) {
      await reassignCardDeck({ 
        id: stashedDeck.find((card) => card.deckOrder === stashedDeck.length - 1)!.id, 
        deckId: playerDeck.id, 
        deckOrder: 0 
      });
      await reassignCardDeck({ 
        id: stashedDeck.find((card) => card.deckOrder === stashedDeck.length - 2)!.id,
        deckId: playerDeck.id, 
        deckOrder: 1 
      });
      await reassignCardDeck({ 
        id: stashedDeck.find((card) => card.deckOrder === stashedDeck.length - 3)!.id, 
        deckId: dealerDeck.id, 
        deckOrder: 0 
      });
      await reassignCardDeck({ 
        id: stashedDeck.find((card) => card.deckOrder === stashedDeck.length - 4)!.id, 
        deckId: dealerDeck.id, 
        deckOrder: 1 
      });
    } else {
      console.warn("Not enough cards in play to deal a new round, even after restocking.");
    }
  });

  const playerStand = () => runGameAction(async () => {
    if (!playerDeck || !dealerDeck) return;
    // Check Dealer Score
    calculateScore(dealerDeck.cards);
    // Dealer Hit if needed
    // Calculate Winnings
    // Handle End of Round
    //handleEndRound();
  });

  return (
    <main className="container">
      <h2 className="title">Welcome to Blackjack!</h2>
      <div className="buttons">
        <button className="button button-filled disabled:opacity-25" onClick={handleNewGame} disabled={isProcessing.current}>
          New Game
        </button>
        <button className="button button-filled disabled:opacity-25" onClick={handleDrawToDiscard} disabled={isProcessing.current}>
          Draw to Discard
        </button>
        <button className="button button-filled disabled:opacity-25" onClick={() => drawToDeck(playerDeck!)} disabled={isProcessing.current}>
          Player HIT
        </button>
        <button className="button button-filled disabled:opacity-25" onClick={playerStand} disabled={isProcessing.current}>
          Player STAND
        </button>
        <button className="button button-filled disabled:opacity-25" onClick={() => drawToDeck(dealerDeck!)} disabled={isProcessing.current}>
          Dealer HIT
        </button>
        <button className="button button-filled disabled:opacity-25" onClick={handleEndRound} disabled={isProcessing.current}>
          End Round
        </button>
      </div>
      <div className="flex gap-3">
        {isLoading && "Loading..."}
        {error && "Error loading decks: " + error}
        <div className="content border">
          {drawDeck && drawDeck.name}
          {drawDeck && <CardsList cards={drawDeck.cards} />}
        </div>
        <div className="content border">
          {discardDeck && discardDeck.name}
          {discardDeck && <CardsList cards={discardDeck.cards} />}
        </div>
        <div className="content border">
          {playerDeck && playerDeck.name}
          {playerDeck && <CardsList cards={playerDeck.cards} />}
        </div>
        <div className="content border">
          {dealerDeck && dealerDeck.name}
          {dealerDeck && <CardsList cards={dealerDeck.cards} />}
        </div>
      </div>
    </main>
  );
}

const CardsList = ({ cards }: { cards: Card[] }) => {
  if (!cards?.length) return <div>No cards found.</div>;
  return (
    <div>
      {cards.map((cards, index) => (
        <div key={index}>
          {cards.value} of {cards.suit} (Score: {cards.score}) Order: {cards.deckOrder}
        </div>
      ))}
    </div>
  );
}

function shuffle<Card>(cards: Card[]): Card[] {
  // Fisher-Yates shuffle algorithm
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateScore(cards: Card[]): number {
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

const initializeCards = async () => {
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

const initializeDecks = async (
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


