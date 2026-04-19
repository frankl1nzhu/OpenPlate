export interface Nutrients {
  calories: number        // 热量 (kcal)
  carbs: number           // 碳水化合物 (g)
  protein: number         // 蛋白质总量 (g) = completeProtein + incompleteProtein
  completeProtein: number // 完全蛋白 (g)
  incompleteProtein: number // 不完全蛋白 (g)
  fat: number             // 脂肪 (g)
  saturatedFat: number    // 饱和脂肪 (g)
  monounsaturatedFat: number // 单不饱和脂肪 (g)
  polyunsaturatedFat: number // 多不饱和脂肪 (g)
  fiber: number           // 膳食纤维 (g)
  sodium: number          // 钠 (mg)
  // 微量元素
  vitaminA: number        // 维生素A (μg)
  vitaminC: number        // 维生素C (mg)
  vitaminD: number        // 维生素D (μg)
  vitaminE: number        // 维生素E (mg)
  vitaminB1: number       // 维生素B1 (mg)
  vitaminB2: number       // 维生素B2 (mg)
  vitaminB6: number       // 维生素B6 (mg)
  vitaminB12: number      // 维生素B12 (μg)
  folate: number          // 叶酸 (μg DFE)
  niacin: number          // 烟酸 (mg)
  pantothenicAcid: number // 泛酸 (mg)
  biotin: number          // 生物素 (μg)
  calcium: number         // 钙 (mg)
  iron: number            // 铁 (mg)
  zinc: number            // 锌 (mg)
  potassium: number       // 钾 (mg)
  magnesium: number       // 镁 (mg)
  phosphorus: number      // 磷 (mg)
  selenium: number        // 硒 (μg)
  iodine: number          // 碘 (μg)
  copper: number          // 铜 (mg)
  manganese: number       // 锰 (mg)
  chromium: number        // 铬 (μg)
  molybdenum: number      // 钼 (μg)
  choline: number         // 胆碱 (mg)
}

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0,
  carbs: 0,
  protein: 0,
  completeProtein: 0,
  incompleteProtein: 0,
  fat: 0,
  saturatedFat: 0,
  monounsaturatedFat: 0,
  polyunsaturatedFat: 0,
  fiber: 0,
  sodium: 0,
  vitaminA: 0,
  vitaminC: 0,
  vitaminD: 0,
  vitaminE: 0,
  vitaminB1: 0,
  vitaminB2: 0,
  vitaminB6: 0,
  vitaminB12: 0,
  folate: 0,
  niacin: 0,
  pantothenicAcid: 0,
  biotin: 0,
  calcium: 0,
  iron: 0,
  zinc: 0,
  potassium: 0,
  magnesium: 0,
  phosphorus: 0,
  selenium: 0,
  iodine: 0,
  copper: 0,
  manganese: 0,
  chromium: 0,
  molybdenum: 0,
  choline: 0,
}

// 宏量营养素 keys
export const MACRO_KEYS: (keyof Nutrients)[] = [
  'calories', 'carbs', 'protein', 'completeProtein', 'incompleteProtein', 'fat', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'fiber', 'sodium',
]

// 微量元素 keys
export const MICRO_KEYS: (keyof Nutrients)[] = [
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminB1', 'vitaminB2',
  'vitaminB6', 'vitaminB12', 'folate', 'niacin', 'pantothenicAcid', 'biotin',
  'calcium', 'iron', 'zinc', 'potassium', 'magnesium',
  'phosphorus', 'selenium', 'iodine', 'copper', 'manganese',
  'chromium', 'molybdenum', 'choline',
]

export const ALL_NUTRIENT_KEYS: (keyof Nutrients)[] = [...MACRO_KEYS, ...MICRO_KEYS]

export const NUTRIENT_LABELS: Record<keyof Nutrients, string> = {
  calories: '热量',
  carbs: '碳水',
  protein: '蛋白质',
  completeProtein: '完全蛋白',
  incompleteProtein: '不完全蛋白',
  fat: '脂肪',
  saturatedFat: '饱和脂肪',
  monounsaturatedFat: '单不饱和脂肪',
  polyunsaturatedFat: '多不饱和脂肪',
  fiber: '膳食纤维',
  sodium: '钠',
  vitaminA: '维生素A',
  vitaminC: '维生素C',
  vitaminD: '维生素D',
  vitaminE: '维生素E',
  vitaminB1: '维生素B1',
  vitaminB2: '维生素B2',
  vitaminB6: '维生素B6',
  vitaminB12: '维生素B12',
  folate: '叶酸',
  niacin: '烟酸',
  pantothenicAcid: '泛酸',
  biotin: '生物素',
  calcium: '钙',
  iron: '铁',
  zinc: '锌',
  potassium: '钾',
  magnesium: '镁',
  phosphorus: '磷',
  selenium: '硒',
  iodine: '碘',
  copper: '铜',
  manganese: '锰',
  chromium: '铬',
  molybdenum: '钼',
  choline: '胆碱',
}

export const NUTRIENT_UNITS: Record<keyof Nutrients, string> = {
  calories: 'kcal',
  carbs: 'g',
  protein: 'g',
  completeProtein: 'g',
  incompleteProtein: 'g',
  fat: 'g',
  saturatedFat: 'g',
  monounsaturatedFat: 'g',
  polyunsaturatedFat: 'g',
  fiber: 'g',
  sodium: 'mg',
  vitaminA: 'μg',
  vitaminC: 'mg',
  vitaminD: 'μg',
  vitaminE: 'mg',
  vitaminB1: 'mg',
  vitaminB2: 'mg',
  vitaminB6: 'mg',
  vitaminB12: 'μg',
  folate: 'μg',
  niacin: 'mg',
  pantothenicAcid: 'mg',
  biotin: 'μg',
  calcium: 'mg',
  iron: 'mg',
  zinc: 'mg',
  potassium: 'mg',
  magnesium: 'mg',
  phosphorus: 'mg',
  selenium: 'μg',
  iodine: 'μg',
  copper: 'mg',
  manganese: 'mg',
  chromium: 'μg',
  molybdenum: 'μg',
  choline: 'mg',
}

export interface FoodUnit {
  name: string    // "g", "个", "片"
  grams: number   // grams equivalent of 1 of this unit
}

export interface Food {
  id: string
  name: string
  photoURL?: string
  unit: string           // base unit name (e.g., "g")
  defaultQuantity: number // base amount (e.g., 100 for "100g")
  units?: FoodUnit[]     // multiple units with conversion
  isCompleteProtein: boolean
  nutrientsPerUnit: Nutrients // nutrients for defaultQuantity of base unit
  createdBy: string
  createdAt: number
}

export interface MealFood {
  foodId: string
  quantity: number
  unit?: string          // which unit was used
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
  type: 'food' | 'meal' | 'quick'
  refId: string          // food or meal id (empty for quick)
  name: string           // snapshot at log time
  photoURL?: string      // snapshot at log time
  quantity: number       // multiplier
  unit?: string          // unit used when logging
  nutrients: Nutrients   // calculated at log time
  timestamp: number
}

export interface DailyLog {
  id: string             // format: userId_YYYY-MM-DD
  userId: string
  date: string           // YYYY-MM-DD
  entries: LogEntry[]
  exercises: ExerciseEntry[]
}

export interface DailyGoal {
  id: string             // same as userId
  userId: string
  targets: Nutrients
}

// 删除申请
export interface DeleteRequest {
  id: string
  type: 'food' | 'meal'       // 删除类型
  targetId: string             // food or meal id
  targetName: string           // food or meal name
  reason: string               // 删除原因
  requestedBy: string          // user uid
  requestedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: number
}

// 用户资料
export interface UserProfile {
  id: string              // same as userId
  userId: string
  nickname: string
  email?: string          // 冗余存储，方便管理员查询
  age?: number
  gender?: 'male' | 'female'
  weightKg?: number
  heightCm?: number
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'heavy'
  regularExercise?: boolean  // 是否规律锻炼
}

// 运动记录
export type ExerciseType = 'running' | 'walking' | 'cycling' | 'swimming' | 'weight_training' | 'yoga' | 'hiit' | 'other'
export type ExerciseIntensity = 'low' | 'moderate' | 'high'

export interface ExerciseEntry {
  id: string
  exerciseType: ExerciseType
  intensity: ExerciseIntensity
  durationMinutes: number
  caloriesBurned: number
  manualCalories: boolean     // 是否手动输入
  timestamp: number
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  running: '跑步',
  walking: '步行',
  cycling: '骑行',
  swimming: '游泳',
  weight_training: '力量训练',
  yoga: '瑜伽',
  hiit: 'HIIT',
  other: '其他',
}

export const EXERCISE_INTENSITY_LABELS: Record<ExerciseIntensity, string> = {
  low: '低强度',
  moderate: '中强度',
  high: '高强度',
}

// 健身目标
export type FitnessGoalType = 'bulk' | 'cut' | 'maintain'

export interface FitnessGoal {
  id: string
  userId: string
  startDate: string           // YYYY-MM-DD
  endDate: string             // YYYY-MM-DD
  type: FitnessGoalType
  calorieAdjustment: number   // +300 增肌, -500 减脂, 0 保持 (可自定义)
}

export const FITNESS_GOAL_LABELS: Record<FitnessGoalType, string> = {
  bulk: '增肌',
  cut: '减脂',
  maintain: '保持',
}

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: '久坐办公',
  light: '轻度活动',
  moderate: '中等活动',
  heavy: '重体力劳动',
}
