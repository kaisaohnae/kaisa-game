'use client';

import {useEffect, useRef, useState} from 'react';
import {EQUIP_SLOTS, type Equipment, type GearSlot, type Item} from '../content/equip';
import {jobLabel, type JobId, type LoadedImages} from '../content';
import {displaySettings} from '../content/settings';
import {drawJobPreview} from '../render/drawCharacter';
import {itemIconUrl, tierMeta, type GearTier} from '../content/items';

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

  const swap = (a: number, b: number) => {
    if (a === b || a < 0 || b < 0 || a >= bag.length || b >= bag.length) return;
    const tmp = bag[a];
    bag[a] = bag[b];
    bag[b] = tmp;
    onMutate();
  };

  return (
    <div
      className="todie__inv-dock"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
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
            <p className="todie__inv-hint">우클릭: 장착 토글</p>
            <div className="todie__tier-legend">
              <span className="todie__tier-badge todie__tier-badge--basic">기본템</span>
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
                title={
                  it
                    ? `${it.name}${tierMeta(it.tier) ? ` · ${tierMeta(it.tier)!.label}` : ''} (우클릭 해제)`
                    : s.label
                }
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
          <span className="todie__inv-bag-sub">드래그 이동 · 우클릭 장착</span>
        </div>
        <div className="todie__inv-scroll">
          <div className="todie__inv-grid">
            {bag.map((it, i) => (
              <div
                key={`${it.id}-${i}`}
                className={`todie__slot${dragFrom === i ? ' is-drag' : ''}${
                  over === i ? ' is-over' : ''
                }${it.tier ? ` is-tier-${it.tier}` : ''}`}
                draggable={it.kind !== 'empty'}
                onDragStart={(e) => {
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
                title={
                  it.kind === 'empty'
                    ? '빈 칸'
                    : [
                        it.name,
                        `x${it.qty}`,
                        tierMeta(it.tier)?.label,
                        it.job ? `${jobLabel(it.job)} 전용` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                }
              >
                <span className="todie__slot-idx">{i + 1}</span>
                {it.kind !== 'empty' && (
                  <>
                    <ItemIcon item={it} />
                    <span className="todie__slot-qty">{it.qty}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
