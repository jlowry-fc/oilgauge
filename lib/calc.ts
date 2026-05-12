export function calcTotalInches(feet: number, inches: number, fraction: number): number {
  return feet * 12 + inches + fraction
}

export function calcBbls(totalInches: number, bblsPerInch: number): number {
  return Math.round(totalInches * bblsPerInch * 100) / 100
}

export function calcProduction(currentBbls: number, prevBbls: number, daysDiff: number) {
  const delta = Math.round((currentBbls - prevBbls) * 100) / 100
  const bblsPerDay = daysDiff > 0 ? Math.round(Math.max(0, delta) / daysDiff * 1000) / 1000 : 0
  return { delta, bblsPerDay }
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000 * 100) / 100
}

export const FRACTIONS = [
  { label: '0', value: 0 },
  { label: '⅛', value: 0.125 },
  { label: '¼', value: 0.25 },
  { label: '⅜', value: 0.375 },
  { label: '½', value: 0.5 },
  { label: '⅝', value: 0.625 },
  { label: '¾', value: 0.75 },
  { label: '⅞', value: 0.875 },
]

export const READING_TYPES = [
  { value: 'normal', label: 'Normal Gauge' },
  { value: 'oil_sold', label: 'Oil Sold' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'bottom_pulled', label: 'Bottom Pulled' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' },
]

export function fractLabel(v: number): string {
  const m: Record<number, string> = { 0: '0', 0.125: '⅛', 0.25: '¼', 0.375: '⅜', 0.5: '½', 0.625: '⅝', 0.75: '¾', 0.875: '⅞' }
  return m[v] ?? String(v)
}
