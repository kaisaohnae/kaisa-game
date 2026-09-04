/**
 * Sync game assets:
 * - Monsters: pixellab-characters → public/common/monsters/{en_title}/{walk|attack|idle}
 * - Protagonists: pixellab 「주인공: 검사/법사」 Idle·걷기·공격 → public/common/characters/{warrior|mage}
 *   (roll은 PixelLab에 없으면 walk 복제)
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const settings = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/games/todie/settings/settings.json'), 'utf8'),
);
const pixCat = JSON.parse(
  fs.readFileSync(path.join(ROOT, settings.paths.pixellabCatalog), 'utf8'),
);

const DIRS = [
  'south',
  'west',
  'east',
  'north',
  'south-east',
  'north-east',
  'north-west',
  'south-west',
];

/** Korean title → English folder / en_title */
const EN_TITLE_BY_KO = {
  '몬스터: 해골 전사': 'skeleton-warrior',
  '몬스터: 어둠의 마법사': 'dark-mage',
  '몬스터: 오크': 'orc',
  '몬스터: 코뿔소': 'rhino',
  '몬스터: 나무의 정령': 'tree-spirit',
  '몬스터: 정예 늑대인간': 'elite-werewolf',
  '몬스터: 정예 사자 인간': 'elite-lion-human',
  '몬스터: 정예 물의 골렘': 'elite-water-golem',
  '몬스터: 정예 어둠의 악마': 'elite-dark-demon',
  '몬스터: 정예 사자': 'elite-lion',
  '몬스터: 정예 피의 골렘': 'elite-blood-golem',
  '몬스터: 보스 죽음의 파괴자': 'boss-death-destroyer',
  '몬스터: 보스 전쟁의 왕': 'boss-war-king',
  '몬스터: 최종 관문의 수호자': 'final-gate-guardian',
  '몬스터: 해골 궁수': 'skeleton-archer',
  '몬스터: 피의 마법사': 'blood-mage',
  '몬스터: 최종 죽음의 왕': 'final-death-king',
};

/**
 * @param {string} title
 * @param {string} [enFromSettings]
 */
function englishIdForTitle(title, enFromSettings) {
  const mapped = (enFromSettings && String(enFromSettings).trim()) || EN_TITLE_BY_KO[title];
  if (mapped) return {enTitle: mapped, id: mapped};
  const fallback = title
    .replace(/^몬스터:\s*/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const id = fallback || `monster-${Buffer.from(title).toString('hex').slice(0, 8)}`;
  return {enTitle: id, id};
}

/** @param {string} title */
function resolveTitle(title) {
  return settings.titleAliases?.[title] ?? title;
}

/** @param {string} title */
function tierOfTitle(title) {
  if (title.startsWith('몬스터: 최종')) return 'final';
  if (title.startsWith('몬스터: 보스')) return 'boss';
  if (title.startsWith('몬스터: 정예')) return 'elite';
  if (title.startsWith('몬스터:')) return 'normal';
  return 'normal';
}

/** @type {Map<string, object[]>} */
const byTitle = new Map();
for (const c of pixCat.characters ?? []) {
  const t = c.title || '';
  if (!byTitle.has(t)) byTitle.set(t, []);
  byTitle.get(t).push(c);
}

/**
 * @param {string} title
 * @param {string[]} stateNames
 */
function pickState(title, stateNames) {
  const rows = byTitle.get(title) ?? [];
  for (const want of stateNames) {
    const hit = rows.find((r) => r.stateName === want);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {string} characterName
 * @param {string} destDir
 */
function copyPixFrames(characterName, destDir) {
  const srcDir = path.join(ROOT, 'public/pixellab-characters', characterName);
  fs.mkdirSync(destDir, {recursive: true});
  let n = 0;
  for (const dir of DIRS) {
    const src = path.join(srcDir, `${dir}.png`);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(destDir, `${dir}.png`));
    n += 1;
  }
  return n;
}

// ── Monsters ──────────────────────────────────────────────
const monstersRoot = path.join(ROOT, 'public/common/monsters');
fs.rmSync(monstersRoot, {recursive: true, force: true});
fs.mkdirSync(monstersRoot, {recursive: true});

const idleStates = settings.states.idle ?? ['Idle'];
/** @type {object[]} */
const monsterEntries = [];
/** @type {Map<string, string>} */
const enTitleFromSettings = new Map();
/** @type {Set<string>} */
const neededTitles = new Set();
for (const stage of Object.values(settings.stages)) {
  for (const m of stage.monsters) {
    neededTitles.add(m.title);
    if (m.en_title) enTitleFromSettings.set(m.title, m.en_title);
  }
}

const missing = [];
for (const title of [...neededTitles].sort()) {
  const resolved = resolveTitle(title);
  const walk = pickState(resolved, settings.states.walk);
  const attack = pickState(resolved, settings.states.attack);
  const idle = pickState(resolved, idleStates);
  if (!walk || !attack) {
    missing.push({
      title,
      resolved,
      walk: walk?.name ?? null,
      attack: attack?.name ?? null,
      idle: idle?.name ?? null,
      available: (byTitle.get(resolved) ?? []).map((r) => r.stateName),
    });
    continue;
  }
  const {enTitle, id} = englishIdForTitle(title, enTitleFromSettings.get(title));
  const walkN = copyPixFrames(walk.name, path.join(monstersRoot, id, 'walk'));
  const atkN = copyPixFrames(attack.name, path.join(monstersRoot, id, 'attack'));
  // Idle 없으면 walk 포즈를 idle로 복사
  const idleN = idle
    ? copyPixFrames(idle.name, path.join(monstersRoot, id, 'idle'))
    : copyPixFrames(walk.name, path.join(monstersRoot, id, 'idle'));
  monsterEntries.push({
    id,
    title,
    en_title: enTitle,
    catalogTitle: resolved,
    tier: tierOfTitle(title),
    walkFrom: walk.name,
    walkState: walk.stateName,
    attackFrom: attack.name,
    attackState: attack.stateName,
    idleFrom: idle?.name ?? walk.name,
    idleState: idle?.stateName ?? 'Idle',
    frames: DIRS,
    walkFrames: walkN,
    attackFrames: atkN,
    idleFrames: idleN,
  });
  console.log(
    `monster OK  ${title} → ${id} (walk=${walk.name}, atk=${attack.name}, idle=${idle?.name ?? walk.name + '(walk)'})`,
  );
}

fs.writeFileSync(
  path.join(monstersRoot, 'catalog.json'),
  `${JSON.stringify({version: 1, monsters: monsterEntries}, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(ROOT, 'src/games/todie/settings/monsters.catalog.json'),
  `${JSON.stringify({version: 1, monsters: monsterEntries}, null, 2)}\n`,
);

// ── Protagonists: PixelLab 주인공 → common/characters ─────
const charsRoot = path.join(ROOT, 'public/common/characters');
fs.rmSync(charsRoot, {recursive: true, force: true});
fs.mkdirSync(charsRoot, {recursive: true});

const protagonists = settings.protagonists ?? {
  warrior: {title: '주인공: 검사', folder: 'warrior'},
  mage: {title: '주인공: 법사', folder: 'mage'},
};

/** @type {object[]} */
const characterEntries = [];
/** @type {object[]} */
const characterMissing = [];

for (const [jobKey, cfg] of Object.entries(protagonists)) {
  const title = cfg.title ?? '';
  const folder = cfg.folder ?? jobKey;
  const walk = pickState(title, settings.states.walk);
  const attack = pickState(title, settings.states.attack);
  const idle = pickState(title, idleStates);
  if (!walk || !attack || !idle) {
    characterMissing.push({
      job: jobKey,
      title,
      walk: walk?.name ?? null,
      attack: attack?.name ?? null,
      idle: idle?.name ?? null,
      available: (byTitle.get(title) ?? []).map((r) => r.stateName),
    });
    continue;
  }
  const idleN = copyPixFrames(idle.name, path.join(charsRoot, folder, 'idle'));
  const walkN = copyPixFrames(walk.name, path.join(charsRoot, folder, 'walk'));
  const atkN = copyPixFrames(attack.name, path.join(charsRoot, folder, 'attack'));
  // roll 스테이트 없음 → walk 복제
  const rollN = copyPixFrames(walk.name, path.join(charsRoot, folder, 'roll'));
  characterEntries.push({
    id: folder,
    job: cfg.job ?? jobKey,
    title,
    idleFrom: idle.name,
    idleState: idle.stateName,
    walkFrom: walk.name,
    walkState: walk.stateName,
    attackFrom: attack.name,
    attackState: attack.stateName,
    rollFrom: walk.name,
    rollState: `${walk.stateName} (roll fallback)`,
    frames: DIRS,
    idleFrames: idleN,
    walkFrames: walkN,
    attackFrames: atkN,
    rollFrames: rollN,
  });
  console.log(
    `character OK ${folder} ← ${title} (idle=${idle.name}, walk=${walk.name}, atk=${attack.name}, roll=${walk.name})`,
  );
}

fs.writeFileSync(
  path.join(charsRoot, 'catalog.json'),
  `${JSON.stringify({version: 1, characters: characterEntries}, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(ROOT, 'src/games/todie/settings/characters.catalog.json'),
  `${JSON.stringify({version: 1, characters: characterEntries}, null, 2)}\n`,
);

if (missing.length) {
  console.log('\nMISSING monsters (skipped):');
  for (const m of missing) {
    console.log(
      `- ${m.title} [resolved=${m.resolved}] states=${(m.available || []).join(',') || '∅'}`,
    );
  }
}
if (characterMissing.length) {
  console.log('\nMISSING protagonists (skipped):');
  for (const m of characterMissing) {
    console.log(
      `- ${m.job} ${m.title} states=${(m.available || []).join(',') || '∅'}`,
    );
  }
}

console.log(
  `\nDone: ${monsterEntries.length} monsters, ${characterEntries.length} protagonists from pixellab, missing monsters=${missing.length} protagonists=${characterMissing.length}`,
);
