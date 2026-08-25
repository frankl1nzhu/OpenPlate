import type { Nutrients, Food, FoodUnit, LogEntry } from '../types'
import { ALL_NUTRIENT_KEYS, EMPTY_NUTRIENTS } from '../types'

export function multiplyNutrients(nutrients: Nutrients, multiplier: number): Nutrients {
  const result = { ...EMPTY_NUTRIENTS }
  for (const key of ALL_NUTRIENT_KEYS) {
    result[key] = Math.round((nutrients[key] || 0) * multiplier * 10) / 10
  }
  // protein is a derived total – always recompute from sub-fields
  result.protein = Math.round((result.completeProtein + result.incompleteProtein) * 10) / 10
  return result
}

export function sumNutrients(...items: Nutrients[]): Nutrients {
  const result = { ...EMPTY_NUTRIENTS }
  for (const n of items) {
    for (const key of ALL_NUTRIENT_KEYS) {
      result[key] += n[key] || 0
    }
  }
  // protein is a derived total – always recompute from sub-fields
  result.protein = result.completeProtein + result.incompleteProtein
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

// Get available units for a food (backward compat: old foods get single synthetic unit)
export function getFoodUnits(food: Food): FoodUnit[] {
  if (food.units && food.units.length > 0) return food.units
  return [{ name: food.unit, grams: food.defaultQuantity }]
}

// Calculate nutrients for a food with a specific quantity and unit
export function calculateFoodNutrients(food: Food, quantity: number, unitName?: string): Nutrients {
  if (food.units && food.units.length > 0 && unitName) {
    const unit = food.units.find((u) => u.name === unitName)
    if (unit) {
      const multiplier = (quantity * unit.grams) / food.defaultQuantity
      return multiplyNutrients(food.nutrientsPerUnit, multiplier)
    }
  }
  // Fallback: old multiplier system (quantity is a multiplier of the base amount)
  return multiplyNutrients(food.nutrientsPerUnit, quantity)
}

// Normalize mealIndex values so remaining meal groups are sequentially numbered 1, 2, 3...
export function normalizeMealIndices(entries: LogEntry[]): LogEntry[] {
  if (!entries || entries.length === 0) return []

  // Collect distinct mealIndex values sorted in numeric ascending order
  const distinctMealIndices = Array.from(
    new Set(
      entries
        .map((e, idx) => e.mealIndex ?? (idx + 1))
        .filter((val): val is number => typeof val === 'number' && !isNaN(val))
    )
  ).sort((a, b) => a - b)

  const indexMap = new Map<number, number>()
  distinctMealIndices.forEach((rawIndex, newIdx) => {
    indexMap.set(rawIndex, newIdx + 1)
  })

  return entries
    .map((entry, idx) => {
      const rawMealIndex = entry.mealIndex ?? (idx + 1)
      const newMealIndex = indexMap.get(rawMealIndex) ?? (idx + 1)
      return { ...entry, mealIndex: newMealIndex }
    })
    .sort((a, b) => (a.mealIndex ?? 0) - (b.mealIndex ?? 0) || (a.timestamp ?? 0) - (b.timestamp ?? 0))
}

