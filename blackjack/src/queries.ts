import type { Card } from "wasp/entities";
import type { GetCards } from "wasp/server/operations";
import type { Deck } from "wasp/entities";
import type { GetDecks } from "wasp/server/operations";

export type DeckWithCards = Deck & { cards: Card[] };

export const getCards: GetCards<void, Card[]> = async (args, context) => {
    return context.entities.Card.findMany();
};

export const getDecks: GetDecks<void, DeckWithCards[]> = async (args, context) => {
    return context.entities.Deck.findMany({
        include: { cards: true },
    });
};

