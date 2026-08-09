import type { Nutrients, ExerciseType, ExerciseIntensity, FitnessGoalType } from '../types'
import { EMPTY_NUTRIENTS } from '../types'

// MET values: exercise type × intensity
// Source: Ainsworth BE et al. "2011 Compendium of Physical Activities"
export const MET_VALUES: Record<ExerciseType, Record<ExerciseIntensity, number>> = {
  running: { low: 6.0, moderate: 8.3, high: 11.0 },
  walking: { low: 2.5, moderate: 3.5, high: 5.0 },
  cycling: { low: 4.0, moderate: 6.8, high: 10.0 },
  swimming: { low: 4.5, moderate: 7.0, high: 10.0 },
  weight_training: { low: 3.5, moderate: 5.0, high: 6.0 },
  yoga: { low: 2.5, moderate: 3.0, high: 4.0 },
  hiit: { low: 6.0, moderate: 8.0, high: 12.0 },
  other: { low: 3.0, moderate: 5.0, high: 7.0 },
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
}

/**
 * Mifflin-St Jeor equation for BMR (most accurate for general population)
 * Male:   10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * Female: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 */
export function calculateBMR(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}

/**
 * TDEE = BMR × activity multiplier
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: string,
): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2
  return Math.round(bmr * multiplier)
}

/**
 * Calculate exercise calories burned using MET formula
 * Calories = MET × weightKg × (durationMinutes / 60)
 */
export function calculateExerciseCalories(
  exerciseType: ExerciseType,
  intensity: ExerciseIntensity,
  durationMinutes: number,
  weightKg: number,
): number {
  const met = MET_VALUES[exerciseType]?.[intensity] ?? 5.0
  return Math.round(met * weightKg * (durationMinutes / 60))
}

/**
 * Protein per kg of body weight by gender and fitness goal
 */
export const PROTEIN_PER_KG: Record<'male' | 'female', Record<FitnessGoalType, number>> = {
  male:   { bulk: 2.0, maintain: 1.8, cut: 2.2 },
  female: { bulk: 1.8, maintain: 1.6, cut: 2.0 },
}

/**
 * Fat per kg of body weight by gender and fitness goal
 */
export const FAT_PER_KG: Record<'male' | 'female', Record<FitnessGoalType, number>> = {
  male:   { bulk: 1.0, maintain: 0.8, cut: 0.6 },
  female: { bulk: 1.0, maintain: 0.9, cut: 0.8 },
}

/**
 * Generate recommended daily nutrient targets based on TDEE, body metrics and fitness goal.
 *
 * Macros strategy:
 * - Protein (g/kg): male bulk 2.0 / maintain 1.8 / cut 2.2; female bulk 1.8 / maintain 1.6 / cut 2.0
 * - Fat (g/kg): male bulk 1.0 / maintain 0.8 / cut 0.6; female bulk 1.0 / maintain 0.9 / cut 0.8
 * - Carbs: remaining calories after protein and fat
 * - Fiber: total kcal / 1000 × 14 g
 */
export function calculateRecommendedTargets(
  tdee: number,
  weightKg: number,
  gender: 'male' | 'female',
  age: number,
  goal: FitnessGoalType = 'maintain',
): Nutrients {
  // Protein: weight-based only
  const proteinPerKg = PROTEIN_PER_KG[gender][goal]
  const totalProtein = Math.round(weightKg * proteinPerKg)
  const proteinCalories = totalProtein * 4

  // Fat: weight-based only
  const fatPerKg = FAT_PER_KG[gender][goal]
  const totalFat = Math.round(weightKg * fatPerKg)
  const fatCalories = totalFat * 9
  const saturatedFat       = Math.round(totalFat * 0.30)
  const monounsaturatedFat = Math.round(totalFat * 0.50)
  const polyunsaturatedFat = Math.round(totalFat * 0.20)

  // Carbs: remaining calories
  const carbCalories = tdee - proteinCalories - fatCalories
  const totalCarbs = Math.round(Math.max(0, carbCalories / 4))

  // Fiber: tdee / 1000 × 14
  const fiber = Math.round(tdee / 1000 * 14)

  // DRI micronutrients based on age and gender (adults 19-70)
  const isMale = gender === 'male'
  const isOver50 = age >= 50

  return {
    ...EMPTY_NUTRIENTS,
    calories: Math.round(proteinCalories + fatCalories + Math.max(0, carbCalories)),
    carbs: totalCarbs,
    protein: totalProtein,
    completeProtein:   Math.round(totalProtein * 0.6),
    incompleteProtein: Math.round(totalProtein * 0.4),
    fat: totalFat,
    saturatedFat,
    monounsaturatedFat,
    polyunsaturatedFat,
    fiber,
    sodium: 2300,
    vitaminA: isMale ? 900 : 700,
    vitaminC: isMale ? 90 : 75,
    vitaminD: 15,
    vitaminE: 15,
    vitaminB1: isMale ? 1.2 : 1.1,
    vitaminB2: isMale ? 1.3 : 1.1,
    vitaminB6: isOver50 ? 1.7 : 1.3,
    vitaminB12: 2.4,
    folate: 400,
    niacin: isMale ? 16 : 14,
    pantothenicAcid: 5,
    biotin: 30,
    calcium: isOver50 ? 1200 : 1000,
    iron: isMale ? 8 : (age < 51 ? 18 : 8),
    zinc: isMale ? 11 : 8,
    potassium: isMale ? 3400 : 2600,
    magnesium: isMale ? (isOver50 ? 420 : 400) : (isOver50 ? 320 : 310),
    phosphorus: 700,
    selenium: 55,
    iodine: 150,
    copper: 0.9,
    manganese: isMale ? 2.3 : 1.8,
    chromium: isMale ? 35 : 25,
    molybdenum: 45,
    choline: isMale ? 550 : 425,
  }
}

/**
 * Adjust daily targets based on exercise calories burned and fitness goal.
 * The saved daily goal is the maintain-weight baseline: protein/fat follow the
 * "maintain" ratios only. When an active fitness goal (bulk/cut) exists, its
 * protein/fat ratios are added ON TOP of the baseline (delta vs. maintain).
 * All extra (or reduced) calories are absorbed by carbs.
 */
export function adjustTargetsForExercise(
  baseTargets: Nutrients,
  exerciseCalories: number,
  calorieAdjustment: number = 0,
  goal?: FitnessGoalType,
  weightKg?: number,
  gender?: 'male' | 'female',
): Nutrients {
  const totalExtra = exerciseCalories + calorieAdjustment

  const canAdjustMacros = goal && goal !== 'maintain' && weightKg && gender
  const proteinDelta = canAdjustMacros
    ? Math.round(weightKg * (PROTEIN_PER_KG[gender][goal] - PROTEIN_PER_KG[gender]['maintain']))
    : 0
  const fatDelta = canAdjustMacros
    ? Math.round(weightKg * (FAT_PER_KG[gender][goal] - FAT_PER_KG[gender]['maintain']))
    : 0

  if (totalExtra === 0 && proteinDelta === 0 && fatDelta === 0) return baseTargets

  const newCalories = baseTargets.calories + totalExtra

  const baseProtein = baseTargets.completeProtein + baseTargets.incompleteProtein
  const newProtein = Math.max(0, baseProtein + proteinDelta)
  const newFat = Math.max(0, baseTargets.fat + fatDelta)

  // Carbs absorb the remainder
  const newCarbCalories = newCalories - newFat * 9 - newProtein * 4
  const newCarbs = Math.round(Math.max(0, newCarbCalories / 4))

  // Fiber: totalKcal / 1000 × 14
  const newFiber = Math.round(newCalories / 1000 * 14)

  const result: Nutrients = {
    ...baseTargets,
    calories: Math.round(newCalories),
    carbs: newCarbs,
    fiber: newFiber,
  }

  // Apply macro adjustments only when the fitness goal calls for them,
  // keeping the exercise-only path byte-identical to before.
  if (proteinDelta !== 0 || fatDelta !== 0) {
    const proteinScale = baseProtein > 0 ? newProtein / baseProtein : 1
    const fatScale = baseTargets.fat > 0 ? newFat / baseTargets.fat : 1
    result.protein = newProtein
    result.completeProtein = Math.round(baseTargets.completeProtein * proteinScale)
    result.incompleteProtein = Math.round(baseTargets.incompleteProtein * proteinScale)
    result.fat = newFat
    result.saturatedFat = Math.round(baseTargets.saturatedFat * fatScale)
    result.monounsaturatedFat = Math.round(baseTargets.monounsaturatedFat * fatScale)
    result.polyunsaturatedFat = Math.round(baseTargets.polyunsaturatedFat * fatScale)
  }

  return result
}
