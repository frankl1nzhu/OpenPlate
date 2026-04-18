export interface Nutrients {
  calories: number
  carbs: number
  completeProtein: number
  incompleteProtein: number
  fat: number
  saturatedFat: number
  monounsaturatedFat: number
  polyunsaturatedFat: number
  fiber: number
  sodium: number
  vitaminA: number
  vitaminC: number
  vitaminD: number
  vitaminE: number
  vitaminB1: number
  vitaminB2: number
  vitaminB6: number
  vitaminB12: number
  folate: number
  niacin: number
  pantothenicAcid: number
  biotin: number
  calcium: number
  iron: number
  zinc: number
  potassium: number
  magnesium: number
  phosphorus: number
  selenium: number
  iodine: number
  copper: number
  manganese: number
  chromium: number
  molybdenum: number
  choline: number
}

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0, carbs: 0, completeProtein: 0, incompleteProtein: 0,
  fat: 0, saturatedFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0,
  fiber: 0, sodium: 0,
  vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0,
  vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
  folate: 0, niacin: 0, pantothenicAcid: 0, biotin: 0,
  calcium: 0, iron: 0, zinc: 0, potassium: 0, magnesium: 0,
  phosphorus: 0, selenium: 0, iodine: 0, copper: 0, manganese: 0,
  chromium: 0, molybdenum: 0, choline: 0,
}

export const ALL_NUTRIENT_KEYS: (keyof Nutrients)[] = [
  'calories', 'carbs', 'completeProtein', 'incompleteProtein',
  'fat', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat',
  'fiber', 'sodium',
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE',
  'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12',
  'folate', 'niacin', 'pantothenicAcid', 'biotin',
  'calcium', 'iron', 'zinc', 'potassium', 'magnesium',
  'phosphorus', 'selenium', 'iodine', 'copper', 'manganese',
  'chromium', 'molybdenum', 'choline',
]

export const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  calories: '热量', carbs: '碳水',
  completeProtein: '完全蛋白', incompleteProtein: '不完全蛋白',
  fat: '脂肪', saturatedFat: '饱和脂肪',
  monounsaturatedFat: '单不饱和脂肪', polyunsaturatedFat: '多不饱和脂肪',
  fiber: '膳食纤维', sodium: '钠',
  vitaminA: '维生素A', vitaminC: '维生素C', vitaminD: '维生素D', vitaminE: '维生素E',
  vitaminB1: '维生素B1', vitaminB2: '维生素B2', vitaminB6: '维生素B6', vitaminB12: '维生素B12',
  folate: '叶酸', niacin: '烟酸', pantothenicAcid: '泛酸', biotin: '生物素',
  calcium: '钙', iron: '铁', zinc: '锌', potassium: '钾', magnesium: '镁',
  phosphorus: '磷', selenium: '硒', iodine: '碘', copper: '铜', manganese: '锰',
  chromium: '铬', molybdenum: '钼', choline: '胆碱',
}

export const NUTRIENT_UNITS: Record<keyof Nutrients, string> = {
  calories: 'kcal', carbs: 'g',
  completeProtein: 'g', incompleteProtein: 'g',
  fat: 'g', saturatedFat: 'g',
  monounsaturatedFat: 'g', polyunsaturatedFat: 'g',
  fiber: 'g', sodium: 'mg',
  vitaminA: 'μg', vitaminC: 'mg', vitaminD: 'μg', vitaminE: 'mg',
  vitaminB1: 'mg', vitaminB2: 'mg', vitaminB6: 'mg', vitaminB12: 'μg',
  folate: 'μg', niacin: 'mg', pantothenicAcid: 'mg', biotin: 'μg',
  calcium: 'mg', iron: 'mg', zinc: 'mg', potassium: 'mg', magnesium: 'mg',
  phosphorus: 'mg', selenium: 'μg', iodine: 'μg', copper: 'mg', manganese: 'mg',
  chromium: 'μg', molybdenum: 'μg', choline: 'mg',
}

export interface LLMFoodResult {
  name: string
  isCompleteProtein: boolean
  nutrients: Nutrients
}

export type AiTaskType = 'food' | 'quick'
export type AiTaskStatus = 'processing' | 'ready' | 'failed'
