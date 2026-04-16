export interface Nutrients {
  calories: number        // 热量 (kcal)
  carbs: number           // 碳水化合物 (g)
  completeProtein: number // 完全蛋白 (g)
  incompleteProtein: number // 不完全蛋白 (g)
  fat: number             // 脂肪 (g)
  fiber: number           // 膳食纤维 (g)
  sodium: number          // 钠 (mg)
  // 微量元素
  vitaminA: number        // 维生素A (μg)
  vitaminC: number        // 维生素C (mg)
  vitaminD: number        // 维生素D (μg)
  vitaminE: number        // 维生素E (mg)
  vitaminB1: number       // 维生素B1 (mg)
  vitaminB2: number       // 维生素B2 (mg)
  calcium: number         // 钙 (mg)
  iron: number            // 铁 (mg)
  zinc: number            // 锌 (mg)
  potassium: number       // 钾 (mg)
  magnesium: number       // 镁 (mg)
}

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0,
  carbs: 0,
  completeProtein: 0,
  incompleteProtein: 0,
  fat: 0,
  fiber: 0,
  sodium: 0,
  vitaminA: 0,
  vitaminC: 0,
  vitaminD: 0,
  vitaminE: 0,
  vitaminB1: 0,
  vitaminB2: 0,
  calcium: 0,
  iron: 0,
  zinc: 0,
  potassium: 0,
  magnesium: 0,
}

// 宏量营养素 keys
export const MACRO_KEYS: (keyof Nutrients)[] = [
  'calories', 'carbs', 'completeProtein', 'incompleteProtein', 'fat', 'fiber', 'sodium',
]

// 微量元素 keys
export const MICRO_KEYS: (keyof Nutrients)[] = [
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminB1', 'vitaminB2',
  'calcium', 'iron', 'zinc', 'potassium', 'magnesium',
]

export const ALL_NUTRIENT_KEYS: (keyof Nutrients)[] = [...MACRO_KEYS, ...MICRO_KEYS]

export const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  calories: '热量',
  carbs: '碳水',
  completeProtein: '完全蛋白',
  incompleteProtein: '不完全蛋白',
  fat: '脂肪',
  fiber: '膳食纤维',
  sodium: '钠',
  vitaminA: '维生素A',
  vitaminC: '维生素C',
  vitaminD: '维生素D',
  vitaminE: '维生素E',
  vitaminB1: '维生素B1',
  vitaminB2: '维生素B2',
  calcium: '钙',
  iron: '铁',
  zinc: '锌',
  potassium: '钾',
  magnesium: '镁',
}

export const NUTRIENT_UNITS: Record<keyof Nutrients, string> = {
  calories: 'kcal',
  carbs: 'g',
  completeProtein: 'g',
  incompleteProtein: 'g',
  fat: 'g',
  fiber: 'g',
  sodium: 'mg',
  vitaminA: 'μg',
  vitaminC: 'mg',
  vitaminD: 'μg',
  vitaminE: 'mg',
  vitaminB1: 'mg',
  vitaminB2: 'mg',
  calcium: 'mg',
  iron: 'mg',
  zinc: 'mg',
  potassium: 'mg',
  magnesium: 'mg',
}

export interface Food {
  id: string
  name: string
  photoURL?: string
  unit: string           // e.g., "g", "个", "杯"
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

// 删除申请
export interface DeleteRequest {
  id: string
  foodId: string
  foodName: string
  requestedBy: string    // user uid
  requestedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: number
}
