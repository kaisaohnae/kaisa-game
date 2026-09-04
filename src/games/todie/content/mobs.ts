/** @deprecated use content/monsters — kept as thin adapter for older imports */
export {
  loadMonsterImages as loadMobImages,
  monsterDrawSize as mobDrawSize,
  type MonsterImages,
} from './monsters';

export function mobSpriteKey(id: string, _elite?: boolean): string {
  return id;
}

export function mobSpriteUrl(id: string): string {
  return `/common/monsters/${id}/walk/south.png`;
}
