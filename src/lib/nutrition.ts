import type { Nutrients, ExerciseType, ExerciseIntensity } from '../types'
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
 * Generate recommended daily nutrient targets based on TDEE and body metrics.
 * Uses DRI (Dietary Reference Intakes) for micronutrients.
 *
 * Macros strategy:
 * - Protein: 2.2g/kg (heavy labor or regular exercise), 1.6g/kg otherwise; 80% complete, 20% incomplete; weight-based only
 * - Fat: 30% of total calories; saturated <30%, monounsaturated >=50%, polyunsaturated remainder
 * - Carbs: remaining calories
 */
export function calculateRecommendedTargets(
  tdee: number,
  weightKg: number,
  gender: 'male' | 'female',
  age: number,
  activityLevel: string = 'sedentary',
  regularExercise: boolean = false,
): Nutrients {
  // Protein: based on weight only, not calories
  const isHighActivity = activityLevel === 'heavy' || regularExercise
  const proteinPerKg = isHighActivity ? 2.2 : 1.6
  const totalProtein = Math.round(weightKg * proteinPerKg)
  const proteinCalories = totalProtein * 4

  // Fat: 30% of TDEE
  const fatCalories = tdee * 0.30
  const totalFat = Math.round(fatCalories / 9)
  const saturatedFat = Math.round(totalFat * 0.30)   // upper limit 30%
  const monounsaturatedFat = Math.round(totalFat * 0.50) // at least 50%
  const polyunsaturatedFat = Math.round(totalFat * 0.20) // remainder

  // Carbs: remainder
  const carbCalories = tdee - proteinCalories - fatCalories
  const totalCarbs = Math.round(Math.max(0, carbCalories / 4))

  // Fiber: Institute of Medicine recommendation
  const fiber = gender === 'male' ? 30 : 25

  // DRI micronutrients based on age and gender (adults 19-70)
  const isMale = gender === 'male'
  const isOver50 = age >= 50

  return {
    ...EMPTY_NUTRIENTS,
    calories: tdee,
    carbs: totalCarbs,
    completeProtein: Math.round(totalProtein * 0.8),  // 80% complete protein
    incompleteProtein: Math.round(totalProtein * 0.2), // 20% incomplete protein
    fat: totalFat,
    saturatedFat,
    monounsaturatedFat,
    polyunsaturatedFat,
    fiber,
    sodium: 2300,
    // Vitamins (DRI values)
    vitaminA: isMale ? 900 : 700,           // μg RAE
    vitaminC: isMale ? 90 : 75,             // mg
    vitaminD: isOver50 ? 15 : 15,           // μg (600 IU)
    vitaminE: 15,                            // mg
    vitaminB1: isMale ? 1.2 : 1.1,          // mg
    vitaminB2: isMale ? 1.3 : 1.1,          // mg
    vitaminB6: isOver50 ? 1.7 : (isMale ? 1.3 : 1.3), // mg
    vitaminB12: 2.4,                         // μg
    folate: 400,                             // μg DFE
    niacin: isMale ? 16 : 14,               // mg
    pantothenicAcid: 5,                      // mg
    biotin: 30,                              // μg
    // Minerals (DRI values)
    calcium: isOver50 ? 1200 : 1000,         // mg
    iron: isMale ? 8 : (age < 51 ? 18 : 8), // mg
    zinc: isMale ? 11 : 8,                   // mg
    potassium: isMale ? 3400 : 2600,         // mg
    magnesium: isMale ? (isOver50 ? 420 : 400) : (isOver50 ? 320 : 310), // mg
    phosphorus: 700,                         // mg
    selenium: 55,                            // μg
    iodine: 150,                             // μg
    copper: 0.9,                             // mg
    manganese: isMale ? 2.3 : 1.8,          // mg
    chromium: isMale ? 35 : 25,             // μg
    molybdenum: 45,                          // μg
    choline: isMale ? 550 : 425,             // mg
  }
}

/**
 * Adjust daily targets based on exercise calories burned and fitness goal.
 * - Exercise calories are added to the calorie target (eat more to compensate)
 * - Fitness goal adjustment is applied on top
 * - Extra calories distributed: protein stays constant, 25% fat / 75% carbs
 */
export function adjustTargetsForExercise(
  baseTargets: Nutrients,
  exerciseCalories: number,
  calorieAdjustment: number = 0,
): Nutrients {
  const extraCalories = exerciseCalories + calorieAdjustment
  if (extraCalories === 0) return baseTargets

  const adjustedCalories = baseTargets.calories + extraCalories

  // Distribute extra calories: 25% fat, 75% carbs (protein unchanged)
  const extraFatCalories = extraCalories * 0.25
  const extraCarbCalories = extraCalories * 0.75

  return {
    ...baseTargets,
    calories: Math.round(adjustedCalories),
    fat: Math.round(baseTargets.fat + extraFatCalories / 9),
    carbs: Math.round(baseTargets.carbs + extraCarbCalories / 4),
  }
}
