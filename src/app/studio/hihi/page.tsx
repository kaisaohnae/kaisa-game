'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {STUDIO_SECRET, STUDIO_URL} from '@/lib/pixellab/studio-config';
import {
  emptyPixellabCatalog,
  libraryCharacterUrl,
  type LibCharacterEntry,
  type PixellabLibraryCatalog,
} from '@/games/todie/content/pixellabLibrary';
import {
  emptyHihiCharactersCatalog,
  hihiCharacterPreviewUrl,
  hihiGenderFromTitle,
  isHihiOnlyCharacterTitle,
  type HihiCatalogCharacter,
  type HihiCharactersCatalog,
} from '@/lib/hihi-characters';
import '../studio.css';
import './hihi-studio.css';

type Filter = 'all' | 'M' | 'F';

function studioHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Studio-Secret': STUDIO_SECRET,
  };
}

/** Prefer Idle (or first) frame entry per groupId / title bucket */
function uniqueCandidates(chars: LibCharacterEntry[]): LibCharacterEntry[] {
  const byKey = new Map<string, LibCharacterEntry>();
  for (const c of chars) {
    // Hihi studio: only `남자:` / `여자:` titles
    if (!isHihiOnlyCharacterTitle(c.title)) continue;
    const key = c.groupId || `${c.title}::${c.name}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, c);
      continue;
    }
    const score = (x: LibCharacterEntry) => {
      const s = (x.stateName || '').toLowerCase();
      if (s === 'idle' || s.includes('idle')) return 3;
      if (s.includes('걷') || s.includes('walk')) return 2;
      return 1;
    };
    if (score(c) > score(prev)) byKey.set(key, c);
  }
  return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

export default function HihiStudioPage() {
  const [library, setLibrary] = useState<PixellabLibraryCatalog>(emptyPixellabCatalog());
  const [catalog, setCatalog] = useState<HihiCharactersCatalog>(emptyHihiCharactersCatalog());
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('');
  const [online, setOnline] = useState(true);

  const headers = useMemo(() => studioHeaders(), []);

  const load = useCallback(async () => {
    try {
      const [libRes, catRes] = await Promise.all([
        fetch(`${STUDIO_URL}/api/pixellab/library`, {headers}),
        fetch(`${STUDIO_URL}/api/hihi-characters`, {headers}),
      ]);
      if (!libRes.ok) throw new Error(`library ${libRes.status} — npm run studio 실행 여부/시크릿 확인`);
      const libData = await libRes.json();
      setLibrary({
        version: 1,
        objects: libData.objects ?? [],
        tiles: libData.tiles ?? [],
        characters: libData.characters ?? [],
      });
      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalog({
          version: 1,
          characters: Array.isArray(catData.characters) ? catData.characters : [],
        });
      }
      setOnline(true);
      setLog('');
    } catch (e) {
      setOnline(false);
      setLog(e instanceof Error ? e.message : String(e));
    }
  }, [headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const enabledMap = useMemo(() => {
    const m = new Map<string, HihiCatalogCharacter>();
    for (const c of catalog.characters) {
      if (c.enabled === false) continue;
      if (c.groupId) m.set(`g:${c.groupId}`, c);
      if (c.title) m.set(`t:${c.title}`, c);
      if (c.name) m.set(`n:${c.name}`, c);
    }
    return m;
  }, [catalog]);

  const unique = useMemo(() => uniqueCandidates(library.characters), [library.characters]);

  const candidates = useMemo(() => {
    if (filter === 'M') return unique.filter(c => hihiGenderFromTitle(c.title) === 'M');
    if (filter === 'F') return unique.filter(c => hihiGenderFromTitle(c.title) === 'F');
    return unique;
  }, [unique, filter]);

  const findSelected = (c: LibCharacterEntry) =>
    (c.groupId && enabledMap.get(`g:${c.groupId}`)) ||
    enabledMap.get(`t:${c.title}`) ||
    enabledMap.get(`n:${c.name}`);

  const toggle = (c: LibCharacterEntry, genderOverride?: 'M' | 'F' | null) => {
    setCatalog(prev => {
      const exists = prev.characters.find(
        x =>
          (c.groupId && x.groupId === c.groupId) ||
          (c.title && x.title === c.title) ||
          x.name === c.name
      );
      if (exists && exists.enabled !== false) {
        return {
          version: 1,
          characters: prev.characters.filter(x => x !== exists),
        };
      }
      const gender = genderOverride ?? hihiGenderFromTitle(c.title) ?? exists?.gender ?? null;
      const next: HihiCatalogCharacter = {
        name: c.name,
        title: c.title,
        remoteId: c.remoteId,
        frames: c.frames,
        groupId: c.groupId,
        stateName: c.stateName,
        gender,
        enabled: true,
      };
      const without = prev.characters.filter(
        x =>
          !(
            (c.groupId && x.groupId === c.groupId) ||
            (c.title && x.title === c.title) ||
            x.name === c.name
          )
      );
      return {version: 1, characters: [...without, next]};
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload: HihiCharactersCatalog = {
        version: 1,
        characters: catalog.characters
          .filter(c => c.enabled !== false)
          .map(c => ({...c, enabled: true})),
      };
      const res = await fetch(`${STUDIO_URL}/api/hihi-characters`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      setCatalog({
          version: 1,
          characters: Array.isArray(data.characters) ? data.characters : [],
        });
      setLog(
        `가져오기 완료 · ${data.count ?? payload.characters.length}명 → public/hihi/characters/` +
          (data.warnings?.length ? ` · 경고 ${data.warnings.length}` : '')
      );
    } catch (e) {
      setLog(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="studio hihi-studio">
      <header className="studio__head">
        <div>
          <h1>Hihi 캐릭터</h1>
          <p className="studio__hint">
            제목이 <code>남자:</code> / <code>여자:</code> 로 시작하는 PixelLab 캐릭터만 표시합니다. 선택 후{' '}
            <b>선택 가져오기</b>하면 idle·걷기모션이 <code>public/hihi/characters/</code> 로 복사됩니다.
          </p>
        </div>
        <div className="studio__files">
          <button type="button" className="studio__btn" disabled={busy} onClick={() => void load()}>
            새로고침
          </button>
          <button type="button" className="studio__btn studio__btn--primary" disabled={busy || !online} onClick={() => void save()}>
            {busy ? '가져오는 중…' : '선택 가져오기'}
          </button>
        </div>
      </header>

      {!online && (
        <p className="studio__warn-inline">
          스튜디오 서버 연결 실패. 터미널에서 <code>npm run studio</code> 실행 후 새로고침하세요.
        </p>
      )}
      {log && <p className="studio__hint">{log}</p>}

      <div className="hihi-studio__stats">
        <code>남자:/여자:</code> 캐릭터 <b>{unique.length}</b> · hihi 선택 <b>{enabledMap.size}</b>
        {unique.length === 0 && (
          <span className="hihi-studio__tip">
            {' '}
            · 아직 없어요. PixelLab에서 이름을 <code>남자: …</code> / <code>여자: …</code> 로 만든 뒤 에셋
            스튜디오에서 가져와 주세요.
          </span>
        )}
      </div>

      <div className="hihi-studio__filters">
        {(
          [
            ['all', '전체'],
            ['M', '남자:'],
            ['F', '여자:'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`studio__btn${filter === id ? ' studio__btn--primary' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        <span className="studio__hint">표시 {candidates.length}</span>
      </div>

      <div className="hihi-studio__grid">
        {candidates.map(c => {
          const selected = findSelected(c);
          const on = Boolean(selected);
          const gender = selected?.gender ?? hihiGenderFromTitle(c.title);
          const preview = c.frames?.[0] || 'south';
          const previewSrc =
            selected && selected.actions?.idle?.length
              ? hihiCharacterPreviewUrl(selected)
              : libraryCharacterUrl(c.name, preview);
          return (
            <div key={c.groupId || c.name} className={`hihi-studio__card${on ? ' is-on' : ''}`}>
              <button type="button" className="hihi-studio__pick" onClick={() => toggle(c, gender)}>
                <img src={previewSrc} alt="" draggable={false} />
                <strong>{c.title || '(제목 없음)'}</strong>
                <span>
                  {selected?.name || c.name}
                  {c.stateName ? ` · ${c.stateName}` : ''}
                  {gender ? ` · ${gender === 'M' ? '남' : '여'}` : ''}
                  {on && selected?.actions ? ' · 가져옴' : ''}
                </span>
                <em>{on ? '사용 중 (클릭 해제)' : '클릭하여 선택'}</em>
              </button>
            </div>
          );
        })}
        {!candidates.length && (
          <p className="studio__hint">
            {unique.length === 0
              ? '남자:/여자: 캐릭터가 없습니다. PixelLab에서 접두어 이름으로 만든 뒤 에셋 스튜디오에서 가져오세요.'
              : '이 필터에 해당하는 캐릭터가 없습니다.'}
          </p>
        )}
      </div>
    </main>
  );
}
