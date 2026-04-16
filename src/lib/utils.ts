import type { Nutrients } from '../types'

export function multiplyNutrients(nutrients: Nutrients, multiplier: number): Nutrients {
  return {
    calories: Math.round(nutrients.calories * multiplier * 10) / 10,
    carbs: Math.round(nutrients.carbs * multiplier * 10) / 10,
    completeProtein: Math.round(nutrients.completeProtein * multiplier * 10) / 10,
    incompleteProtein: Math.round(nutrients.incompleteProtein * multiplier * 10) / 10,
    fat: Math.round(nutrients.fat * multiplier * 10) / 10,
    fiber: Math.round(nutrients.fiber * multiplier * 10) / 10,
    sodium: Math.round(nutrients.sodium * multiplier * 10) / 10,
  }
}

export function sumNutrients(...items: Nutrients[]): Nutrients {
  return items.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      carbs: acc.carbs + n.carbs,
      completeProtein: acc.completeProtein + n.completeProtein,
      incompleteProtein: acc.incompleteProtein + n.incompleteProtein,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
      sodium: acc.sodium + n.sodium,
    }),
    { calories: 0, carbs: 0, completeProtein: 0, incompleteProtein: 0, fat: 0, fiber: 0, sodium: 0 },
  )
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
