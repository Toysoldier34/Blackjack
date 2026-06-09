import type { Card, Deck } from "wasp/entities";
import type { GetCards, GetDecks } from "wasp/server/operations";

export type DeckWithCards = Deck & { cards: Card[] };

export const getCards: GetCards<void, Card[]> = async (args, context) => {
    return context.entities.Card.findMany();
};

export const getDecks: GetDecks<void, DeckWithCards[]> = async (args, context) => {
    return context.entities.Deck.findMany({
        include: { cards: true },
    });
};

