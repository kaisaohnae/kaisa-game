import type {ComponentType} from 'react';
import type {SvgProps} from './faces';
import {
  AnimalBear,
  AnimalCat,
  AnimalChick,
  AnimalCow,
  AnimalDog,
  AnimalFox,
  AnimalFrog,
  AnimalLion,
  AnimalMonkey,
  AnimalPanda,
  AnimalPig,
  AnimalRabbit,
  AnimalTiger,
} from './animals';
import {
  ColorBlue,
  ColorGreen,
  ColorOrange,
  ColorRed,
  ColorYellow,
  FruitApple,
  FruitBanana,
  FruitGrape,
  FruitOrange,
  FruitPeach,
  FruitStrawberry,
  FruitWatermelon,
  ShapeCircle,
  ShapeDiamond,
  ShapeHeart,
  ShapeSquare,
  ShapeStar,
  ShapeTriangle,
} from './fruits-shapes';
import {
  ItemBalloon,
  ItemBasket,
  ItemBook,
  ItemCandy,
  ItemCoin,
  ItemFinger,
  ItemFlower,
  ItemMap,
  ItemMinus,
  ItemPalette,
  ItemParty,
  ItemPlant,
  ItemPlus,
  ItemQuestion,
  ItemSparkle,
  ItemSword,
  ItemTeddy,
} from './items';
import {
  MonsterBat,
  MonsterDragon,
  MonsterSlime,
  MonsterWolf,
} from './monsters';

export type KidsIconId =
  | 'animal-cat'
  | 'animal-dog'
  | 'animal-rabbit'
  | 'animal-bear'
  | 'animal-frog'
  | 'animal-chick'
  | 'animal-fox'
  | 'animal-panda'
  | 'animal-pig'
  | 'animal-monkey'
  | 'animal-cow'
  | 'animal-lion'
  | 'animal-tiger'
  | 'fruit-apple'
  | 'fruit-banana'
  | 'fruit-grape'
  | 'fruit-orange'
  | 'fruit-strawberry'
  | 'fruit-peach'
  | 'fruit-watermelon'
  | 'shape-circle'
  | 'shape-square'
  | 'shape-triangle'
  | 'shape-star'
  | 'shape-heart'
  | 'shape-diamond'
  | 'color-red'
  | 'color-blue'
  | 'color-yellow'
  | 'color-green'
  | 'color-orange'
  | 'item-balloon'
  | 'item-candy'
  | 'item-flower'
  | 'item-teddy'
  | 'item-coin'
  | 'item-sparkle'
  | 'item-party'
  | 'item-question'
  | 'item-palette'
  | 'item-basket'
  | 'item-map'
  | 'item-sword'
  | 'item-book'
  | 'item-plus'
  | 'item-minus'
  | 'item-finger'
  | 'item-plant'
  | 'monster-slime'
  | 'monster-bat'
  | 'monster-wolf'
  | 'monster-dragon';

type IconEntry = {
  id: KidsIconId;
  label: string;
  category: 'animal' | 'fruit' | 'shape' | 'color' | 'item' | 'monster';
  Component: ComponentType<SvgProps>;
};

function entry(
  id: KidsIconId,
  label: string,
  category: IconEntry['category'],
  Component: ComponentType<SvgProps>,
): IconEntry {
  return {id, label, category, Component};
}

/** Central catalog — add new SVGs here, then use <KidsIcon id="..." />. */
export const KIDS_ICON_REGISTRY: Record<KidsIconId, IconEntry> = {
  'animal-cat': entry('animal-cat', '고양이', 'animal', AnimalCat),
  'animal-dog': entry('animal-dog', '강아지', 'animal', AnimalDog),
  'animal-rabbit': entry('animal-rabbit', '토끼', 'animal', AnimalRabbit),
  'animal-bear': entry('animal-bear', '곰', 'animal', AnimalBear),
  'animal-frog': entry('animal-frog', '개구리', 'animal', AnimalFrog),
  'animal-chick': entry('animal-chick', '병아리', 'animal', AnimalChick),
  'animal-fox': entry('animal-fox', '여우', 'animal', AnimalFox),
  'animal-panda': entry('animal-panda', '팬더', 'animal', AnimalPanda),
  'animal-pig': entry('animal-pig', '돼지', 'animal', AnimalPig),
  'animal-monkey': entry('animal-monkey', '원숭이', 'animal', AnimalMonkey),
  'animal-cow': entry('animal-cow', '소', 'animal', AnimalCow),
  'animal-lion': entry('animal-lion', '사자', 'animal', AnimalLion),
  'animal-tiger': entry('animal-tiger', '호랑이', 'animal', AnimalTiger),

  'fruit-apple': entry('fruit-apple', '사과', 'fruit', FruitApple),
  'fruit-banana': entry('fruit-banana', '바나나', 'fruit', FruitBanana),
  'fruit-grape': entry('fruit-grape', '포도', 'fruit', FruitGrape),
  'fruit-orange': entry('fruit-orange', '귤', 'fruit', FruitOrange),
  'fruit-strawberry': entry('fruit-strawberry', '딸기', 'fruit', FruitStrawberry),
  'fruit-peach': entry('fruit-peach', '복숭아', 'fruit', FruitPeach),
  'fruit-watermelon': entry('fruit-watermelon', '수박', 'fruit', FruitWatermelon),

  'shape-circle': entry('shape-circle', '동그라미', 'shape', ShapeCircle),
  'shape-square': entry('shape-square', '네모', 'shape', ShapeSquare),
  'shape-triangle': entry('shape-triangle', '세모', 'shape', ShapeTriangle),
  'shape-star': entry('shape-star', '별', 'shape', ShapeStar),
  'shape-heart': entry('shape-heart', '하트', 'shape', ShapeHeart),
  'shape-diamond': entry('shape-diamond', '다이아', 'shape', ShapeDiamond),

  'color-red': entry('color-red', '빨강', 'color', ColorRed),
  'color-blue': entry('color-blue', '파랑', 'color', ColorBlue),
  'color-yellow': entry('color-yellow', '노랑', 'color', ColorYellow),
  'color-green': entry('color-green', '초록', 'color', ColorGreen),
  'color-orange': entry('color-orange', '주황', 'color', ColorOrange),

  'item-balloon': entry('item-balloon', '풍선', 'item', ItemBalloon),
  'item-candy': entry('item-candy', '사탕', 'item', ItemCandy),
  'item-flower': entry('item-flower', '꽃', 'item', ItemFlower),
  'item-teddy': entry('item-teddy', '인형', 'item', ItemTeddy),
  'item-coin': entry('item-coin', '코인', 'item', ItemCoin),
  'item-sparkle': entry('item-sparkle', '반짝', 'item', ItemSparkle),
  'item-party': entry('item-party', '축하', 'item', ItemParty),
  'item-question': entry('item-question', '물음표', 'item', ItemQuestion),
  'item-palette': entry('item-palette', '팔레트', 'item', ItemPalette),
  'item-basket': entry('item-basket', '바구니', 'item', ItemBasket),
  'item-map': entry('item-map', '지도', 'item', ItemMap),
  'item-sword': entry('item-sword', '검', 'item', ItemSword),
  'item-book': entry('item-book', '책', 'item', ItemBook),
  'item-plus': entry('item-plus', '더하기', 'item', ItemPlus),
  'item-minus': entry('item-minus', '빼기', 'item', ItemMinus),
  'item-finger': entry('item-finger', '손가락', 'item', ItemFinger),
  'item-plant': entry('item-plant', '새싹', 'item', ItemPlant),

  'monster-slime': entry('monster-slime', '슬라임', 'monster', MonsterSlime),
  'monster-bat': entry('monster-bat', '박쥐', 'monster', MonsterBat),
  'monster-wolf': entry('monster-wolf', '늑대', 'monster', MonsterWolf),
  'monster-dragon': entry('monster-dragon', '아기용', 'monster', MonsterDragon),
};

export const ANIMAL_ICON_IDS = [
  'animal-cat',
  'animal-dog',
  'animal-rabbit',
  'animal-bear',
  'animal-frog',
  'animal-chick',
  'animal-fox',
  'animal-panda',
  'animal-pig',
  'animal-monkey',
  'animal-cow',
  'animal-lion',
  'animal-tiger',
] as const satisfies readonly KidsIconId[];

export const FRUIT_ICON_IDS = [
  'fruit-apple',
  'fruit-banana',
  'fruit-grape',
  'fruit-orange',
  'fruit-strawberry',
  'fruit-peach',
  'fruit-watermelon',
] as const satisfies readonly KidsIconId[];

export const GAME_CARD_ICONS: Record<string, KidsIconId> = {
  todie: 'item-sword',
  baduk: 'shape-circle',
  janggi: 'shape-diamond',
  chess: 'shape-square',
  'animal-tap': 'animal-dog',
  'color-touch': 'item-palette',
  'balloon-pop': 'item-balloon',
  'drag-fruit': 'item-basket',
  'tap-order': 'item-finger',
  'count-fruit': 'fruit-apple',
  'memory-cards': 'shape-star',
  'maze-pad': 'item-map',
  'pattern-copy': 'item-sparkle',
  'picture-puzzle': 'item-teddy',
  'hangul-study': 'item-book',
  'add-play': 'item-plus',
  'sub-play': 'item-minus',
};

export function getKidsIcon(id: KidsIconId) {
  return KIDS_ICON_REGISTRY[id];
}

export function isKidsIconId(value: string): value is KidsIconId {
  return value in KIDS_ICON_REGISTRY;
}
