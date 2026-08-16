import type {GameLevel, GameModule} from './types';
import {AnimalTapGame} from './level1/animal-tap';
import {BalloonPopGame} from './level1/balloon-pop';
import {ColorTouchGame} from './level1/color-touch';
import {CountFruitGame} from './level2/count-fruit';
import {DragFruitGame} from './level2/drag-fruit';
import {MemoryCardsGame} from './level2/memory-cards';
import {MoveBuddyGame} from './level2/move-buddy';
import {ShapeMatchGame} from './level2/shape-match';
import {TapOrderGame} from './level2/tap-order';
import {MazePadGame} from './level3/maze-pad';
import {PatternCopyGame} from './level3/pattern-copy';
import {ShadowMatchGame} from './level3/shadow-match';
import {HangulStudyGame} from './level4/hangul-study';
import {NumberStudyGame} from './level4/number-study';
import {AddPlayGame} from './level5/add-play';
import {SubPlayGame} from './level5/sub-play';
import {HeroQuestGame} from './level6/hero-quest';
import {MagicGardenGame} from './level6/magic-garden';
import {PetCareGame} from './level6/pet-care';

/** 새 게임 추가 시 level 폴더 + 여기만 등록 */
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
    id: 'shadow-match',
    title: '그림자 찾기',
    description: '그림자 주인을 맞춰요',
    level: 3,
    Component: ShadowMatchGame,
  },
  {
    id: 'number-study',
    title: '숫자 공부',
    description: '같은 숫자를 찾아요',
    level: 4,
    Component: NumberStudyGame,
  },
  {
    id: 'hangul-study',
    title: '한글 공부',
    description: '자음·모음을 찾아요',
    level: 4,
    Component: HangulStudyGame,
  },
  {
    id: 'add-play',
    title: '덧셈 놀이',
    description: '더하기 답을 골라요',
    level: 5,
    Component: AddPlayGame,
  },
  {
    id: 'sub-play',
    title: '뺄셈 놀이',
    description: '빼기 답을 골라요',
    level: 5,
    Component: SubPlayGame,
  },
  {
    id: 'pet-care',
    title: '펫 키우기',
    description: '밥을 주고 키워봐요',
    level: 6,
    Component: PetCareGame,
  },
  {
    id: 'hero-quest',
    title: '영웅 모험',
    description: '싸워서 레벨을 올려요',
    level: 6,
    Component: HeroQuestGame,
  },
  {
    id: 'magic-garden',
    title: '마법 정원',
    description: '심고 키우고 수확해요',
    level: 6,
    Component: MagicGardenGame,
  },
];

export function getGame(id: string) {
  return GAMES.find((game) => game.id === id);
}

export function getGameIds() {
  return GAMES.map((game) => game.id);
}

/** ★★★★★★ → ★ */
export function getLevelsDesc(): GameLevel[] {
  return [6, 5, 4, 3, 2, 1];
}

export function getGamesByLevel(level: GameLevel) {
  return GAMES.filter((game) => game.level === level);
}

export type {GameMeta, GameModule, GameLevel} from './types';
