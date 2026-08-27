'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {STUDIO_SECRET, STUDIO_URL} from '@/lib/pixellab/studio-config';
import './studio.css';

type QueueStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

type ManifestRow = {
  id: string;
  category: string;
  label: string;
  type: string;
  selectedByDefault?: boolean;
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
      setSelected((prev) => {
        if (prev.size > 0) return prev;
        const defaults = new Set<string>(
          (data.queue as ManifestRow[])
            .filter((r) => r.selectedByDefault)
            .map((r) => r.id),
        );
        return defaults;
      });

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

  const runDefaults = async () => {
    pushLog('run defaults (sync characters)…');
    const res = await fetch(`${STUDIO_URL}/api/queue/run-defaults`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) pushLog(data.error ?? 'run failed');
    else pushLog(`queued ${data.ids?.length ?? 0}`);
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

  const filtered = rows.filter((r) => filter === 'all' || r.category === filter);
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

      <section className="studio__toolbar">
        <button type="button" className="studio__btn studio__btn--primary" onClick={() => void runDefaults()}>
          기본 4종 동기화 (캐릭터, 무료)
        </button>
        <button type="button" className="studio__btn" onClick={() => void runSelected()}>
          선택 실행 ({selected.size})
        </button>
        <button type="button" className="studio__btn" onClick={() => void refresh()}>
          새로고침
        </button>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="studio__select">
          <option value="all">전체</option>
          <option value="character">캐릭터</option>
          <option value="mob">몬스터</option>
          <option value="tile">타일</option>
          <option value="item">아이템</option>
        </select>
      </section>

      <section className="studio__panel">
        <h2>에셋 목록</h2>
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
              <span className="studio__tag">{row.category}</span>
              <span className="studio__tag">{row.type}</span>
              {row.costsGenerations && <span className="studio__tag studio__tag--cost">gen</span>}
              <span className="studio__state">{row.queue.status}</span>
              {row.queue.message && <span className="studio__msg">{row.queue.message}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="studio__panel">
        <h2>로그</h2>
        <pre className="studio__log">{log.join('\n') || '(empty)'}</pre>
      </section>
    </main>
  );
}
