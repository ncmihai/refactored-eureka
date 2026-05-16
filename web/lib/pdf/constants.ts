import type { Relation } from "../report-data";

export type RGB = readonly [number, number, number];

export const PAGE_W = 595;
export const PAGE_H = 842;
export const M = 42;
export const BRAND: RGB = [0.08, 0.33, 0.24];
export const AMBER: RGB = [0.7, 0.31, 0.04];
export const INK: RGB = [0.12, 0.11, 0.1];
export const MUTED: RGB = [0.36, 0.33, 0.29];
export const BORDER: RGB = [0.86, 0.84, 0.8];
export const SOFT: RGB = [0.96, 0.95, 0.92];

export function rgb(value: RGB) {
  return `${value[0].toFixed(3)} ${value[1].toFixed(3)} ${value[2].toFixed(3)}`;
}

export function brandRgb(value: Relation): RGB {
  if (!value || typeof value !== "object" || !value.brandColor) return BRAND;
  const hex = value.brandColor.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return BRAND;
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}
