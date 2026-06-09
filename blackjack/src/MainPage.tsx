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
  const [hideDealerCard, setHideDealerCard] = useState(true);
  
  const isProcessing = useRef(false);

  const { data: decks, isLoading, error } = useQuery(getDecks);

  const drawDeck = decks?.find((deck) => deck.id === drawDeckRef);
  const discardDeck = decks?.find((deck) => deck.id === discardDeckRef);
  const playerDeck = decks?.find((deck) => deck.id === playerDeckRef);
  const dealerDeck = decks?.find((deck) => deck.id === dealerDeckRef);

  const runGameAction = async <T,>(actionFunction: () => Promise<T>): Promise<T | undefined> => {
    if (isProcessing.current) return;
    try {
      isProcessing.current = true;
      return await actionFunction();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      isProcessing.current = false;
    }
  };

  const handleNewGame = () => runGameAction(async () => {
    setHideDealerCard(true);
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

  const handleDrawToDeckClick = (destinationDeck: DeckWithCards) => runGameAction(async () => {
    if (!drawDeck || !playerDeck) return;
    const { drawnCard } = await drawToDeck(destinationDeck, drawDeck.cards, destinationDeck.cards.length);
    if (!drawnCard) return;
    const currentPlayerCards = [...playerDeck.cards];
    currentPlayerCards.push(drawnCard);
    const playerScore = calculateScore(currentPlayerCards);
    if (playerScore > 21) {
      setHideDealerCard(false);
      // Player Loses
      alert("Player Bust with a score of " + playerScore);
      endRound();
    }
  });

  const drawToDeck = async (
    destinationDeck: DeckWithCards, 
    currentDrawCards: Card[], 
    currentDestinationCount: number
  ): Promise<{ drawnCard: Card | undefined; updatedDrawCards: Card[] }> => {
    if (!drawDeck || !destinationDeck) return { drawnCard: undefined, updatedDrawCards: currentDrawCards };

    let newDrawDeck: Card[] = [...currentDrawCards];
    if (newDrawDeck.length === 0) {
      newDrawDeck = await restockDrawDeck();
    }

    let updatedDrawCards: Card[] = [];
    const topCard: Card | undefined = newDrawDeck.find((card) => card.deckOrder === newDrawDeck.length - 1);
    if (topCard) {
      await reassignCardDeck({
        id: topCard.id,
        deckId: destinationDeck.id,
        deckOrder: currentDestinationCount
      });
      updatedDrawCards = newDrawDeck.filter(card => card.id !== topCard.id);
    }
    return { drawnCard: topCard, updatedDrawCards };
  };

  const restockDrawDeck = async (extraCards: Card[] = []): Promise<Card[]> => {
    if (!discardDeck || !drawDeck) return [];
    console.log("Restocking Draw Deck");

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

  const handleEndRound = () => runGameAction(async () => { endRound(); });

  const endRound = async () => {
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
    setHideDealerCard(true);

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
  }

  const playerStay = () => runGameAction(async () => {
    if (!playerDeck || !dealerDeck || !drawDeck) return;
    setHideDealerCard(false);
    // Check Dealer Score
    let currentDealerCards = [...dealerDeck.cards];
    let dealerScore = calculateScore(currentDealerCards);
    let trackedDrawCards = [...drawDeck.cards];
    // Dealer Hit if needed
    while (dealerScore < 17) {
      const { drawnCard, updatedDrawCards } = await drawToDeck(dealerDeck, trackedDrawCards, currentDealerCards.length);
      if (!drawnCard) {
        console.warn("Could not draw card");
        break;
      }
      trackedDrawCards = updatedDrawCards;
      currentDealerCards.push(drawnCard);
      dealerScore = calculateScore(currentDealerCards);
    }
    // Calculate Winnings
    const playerScore = calculateScore(playerDeck.cards)
    if (playerScore > 21) {
      // Player Loses
      alert("Player Bust with a score of " + playerScore);
    } else if (dealerScore > 21) {
      // Player Wins
      alert("Dealer Bust with a score of " + dealerScore);
    } else if (playerScore > dealerScore) {
      // Player Wins
      alert("Player Wins with a score of " + playerScore);
    } else if (dealerScore > playerScore) {
      // Player Loses
      alert("Dealer Wins with a score of " + dealerScore);
    } else {
      // Player Ties
      alert("Push due to Tie");
    }
    // Handle End of Round
    endRound();
  });


  return (
    <main className="container min-h-screen min-w-screen mx-auto flex flex-row items-center p-6">
      {/*Left Button Column*/}
      <div className="grow-2 flex flex-col">
        <div className="buttons flex flex-col justify-start gap-4">
          <button className="button button-filled disabled:opacity-25" onClick={handleNewGame} disabled={isProcessing.current}>
            New Game
          </button>
          <button className="button button-filled disabled:opacity-25" onClick={handleDrawToDiscard} disabled={isProcessing.current}>
            Draw to Discard
          </button>
          <button className="button button-filled disabled:opacity-25" onClick={() => handleDrawToDeckClick(playerDeck!)} disabled={isProcessing.current}>
            Player HIT
          </button>
          <button className="button button-filled disabled:opacity-25" onClick={playerStay} disabled={isProcessing.current}>
            Player STAY
          </button>
          <button className="button button-filled disabled:opacity-25" onClick={() => handleDrawToDeckClick(dealerDeck!)} disabled={isProcessing.current}>
            Dealer HIT
          </button>
          <button className="button button-filled disabled:opacity-25" onClick={handleEndRound} disabled={isProcessing.current}>
            End Round
          </button>
        </div>
      </div>
      {/*Center Content Column*/}
      <div className="min-h-screen flex flex-col grow-8">
        <h2 className="title text-center mb-6">BLACKJACK</h2>
        {isLoading && "Loading..."}
        {error && "Error loading decks: " + error}
        <div className="grid grid-cols-1 grow content-between">
          <div>
            <div className="text-center text-2xl">DEALER HAND</div>
            <DealerHand cards={dealerDeck?.cards} hideDealerCard={hideDealerCard}/>
          </div>
          <div>
            <PlayerHand cards={playerDeck?.cards}/>
            <div className="text-center text-2xl">PLAYER HAND</div>
          </div>
        </div>
      </div>
      {/*Right Padding Column*/}
      <div className="grow-2">
      </div>
    </main>
  );
}


interface DealerHandProps { cards: Card[] | undefined; hideDealerCard: boolean; }

const DealerHand = ({ cards, hideDealerCard }: DealerHandProps) => {
  if (!cards || cards.length === 0) return null;

  const dealerCards = [...cards];
  const firstCard = dealerCards.shift(); 

  return (
    <div className="flex flex-wrap justify-center gap-4 my-6 w-full">
      {firstCard && (
        hideDealerCard ? (
          <PlayingCard key={firstCard.id} card={{...firstCard, suit: "?", value: "?"}} />
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

interface PlayerHandProps { cards: Card[] | undefined; }

const PlayerHand = ({cards}: PlayerHandProps) => {
  if (!cards || cards.length === 0) return;
  
  return (
    <div className="flex flex-wrap justify-center gap-4 my-6 w-full">
      {cards.map((card) => (
        <PlayingCard key={card.id} card={card}/>
      ))}
    </div>
  )
}

interface PlayingCardProps { card: Card; }

const PlayingCard = ({card}: PlayingCardProps) => {
  return (
    <div className="hover-3d my-12 mx-2 cursor-pointer">
      <div className="card w-50 h-70 bg-black text-white bg-[radial-gradient(circle_at_bottom_left,#ffffff04_35%,transparent_36%),radial-gradient(circle_at_top_right,#ffffff04_35%,transparent_36%)] bg-size-[4.95em_4.95em]">
        <div className="card-body">
          <div className="flex mb-10">
            <div className="font-bold text-3xl">{card.value}</div>
          </div>
          <div className="text-8xl text-center mb-4 opacity-70">{card.suit}</div>
          <div className="flex justify-end mb-10">
            <div className="font-bold text-3xl rotate-180">{card.value}</div>
          </div>
        </div>
      </div>
      {/* 8 empty divs needed for the 3D effect */}
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
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


