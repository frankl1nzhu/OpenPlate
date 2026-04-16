export interface Nutrients {
  calories: number       // 千卡 (kcal)
  carbs: number          // 碳水化合物 (g)
  completeProtein: number // 完全蛋白 (g)
  incompleteProtein: number // 不完全蛋白 (g)
  fat: number            // 脂肪 (g)
  fiber: number          // 膳食纤维 (g)
  sodium: number         // 钠 (mg)
}

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0,
  carbs: 0,
  completeProtein: 0,
  incompleteProtein: 0,
  fat: 0,
  fiber: 0,
  sodium: 0,
}

export const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  calories: '热量',
  carbs: '碳水',
  completeProtein: '完全蛋白',
  incompleteProtein: '不完全蛋白',
  fat: '脂肪',
  fiber: '膳食纤维',
  sodium: '钠',
}

export const NUTRIENT_UNITS: Record<keyof Nutrients, string> = {
  calories: 'kcal',
  carbs: 'g',
  completeProtein: 'g',
  incompleteProtein: 'g',
  fat: 'g',
  fiber: 'g',
  sodium: 'mg',
}

export interface Food {
  id: string
  name: string
  photoURL?: string
  unit: string           // e.g., "100g", "1个", "1杯"
  defaultQuantity: number // default amount per unit
  isCompleteProtein: boolean
  nutrientsPerUnit: Nutrients
  createdBy: string      // user uid
  createdAt: number      // timestamp
}

export interface MealFood {
  foodId: string
  quantity: number
}

export interface Meal {
  id: string
  name: string
  photoURL?: string
  foods: MealFood[]
  createdBy: string
  createdAt: number
}

export interface LogEntry {
  id: string
  type: 'food' | 'meal'
  refId: string          // food or meal id
  quantity: number       // multiplier
  nutrients: Nutrients   // calculated at log time
  timestamp: number
}

export interface DailyLog {
  id: string             // format: userId_YYYY-MM-DD
  userId: string
  date: string           // YYYY-MM-DD
  entries: LogEntry[]
}

export interface DailyGoal {
  id: string             // same as userId
  userId: string
  targets: Nutrients
}
