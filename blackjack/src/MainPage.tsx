import React, { useRef, useState } from "react";
import "./Main.css";
import type { Card } from "wasp/entities";
import type { DeckWithCards } from "./queries";
import { getDecks, reassignCardDeck, useQuery } from "wasp/client/operations";
import { HyperplexedText } from "./components/ui/HyperplexedText";
import { Particles } from "./components/ui/Particles";
import { shuffle, calculateScore } from "./utilities"
import { initializeCards, initializeDecks } from "./initializers"
import { DealerHand } from "./components/DealerHand";
import { PlayerHand } from "./components/PlayerHand";


export function MainPage() {
  const [drawDeckRef, setDrawDeckRef] = useState(0);
  const [discardDeckRef, setDiscardDeckRef] = useState(0);
  const [playerDeckRef, setPlayerDeckRef] = useState(0);
  const [dealerDeckRef, setDealerDeckRef] = useState(0);
  const [hideDealerCard, setHideDealerCard] = useState(true);
  const [winnerText, setWinnerText] = useState("");
  const [disableButtons, setDisableButtons] = useState(false);

  const isProcessing = useRef(false);

  const { data: decks, isLoading, error } = useQuery(getDecks);

  const drawDeck = decks?.find((deck) => deck.id === drawDeckRef);
  const discardDeck = decks?.find((deck) => deck.id === discardDeckRef);
  const playerDeck = decks?.find((deck) => deck.id === playerDeckRef);
  const dealerDeck = decks?.find((deck) => deck.id === dealerDeckRef);

  const millisecondsToWaitBetweenRounds = 3000;

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
      setWinnerText("Player Bust with a score of " + playerScore);
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

  const endRound = async () => {
    if (!discardDeck || !playerDeck || !dealerDeck || ! drawDeck) return;
    setDisableButtons(true);
    await new Promise(resolve => setTimeout(resolve, millisecondsToWaitBetweenRounds));
    setDisableButtons(false);
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
      setWinnerText("Player Bust with a score of " + playerScore);
    } else if (dealerScore > 21) {
      // Player Wins
      setWinnerText("Dealer Bust with a score of " + dealerScore);
    } else if (playerScore > dealerScore) {
      // Player Wins
      setWinnerText("Player Wins with a score of " + playerScore);
    } else if (dealerScore > playerScore) {
      // Player Loses
      setWinnerText("Dealer Wins with a score of " + dealerScore);
    } else {
      // Player Ties
      setWinnerText("Push due to Tie");
    }
    // Handle End of Round
    endRound();
  });


  return (
    <Particles>
      <main className="min-h-screen min-w-screen">
        <div className="min-h-screen flex flex-row">
          <div className="flex items-center">
            <div className="flex ml-6">
              <div className="buttons flex flex-col justify-start gap-4">
                <button className="disabled:opacity-25 text-left" 
                onClick={handleNewGame} disabled={isProcessing.current || disableButtons}
                >
                  <HyperplexedText text="NEW GAME"/>
                </button>
                <button className="disabled:opacity-25 text-left" 
                onClick={() => handleDrawToDeckClick(playerDeck!)} disabled={isProcessing.current || disableButtons}
                >
                  <HyperplexedText text="HIT"/>
                </button>
                <button className="disabled:opacity-25 text-left" 
                onClick={playerStay} disabled={isProcessing.current || disableButtons}
                >
                  <HyperplexedText text="STAY"/>
                </button>
              </div>
            </div>
          </div>
          <div className="flex mx-auto">
            <div className="flex flex-col">
              <div className="flex flex-col">
                <h2 className="title text-center m-6"><HyperplexedText text="BLACKJACK"/></h2>
              </div>
              {isLoading && "Loading..."}
              {error && "Error loading decks: " + error}
              <div className="flex flex-col grow justify-between items-center">
                <div>
                  <div className="text-center text-1xl text-white">DEALER HAND</div>
                  <DealerHand cards={dealerDeck?.cards} hideDealerCard={hideDealerCard}/>
                </div>   
                <div className="text-white text-center uppercase text-xl">
                  {winnerText}
                </div>             
                <div>
                  <PlayerHand cards={playerDeck?.cards}/>
                  <div className="text-center text-1xl mb-6 text-white">PLAYER HAND</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Particles>
  );
}

