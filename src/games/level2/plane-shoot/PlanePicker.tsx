'use client';

import {PLANE_SHOOT_PICKER, type PlaneDef} from './planes';
import './plane-picker.css';

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
};

function previewSrc(def: PlaneDef) {
  return def.src;
}

export default function PlanePicker({selectedId, onSelect}: Props) {
  return (
    <div className="plane-picker">
      <p className="plane-picker__label">어떤 비행기로 날까요?</p>
      <div className="plane-picker__grid" role="listbox" aria-label="비행기 선택">
        {PLANE_SHOOT_PICKER.map((plane) => {
          const selected = plane.id === selectedId;
          return (
            <button
              key={plane.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`plane-picker__item${selected ? ' is-selected' : ''}`}
              onClick={() => onSelect(plane.id)}
            >
              <span className="plane-picker__thumb">
                <img
                  className="plane-picker__img"
                  src={previewSrc(plane)}
                  alt=""
                  draggable={false}
                />
              </span>
              <span className="plane-picker__name">{plane.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
