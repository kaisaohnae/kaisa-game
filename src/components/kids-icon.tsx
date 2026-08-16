'use client';

import {
  KIDS_ICON_REGISTRY,
  type KidsIconId,
} from '@/assets/kids-icons';
import './kids-icon.css';

type Props = {
  id: KidsIconId;
  size?: number | string;
  className?: string;
  label?: string;
};

/** Renders a catalog SVG by id — single place for all kids visuals. */
export function KidsIcon({id, size = '1em', className, label}: Props) {
  const entry = KIDS_ICON_REGISTRY[id];
  if (!entry) return null;

  const Icon = entry.Component;
  const aria = label ?? entry.label;

  return (
    <Icon
      className={className ? `kids-icon ${className}` : 'kids-icon'}
      width={size}
      height={size}
      role="img"
      aria-label={aria}
    />
  );
}
