import React, { useState } from "react";
import "./Main.css";
import type { Card, Deck } from "wasp/entities";
import type {DeckWithCards} from "./queries";
import { getDecks, updateDeck, getCards, updateCardDeckOrder, reassignCardDeck, useQuery } from "wasp/client/operations";
import { createDeck, createCard } from "wasp/client/operations";
import { cardList } from "./cardList";



export function MainPage() {
  const [drawDeckRef, setDrawDeckRef] = useState(0);
  const [discardDeckRef, setDiscardDeckRef] = useState(0);
  const [playerDeckRef, setPlayerDeckRef] = useState(0);
  const [dealerDeckRef, setDealerDeckRef] = useState(0);
  const { data: decks, isLoading, error } = useQuery(getDecks);

  const drawDeck = decks?.find((deck) => deck.id === drawDeckRef);
  const discardDeck = decks?.find((deck) => deck.id === discardDeckRef);
  const playerDeck = decks?.find((deck) => deck.id === playerDeckRef);
  const dealerDeck = decks?.find((deck) => deck.id === dealerDeckRef);

  const handleNewGame = async () => {
    // Initialize cards
    const tempCards = await initializeCards();
    // Initialize decks and shuffle draw deck
    await initializeDecks(tempCards, setDrawDeckRef, setDiscardDeckRef, setPlayerDeckRef, setDealerDeckRef);

  };

  const handleDrawToDiscard = async () => {
    if (drawDeck && discardDeck) {
      if (drawDeck.cards.length > 0) {
        const topCard = drawDeck.cards.find((card) => card.deckOrder === drawDeck.cards.length - 1);        
        await reassignCardDeck({
          id: topCard!.id,
          deckId: discardDeckRef,
          deckOrder: discardDeck.cards.length
        });
      } else {
        await restockDrawDeck();
      }
    }
  }

  const drawToDeck = async (destinationDeck: DeckWithCards) => {
    if (drawDeck && destinationDeck) {
      if (drawDeck.cards.length == 1) {
        const topCard = drawDeck.cards.find((card) => card.deckOrder === drawDeck.cards.length - 1);        
        await reassignCardDeck({
          id: topCard!.id,
          deckId: destinationDeck.id,
          deckOrder: destinationDeck.cards.length
        });
        restockDrawDeck();
      } else if (drawDeck.cards.length > 1) {
        const topCard = drawDeck.cards.find((card) => card.deckOrder === drawDeck.cards.length - 1);        
        await reassignCardDeck({
          id: topCard!.id,
          deckId: destinationDeck.id,
          deckOrder: destinationDeck.cards.length
        });
      } else if (drawDeck.cards.length == 0) {
        console.log("drawDeck empty");
        await restockDrawDeck();
      }
    }
  }

  const restockDrawDeck = async () =>{
    const shuffledCards = shuffle(discardDeck!.cards);
    for (const card of shuffledCards) {
      await reassignCardDeck({
        id: card.id,
        deckId: drawDeck!.id,
        deckOrder: shuffledCards.indexOf(card),
      });
    }
  }


  return (
    <main className="container">
      <h2 className="title">Welcome to Blackjack!</h2>
      <div className="buttons">
        <div className="button button-filled" onClick={handleNewGame}>
          New Game
        </div>
        <div className="button button-filled" onClick={handleDrawToDiscard}>
          Draw to Discard
        </div>
        <div className="button button-filled" onClick={() => drawToDeck(playerDeck!)}>
          Draw to Player
        </div>
        <div className="button button-filled" onClick={() => drawToDeck(dealerDeck!)}>
          Draw to Dealer
        </div>
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
};

function shuffle<Card>(cards: Card[]): Card[] {
  // Fisher-Yates shuffle algorithm
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
    tempCards: Card[],
    setDrawDeckRef: React.Dispatch<React.SetStateAction<number>>,
    setDiscardDeckRef: React.Dispatch<React.SetStateAction<number>>,
    setPlayerDeckRef: React.Dispatch<React.SetStateAction<number>>,
    setDealerDeckRef: React.Dispatch<React.SetStateAction<number>>,
  ): Promise<void> => {
  const tempDrawDeckRef = await createDeck({ name: "drawDeck", cards: tempCards });
  setDrawDeckRef(tempDrawDeckRef.id);
  const tempDiscardDeckRef = await createDeck({ name: "discardDeck", cards: [] });
  setDiscardDeckRef(tempDiscardDeckRef.id);
  const tempPlayerDeckRef = await createDeck({ name: "playerDeck", cards: [] });
  setPlayerDeckRef(tempPlayerDeckRef.id);
  const tempDealerDeckRef = await createDeck({ name: "dealerDeck", cards: [] });
  setDealerDeckRef(tempDealerDeckRef.id);
  // Shuffle cards in draw deck
  const shuffledCards = shuffle(tempCards);
  for (const card of shuffledCards) {
    updateCardDeckOrder({ id: card.id, deckOrder: shuffledCards.indexOf(card) });
  }
}

