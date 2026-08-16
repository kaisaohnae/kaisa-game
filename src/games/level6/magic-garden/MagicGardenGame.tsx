'use client';

import {useCallback, useEffect, useState} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import {isKidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import {loadRpg, saveRpg} from '@/games/shared/rpg-storage';
import './magic-garden.css';

const KEY = 'kaisa-rpg-magic-garden';

type Plot = {stage: 0 | 1 | 2 | 3; crop: KidsIconId};

type GardenSave = {
  level: number;
  xp: number;
  coins: number;
  plots: Plot[];
};

const CROPS: KidsIconId[] = [
  'garden-seed',
  'garden-tulip',
  'garden-sunflower',
  'garden-carrot',
  'fruit-strawberry',
];

const STAGE_ICONS: KidsIconId[] = [
  'garden-hole',
  'garden-sprout',
  'garden-leaf',
  'garden-bloom',
];

const DEFAULT: GardenSave = {
  level: 1,
  xp: 0,
  coins: 5,
  plots: Array.from({length: 4}, () => ({
    stage: 0 as const,
    crop: 'garden-seed',
  })),
};

function normalizeSave(raw: GardenSave): GardenSave {
  return {
    ...raw,
    plots: raw.plots.map((p) => ({
      stage: p.stage,
      crop: isKidsIconId(p.crop) ? p.crop : 'garden-seed',
    })),
  };
}

function xpNeed(level: number) {
  return 10 + level * 8;
}

function plotIcon(plot: Plot): KidsIconId {
  if (plot.stage === 0) return STAGE_ICONS[0];
  if (plot.stage === 3) return plot.crop;
  return STAGE_ICONS[plot.stage];
}

export default function MagicGardenGame() {
  const [save, setSave] = useState<GardenSave>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [msg, setMsg] = useState('씨앗을 심고 물을 줘요');

  useEffect(() => {
    setSave(normalizeSave(loadRpg(KEY, DEFAULT)));
    setReady(true);
  }, []);

  const persist = useCallback((next: GardenSave) => {
    setSave(next);
    saveRpg(KEY, next);
  }, []);

  const addXp = (base: GardenSave, amount: number) => {
    let {level, xp} = base;
    let leveled = false;
    xp += amount;
    while (xp >= xpNeed(level)) {
      xp -= xpNeed(level);
      level += 1;
      leveled = true;
    }
    const next = {...base, level, xp};
    if (leveled) {
      setCelebrate(true);
      setMsg(`정원 Lv.${level}!`);
      window.setTimeout(() => setCelebrate(false), 900);
    }
    return next;
  };

  const plant = (index: number) => {
    if (!ready) return;
    const plot = save.plots[index];
    if (plot.stage !== 0) return;
    if (save.coins < 1) {
      setMsg('코인이 더 필요해요');
      return;
    }
    const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
    const plots = save.plots.map((p, i) =>
      i === index ? {stage: 1 as const, crop} : p,
    );
    persist({...save, coins: save.coins - 1, plots});
    setMsg('씨앗 심기 완료!');
  };

  const water = (index: number) => {
    if (!ready) return;
    const plot = save.plots[index];
    if (plot.stage === 0 || plot.stage >= 3) return;
    const nextStage = (plot.stage + 1) as 1 | 2 | 3;
    const plots = save.plots.map((p, i) =>
      i === index ? {...p, stage: nextStage} : p,
    );
    let next = addXp({...save, plots}, 3);
    if (nextStage === 3) {
      next = {...next, coins: next.coins + 2};
      setMsg('꽃이 피었어요! +2코인');
    } else {
      setMsg('쑥쑥 자란다!');
    }
    persist(next);
  };

  const harvest = (index: number) => {
    if (!ready) return;
    const plot = save.plots[index];
    if (plot.stage !== 3) return;
    const plots = save.plots.map((p, i) =>
      i === index ? {stage: 0 as const, crop: 'garden-seed' as KidsIconId} : p,
    );
    const next = addXp({...save, plots, coins: save.coins + 3}, 6);
    persist(next);
    setCelebrate(true);
    setMsg('수확! 대단해');
    window.setTimeout(() => setCelebrate(false), 850);
  };

  const onPlot = (index: number) => {
    const plot = save.plots[index];
    if (plot.stage === 0) plant(index);
    else if (plot.stage < 3) water(index);
    else harvest(index);
  };

  const need = xpNeed(save.level);

  return (
    <div className="magic-garden">
      <SuccessBurst show={celebrate} />
      <div className="magic-garden__badge">
        <KidsIcon id="item-plant" size="1.1em" /> Lv.{save.level} ·{' '}
        <KidsIcon id="item-coin" size="1em" /> {save.coins}
      </div>
      <p className="magic-garden__msg">{msg}</p>

      <div className="magic-garden__xp">
        XP
        <span className="magic-garden__bar">
          <i style={{width: `${Math.min(100, (save.xp / need) * 100)}%`}} />
        </span>
      </div>

      <div className="magic-garden__plots">
        {save.plots.map((plot, i) => (
          <button
            key={i}
            type="button"
            className="magic-garden__plot"
            aria-label={
              plot.stage === 0
                ? '씨앗 심기'
                : plot.stage < 3
                  ? '물 주기'
                  : '수확하기'
            }
            onClick={() => onPlot(i)}
          >
            <KidsIcon id={plotIcon(plot)} size="1em" />
            <em>
              {plot.stage === 0 ? '심기' : plot.stage < 3 ? '물주기' : '수확'}
            </em>
          </button>
        ))}
      </div>
    </div>
  );
}
