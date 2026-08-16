import type {ComponentType} from 'react';

/** 1 = ★ · 2 = ★★ · 3 = ★★★ (최대 3) */
export type GameLevel = 1 | 2 | 3;

export type GameMeta = {
  id: string;
  title: string;
  description: string;
  level: GameLevel;
};

export type GameModule = GameMeta & {
  Component: ComponentType;
};
