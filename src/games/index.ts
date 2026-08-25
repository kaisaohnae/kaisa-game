import type {GameLevel, GameModule} from './types';
import {AnimalTapGame} from './level1/animal-tap';
import {BalloonPopGame} from './level1/balloon-pop';
import {ColorTouchGame} from './level1/color-touch';
import {CarRunGame} from './level2/car-run';
import {CountFruitGame} from './level2/count-fruit';
import {DragFruitGame} from './level2/drag-fruit';
import {MemoryCardsGame} from './level2/memory-cards';
import {TapOrderGame} from './level2/tap-order';
import {MazePadGame} from './level3/maze-pad';
import {PatternCopyGame} from './level3/pattern-copy';
import {PicturePuzzleGame} from './level3/picture-puzzle';
import {HangulStudyGame} from './level4/hangul-study';
import {AddPlayGame} from './level5/add-play';
import {SubPlayGame} from './level5/sub-play';
import {TodieGame} from './todie';

/**
 * 포털 표시 순서 = 배열 순서 (나중에 추가된 게임이 앞).
 * 새 게임은 맨 위에 추가.
 */
export const GAMES: GameModule[] = [
  {
    id: 'car-run',
    title: 'Car Race',
    description: 'Dodge left and right as you drive',
    level: 2,
    Component: CarRunGame,
  },
  {
    id: 'picture-puzzle',
    title: 'Picture Puzzle',
    description: 'Move pieces to finish the picture',
    level: 3,
    hidden: true,
    Component: PicturePuzzleGame,
  },
  {
    id: 'todie',
    title: 'todie',
    description: 'Explore and fight with WASD',
    level: 5,
    Component: TodieGame,
  },
  {
    id: 'sub-play',
    title: 'Subtraction Play',
    description: 'Pick the right subtraction answer',
    level: 3,
    Component: SubPlayGame,
  },
  {
    id: 'add-play',
    title: 'Addition Play',
    description: 'Pick the right addition answer',
    level: 3,
    Component: AddPlayGame,
  },
  {
    id: 'pattern-copy',
    title: 'Sparkle Follow',
    description: 'Remember the color order',
    level: 3,
    Component: PatternCopyGame,
  },
  {
    id: 'maze-pad',
    title: 'Maze Adventure',
    description: 'Find the path with arrows',
    level: 3,
    Component: MazePadGame,
  },
  {
    id: 'memory-cards',
    title: 'Match Pairs',
    description: 'Flip cards to find matching pictures',
    level: 3,
    Component: MemoryCardsGame,
  },
  {
    id: 'hangul-study',
    title: 'Hangul Study',
    description: 'Find consonants and vowels',
    level: 2,
    Component: HangulStudyGame,
  },
  {
    id: 'count-fruit',
    title: 'Count Fruit',
    description: 'Count the fruit and pick a number',
    level: 2,
    Component: CountFruitGame,
  },
  {
    id: 'tap-order',
    title: 'Tap in Order',
    description: 'Tap in the order shown',
    level: 2,
    Component: TapOrderGame,
  },
  {
    id: 'drag-fruit',
    title: 'Fruit Basket',
    description: 'Drag fruit into the basket',
    level: 2,
    Component: DragFruitGame,
  },
  {
    id: 'balloon-pop',
    title: 'Balloon Pop',
    description: 'Pop the balloons in the sky',
    level: 1,
    Component: BalloonPopGame,
  },
  {
    id: 'color-touch',
    title: 'Color Touch',
    description: 'Tap the matching color!',
    level: 1,
    Component: ColorTouchGame,
  },
  {
    id: 'animal-tap',
    title: 'Find Animals',
    description: 'Tap the matching animal!',
    level: 1,
    Component: AnimalTapGame,
  },
];

export function getGame(id: string) {
  return GAMES.find((game) => game.id === id);
}

export function getGameIds() {
  return GAMES.map((game) => game.id);
}

export function getPortalGames() {
  return GAMES.filter((game) => !game.hidden);
}

export function getLevelsDesc(): GameLevel[] {
  return [5, 4, 3, 2, 1];
}

export function getGamesByLevel(level: GameLevel) {
  return GAMES.filter((game) => game.level === level);
}

export type {GameMeta, GameModule, GameLevel} from './types';
