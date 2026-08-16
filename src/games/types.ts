import type {ComponentType} from 'react';

/** ★ … ★★★★★★ */
export type GameLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type GameMeta = {
  id: string;
  title: string;
  description: string;
  level: GameLevel;
};

export type GameModule = GameMeta & {
  Component: ComponentType;
};
