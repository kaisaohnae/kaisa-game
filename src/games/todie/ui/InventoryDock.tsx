'use client';

import {useEffect, useRef, useState, type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {EQUIP_SLOTS, type Equipment, type GearSlot, type Item} from '../content/equip';
import {
  clearItem,
  isHotbarConsumableBagIndex,
  HOTBAR_MANA_BAG,
  HOTBAR_POTION_BAG,
} from '../content/equip';
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

function ItemIcon({item, forbidden = false}: {item: Item; forbidden?: boolean}) {
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
      {forbidden && <span className="todie__forbid-mark" aria-hidden title="사용 불가" />}
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
  expanded,
  onToggleExpand,
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
  expanded: boolean;
  onToggleExpand: () => void;
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
  const dropHandledRef = useRef(false);
  const dragFromRef = useRef<number | null>(null);

  const tryEquipBag = (index: number, item: Item) => {
    if (isHotbarConsumableBagIndex(index)) {
      onToast('4·5번은 물약 전용이에요');
      return;
    }
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
    // Hotbar potion/mana slots stay fixed — no rearranging into/out of 0·1
    if (isHotbarConsumableBagIndex(a) || isHotbarConsumableBagIndex(b)) {
      onToast('4·5번 물약 칸은 고정이에요');
      return;
    }
    const tmp = bag[a];
    bag[a] = bag[b];
    bag[b] = tmp;
    onMutate();
  };

  const discardIfDroppedOutside = (from: number) => {
    if (from < 0 || from >= bag.length) return;
    const it = bag[from];
    if (!it || it.kind === 'empty') return;
    if (!window.confirm('삭제하시겠습니까?')) return;
    clearItem(it);
    onMutate();
    onToast('아이템을 버렸어요');
  };

  const power = sumEquippedStats(equipped);
  const worn = EQUIP_SLOTS.filter((s) => Boolean(equipped[s.id])).length;
  const bagUsed = bag.filter((it) => it.kind !== 'empty').length;

  if (!expanded) {
    return (
      <button
        type="button"
        className="todie__inv-fab"
        onClick={onToggleExpand}
        onPointerDown={(e) => e.stopPropagation()}
        title="인벤 열기 (I)"
        aria-label="인벤 열기"
      >
        <span className="todie__inv-fab-icon" aria-hidden />
        <span className="todie__inv-fab-badge">{bagUsed}</span>
      </button>
    );
  }

  return (
    <div
      className="todie__inv-dock is-max"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {tip &&
        typeof document !== 'undefined' &&
        createPortal(<ItemBubble info={tip.info} x={tip.x} y={tip.y} />, document.body)}

      <button
        type="button"
        className="todie__inv-close"
        onClick={onToggleExpand}
        title="인벤 닫기 (I)"
        aria-label="인벤 닫기"
      >
        −
      </button>

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
              <span className="todie__tier-badge todie__tier-badge--mythic">신화템</span>
            </div>
            <div className="todie__inv-toolbar-sub">
              장비 {worn} · 가방 {bagUsed}
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
          <span>가방 {bag.length}</span>
          <span className="todie__inv-bag-sub">
            드래그 이동 · 밖으로 떨구면 삭제 · 1·2칸=핫바 4·5(물약)
          </span>
        </div>
        <div className="todie__inv-scroll">
          <div className="todie__inv-grid">
            {bag.map((it, i) => {
              const wrongJob = Boolean(it.job && it.job !== job);
              const blocked = wrongJob;
              const hotbarLock = isHotbarConsumableBagIndex(i);
              const hotbarLabel =
                i === HOTBAR_POTION_BAG ? '4 체력' : i === HOTBAR_MANA_BAG ? '5 마나' : null;
              return (
                <div
                  key={`${it.id}-${i}`}
                  className={`todie__slot${dragFrom === i ? ' is-drag' : ''}${
                    over === i ? ' is-over' : ''
                  }${it.tier ? ` is-tier-${it.tier}` : ''}${blocked ? ' is-blocked' : ''}${
                    hotbarLock ? ' is-hotbar-lock' : ''
                  }`}
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
                    dropHandledRef.current = false;
                    dragFromRef.current = i;
                    setDragFrom(i);
                    e.dataTransfer.setData('text/plain', String(i));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    const from = dragFromRef.current;
                    const droppedOnSlot = dropHandledRef.current;
                    dragFromRef.current = null;
                    setDragFrom(null);
                    setOver(null);
                    dropHandledRef.current = false;
                    if (!droppedOnSlot && from != null) {
                      discardIfDroppedOutside(from);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(i);
                  }}
                  onDragLeave={() => setOver((o) => (o === i ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropHandledRef.current = true;
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    if (!Number.isNaN(from)) swap(from, i);
                    setDragFrom(null);
                    setOver(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (hotbarLock) {
                      onToast('4·5번 물약 칸은 고정이에요');
                      return;
                    }
                    if (it.kind === 'gear') onToggleEquip(i);
                    else if (it.kind !== 'empty') onToast('장비만 장착할 수 있어요');
                  }}
                >
                  <span className="todie__slot-idx">{hotbarLabel ?? i + 1}</span>
                  {it.kind !== 'empty' && (
                    <>
                      <ItemIcon item={it} forbidden={blocked} />
                      <span className={`todie__slot-qty${blocked ? ' is-blocked' : ''}`}>
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
