'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {STUDIO_SECRET, STUDIO_URL} from '@/lib/pixellab/studio-config';
import {
  TILE_DEFS,
  floodFill,
  generateDefaultMap,
  getTileId,
  paintBrush,
  parseMapJson,
  setTileId,
  tileDef,
  tileSpriteUrl,
  type TileId,
  type TodieMapJson,
} from '@/games/todie/content/tiles';
import './map-studio.css';

type Tool = 'paint' | 'fill' | 'eyedrop';

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
  const tileImgsRef = useRef<Partial<Record<TileId, HTMLImageElement>>>({});

  const [brush, setBrush] = useState<TileId>('grass_a');
  const [tool, setTool] = useState<Tool>('paint');
  const [brushSize, setBrushSize] = useState(2);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('맵 로딩…');
  const [secret] = useState(STUDIO_SECRET);
  const [cursorTile, setCursorTile] = useState({tx: 0, ty: 0});
  const [, bump] = useState(0);

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
          ctx.globalAlpha = 0.65;
          ctx.drawImage(img, x, y, ts, ts);
          ctx.globalAlpha = 1;
        }
      }
    }

    // grid when zoomed in
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

    // world border
    ctx.strokeStyle = 'rgba(255, 224, 130, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, map.cols * ts, map.rows * ts);

    // spawn marker
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const imgs: Partial<Record<TileId, HTMLImageElement>> = {};
      await Promise.all(
        TILE_DEFS.map(
          (t) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                imgs[t.id] = img;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = tileSpriteUrl(t.id);
            }),
        ),
      );
      if (!alive) return;
      tileImgsRef.current = imgs;

      try {
        const res = await fetch(`${STUDIO_URL}/api/todie-map`, {
          headers: {'X-Studio-Secret': secret},
        });
        if (res.ok) {
          mapRef.current = parseMapJson(await res.json());
          setStatus('서버 맵 로드됨 · public/todie/map/world.json');
        } else {
          const pub = await fetch('/todie/map/world.json', {cache: 'no-store'});
          if (pub.ok) {
            mapRef.current = parseMapJson(await pub.json());
            setStatus('맵 로드됨 · /todie/map/world.json');
          } else {
            mapRef.current = generateDefaultMap();
            setStatus('기본 맵 생성됨');
            setDirty(true);
          }
        }
      } catch {
        try {
          const pub = await fetch('/todie/map/world.json', {cache: 'no-store'});
          if (pub.ok) {
            mapRef.current = parseMapJson(await pub.json());
            setStatus('맵 로드됨 · /todie/map/world.json');
          } else {
            mapRef.current = generateDefaultMap();
            setStatus('기본 맵 생성됨 (studio 오프라인)');
            setDirty(true);
          }
        } catch {
          mapRef.current = generateDefaultMap();
          setStatus('기본 맵 생성됨');
          setDirty(true);
        }
      }
      // center view on spawn
      const wrap = wrapRef.current;
      if (wrap) {
        const map = mapRef.current;
        const z = zoomRef.current;
        panRef.current = {
          x: wrap.clientWidth / 2 - (map.cols / 2) * map.tileSize * z,
          y: wrap.clientHeight / 2 - (map.rows / 2) * map.tileSize * z,
        };
      }
      scheduleRedraw();
      bump((n) => n + 1);
    })();
    return () => {
      alive = false;
    };
  }, [scheduleRedraw, secret]);

  useEffect(() => {
    const onResize = () => scheduleRedraw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scheduleRedraw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') dragRef.current.space = e.type === 'keydown';
      if (e.type === 'keydown' && e.key === 'b') setTool('paint');
      if (e.type === 'keydown' && e.key === 'f') setTool('fill');
      if (e.type === 'keydown' && e.key === 'i') setTool('eyedrop');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

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
    const map = mapRef.current;
    if (tool === 'eyedrop') {
      setBrush(getTileId(map, tx, ty));
      setTool('paint');
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
    if (e.button === 1 || e.button === 2 || dragRef.current.space || e.altKey) {
      dragRef.current = {
        mode: 'pan',
        lastX: e.clientX,
        lastY: e.clientY,
        space: dragRef.current.space,
      };
      return;
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
      scheduleRedraw();
      return;
    }
    if (dragRef.current.mode === 'paint' && tool === 'paint' && t) {
      applyAt(t.tx, t.ty);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.mode = null;
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
    scheduleRedraw();
  };

  const saveToServer = async () => {
    setStatus('저장 중…');
    try {
      const res = await fetch(`${STUDIO_URL}/api/todie-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Studio-Secret': secret,
        },
        body: JSON.stringify(mapRef.current),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `save ${res.status}`);
      setDirty(false);
      setStatus(`저장 완료 · ${data.path} (${data.cells} cells)`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(mapRef.current)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'world.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('world.json 다운로드됨');
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    try {
      mapRef.current = parseMapJson(JSON.parse(await file.text()));
      setDirty(true);
      setStatus(`불러옴 · ${file.name}`);
      scheduleRedraw();
      bump((n) => n + 1);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  };

  const regen = () => {
    if (!window.confirm('절차적 기본 맵으로 덮어쓸까요?')) return;
    mapRef.current = generateDefaultMap();
    setDirty(true);
    setStatus('기본 바이옴 맵 생성됨');
    scheduleRedraw();
    bump((n) => n + 1);
  };

  const map = mapRef.current;
  const meta = useMemo(
    () => `${map.cols}×${map.rows} · tile ${map.tileSize} · world ${map.worldSize}`,
    [map],
  );

  return (
    <main className="map-studio">
      <header className="map-studio__header">
        <div>
          <h1 className="map-studio__title">Todie Map Studio</h1>
          <p className="map-studio__sub">
            {meta} · 휠 줌 · Space/우클릭 팬 · B칠하기 F채우기 I스포이드
          </p>
        </div>
        <div className="map-studio__links">
          <Link href="/studio/" className="map-studio__link">
            Asset Studio
          </Link>
          <Link href="/games/todie/" className="map-studio__link">
            게임 열기
          </Link>
        </div>
      </header>

      <div className="map-studio__body">
        <aside className="map-studio__side">
          <h2>팔레트</h2>
          <div className="map-studio__palette">
            {TILE_DEFS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`map-studio__swatch${brush === t.id ? ' is-active' : ''}`}
                onClick={() => {
                  setBrush(t.id);
                  setTool('paint');
                }}
                title={t.id}
              >
                <span className="map-studio__swatch-color" style={{background: t.fill}} />
                <img src={tileSpriteUrl(t.id)} alt="" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <h2>도구</h2>
          <div className="map-studio__tools">
            {(
              [
                ['paint', '칠하기'],
                ['fill', '채우기'],
                ['eyedrop', '스포이드'],
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
            <button type="button" className="map-studio__btn map-studio__btn--primary" onClick={() => void saveToServer()}>
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

          <p className="map-studio__hint">
            저장 위치: <code>public/todie/map/world.json</code>
            <br />
            <code>npm run studio</code> 필요 (서버 저장 시)
          </p>
          <p className="map-studio__status">{status}</p>
          <p className="map-studio__cursor">
            타일 {cursorTile.tx}, {cursorTile.ty} · {getTileId(map, cursorTile.tx, cursorTile.ty)}
          </p>
        </aside>

        <div
          ref={wrapRef}
          className="map-studio__canvas-wrap"
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
