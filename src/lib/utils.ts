import type { Nutrients } from '../types'
import { ALL_NUTRIENT_KEYS, EMPTY_NUTRIENTS } from '../types'

export function multiplyNutrients(nutrients: Nutrients, multiplier: number): Nutrients {
  const result = { ...EMPTY_NUTRIENTS }
  for (const key of ALL_NUTRIENT_KEYS) {
    result[key] = Math.round((nutrients[key] || 0) * multiplier * 10) / 10
  }
  return result
}

export function sumNutrients(...items: Nutrients[]): Nutrients {
  const result = { ...EMPTY_NUTRIENTS }
  for (const n of items) {
    for (const key of ALL_NUTRIENT_KEYS) {
      result[key] += n[key] || 0
    }
  }
  return result
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Clean undefined values for Firestore (Firestore rejects undefined)
export function cleanForFirestore<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj }
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }
  return cleaned
}
