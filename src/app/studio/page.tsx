'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {STUDIO_SECRET, STUDIO_URL} from '@/lib/pixellab/studio-config';
import PixelLabImportPanel from './pixellab-import-panel';
import './studio.css';

const CATEGORY_LABEL: Record<string, string> = {
  all: '전체',
  character: '캐릭터',
  mob: '몬스터',
  tile: '타일',
  item: '소모품',
  gear: '장비',
  vehicle: '차량',
  obstacle: '장애물',
  object: '맵오브젝트',
  'player-plane': '플레이어기',
  'enemy-plane': '적기',
  fx: '이펙트',
  projectile: '발사체',
  'weapon-item': '무기아이템',
};

const GAME_TABS: {id: StudioGame; label: string}[] = [
  {id: 'todie', label: 'Todie'},
  {id: 'car-run', label: '자동차'},
  {id: 'plane-shoot', label: '비행기 슈팅'},
];

type QueueStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

type StudioGame = 'todie' | 'car-run' | 'plane-shoot';

type ManifestRow = {
  id: string;
  game: StudioGame;
  category: string;
  label: string;
  type: string;
  costsGenerations?: boolean;
  previewUrl?: string;
  description?: string;
  defaultDescription?: string;
  edited?: boolean;
  fileInstall?: {path: string};
  queue: {id: string; status: QueueStatus; message?: string; outputPath?: string};
};

type Balance = {
  credits?: {usd?: number};
  subscription?: {plan?: string; generations?: number; total?: number};
};

function emptyGameCounts(): Record<StudioGame, number> {
  return {todie: 0, 'car-run': 0, 'plane-shoot': 0};
}

function rowPreviewUrl(row: ManifestRow) {
  if (row.previewUrl) return row.previewUrl;
  const path = row.fileInstall?.path?.replace(/\\/g, '/');
  if (path?.startsWith('public/')) return `/${path.slice('public/'.length)}`;
  return undefined;
}

function AssetThumb({src, label}: {src?: string; label: string}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="studio__thumb studio__thumb--empty" aria-hidden />;
  }
  return (
    <span className="studio__thumb">
      <img
        src={src}
        alt=""
        title={label}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export default function StudioPage() {
  const [online, setOnline] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState(STUDIO_SECRET);
  const [log, setLog] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [gameFilter, setGameFilter] = useState<StudioGame>('todie');
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [promptSaving, setPromptSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 80));
  }, []);

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'X-Studio-Secret': secretInput,
    }),
    [secretInput],
  );

  const refresh = useCallback(async () => {
    try {
      const health = await fetch(`${STUDIO_URL}/api/health`);
      const h = await health.json();
      setOnline(Boolean(h.ok));
      setHasApiKey(Boolean(h.hasApiKey));

      const man = await fetch(`${STUDIO_URL}/api/manifest`, {headers});
      if (!man.ok) throw new Error(`manifest ${man.status}`);
      const data = await man.json();
      const byId = new Map(
        (
          data.items as
            | {
                id: string;
                previewUrl?: string;
                description?: string;
                defaultDescription?: string;
                edited?: boolean;
              }[]
            | undefined
        )?.map((i) => [i.id, i]) ?? [],
      );
      const queueRows = (data.queue ?? []) as ManifestRow[];
      setRows(
        queueRows.map((row) => {
          const meta = byId.get(row.id);
          return {
            ...row,
            previewUrl: row.previewUrl ?? meta?.previewUrl ?? rowPreviewUrl(row),
            description: row.description ?? meta?.description ?? '',
            defaultDescription: row.defaultDescription ?? meta?.defaultDescription ?? '',
            edited: row.edited ?? meta?.edited ?? false,
          };
        }),
      );
      setRunning(Boolean(data.running));

      if (h.hasApiKey) {
        const bal = await fetch(`${STUDIO_URL}/api/balance`, {headers});
        if (bal.ok) setBalance(await bal.json());
      }
    } catch (e) {
      setOnline(false);
      pushLog(e instanceof Error ? e.message : String(e));
    }
  }, [headers, pushLog]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!online || !secretInput) return;
    const es = new EventSource(
      `${STUDIO_URL}/api/events?secret=${encodeURIComponent(secretInput)}`,
    );
    es.onmessage = () => void refresh();
    return () => es.close();
  }, [online, secretInput, refresh]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    pushLog(`run ${ids.length} jobs…`);
    const res = await fetch(`${STUDIO_URL}/api/queue/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ids}),
    });
    const data = await res.json();
    if (!res.ok) pushLog(data.error ?? 'run failed');
    else pushLog('queued');
    void refresh();
  };

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    const res = await fetch(`${STUDIO_URL}/api/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify({apiKey: apiKeyInput.trim()}),
    });
    const data = await res.json();
    if (!res.ok) pushLog(data.error ?? 'save key failed');
    else {
      pushLog('API key saved to .env.local');
      setApiKeyInput('');
      void refresh();
    }
  };

  const openPrompt = (row: ManifestRow) => {
    if (!row.description && !row.defaultDescription && row.type === 'sync_character') {
      pushLog(`${row.id}: sync_character 는 프롬프트 없음`);
      return;
    }
    setPromptId(row.id);
    setPromptDraft(row.description || row.defaultDescription || '');
  };

  const closePrompt = () => {
    setPromptId(null);
    setPromptDraft('');
  };

  const savePrompt = async () => {
    if (!promptId) return;
    setPromptSaving(true);
    try {
      const res = await fetch(`${STUDIO_URL}/api/prompts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({id: promptId, description: promptDraft}),
      });
      const data = await res.json();
      if (!res.ok) {
        pushLog(data.error ?? 'prompt save failed');
        return;
      }
      pushLog(`prompt saved → .pixellab-studio/prompts.json (${promptId})`);
      setRows((prev) =>
        prev.map((r) =>
          r.id === promptId
            ? {
                ...r,
                description: promptDraft,
                edited: promptDraft !== (r.defaultDescription ?? ''),
              }
            : r,
        ),
      );
      closePrompt();
    } finally {
      setPromptSaving(false);
    }
  };

  const resetPromptDraft = () => {
    const row = rows.find((r) => r.id === promptId);
    if (!row) return;
    setPromptDraft(row.defaultDescription || '');
  };

  const gameRows = useMemo(
    () => rows.filter((r) => r.game === gameFilter),
    [rows, gameFilter],
  );

  const categoryOptions = useMemo(() => {
    const cats = new Set(gameRows.map((r) => r.category));
    const preferred = Object.keys(CATEGORY_LABEL).filter((c) => c !== 'all' && cats.has(c));
    const rest = Array.from(cats)
      .filter((c) => !preferred.includes(c))
      .sort();
    return ['all', ...preferred, ...rest];
  }, [gameRows]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {all: gameRows.length};
    for (const row of gameRows) {
      counts[row.category] = (counts[row.category] ?? 0) + 1;
    }
    return counts;
  }, [gameRows]);

  const categoryIncomplete = useMemo(() => {
    const counts: Record<string, number> = {all: 0};
    for (const row of gameRows) {
      if (row.queue.status === 'completed') continue;
      counts.all += 1;
      counts[row.category] = (counts[row.category] ?? 0) + 1;
    }
    return counts;
  }, [gameRows]);

  const filtered = gameRows
    .filter((r) => filter === 'all' || r.category === filter)
    .sort((a, b) => {
      const aDone = a.queue.status === 'completed' ? 1 : 0;
      const bDone = b.queue.status === 'completed' ? 1 : 0;
      return aDone - bDone;
    });

  const incompleteInView = useMemo(
    () => filtered.filter((r) => r.queue.status !== 'completed'),
    [filtered],
  );

  const selectIncomplete = () => {
    setSelected(new Set(incompleteInView.map((r) => r.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const gameCounts = useMemo(() => {
    const counts = emptyGameCounts();
    for (const row of rows) counts[row.game] += 1;
    return counts;
  }, [rows]);

  const gameIncomplete = useMemo(() => {
    const counts = emptyGameCounts();
    for (const row of rows) {
      if (row.queue.status !== 'completed') counts[row.game] += 1;
    }
    return counts;
  }, [rows]);

  const switchGame = (game: StudioGame) => {
    setGameFilter(game);
    setFilter('all');
    setSelected(new Set());
  };

  const switchCategory = (cat: string) => {
    setFilter(cat);
    setSelected(new Set());
  };

  const editingRow = promptId ? rows.find((r) => r.id === promptId) : null;
  const genLeft = balance?.subscription?.generations;
  const activeTabId = `studio-tab-${gameFilter}`;

  return (
    <main className="studio">
      <header className="studio__header">
        <div className="studio__status">
          <span className={online ? 'studio__dot studio__dot--ok' : 'studio__dot'} />
          {online ? 'Studio online' : 'Studio offline — npm run studio'}
          {hasApiKey && genLeft != null && (
            <span className="studio__gens">Generations: {Math.floor(genLeft)}</span>
          )}
        </div>
      </header>

      {!online && (
        <section className="studio__panel studio__warn">
          <p>
            터미널에서 <code>npm run studio</code> 를 실행한 뒤 이 페이지를 새로고침하세요.
          </p>
        </section>
      )}

      <section className="studio__panel">
        <button
          type="button"
          className="studio__lib-acc-head"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <span>{settingsOpen ? '▾' : '▸'}</span> 설정
        </button>
        {settingsOpen && (
          <div className="studio__lib-acc-body">
            <div className="studio__form">
              <label>
                Studio Secret
                <input
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="STUDIO_SECRET (.env.local)"
                />
              </label>
              <label>
                PixelLab API Key
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={hasApiKey ? '•••••••• (saved)' : 'Paste API key'}
                />
              </label>
              <button type="button" className="studio__btn" onClick={() => void saveApiKey()}>
                API Key 저장
              </button>
            </div>
          </div>
        )}
      </section>

      {online && (
        <PixelLabImportPanel
          headers={headers}
          online={online}
          hasApiKey={hasApiKey}
          onLog={pushLog}
        />
      )}

      <section className="studio__workspace">
        <div className="studio__tab-bar" role="tablist" aria-label="게임 선택">
          {GAME_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`studio-tab-${tab.id}`}
              aria-selected={gameFilter === tab.id}
              aria-controls="studio-panel-assets"
              className={`studio__tab${gameFilter === tab.id ? ' studio__tab--active' : ''}`}
              onClick={() => switchGame(tab.id)}
            >
              <span className="studio__tab-label">{tab.label}</span>
              <span className="studio__tab-meta">
                <span className="studio__tab-count">{gameCounts[tab.id]}</span>
                {gameIncomplete[tab.id] > 0 && (
                  <span className="studio__tab-badge">{gameIncomplete[tab.id]} 남음</span>
                )}
              </span>
            </button>
          ))}
        </div>

        <div
          id="studio-panel-assets"
          role="tabpanel"
          aria-labelledby={activeTabId}
          className="studio__tab-panel"
        >
          <div className="studio__toolbar">
            <button type="button" className="studio__btn studio__btn--primary" onClick={() => void runSelected()}>
              선택 실행 ({selected.size})
            </button>
            <button
              type="button"
              className="studio__btn"
              onClick={selectIncomplete}
              disabled={incompleteInView.length === 0}
            >
              미완료 전체선택 ({incompleteInView.length})
            </button>
            <button type="button" className="studio__btn" onClick={clearSelection} disabled={selected.size === 0}>
              선택 해제
            </button>
            <button type="button" className="studio__btn" onClick={() => void refresh()}>
              새로고침
            </button>
          </div>

          <div className="studio__cat-tabs" role="tablist" aria-label="에셋 종류">
            {categoryOptions.map((cat) => {
              const active = filter === cat;
              const incomplete = categoryIncomplete[cat] ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`studio__cat-tab${active ? ' studio__cat-tab--active' : ''}`}
                  onClick={() => switchCategory(cat)}
                >
                  <span className="studio__cat-tab-label">{CATEGORY_LABEL[cat] ?? cat}</span>
                  <span className="studio__cat-tab-count">{categoryCounts[cat] ?? 0}</span>
                  {incomplete > 0 && (
                    <span className="studio__cat-tab-badge">{incomplete}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="studio__tab-panel-head">
            <h2>{CATEGORY_LABEL[filter] ?? filter}</h2>
            <span className="studio__tab-panel-sub">{filtered.length}개</span>
            {running && <span className="studio__running">실행 중…</span>}
          </div>

          <ul className="studio__list">
            {filtered.map((row) => (
              <li key={row.id} className={`studio__row studio__row--${row.queue.status}`}>
                <AssetThumb src={rowPreviewUrl(row)} label={row.label} />
                <label className="studio__check">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                  <span className="studio__row-title">{row.label}</span>
                </label>
                <span className="studio__tag">{CATEGORY_LABEL[row.category] ?? row.category}</span>
                <span className="studio__tag">{row.type}</span>
                {row.costsGenerations && <span className="studio__tag studio__tag--cost">gen</span>}
                {row.edited && <span className="studio__tag studio__tag--edited">edited</span>}
                <span className="studio__state">{row.queue.status}</span>
                <button
                  type="button"
                  className="studio__btn studio__btn--tiny"
                  onClick={() => openPrompt(row)}
                  disabled={row.type === 'sync_character'}
                >
                  프롬프트
                </button>
                {row.queue.message && <span className="studio__msg">{row.queue.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="studio__panel">
        <h2>로그</h2>
        <pre className="studio__log">{log.join('\n') || '(empty)'}</pre>
      </section>

      {editingRow && (
        <div className="studio__modal" role="dialog" aria-modal="true" aria-labelledby="studio-prompt-title">
          <div className="studio__modal-card">
            <div className="studio__modal-head">
              <h2 id="studio-prompt-title">프롬프트 편집</h2>
              <button type="button" className="studio__btn" onClick={closePrompt}>
                닫기
              </button>
            </div>
            <p className="studio__modal-meta">
              <strong>{editingRow.label}</strong>
              <code>{editingRow.id}</code>
            </p>
            <div className="studio__modal-preview">
              <AssetThumb src={rowPreviewUrl(editingRow)} label={editingRow.label} />
              <p className="studio__hint">
                저장 위치: <code>.pixellab-studio/prompts.json</code> · 생성 시 이 문구를 사용합니다.
              </p>
            </div>
            <label className="studio__prompt-label">
              Generation prompt
              <textarea
                className="studio__prompt"
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                rows={10}
              />
            </label>
            <div className="studio__modal-actions">
              <button type="button" className="studio__btn" onClick={resetPromptDraft}>
                기본값으로
              </button>
              <button
                type="button"
                className="studio__btn studio__btn--primary"
                disabled={promptSaving || !promptDraft.trim()}
                onClick={() => void savePrompt()}
              >
                {promptSaving ? '저장 중…' : 'JSON 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
