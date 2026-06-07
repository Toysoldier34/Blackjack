import type { Deck } from "wasp/entities";
import type { CreateDeck, UpdateDeck } from "wasp/server/operations";
import type { Card } from "wasp/entities";
import type { CreateCard, UpdateCardDeckOrder, ReassignCardDeck } from "wasp/server/operations";

type CreateDeckPayload = Pick<Deck, "name"> & { cards: Card[] };
type UpdateDeckPayload = Pick<Deck, "id" |"name"> & { cards: Card[] };
type CreateCardPayload = Pick<Card, "suit" | "value" | "score">;
type UpdateCardPayload = Pick<Card, "id" |"deckOrder">;
type ReassignCardPayload = Pick<Card, "id" |"deckOrder" | "deckId">;

export const createDeck: CreateDeck<CreateDeckPayload, Deck> = async (
    { name, cards },
    context,
) => {
    return context.entities.Deck.create({
        data: { 
            name, 
            cards: { 
                connect: cards.map((card) => ({ 
                    id: card.id 
                })) 
            } 
        },
    });
};

export const updateDeck: UpdateDeck<UpdateDeckPayload, Deck> = async (
    { id, name, cards },
    context,
) => {
    return context.entities.Deck.update({
        where: { id },
        data: { 
            name: name,
            //cards: cards,
        },
    });
};

export const createCard: CreateCard<CreateCardPayload, Card> = async (
    args,
    context,
) => {
    return context.entities.Card.create({
        data: { suit: args.suit, value: args.value, score: args.score },
    });
};

export const updateCardDeckOrder: UpdateCardDeckOrder<UpdateCardPayload, Card> = async (
    { id, deckOrder },
    context,
) => {
    return context.entities.Card.update({
        where: { id },
        data: { 
            deckOrder: deckOrder,
        },
    });
};

export const reassignCardDeck: ReassignCardDeck<ReassignCardPayload, Card> = async (
    { id, deckOrder, deckId },
    context,
) => {
    return context.entities.Card.update({
        where: { id: id },
        data: { 
            deckOrder: deckOrder,
            deck: {
                connect: { id: deckId!}
            },
        },
    });
};