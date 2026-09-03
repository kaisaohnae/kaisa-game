'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  STUDIO_SECRET,
  STUDIO_URL,
  isLocalStudioUrl,
  studioHeaders,
} from '@/lib/pixellab/studio-config';
import {
  DEFAULT_MAP_TILE,
  eraseMapObject,
  floodFill,
  generateDefaultMap,
  getTileId,
  mapObjectDef,
  objectAt,
  paintBrush,
  parseMapJson,
  placeMapObject,
  tileDef,
  type MapObjectKind,
  type TileId,
  type TodieMapJson,
} from '@/games/todie/content/tiles';
import {
  emptyPixellabCatalog,
  fetchPixellabCatalog,
  libraryObjectUrl,
  libraryTileId,
  libraryTileUrl,
  type PixellabLibraryCatalog,
} from '@/games/todie/content/pixellabLibrary';
import './map-studio.css';

type Tool = 'pan' | 'paint' | 'fill' | 'eyedrop' | 'object' | 'erase-object';

type MapListEntry = {id: string; name: string; cols: number; rows: number; updatedAt: number};

const HISTORY_LIMIT = 40;

function cloneMap(map: TodieMapJson): TodieMapJson {
  return JSON.parse(JSON.stringify(map)) as TodieMapJson;
}

function publicMapUrl(id: string): string {
  return id === 'world' ? '/todie/map/world.json' : `/todie/map/${id}.json`;
}

/** UI 표시명 — 파일 id `world` 는 스테이지1 */
function mapDisplayName(id: string) {
  return id === 'world' ? 'stage1' : id;
}

export default function TodieMapStudioPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TodieMapJson>(generateDefaultMap());
  const panRef = useRef({x: 40, y: 40});
  const zoomRef = useRef(0.55);
  const dragRef = useRef<{
    mode: 'pan' | 'paint' | null;
    lastX: number;
    lastY: number;
    space: boolean;
  }>({mode: null, lastX: 0, lastY: 0, space: false});
  const tileImgsRef = useRef<Partial<Record<string, HTMLImageElement>>>({});
  const objImgsRef = useRef<Partial<Record<string, HTMLImageElement>>>({});

  const [brush, setBrush] = useState<TileId>(DEFAULT_MAP_TILE);
  const [objectBrush, setObjectBrush] = useState<MapObjectKind>('object-1');
  const [objectFrame, setObjectFrame] = useState<string | undefined>('frame_0');
  const [tool, setTool] = useState<Tool>('paint');
  const [brushSize, setBrushSize] = useState(2);
  const [dirty, setDirty] = useState(false);
  const [secret] = useState(STUDIO_SECRET);
  const [cursorTile, setCursorTile] = useState({tx: 0, ty: 0});
  const [mapId, setMapId] = useState('world');
  const [mapList, setMapList] = useState<MapListEntry[]>([]);
  const [library, setLibrary] = useState<PixellabLibraryCatalog>(emptyPixellabCatalog());
  const [libOpen, setLibOpen] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef<TodieMapJson[]>([]);
  const [, bump] = useState(0);

  const localOnly = isLocalStudioUrl();
  const panMode = tool === 'pan' || spaceHeld;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const map = mapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#1a1f2a';
    ctx.fillRect(0, 0, w, h);

    const zoom = zoomRef.current;
    const pan = panRef.current;
    const ts = map.tileSize * zoom;

    ctx.save();
    ctx.translate(pan.x, pan.y);

    const x0 = Math.max(0, Math.floor(-pan.x / ts) - 1);
    const y0 = Math.max(0, Math.floor(-pan.y / ts) - 1);
    const x1 = Math.min(map.cols - 1, Math.ceil((w - pan.x) / ts) + 1);
    const y1 = Math.min(map.rows - 1, Math.ceil((h - pan.y) / ts) + 1);

    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        const id = getTileId(map, tx, ty);
        const img = tileImgsRef.current[id];
        const x = tx * ts;
        const y = ty * ts;
        ctx.fillStyle = tileDef(id).fill;
        ctx.fillRect(x, y, ts + 0.5, ts + 0.5);
        if (img && img.complete) {
          ctx.globalAlpha = 0.55;
          ctx.drawImage(img, x, y, ts, ts);
          ctx.globalAlpha = 1;
        }
      }
    }

    if (zoom >= 0.45) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let tx = x0; tx <= x1 + 1; tx += 1) {
        ctx.beginPath();
        ctx.moveTo(tx * ts, y0 * ts);
        ctx.lineTo(tx * ts, (y1 + 1) * ts);
        ctx.stroke();
      }
      for (let ty = y0; ty <= y1 + 1; ty += 1) {
        ctx.beginPath();
        ctx.moveTo(x0 * ts, ty * ts);
        ctx.lineTo((x1 + 1) * ts, ty * ts);
        ctx.stroke();
      }
    }

    for (const o of map.objects) {
      if (o.tx < x0 - 1 || o.tx > x1 + 1 || o.ty < y0 - 1 || o.ty > y1 + 1) continue;
      const def = mapObjectDef(o.kind);
      const cx = (o.tx + 0.5) * ts;
      const cy = (o.ty + 0.5) * ts;
      const sz = def.size * zoom;
      const key = o.frame ? `${o.kind}:${o.frame}` : o.kind;
      const img = objImgsRef.current[key] ?? objImgsRef.current[o.kind];
      if (img && img.complete) {
        ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
      } else {
        ctx.fillStyle = def.fill;
        ctx.beginPath();
        ctx.arc(cx, cy, sz * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(255, 224, 130, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, map.cols * ts, map.rows * ts);

    const sx = (map.cols / 2) * ts;
    const sy = (map.rows / 2) * ts;
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(3, 5 * zoom), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const scheduleRedraw = useCallback(() => {
    requestAnimationFrame(() => redraw());
  }, [redraw]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  const pushHistory = useCallback(() => {
    historyRef.current.push(cloneMap(mapRef.current));
    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.splice(0, historyRef.current.length - HISTORY_LIMIT);
    }
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) {
      setCanUndo(false);
      return;
    }
    mapRef.current = prev;
    setDirty(true);
    setCanUndo(historyRef.current.length > 0);
    scheduleRedraw();
    bump((n) => n + 1);
  }, [scheduleRedraw]);

  const clampPan = useCallback(() => {
    const wrap = wrapRef.current;
    const map = mapRef.current;
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const ts = map.tileSize * zoomRef.current;
    const mapW = map.cols * ts;
    const mapH = map.rows * ts;
    if (mapW <= w) {
      panRef.current.x = (w - mapW) / 2;
    } else {
      panRef.current.x = Math.min(0, Math.max(w - mapW, panRef.current.x));
    }
    if (mapH <= h) {
      panRef.current.y = (h - mapH) / 2;
    } else {
      panRef.current.y = Math.min(0, Math.max(h - mapH, panRef.current.y));
    }
  }, []);

  const pingStudio = useCallback(async () => {
    if (!localOnly) return false;
    try {
      const res = await fetch(`${STUDIO_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  }, [localOnly]);

  const refreshMapList = useCallback(async () => {
    if (!localOnly) return;
    try {
      const res = await fetch(`${STUDIO_URL}/api/todie-maps`, {
        headers: {'X-Studio-Secret': secret},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.maps)) setMapList(data.maps as MapListEntry[]);
    } catch {
      // ignore — keep previous list
    }
  }, [localOnly, secret]);

  const loadMap = useCallback(
    async (id: string) => {
      const online = await pingStudio();
      try {
        if (online) {
          const res = await fetch(`${STUDIO_URL}/api/todie-map?id=${encodeURIComponent(id)}`, {
            headers: {'X-Studio-Secret': secret},
          });
          if (res.ok) {
            mapRef.current = parseMapJson(await res.json());
          } else if (res.status === 404) {
            const pub = await fetch(publicMapUrl(id), {cache: 'no-store'});
            if (pub.ok) {
              mapRef.current = parseMapJson(await pub.json());
            } else {
              mapRef.current = generateDefaultMap();
              mapRef.current.name = id;
              setDirty(true);
            }
          } else {
            const pub = await fetch(publicMapUrl(id), {cache: 'no-store'});
            if (pub.ok) {
              mapRef.current = parseMapJson(await pub.json());
            }
          }
        } else {
          const pub = await fetch(publicMapUrl(id), {cache: 'no-store'});
          if (pub.ok) {
            mapRef.current = parseMapJson(await pub.json());
          } else {
            mapRef.current = generateDefaultMap();
            mapRef.current.name = id;
            setDirty(true);
          }
        }
      } catch {
        mapRef.current = generateDefaultMap();
        mapRef.current.name = id;
        setDirty(true);
      }

      setMapId(id);
      const wrap = wrapRef.current;
      if (wrap) {
        const map = mapRef.current;
        const z = zoomRef.current;
        panRef.current = {
          x: wrap.clientWidth / 2 - (map.cols / 2) * map.tileSize * z,
          y: wrap.clientHeight / 2 - (map.rows / 2) * map.tileSize * z,
        };
        clampPan();
      }
      clearHistory();
      scheduleRedraw();
      bump((n) => n + 1);
    },
    [clampPan, clearHistory, pingStudio, scheduleRedraw, secret],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const tileImgs: Partial<Record<string, HTMLImageElement>> = {};
      const objImgs: Partial<Record<string, HTMLImageElement>> = {};
      const catalog = await fetchPixellabCatalog();
      if (!alive) return;
      setLibrary(catalog);

      const loadJobs: Promise<void>[] = [];

      for (const t of catalog.tiles) {
        for (const w of t.tiles) {
          const id = libraryTileId(t.name, w);
          loadJobs.push(
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                tileImgs[id] = img;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = libraryTileUrl(t.name, w);
            }),
          );
        }
      }
      for (const o of catalog.objects) {
        for (const f of o.frames) {
          const key = `${o.name}:${f}`;
          loadJobs.push(
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                objImgs[key] = img;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = libraryObjectUrl(o.name, f);
            }),
          );
        }
      }

      await Promise.all(loadJobs);
      if (!alive) return;
      tileImgsRef.current = tileImgs;
      objImgsRef.current = objImgs;

      await loadMap('world');
      void refreshMapList();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => {
      clampPan();
      scheduleRedraw();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPan, scheduleRedraw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const held = e.type === 'keydown';
        dragRef.current.space = held;
        setSpaceHeld(held);
        if (!held) setPanning(false);
        return;
      }
      if (e.type !== 'keydown') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === 'h') setTool('pan');
      if (e.key === 'b') setTool('paint');
      if (e.key === 'f') setTool('fill');
      if (e.key === 'i') setTool('eyedrop');
      if (e.key === 'o') setTool('object');
      if (e.key === 'x') setTool('erase-object');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [undo]);

  const screenToTile = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    const map = mapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    const ts = map.tileSize * zoomRef.current;
    const tx = Math.floor((lx - panRef.current.x) / ts);
    const ty = Math.floor((ly - panRef.current.y) / ts);
    if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return null;
    return {tx, ty};
  };

  const applyAt = (tx: number, ty: number) => {
    if (tool === 'pan') return;
    const map = mapRef.current;
    if (tool === 'eyedrop') {
      setBrush(getTileId(map, tx, ty));
      setTool('paint');
      return;
    }
    if (tool === 'object') {
      placeMapObject(map, tx, ty, objectBrush, objectFrame);
      setDirty(true);
      scheduleRedraw();
      return;
    }
    if (tool === 'erase-object') {
      eraseMapObject(map, tx, ty);
      setDirty(true);
      scheduleRedraw();
      return;
    }
    if (tool === 'fill') {
      floodFill(map, tx, ty, brush);
    } else {
      paintBrush(map, tx, ty, brush, brushSize - 1);
    }
    setDirty(true);
    scheduleRedraw();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const wantPan = panMode || e.button === 1;
    if (wantPan && e.button !== 2) {
      dragRef.current = {
        mode: 'pan',
        lastX: e.clientX,
        lastY: e.clientY,
        space: dragRef.current.space,
      };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    if (tool !== 'pan' && tool !== 'eyedrop') {
      pushHistory();
    }
    dragRef.current = {
      mode: 'paint',
      lastX: e.clientX,
      lastY: e.clientY,
      space: dragRef.current.space,
    };
    const t = screenToTile(e.clientX, e.clientY);
    if (t) {
      setCursorTile(t);
      applyAt(t.tx, t.ty);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const t = screenToTile(e.clientX, e.clientY);
    if (t) setCursorTile(t);
    if (dragRef.current.mode === 'pan') {
      panRef.current.x += e.clientX - dragRef.current.lastX;
      panRef.current.y += e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      clampPan();
      scheduleRedraw();
      return;
    }
    if (
      dragRef.current.mode === 'paint' &&
      (tool === 'paint' || tool === 'object' || tool === 'erase-object') &&
      t
    ) {
      applyAt(t.tx, t.ty);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.mode = null;
    setPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = zoomRef.current;
    const next = Math.min(2.5, Math.max(0.12, before * (e.deltaY > 0 ? 0.9 : 1.1)));
    const scale = next / before;
    panRef.current.x = mx - (mx - panRef.current.x) * scale;
    panRef.current.y = my - (my - panRef.current.y) * scale;
    zoomRef.current = next;
    clampPan();
    scheduleRedraw();
  };

  const saveToServer = async () => {
    if (!localOnly) {
      return;
    }
    const online = await pingStudio();
    if (!online) {
      return;
    }
    try {
      const res = await fetch(`${STUDIO_URL}/api/todie-map`, {
        method: 'POST',
        headers: studioHeaders({'X-Studio-Secret': secret}),
        body: JSON.stringify({...mapRef.current, id: mapId}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new Error('API 없음 — 떠 있는 studio를 재시작하세요 (npm run studio)');
      }
      if (!res.ok) throw new Error(data.error ?? `save ${res.status}`);
      setDirty(false);
      void refreshMapList();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  };

  const onSelectMap = (id: string) => {
    if (id === mapId) return;
    if (dirty && !window.confirm('저장하지 않은 변경사항이 있어요. 다른 맵으로 전환할까요?')) {
      return;
    }
    void loadMap(id);
  };

  const createNewMap = () => {
    const raw = window.prompt('새 맵 ID (영문/숫자/-/_ 만 가능, 예: stage2)', '');
    if (!raw) return;
    const id = raw.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      return;
    }
    if (id === mapId) return;
    if (mapList.some((m) => m.id === id)) {
      return;
    }
    if (dirty && !window.confirm('저장하지 않은 변경사항이 있어요. 새 맵을 만들까요?')) return;
    mapRef.current = generateDefaultMap();
    mapRef.current.name = id;
    setMapId(id);
    setDirty(true);
    clearHistory();
    scheduleRedraw();
    bump((n) => n + 1);
  };

  const deleteCurrentMap = async () => {
    if (!localOnly || mapId === 'world') return;
    if (!window.confirm(`"${mapId}" 맵을 삭제할까요? 되돌릴 수 없어요.`)) return;
    try {
      const res = await fetch(`${STUDIO_URL}/api/todie-map?id=${encodeURIComponent(mapId)}`, {
        method: 'DELETE',
        headers: studioHeaders({'X-Studio-Secret': secret}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `delete ${res.status}`);
      void refreshMapList();
      void loadMap('world');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  };

  const clearAllObjects = () => {
    const count = mapRef.current.objects?.length ?? 0;
    if (count === 0) {
      return;
    }
    if (!window.confirm(`맵의 오브젝트 ${count}개를 전부 지울까요?`)) return;
    pushHistory();
    mapRef.current.objects = [];
    setDirty(true);
    scheduleRedraw();
    bump((n) => n + 1);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(mapRef.current)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${mapId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    try {
      pushHistory();
      mapRef.current = parseMapJson(JSON.parse(await file.text()));
      setDirty(true);
      scheduleRedraw();
      bump((n) => n + 1);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  };

  const regen = () => {
    if (!window.confirm('절차적 기본 맵으로 덮어쓸까요?')) return;
    pushHistory();
    mapRef.current = generateDefaultMap();
    setDirty(true);
    scheduleRedraw();
    bump((n) => n + 1);
  };

  const map = mapRef.current;
  const atObj = objectAt(map, cursorTile.tx, cursorTile.ty);

  return (
    <main className="map-studio">
      <div className="map-studio__body">
        <aside className="map-studio__side">
          <h2>맵 선택</h2>
          <div className="map-studio__files">
            <select
              className="map-studio__select"
              value={mapId}
              onChange={(e) => onSelectMap(e.target.value)}
              disabled={!localOnly}
            >
              {!mapList.some((m) => m.id === mapId) && (
                <option value={mapId}>{mapDisplayName(mapId)} (미저장)</option>
              )}
              {mapList.map((m) => (
                <option key={m.id} value={m.id}>
                  {mapDisplayName(m.id)}
                </option>
              ))}
            </select>
            <button type="button" className="map-studio__btn" onClick={createNewMap} disabled={!localOnly}>
              + 새 맵 만들기
            </button>
            <button
              type="button"
              className="map-studio__btn"
              onClick={undo}
              disabled={!canUndo}
              title="Ctrl+Z"
            >
              되돌리기
            </button>
            {mapId !== 'world' && (
              <button
                type="button"
                className="map-studio__btn map-studio__btn--danger"
                onClick={() => void deleteCurrentMap()}
                disabled={!localOnly}
              >
                이 맵 삭제
              </button>
            )}
          </div>

          <h2>공통 타일</h2>
          {!library.tiles.length && (
            <p className="map-studio__hint">Asset Studio에서 PixelLab 라이브러리를 가져오세요.</p>
          )}
          {library.tiles.map((t) => {
            const open = libOpen === t.name;
            return (
              <div key={t.name} className="map-studio__acc">
                <button
                  type="button"
                  className="map-studio__acc-head"
                  aria-expanded={open}
                  onClick={() => setLibOpen(open ? null : t.name)}
                  title={t.desc}
                >
                  {open ? '▾' : '▸'} {t.name}
                  <span className="map-studio__acc-desc">{t.desc}</span>
                </button>
                {open && (
                  <div className="map-studio__acc-body">
                    <div className="map-studio__palette">
                      {t.tiles.map((w) => {
                        const id = libraryTileId(t.name, w);
                        return (
                          <button
                            key={w}
                            type="button"
                            className={`map-studio__swatch${brush === id && (tool === 'paint' || tool === 'fill') ? ' is-active' : ''}`}
                            title={`${t.name} ${w}`}
                            onClick={() => {
                              setBrush(id);
                              setTool('paint');
                            }}
                          >
                            <img src={libraryTileUrl(t.name, w)} alt={w} />
                            <span>{w}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <h2>공통 오브젝트</h2>
          {!library.objects.length && (
            <p className="map-studio__hint">Asset Studio에서 PixelLab 라이브러리를 가져오세요.</p>
          )}
          {library.objects.map((o) => {
            const open = libOpen === o.name;
            return (
              <div key={o.name} className="map-studio__acc">
                <button
                  type="button"
                  className="map-studio__acc-head"
                  aria-expanded={open}
                  onClick={() => setLibOpen(open ? null : o.name)}
                  title={o.desc}
                >
                  {open ? '▾' : '▸'} {o.name}
                  <span className="map-studio__acc-desc">{o.desc}</span>
                </button>
                {open && (
                  <div className="map-studio__acc-body">
                    <div className="map-studio__palette">
                      {o.frames.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`map-studio__swatch${objectBrush === o.name && objectFrame === f && tool === 'object' ? ' is-active' : ''}`}
                          title={`${o.name} ${f}`}
                          onClick={() => {
                            setObjectBrush(o.name);
                            setObjectFrame(f);
                            setTool('object');
                          }}
                        >
                          <img src={libraryObjectUrl(o.name, f)} alt={f} />
                          <span>{f}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="map-studio__files">
            <button
              type="button"
              className="map-studio__btn map-studio__btn--danger"
              onClick={clearAllObjects}
            >
              오브젝트 전체 지우기
            </button>
          </div>

          <h2>도구</h2>
          <div className="map-studio__tools">
            {(
              [
                ['pan', '이동'],
                ['paint', '칠하기'],
                ['fill', '채우기'],
                ['eyedrop', '스포이드'],
                ['object', '오브젝트'],
                ['erase-object', '오브젝트 지우기'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`map-studio__tool${tool === id ? ' is-active' : ''}`}
                onClick={() => setTool(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="map-studio__brush">
            브러시 크기 {brushSize}
            <input
              type="range"
              min={1}
              max={8}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </label>

          <h2>파일</h2>
          <div className="map-studio__files">
            <button
              type="button"
              className="map-studio__btn map-studio__btn--primary"
              onClick={() => void saveToServer()}
              disabled={!localOnly}
            >
              서버에 저장 {dirty ? '*' : ''}
            </button>
            <button type="button" className="map-studio__btn" onClick={downloadJson}>
              JSON 다운로드
            </button>
            <label className="map-studio__btn map-studio__file">
              JSON 불러오기
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="button" className="map-studio__btn" onClick={regen}>
              기본 맵 생성
            </button>
          </div>

          <p className="map-studio__cursor">
            타일 {cursorTile.tx}, {cursorTile.ty} · {getTileId(map, cursorTile.tx, cursorTile.ty)}
            {atObj ? ` · ${atObj.kind}` : ''}
          </p>
        </aside>

        <div
          ref={wrapRef}
          className={`map-studio__canvas-wrap${panMode ? ' map-studio__canvas-wrap--pan' : ''}${panning ? ' map-studio__canvas-wrap--panning' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas ref={canvasRef} className="map-studio__canvas" />
        </div>
      </div>
    </main>
  );
}
