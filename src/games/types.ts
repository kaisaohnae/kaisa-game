import type {ComponentType} from 'react';

/** 1 = ★ · 2 = ★★ · 3 = ★★★ · … · 5 = ★★★★★ */
export type GameLevel = 1 | 2 | 3 | 4 | 5;

export type GameMeta = {
  id: string;
  title: string;
  description: string;
  level: GameLevel;
};

export type GameModule = GameMeta & {
  Component: ComponentType;
};
