import type {ComponentType} from 'react';

/** 1 = ★ · 2 = ★★ · 3 = ★★★ · … · 5 = ★★★★★ */
export type GameLevel = 1 | 2 | 3 | 4 | 5;

export type GameMeta = {
  id: string;
  title: string;
  description: string;
  level: GameLevel;
  /** true면 메인 포털 목록에 표시하지 않음 */
  hidden?: boolean;
};

export type GameModule = GameMeta & {
  Component: ComponentType;
};
