import type {GameModule} from './types';
import {AnimalTapGame} from './animal-tap';
import {BalloonPopGame} from './balloon-pop';
import {ColorTouchGame} from './color-touch';
import {CountFruitGame} from './count-fruit';
import {DragFruitGame} from './drag-fruit';
import {MemoryCardsGame} from './memory-cards';
import {MoveBuddyGame} from './move-buddy';
import {ShapeMatchGame} from './shape-match';
import {TapOrderGame} from './tap-order';

/** 새 게임 추가 시 여기만 등록하면 포털·라우트에 자동 반영 */
export const GAMES: GameModule[] = [
  {
    id: 'animal-tap',
    title: '동물 찾기',
    description: '같은 동물을 콕! 눌러요',
    level: 1,
    Component: AnimalTapGame,
  },
  {
    id: 'color-touch',
    title: '색깔 터치',
    description: '같은 색깔을 콕! 눌러보세요',
    level: 1,
    Component: ColorTouchGame,
  },
  {
    id: 'balloon-pop',
    title: '풍선 톡톡',
    description: '하늘 풍선을 톡톡 터뜨려요',
    level: 1,
    Component: BalloonPopGame,
  },
  {
    id: 'drag-fruit',
    title: '과일 담기',
    description: '과일을 바구니로 끌어 넣어요',
    level: 2,
    Component: DragFruitGame,
  },
  {
    id: 'tap-order',
    title: '순서 콕콕',
    description: '보여준 순서대로 눌러요',
    level: 2,
    Component: TapOrderGame,
  },
  {
    id: 'move-buddy',
    title: '친구 움직이기',
    description: '좌우로 움직여 선물을 받아요',
    level: 2,
    Component: MoveBuddyGame,
  },
  {
    id: 'shape-match',
    title: '모양 맞추기',
    description: '동그라미 네모 세모를 찾아요',
    level: 2,
    Component: ShapeMatchGame,
  },
  {
    id: 'count-fruit',
    title: '과일 세기',
    description: '과일을 세고 숫자를 골라요',
    level: 2,
    Component: CountFruitGame,
  },
  {
    id: 'memory-cards',
    title: '짝꿍 찾기',
    description: '뒤집어서 같은 그림을 맞춰요',
    level: 2,
    Component: MemoryCardsGame,
  },
];

export function getGame(id: string) {
  return GAMES.find((game) => game.id === id);
}

export function getGameIds() {
  return GAMES.map((game) => game.id);
}

export function getGamesByLevel(level: 1 | 2) {
  return GAMES.filter((game) => game.level === level);
}

export type {GameMeta, GameModule, GameLevel} from './types';
