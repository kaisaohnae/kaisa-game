'use client';

import {useEffect, useRef, useState, type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {EQUIP_SLOTS, type Equipment, type GearSlot, type Item} from '../content/equip';
import {jobLabel, type JobId, type LoadedImages} from '../content';
import {displaySettings} from '../content/settings';
import {drawJobPreview} from '../render/drawCharacter';
import {
  buildItemHelp,
  itemIconUrl,
  sumEquippedStats,
  tierMeta,
  type GearTier,
  type ItemHelpInfo,
} from '../content/items';

function CharPreview({
  job,
  images,
  equipped,
  gearImages,
}: {
  job: JobId;
  images: LoadedImages | null;
  equipped: Equipment;
  gearImages: Record<string, HTMLImageElement> | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wearKey = EQUIP_SLOTS.map((s) => {
    const it = equipped[s.id];
    return it ? `${it.gearId}:${it.tier}` : '-';
  }).join('|');
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    drawJobPreview(c, images, job, canvas.width, canvas.height, equipped, gearImages);
  }, [job, images, wearKey, gearImages, equipped]);
  return (
    <canvas
      className="todie__char-preview"
      ref={ref}
      width={displaySettings.character.previewSize}
      height={Math.round(displaySettings.character.previewSize * 1.05)}
    />
  );
}

function ItemIcon({item}: {item: Item}) {
  if (item.kind === 'empty') return null;
  const src = itemIconUrl(item);
  const tier = tierMeta(item.tier);
  return (
    <>
      {src ? (
        <img className="todie__slot-icon-img" src={src} alt="" draggable={false} />
      ) : (
        <div className="todie__slot-icon" style={{background: item.color}} />
      )}
      {tier && (
        <span
          className={`todie__tier-badge todie__tier-badge--${item.tier as GearTier}`}
          style={{color: tier.color}}
        >
          {tier.label}
        </span>
      )}
    </>
  );
}

function ItemBubble({
  info,
  x,
  y,
}: {
  info: ItemHelpInfo;
  x: number;
  y: number;
}) {
  const left = Math.max(12, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : x) - 12));
  const top = Math.max(12, y);
  return (
    <div
      className={`todie__item-bubble${info.usable ? '' : ' is-locked'}`}
      style={{left, top}}
      role="tooltip"
    >
      <div className="todie__item-bubble-title" style={{color: info.tierColor ?? '#ffe082'}}>
        {info.title}
      </div>
      {info.tierLabel && (
        <div className="todie__item-bubble-row">
          <span>등급</span>
          <strong style={{color: info.tierColor ?? '#fff'}}>{info.tierLabel}</strong>
        </div>
      )}
      {info.jobLine && (
        <div className="todie__item-bubble-row">
          <span>직업</span>
          <strong className={info.usable ? '' : 'is-bad'}>{info.jobLine}</strong>
        </div>
      )}
      {info.dropLine && (
        <div className="todie__item-bubble-row">
          <span>드랍률</span>
          <strong>{info.dropLine}</strong>
        </div>
      )}
      {info.statsLine && (
        <div className="todie__item-bubble-row">
          <span>성능</span>
          <strong>{info.statsLine}</strong>
        </div>
      )}
      {info.help && <p className="todie__item-bubble-desc">{info.help}</p>}
      <span className="todie__item-bubble-tail" aria-hidden />
    </div>
  );
}

export function InventoryDock({
  bag,
  equipped,
  job,
  charName,
  images,
  gearImages,
  onMutate,
  onToast,
  onToggleEquip,
  onUnequip,
}: {
  bag: Item[];
  equipped: Equipment;
  job: JobId;
  charName: string;
  images: LoadedImages | null;
  gearImages: Record<string, HTMLImageElement> | null;
  onMutate: () => void;
  onToast: (msg: string) => void;
  onToggleEquip: (bagIndex: number) => void;
  onUnequip: (slot: GearSlot) => void;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [tip, setTip] = useState<{info: ItemHelpInfo; x: number; y: number} | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{key: string; t: number} | null>(null);
  const tapStartRef = useRef<{x: number; y: number} | null>(null);

  const tryEquipBag = (index: number, item: Item) => {
    if (item.kind === 'gear') onToggleEquip(index);
    else if (item.kind !== 'empty') onToast('장비만 장착할 수 있어요');
  };

  const onTouchDouble = (key: string, e: ReactPointerEvent, action: () => void) => {
    if (e.pointerType === 'mouse') return;
    const start = tapStartRef.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 14) {
      lastTapRef.current = null;
      return;
    }
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.key === key && now - last.t < 340) {
      lastTapRef.current = null;
      action();
      return;
    }
    lastTapRef.current = {key, t: now};
  };

  const markTapStart = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return;
    tapStartRef.current = {x: e.clientX, y: e.clientY};
  };

  const showTip = (item: Item | null, el: HTMLElement | null) => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (!item || item.kind === 'empty' || !el) {
      setTip(null);
      return;
    }
    const info = buildItemHelp(item, job);
    if (!info) {
      setTip(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTip({
      info,
      x: r.left + r.width / 2,
      y: r.top,
    });
  };

  const hideTipSoon = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setTip(null), 80);
  };

  const swap = (a: number, b: number) => {
    if (a === b || a < 0 || b < 0 || a >= bag.length || b >= bag.length) return;
    const tmp = bag[a];
    bag[a] = bag[b];
    bag[b] = tmp;
    onMutate();
  };

  const power = sumEquippedStats(equipped);

  return (
    <div
      className="todie__inv-dock"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {tip &&
        typeof document !== 'undefined' &&
        createPortal(<ItemBubble info={tip.info} x={tip.x} y={tip.y} />, document.body)}

      <aside className="todie__inv-equip">
        <div className="todie__inv-equip-head">
          <CharPreview
            job={job}
            images={images}
            equipped={equipped}
            gearImages={gearImages}
          />
          <div>
            <div className="todie__inv-char-name">{charName}</div>
            <div className="todie__inv-char-job">{jobLabel(job)}</div>
            <p className="todie__inv-hint">더블탭·우클릭 장착</p>
            <div className="todie__power-mini">
              합 공+{power.atk} 방+{power.def} 체+{power.hp}
            </div>
            <div className="todie__tier-legend">
              <span className="todie__tier-badge todie__tier-badge--basic">기본템</span>
              <span className="todie__tier-badge todie__tier-badge--ascend">전승템</span>
              <span className="todie__tier-badge todie__tier-badge--unique">유일템</span>
              <span className="todie__tier-badge todie__tier-badge--hero">영웅템</span>
            </div>
          </div>
        </div>
        <div className="todie__equip-grid">
          {EQUIP_SLOTS.map((s) => {
            const it = equipped[s.id];
            return (
              <button
                key={s.id}
                type="button"
                className={`todie__equip-slot${it ? ' has-item' : ''}${
                  it?.tier ? ` is-tier-${it.tier}` : ''
                }`}
                onMouseEnter={(e) => showTip(it, e.currentTarget)}
                onMouseLeave={hideTipSoon}
                onFocus={(e) => showTip(it, e.currentTarget)}
                onBlur={hideTipSoon}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  if (it) onUnequip(s.id);
                }}
                onPointerDown={markTapStart}
                onPointerUp={(e) => {
                  if (!it) return;
                  onTouchDouble(`eq:${s.id}`, e, () => onUnequip(s.id));
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onUnequip(s.id);
                }}
              >
                <span className="todie__equip-label">{s.label}</span>
                {it && (
                  <>
                    <ItemIcon item={it} />
                    <span className="todie__slot-qty">{it.qty}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="todie__inv-bag">
        <div className="todie__inv-bag-head">
          <span>가방 100</span>
          <span className="todie__inv-bag-sub">드래그 이동 · 더블탭/우클릭 장착</span>
        </div>
        <div className="todie__inv-scroll">
          <div className="todie__inv-grid">
            {bag.map((it, i) => {
              const wrongJob = Boolean(it.job && it.job !== job);
              return (
                <div
                  key={`${it.id}-${i}`}
                  className={`todie__slot${dragFrom === i ? ' is-drag' : ''}${
                    over === i ? ' is-over' : ''
                  }${it.tier ? ` is-tier-${it.tier}` : ''}${wrongJob ? ' is-wrong-job' : ''}`}
                  draggable={it.kind !== 'empty'}
                  onMouseEnter={(e) => showTip(it, e.currentTarget)}
                  onMouseLeave={hideTipSoon}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    tryEquipBag(i, it);
                  }}
                  onPointerDown={markTapStart}
                  onPointerUp={(e) => {
                    onTouchDouble(`bag:${i}`, e, () => tryEquipBag(i, it));
                  }}
                  onDragStart={(e) => {
                    setTip(null);
                    setDragFrom(i);
                    e.dataTransfer.setData('text/plain', String(i));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setOver(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(i);
                  }}
                  onDragLeave={() => setOver((o) => (o === i ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    if (!Number.isNaN(from)) swap(from, i);
                    setDragFrom(null);
                    setOver(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (it.kind === 'gear') onToggleEquip(i);
                    else if (it.kind !== 'empty') onToast('장비만 장착할 수 있어요');
                  }}
                >
                  <span className="todie__slot-idx">{i + 1}</span>
                  {it.kind !== 'empty' && (
                    <>
                      <ItemIcon item={it} />
                      <span className={`todie__slot-qty${wrongJob ? ' is-wrong-job' : ''}`}>
                        {it.qty}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
