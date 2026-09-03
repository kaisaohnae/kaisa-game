'use client';

import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {STUDIO_URL} from '@/lib/pixellab/studio-config';
import {
  emptyPixellabCatalog,
  libraryCharacterUrl,
  libraryObjectUrl,
  libraryTileUrl,
  type PixellabLibraryCatalog,
} from '@/games/todie/content/pixellabLibrary';

type PendingItem = {
  remoteId: string;
  kind: string;
  desc: string;
  status: string | null;
};

type PendingGroups = {
  objects: PendingItem[];
  tiles: PendingItem[];
  characters: PendingItem[];
};

type Props = {
  headers: HeadersInit;
  online: boolean;
  hasApiKey: boolean;
  onLog: (line: string) => void;
};

export default function PixelLabImportPanel({headers, online, hasApiKey, onLog}: Props) {
  const [catalog, setCatalog] = useState<PixellabLibraryCatalog>(emptyPixellabCatalog());
  const [pending, setPending] = useState<PendingGroups>({
    objects: [],
    tiles: [],
    characters: [],
  });
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<'objects' | 'tiles' | 'characters' | null>('objects');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pendingTotal =
    pending.objects.length + pending.tiles.length + pending.characters.length;

  const loadCatalog = useCallback(async () => {
    const res = await fetch(`${STUDIO_URL}/api/pixellab/library`, {headers});
    if (!res.ok) throw new Error(`library ${res.status}`);
    const data = await res.json();
    setCatalog({
      version: 1,
      objects: data.objects ?? [],
      tiles: data.tiles ?? [],
      characters: data.characters ?? [],
    });
  }, [headers]);

  const loadPending = useCallback(async () => {
    if (!hasApiKey) {
      setPending({objects: [], tiles: [], characters: []});
      setPendingLoaded(true);
      return;
    }
    const res = await fetch(`${STUDIO_URL}/api/pixellab/library/pending`, {headers});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `pending ${res.status}`);
    setPending({
      objects: data.pending?.objects ?? [],
      tiles: data.pending?.tiles ?? [],
      characters: data.pending?.characters ?? [],
    });
    setPendingLoaded(true);
  }, [headers, hasApiKey]);

  const refreshAll = useCallback(async () => {
    try {
      await loadCatalog();
      await loadPending();
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e));
    }
  }, [loadCatalog, loadPending, onLog]);

  useEffect(() => {
    if (!online) return;
    void refreshAll();
  }, [online, refreshAll]);

  const toggleSelected = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const runSyncNew = async () => {
    if (!hasApiKey) {
      onLog('API Key를 먼저 저장하세요');
      return;
    }
    if (pendingTotal === 0) {
      onLog('가져올 새 에셋이 없습니다');
      return;
    }
    setBusy(true);
    onLog('새 에셋 가져오는 중…');
    try {
      const res = await fetch(`${STUDIO_URL}/api/pixellab/library/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({mode: 'new'}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'sync failed');
      setCatalog(data.catalog ?? emptyPixellabCatalog());
      setSelected(new Set());
      const s = data.summary ?? {};
      onLog(`완료 · 추가 ${(s.added ?? []).length}`);
      for (const name of s.added ?? []) onLog(`+ ${name}`);
      await loadPending();
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const runResyncSelected = async () => {
    if (!hasApiKey) {
      onLog('API Key를 먼저 저장하세요');
      return;
    }
    const names = [...selected];
    if (!names.length) {
      onLog('재연동할 object/tile을 선택하세요');
      return;
    }
    setBusy(true);
    onLog(`재연동 ${names.length}개…`);
    try {
      const res = await fetch(`${STUDIO_URL}/api/pixellab/library/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({mode: 'resync', names}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'resync failed');
      setCatalog(data.catalog ?? emptyPixellabCatalog());
      const s = data.summary ?? {};
      onLog(`재연동 완료 · 갱신 ${(s.updated ?? []).length}`);
      for (const name of s.updated ?? []) onLog(`↻ ${name}`);
      setSelected(new Set());
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const selectableNames = useMemo(
    () => [...catalog.objects.map((o) => o.name), ...catalog.tiles.map((t) => t.name)],
    [catalog],
  );

  return (
    <section className="studio__panel">
      <div className="studio__import-head">
        <button
          type="button"
          className="studio__icon-btn"
          title="새로고침"
          aria-label="새로고침"
          disabled={busy}
          onClick={() => void refreshAll()}
        >
          ↻
        </button>
      </div>

      {!hasApiKey && <p className="studio__warn-inline">API Key를 먼저 저장하세요.</p>}

      <div className="studio__files" style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
        <button
          type="button"
          className="studio__btn studio__btn--primary"
          disabled={busy || !hasApiKey || (pendingLoaded && pendingTotal === 0)}
          onClick={() => void runSyncNew()}
        >
          {busy ? '가져오는 중…' : '새 에셋 가져오기'}
        </button>
        <button
          type="button"
          className="studio__btn"
          disabled={busy || !hasApiKey || selected.size === 0}
          onClick={() => void runResyncSelected()}
        >
          재연동 ({selected.size})
        </button>
      </div>

      <div className="studio__pending">
        <h3 className="studio__pending-title">가져올 새 에셋</h3>
        {!pendingLoaded && <p className="studio__hint">확인 중…</p>}
        {pendingLoaded && pendingTotal === 0 && (
          <p className="studio__hint">없음 — 사이트에 아직 안 가져온 에셋이 없습니다.</p>
        )}
        {pendingLoaded && pendingTotal > 0 && (
          <ul className="studio__pending-list">
            {pending.objects.map((p) => (
              <li key={p.remoteId}>
                <span className="studio__tag">object</span> {p.desc || p.remoteId}
                {p.status ? ` · ${p.status}` : ''}
              </li>
            ))}
            {pending.tiles.map((p) => (
              <li key={p.remoteId}>
                <span className="studio__tag">tile</span> {p.desc || p.remoteId}
                {p.status ? ` · ${p.status}` : ''}
              </li>
            ))}
            {pending.characters.map((p) => (
              <li key={p.remoteId}>
                <span className="studio__tag">character</span> {p.desc || p.remoteId}
                {p.status ? ` · ${p.status}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="studio__hint">
        로컬 {catalog.objects.length} objects · {catalog.tiles.length} tiles ·{' '}
        {catalog.characters.length} characters
        {selectableNames.length > 0 ? ' · 재연동은 아래 목록에서 선택' : ''}
      </p>

      <LibraryAccordion
        title={`Objects (${catalog.objects.length})`}
        open={open === 'objects'}
        onToggle={() => setOpen(open === 'objects' ? null : 'objects')}
      >
        {catalog.objects.map((o) => (
          <label key={o.name} className="studio__lib-entry studio__lib-entry--check">
            <input
              type="checkbox"
              checked={selected.has(o.name)}
              onChange={() => toggleSelected(o.name)}
            />
            <div className="studio__lib-entry-body">
              <div className="studio__lib-entry-meta">
                <strong>{o.name}</strong>
                <span className="studio__hint">{o.desc}</span>
              </div>
              <div className="studio__lib-thumbs">
                {o.frames.map((f) => (
                  <img key={f} src={libraryObjectUrl(o.name, f)} alt={f} title={f} />
                ))}
              </div>
            </div>
          </label>
        ))}
        {!catalog.objects.length && <p className="studio__hint">아직 없음</p>}
      </LibraryAccordion>

      <LibraryAccordion
        title={`Tiles (${catalog.tiles.length})`}
        open={open === 'tiles'}
        onToggle={() => setOpen(open === 'tiles' ? null : 'tiles')}
      >
        {catalog.tiles.map((t) => (
          <label key={t.name} className="studio__lib-entry studio__lib-entry--check">
            <input
              type="checkbox"
              checked={selected.has(t.name)}
              onChange={() => toggleSelected(t.name)}
            />
            <div className="studio__lib-entry-body">
              <div className="studio__lib-entry-meta">
                <strong>{t.name}</strong>
                <span className="studio__hint">{t.desc}</span>
              </div>
              <div className="studio__lib-thumbs">
                {t.tiles.map((w) => (
                  <img key={w} src={libraryTileUrl(t.name, w)} alt={w} title={w} />
                ))}
              </div>
            </div>
          </label>
        ))}
        {!catalog.tiles.length && <p className="studio__hint">아직 없음</p>}
      </LibraryAccordion>

      <LibraryAccordion
        title={`Characters (${catalog.characters.length})`}
        open={open === 'characters'}
        onToggle={() => setOpen(open === 'characters' ? null : 'characters')}
      >
        {catalog.characters.map((c) => (
          <div key={c.name} className="studio__lib-entry">
            <div className="studio__lib-entry-meta">
              <strong>{c.name}</strong>
              <span className="studio__hint">{c.desc}</span>
            </div>
            <div className="studio__lib-thumbs">
              {c.frames.map((f) => (
                <img key={f} src={libraryCharacterUrl(c.name, f)} alt={f} title={f} />
              ))}
            </div>
          </div>
        ))}
        {!catalog.characters.length && <p className="studio__hint">아직 없음</p>}
      </LibraryAccordion>
    </section>
  );
}

function LibraryAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="studio__lib-acc">
      <button type="button" className="studio__lib-acc-head" onClick={onToggle} aria-expanded={open}>
        <span>{open ? '▾' : '▸'}</span> {title}
      </button>
      {open && <div className="studio__lib-acc-body">{children}</div>}
    </div>
  );
}
