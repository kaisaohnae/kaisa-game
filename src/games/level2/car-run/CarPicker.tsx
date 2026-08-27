'use client';

import {CAR_RUN_PICKER_VEHICLES, type VehicleDef} from './vehicles';
import './car-picker.css';

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
};

function previewSrc(def: VehicleDef) {
  return def.src ?? def.frames?.[0] ?? '';
}

export default function CarPicker({selectedId, onSelect}: Props) {
  return (
    <div className="car-picker">
      <p className="car-picker__label">어떤 자동차로 달릴까요?</p>
      <div className="car-picker__grid" role="listbox" aria-label="자동차 선택">
        {CAR_RUN_PICKER_VEHICLES.map((vehicle) => {
          const selected = vehicle.id === selectedId;
          return (
            <button
              key={vehicle.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`car-picker__item${selected ? ' is-selected' : ''}`}
              onClick={() => onSelect(vehicle.id)}
            >
              <span className="car-picker__thumb">
                <img
                  className="car-picker__img"
                  src={previewSrc(vehicle)}
                  alt=""
                  draggable={false}
                />
              </span>
              <span className="car-picker__name">{vehicle.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
