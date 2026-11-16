/**
 * Slider math for estimate questions. Framework-free.
 * A slider position is a fraction 0..1; log scale spreads values evenly by powers of ten.
 */

export interface EstimateRange {
  min: number;
  max: number;
  scale?: "linear" | "log";
  step?: number;
}

const clamp01 = (f: number) => Math.min(1, Math.max(0, f));

export function valueFromFraction(fraction: number, range: EstimateRange): number {
  const f = clamp01(fraction);
  const raw =
    range.scale === "log" && range.min > 0
      ? Math.exp(Math.log(range.min) + f * (Math.log(range.max) - Math.log(range.min)))
      : range.min + f * (range.max - range.min);
  if (range.scale === "log") return roundSignificant(raw, 2);
  const step = range.step ?? 1;
  return clampRange(Math.round(raw / step) * step, range);
}

export function fractionFromValue(value: number, range: EstimateRange): number {
  if (range.max === range.min) return 0;
  if (range.scale === "log" && range.min > 0 && value > 0) {
    return clamp01((Math.log(value) - Math.log(range.min)) / (Math.log(range.max) - Math.log(range.min)));
  }
  return clamp01((value - range.min) / (range.max - range.min));
}

function clampRange(v: number, range: EstimateRange): number {
  return Math.min(range.max, Math.max(range.min, v));
}

function roundSignificant(v: number, digits: number): number {
  if (v === 0) return 0;
  const p = Math.pow(10, digits - 1 - Math.floor(Math.log10(Math.abs(v))));
  return Math.round(v * p) / p;
}

/** "400,000", "2.5 million", "1.2 billion" for big numbers; plain for small ones. */
export function formatEstimate(value: number, unit?: string): string {
  const abs = Math.abs(value);
  let text: string;
  if (abs >= 1e9) text = `${trim(value / 1e9)} billion`;
  else if (abs >= 1e6) text = `${trim(value / 1e6)} million`;
  else if (abs >= 1e4) text = Math.round(value).toLocaleString("en-US");
  else text = trim(value);
  return unit ? `${text} ${unit}` : text;
}

function trim(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}
