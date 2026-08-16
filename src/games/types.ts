import type {ComponentType} from 'react';

/** 1 = ★ (쉬운 터치), 2 = ★★ (조작·조금 더) */
export type GameLevel = 1 | 2;

export type GameMeta = {
  id: string;
  title: string;
  description: string;
  level: GameLevel;
};

export type GameModule = GameMeta & {
  Component: ComponentType;
};
