import React, { useState } from "react";
import "./Main.css";
import type { Card, Deck } from "wasp/entities";
import type {DeckWithCards} from "./queries";
import { getDecks, updateDeck, getCards, updateCardDeckOrder, reassignCardDeck, useQuery } from "wasp/client/operations";
import { createDeck, createCard } from "wasp/client/operations";
import { cardList } from "./cardList";

export function MainPage() {
  //const { data: cards, isLoading, error } = useQuery(getCards);
  const { data: decks, isLoading, error } = useQuery(getDecks);
  //const testDeck: Deck = decks ? decks[0] : { id: 0, name: "Test Deck" };
  console.log(decks)
  
  const [drawDeckRef, setDrawDeckRef] = useState(0);
  const [discardDeckRef, setDiscardDeckRef] = useState(0);


  const handleNewGame = async () => {
    const tempCards: Card[] = [];
    try {
      for (const card of cardList) {
        tempCards.push(await createCard({ suit: card.suit, value: card.value, score: card.score }));
      }
    } catch (error) {
      console.error("Error creating card:", error);
      alert("Failed to create card.");
    }
    const tempDrawDeckRef = await createDeck({ name: "drawDeck", cards: tempCards });
    setDrawDeckRef(tempDrawDeckRef.id);
    const tempDiscardDeckRef = await createDeck({ name: "discardDeck", cards: [] });
    setDiscardDeckRef(tempDiscardDeckRef.id);
    const shuffledCards = shuffle(tempCards);
    for (const card of shuffledCards) {
      //console.log(`Card: ${card.value} of ${card.suit} (Score: ${card.score})`);
      updateCardDeckOrder({ id: card.id, deckOrder: shuffledCards.indexOf(card) });
    }
  };

  const handleDrawToDiscard = async () => {
    const drawDeck = decks?.find((deck) => deck.id === drawDeckRef);
    const discardDeck = decks?.find((deck) => deck.id === discardDeckRef);
    if (drawDeck && discardDeck) {
      if (drawDeck.cards.length > 0) {
        const topCard = drawDeck!.cards.find((card) => card.deckOrder === drawDeck!.cards.length - 1);
        console.log(`Drawing Card: ${topCard?.value} of ${topCard?.suit} (Score: ${topCard?.score}) Order: ${topCard?.deckOrder}`);
        
        await reassignCardDeck({
          id: topCard!.id,
          deckId: discardDeckRef,
          deckOrder: discardDeck!.cards.length
        });
      } else {
        await restockDrawDeck(drawDeck, discardDeck);

      }
    }

    // });
    // await updateCardDeckOrder({ 
    //   id: topCard!.id,
    //   deckOrder: 0, //TODO: change from 0 to check new order number
    //   //deckOrder: decks?.find((deck) => deck.id === discardDeckRef)?.cards.length || 0 
    // });
  }




//{decks && <CardsList cards={decks[0]?.cards} />}
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
      </div>
      <div className="flex gap-3">
        <div className="content border">
          {decks && decks[decks.length-1]?.name}
          {decks && <CardsList cards={decks[decks.length-1]?.cards} />}
          {isLoading && "Loading..."}
          {error && "Error loading decks: " + error}
        </div>
        <div className="content border">
          {decks && decks[decks.length-2]?.name}
          {decks && <CardsList cards={decks[decks.length-2]?.cards} />}
          {isLoading && "Loading..."}
          {error && "Error loading decks: " + error}
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

const restockDrawDeck = async (drawDeck: DeckWithCards, discardDeck: DeckWithCards) =>{
  const shuffledCards = shuffle(discardDeck.cards);
  for (const card of shuffledCards) {
    await reassignCardDeck({
      id: card.id,
      deckId: drawDeck.id,
      deckOrder: shuffledCards.indexOf(card),
    });
  }
}