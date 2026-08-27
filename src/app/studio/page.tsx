'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {STUDIO_SECRET, STUDIO_URL} from '@/lib/pixellab/studio-config';
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
};

type QueueStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

type ManifestRow = {
  id: string;
  game: 'todie' | 'car-run';
  category: string;
  label: string;
  type: string;
  costsGenerations?: boolean;
  queue: {id: string; status: QueueStatus; message?: string; outputPath?: string};
};

type Balance = {
  credits?: {usd?: number};
  subscription?: {plan?: string; generations?: number; total?: number};
};

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
  const [gameFilter, setGameFilter] = useState<'todie' | 'car-run'>('todie');

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
      setRows(data.queue ?? []);
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

  const gameRows = useMemo(
    () => rows.filter((r) => r.game === gameFilter),
    [rows, gameFilter],
  );

  const categoryOptions = useMemo(() => {
    const cats = new Set(gameRows.map((r) => r.category));
    return ['all', ...Array.from(cats).sort()];
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
    const counts = {todie: 0, 'car-run': 0};
    for (const row of rows) counts[row.game] += 1;
    return counts;
  }, [rows]);

  const gameIncomplete = useMemo(() => {
    const counts = {todie: 0, 'car-run': 0};
    for (const row of rows) {
      if (row.queue.status !== 'completed') counts[row.game] += 1;
    }
    return counts;
  }, [rows]);

  const switchGame = (game: 'todie' | 'car-run') => {
    setGameFilter(game);
    setFilter('all');
    setSelected(new Set());
  };

  const genLeft = balance?.subscription?.generations;

  return (
    <main className="studio">
      <header className="studio__header">
        <div>
          <h1 className="studio__title">PixelLab Asset Studio</h1>
          <p className="studio__sub">
            로컬 전용 · <code>npm run studio</code> 실행 후 사용 · 공개 포털에 링크 없음
          </p>
        </div>
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
        <h2>설정</h2>
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
        <p className="studio__hint">
          API Key는 <code>.env.local</code> 에만 저장됩니다. Git에 커밋되지 않습니다.
        </p>
      </section>

      <section className="studio__workspace">
        <div className="studio__tab-bar" role="tablist" aria-label="게임 선택">
          <button
            type="button"
            role="tab"
            id="studio-tab-todie"
            aria-selected={gameFilter === 'todie'}
            aria-controls="studio-panel-assets"
            className={`studio__tab${gameFilter === 'todie' ? ' studio__tab--active' : ''}`}
            onClick={() => switchGame('todie')}
          >
            <span className="studio__tab-label">Todie</span>
            <span className="studio__tab-meta">
              <span className="studio__tab-count">{gameCounts.todie}</span>
              {gameIncomplete.todie > 0 && (
                <span className="studio__tab-badge">{gameIncomplete.todie} 남음</span>
              )}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="studio-tab-car-run"
            aria-selected={gameFilter === 'car-run'}
            aria-controls="studio-panel-assets"
            className={`studio__tab${gameFilter === 'car-run' ? ' studio__tab--active' : ''}`}
            onClick={() => switchGame('car-run')}
          >
            <span className="studio__tab-label">자동차</span>
            <span className="studio__tab-meta">
              <span className="studio__tab-count">{gameCounts['car-run']}</span>
              {gameIncomplete['car-run'] > 0 && (
                <span className="studio__tab-badge">{gameIncomplete['car-run']} 남음</span>
              )}
            </span>
          </button>
        </div>

        <div
          id="studio-panel-assets"
          role="tabpanel"
          aria-labelledby={gameFilter === 'todie' ? 'studio-tab-todie' : 'studio-tab-car-run'}
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
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="studio__select">
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABEL[cat] ?? cat}
                </option>
              ))}
            </select>
          </div>

          <div className="studio__tab-panel-head">
            <h2>에셋 목록</h2>
            <span className="studio__tab-panel-sub">{filtered.length}개</span>
            {running && <span className="studio__running">실행 중…</span>}
          </div>

          <ul className="studio__list">
            {filtered.map((row) => (
              <li key={row.id} className={`studio__row studio__row--${row.queue.status}`}>
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
                <span className="studio__state">{row.queue.status}</span>
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
    </main>
  );
}
