'use client';

import {useEffect, useState} from 'react';
import './memory-cards.css';

type Card = {
  id: number;
  pairId: string;
  emoji: string;
};

const PAIRS = [
  {pairId: 'a', emoji: '🐶'},
  {pairId: 'b', emoji: '🐱'},
  {pairId: 'c', emoji: '🐰'},
];

function buildDeck(salt: number): Card[] {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  const cards: Card[] = PAIRS.flatMap((p, i) => [
    {id: i * 2, pairId: p.pairId, emoji: p.emoji},
    {id: i * 2 + 1, pairId: p.pairId, emoji: p.emoji},
  ]);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export default function MemoryCardsGame() {
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>(() => buildDeck(1));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState('같은 그림을 찾아요');

  useEffect(() => {
    setCards(buildDeck(Date.now() % 100000));
    setReady(true);
  }, []);

  const reset = () => {
    setCards(buildDeck(Date.now() % 100000));
    setFlipped([]);
    setMatched([]);
    setLock(false);
    setMoves(0);
    setMessage('같은 그림을 찾아요');
  };

  const onFlip = (id: number) => {
    if (!ready || lock) return;
    if (flipped.includes(id)) return;
    const card = cards.find((c) => c.id === id);
    if (!card || matched.includes(card.pairId)) return;

    const nextFlipped = [...flipped, id];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    setLock(true);
    setMoves((m) => m + 1);
    const [a, b] = nextFlipped.map((fid) => cards.find((c) => c.id === fid)!);

    if (a.pairId === b.pairId) {
      const nextMatched = [...matched, a.pairId];
      setMatched(nextMatched);
      setMessage('짝꿍 발견! 👏');
      setFlipped([]);
      setLock(false);
      if (nextMatched.length === PAIRS.length) {
        setMessage('모두 찾았어요! 대단해 🎉');
      }
      return;
    }

    setMessage('앗, 다른 그림이에요');
    window.setTimeout(() => {
      setFlipped([]);
      setLock(false);
      setMessage('같은 그림을 찾아요');
    }, 700);
  };

  const done = matched.length === PAIRS.length;

  return (
    <div className={`memory-cards${done ? ' memory-cards--done' : ''}`}>
      <div className="memory-cards__bar">
        <span>시도 {moves}</span>
        <button type="button" className="memory-cards__reset" onClick={reset}>
          다시
        </button>
      </div>
      <p className="memory-cards__message">{message}</p>
      <div className="memory-cards__grid" role="group" aria-label="기억 카드">
        {cards.map((card) => {
          const open = flipped.includes(card.id) || matched.includes(card.pairId);
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-cards__card${open ? ' is-open' : ''}`}
              aria-label={open ? card.emoji : '숨겨진 카드'}
              onClick={() => onFlip(card.id)}
            >
              <span aria-hidden="true">{open ? card.emoji : '❓'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
