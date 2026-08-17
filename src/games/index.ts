import type {GameLevel, GameModule} from './types';
import {AnimalTapGame} from './level1/animal-tap';
import {BalloonPopGame} from './level1/balloon-pop';
import {ColorTouchGame} from './level1/color-touch';
import {CountFruitGame} from './level2/count-fruit';
import {DragFruitGame} from './level2/drag-fruit';
import {MemoryCardsGame} from './level2/memory-cards';
import {TapOrderGame} from './level2/tap-order';
import {MazePadGame} from './level3/maze-pad';
import {PatternCopyGame} from './level3/pattern-copy';
import {HangulStudyGame} from './level4/hangul-study';
import {AddPlayGame} from './level5/add-play';
import {SubPlayGame} from './level5/sub-play';
import {TodieGame} from './todie';

/**
 * ★ 바로 콕 · ★★ 조작·학습 · ★★★ 기억·연산 · ★★★★★ todie
 * (모양맞추기·그림자찾기·숫자공부는 중복으로 제외)
 */
export const GAMES: GameModule[] = [
  {
    id: 'todie',
    title: 'todie',
    description: 'WASD로 탐험하고 싸워요',
    level: 5,
    Component: TodieGame,
  },
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
    id: 'count-fruit',
    title: '과일 세기',
    description: '과일을 세고 숫자를 골라요',
    level: 2,
    Component: CountFruitGame,
  },
  {
    id: 'hangul-study',
    title: '한글 공부',
    description: '자음·모음을 찾아요',
    level: 2,
    Component: HangulStudyGame,
  },
  {
    id: 'memory-cards',
    title: '짝꿍 찾기',
    description: '뒤집어서 같은 그림을 맞춰요',
    level: 3,
    Component: MemoryCardsGame,
  },
  {
    id: 'maze-pad',
    title: '미로 탐험',
    description: '화살표로 길을 찾아가요',
    level: 3,
    Component: MazePadGame,
  },
  {
    id: 'pattern-copy',
    title: '반짝 따라하기',
    description: '색깔 순서를 기억해요',
    level: 3,
    Component: PatternCopyGame,
  },
  {
    id: 'add-play',
    title: '덧셈 놀이',
    description: '더하기 답을 골라요',
    level: 3,
    Component: AddPlayGame,
  },
  {
    id: 'sub-play',
    title: '뺄셈 놀이',
    description: '빼기 답을 골라요',
    level: 3,
    Component: SubPlayGame,
  },
];

export function getGame(id: string) {
  return GAMES.find((game) => game.id === id);
}

export function getGameIds() {
  return GAMES.map((game) => game.id);
}

export function getLevelsDesc(): GameLevel[] {
  return [5, 4, 3, 2, 1];
}

export function getGamesByLevel(level: GameLevel) {
  return GAMES.filter((game) => game.level === level);
}

export type {GameMeta, GameModule, GameLevel} from './types';
