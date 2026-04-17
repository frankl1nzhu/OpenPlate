import { useState, useEffect, type FormEvent } from 'react'
import { useGoalStore } from '../store/goalStore'
import { useAuthStore } from '../store/authStore'
import { useFoodStore } from '../store/foodStore'
import { useMealStore } from '../store/mealStore'
import { useUserProfileStore } from '../store/userProfileStore'
import { useFitnessGoalStore } from '../store/fitnessGoalStore'
import { NUTRIENT_LABELS, NUTRIENT_UNITS, EMPTY_NUTRIENTS, MACRO_KEYS, MICRO_KEYS, ALL_NUTRIENT_KEYS, ACTIVITY_LEVEL_LABELS, FITNESS_GOAL_LABELS } from '../types'
import type { Nutrients, FitnessGoalType } from '../types'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { DailyLog, LogEntry, Food, Meal } from '../types'
import { calculateBMR, calculateTDEE, calculateRecommendedTargets } from '../lib/nutrition'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuthStore()
  const { goal, loading, setGoal, showMicroOnHome, setShowMicroOnHome } = useGoalStore()
  const { foods } = useFoodStore()
  const { meals } = useMealStore()
  const { profile, setProfile, setNickname } = useUserProfileStore()
  const { goals: fitnessGoals, addGoal: addFitnessGoal, deleteGoal: deleteFitnessGoal } = useFitnessGoalStore()

  const [targets, setTargets] = useState<Nutrients>({ ...EMPTY_NUTRIENTS })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMicro, setShowMicro] = useState(false)

  // Nickname state
  const [nickname, setNicknameState] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  // Smart recommendation state
  const [showRecommend, setShowRecommend] = useState(false)
  const [recAge, setRecAge] = useState(profile?.age || 25)
  const [recGender, setRecGender] = useState<'male' | 'female'>(profile?.gender || 'male')
  const [recWeight, setRecWeight] = useState(profile?.weightKg || 70)
  const [recHeight, setRecHeight] = useState(profile?.heightCm || 170)
  const [recActivity, setRecActivity] = useState(profile?.activityLevel || 'sedentary')
  const [recommendedTargets, setRecommendedTargets] = useState<Nutrients | null>(null)

  // Fitness goal state
  const [showFitnessGoal, setShowFitnessGoal] = useState(false)
  const [fgStartDate, setFgStartDate] = useState('')
  const [fgEndDate, setFgEndDate] = useState('')
  const [fgType, setFgType] = useState<FitnessGoalType>('maintain')
  const [fgCalorieAdj, setFgCalorieAdj] = useState(0)
  const [savingFitness, setSavingFitness] = useState(false)

  // Export state
  const [exportStart, setExportStart] = useState('')
  const [exportEnd, setExportEnd] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (goal?.targets) {
      setTargets({ ...EMPTY_NUTRIENTS, ...goal.targets })
    }
  }, [goal])

  // Sync nickname from profile
  useEffect(() => {
    if (profile?.nickname) setNicknameState(profile.nickname)
  }, [profile])

  // Sync recommendation fields from profile
  useEffect(() => {
    if (profile) {
      if (profile.age) setRecAge(profile.age)
      if (profile.gender) setRecGender(profile.gender)
      if (profile.weightKg) setRecWeight(profile.weightKg)
      if (profile.heightCm) setRecHeight(profile.heightCm)
      if (profile.activityLevel) setRecActivity(profile.activityLevel)
    }
  }, [profile])

  // Set default export date range
  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    setExportEnd(today.toISOString().split('T')[0])
    setExportStart(weekAgo.toISOString().split('T')[0])
  }, [])

  const handleChange = (key: keyof Nutrients, value: string) => {
    const num = parseFloat(value) || 0
    setTargets((prev) => ({ ...prev, [key]: Math.min(num, 99999) }))
    setSaved(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await setGoal(user.uid, targets)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const getEntryName = (entry: LogEntry): string => {
    if (entry.name) return entry.name
    if (entry.type === 'quick') return '快速记录'
    if (entry.type === 'food') {
      const food = foods.find((f: Food) => f.id === entry.refId)
      return food?.name ?? '未知食物'
    }
    const meal = meals.find((m: Meal) => m.id === entry.refId)
    return meal?.name ?? '未知套餐'
  }

  const handleExport = async () => {
    if (!user || !exportStart || !exportEnd) return
    setExporting(true)
    try {
      const q = query(
        collection(db, 'dailyLogs'),
        where('userId', '==', user.uid),
      )
      const snapshot = await getDocs(q)
      const logs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as DailyLog))
        .filter((log) => log.date >= exportStart && log.date <= exportEnd)
      logs.sort((a, b) => a.date.localeCompare(b.date))

      // Build CSV
      const nutrientKeys = ALL_NUTRIENT_KEYS
      const headers = ['日期', '名称', '类型', '数量', ...nutrientKeys.map((k) => `${NUTRIENT_LABELS[k]} (${NUTRIENT_UNITS[k]})`)]
      const rows: string[][] = []

      for (const log of logs) {
        for (const entry of log.entries) {
          const name = getEntryName(entry)
          const typeLabel = entry.type === 'food' ? '食物' : entry.type === 'meal' ? '套餐' : '快速'
          const row = [
            log.date,
            name,
            typeLabel,
            String(entry.quantity),
            ...nutrientKeys.map((k) => String(Math.round((entry.nutrients[k] || 0) * 100) / 100)),
          ]
          rows.push(row)
        }
      }

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      // BOM for Excel Chinese support
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openplate_${exportStart}_${exportEnd}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('导出失败，如果是首次导出可能需要创建索引，请检查控制台')
    } finally {
      setExporting(false)
    }
  }

  const handleSaveNickname = async () => {
    if (!user || !nickname.trim()) return
    setSavingNickname(true)
    try {
      await setNickname(user.uid, nickname.trim())
      // Also save email for admin lookups
      if (user.email && (!profile || profile.email !== user.email)) {
        await setProfile(user.uid, { email: user.email })
      }
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSavingNickname(false)
    }
  }

  const handleCalculateRecommendation = () => {
    const bmr = calculateBMR(recGender, recWeight, recHeight, recAge)
    const tdee = calculateTDEE(bmr, recActivity)
    const rec = calculateRecommendedTargets(tdee, recWeight, recGender, recAge)
    setRecommendedTargets(rec)
  }

  const handleApplyRecommendation = async () => {
    if (!recommendedTargets || !user) return
    setTargets(recommendedTargets)
    setSaved(false)
    // Save body metrics to profile
    await setProfile(user.uid, {
      age: recAge,
      gender: recGender,
      weightKg: recWeight,
      heightCm: recHeight,
      activityLevel: recActivity,
      email: user.email || undefined,
    })
    setRecommendedTargets(null)
    setShowRecommend(false)
  }

  const handleAddFitnessGoal = async () => {
    if (!user || !fgStartDate || !fgEndDate) return
    setSavingFitness(true)
    try {
      await addFitnessGoal({
        userId: user.uid,
        startDate: fgStartDate,
        endDate: fgEndDate,
        type: fgType,
        calorieAdjustment: fgCalorieAdj,
      })
      setShowFitnessGoal(false)
      setFgStartDate('')
      setFgEndDate('')
      setFgType('maintain')
      setFgCalorieAdj(0)
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSavingFitness(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-20 px-4 py-4">
      <div className="text-center mb-6">
        <div className="text-sm text-gray-500">{user?.email}</div>
      </div>

      {/* Nickname */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-2">昵称</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNicknameState(e.target.value)}
            placeholder="设置昵称"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleSaveNickname}
            disabled={savingNickname || !nickname.trim()}
            className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {savingNickname ? '...' : '保存'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-sm font-bold text-gray-700">每日目标摄入</h3>
        <p className="text-xs text-gray-400">设置为 0 表示不追踪该指标</p>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase">宏量营养素</h4>
          {MACRO_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">
                {NUTRIENT_LABELS[key]}
              </label>
              <input
                type="number"
                value={targets[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                min={0}
                max={99999}
                step="any"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowMicro(!showMicro)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase mt-2"
          >
            微量元素
            <svg
              className={`w-4 h-4 transition-transform ${showMicro ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMicro && MICRO_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-20 shrink-0">
                {NUTRIENT_LABELS[key]}
              </label>
              <input
                type="number"
                value={targets[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                min={0}
                max={99999}
                step="any"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-xs text-gray-400 w-10">{NUTRIENT_UNITS[key]}</span>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : saved ? '已保存' : '保存目标'}
        </button>
      </form>

      {/* Show micro on home toggle */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700">首页显示微量元素进度</span>
          <div
            onClick={() => setShowMicroOnHome(!showMicroOnHome)}
            className={`relative w-11 h-6 rounded-full transition-colors ${showMicroOnHome ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showMicroOnHome ? 'translate-x-5' : ''}`}
            />
          </div>
        </label>
      </div>

      {/* Smart recommendation */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">智能推荐每日摄入</h3>
          <button
            type="button"
            onClick={() => setShowRecommend(!showRecommend)}
            className="text-sm text-emerald-500 font-medium"
          >
            {showRecommend ? '收起' : '开始'}
          </button>
        </div>

        {showRecommend && (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">年龄</label>
              <input
                type="number"
                value={recAge}
                onChange={(e) => setRecAge(parseInt(e.target.value) || 0)}
                min={1}
                max={120}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-400">岁</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">性别</label>
              <div className="flex gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setRecGender('male')}
                  className={`flex-1 py-1.5 text-sm rounded-lg border ${recGender === 'male' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600'}`}
                >
                  男
                </button>
                <button
                  type="button"
                  onClick={() => setRecGender('female')}
                  className={`flex-1 py-1.5 text-sm rounded-lg border ${recGender === 'female' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600'}`}
                >
                  女
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">体重</label>
              <input
                type="number"
                value={recWeight}
                onChange={(e) => setRecWeight(parseFloat(e.target.value) || 0)}
                min={1}
                step="0.1"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-400">kg</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">身高</label>
              <input
                type="number"
                value={recHeight}
                onChange={(e) => setRecHeight(parseFloat(e.target.value) || 0)}
                min={1}
                step="0.1"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-400">cm</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">工作</label>
              <select
                value={recActivity}
                onChange={(e) => setRecActivity(e.target.value as 'sedentary' | 'light' | 'moderate' | 'heavy')}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(ACTIVITY_LEVEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCalculateRecommendation}
              className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg"
            >
              计算推荐值
            </button>

            {recommendedTargets && (
              <div className="bg-white rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-medium text-gray-500">推荐每日摄入（Mifflin-St Jeor + DRI）</h4>
                <div className="grid grid-cols-2 gap-1">
                  {MACRO_KEYS.map((key) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-600">{NUTRIENT_LABELS[key]}</span>
                      <span className="font-medium">
                        {Math.round(recommendedTargets[key])} {NUTRIENT_UNITS[key]}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleApplyRecommendation}
                  className="w-full py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg mt-2"
                >
                  应用到每日目标
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fitness goals */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">健身目标</h3>
          <button
            type="button"
            onClick={() => setShowFitnessGoal(!showFitnessGoal)}
            className="text-sm text-emerald-500 font-medium"
          >
            {showFitnessGoal ? '收起' : '+ 添加'}
          </button>
        </div>

        {showFitnessGoal && (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                <input
                  type="date"
                  value={fgStartDate}
                  onChange={(e) => setFgStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                <input
                  type="date"
                  value={fgEndDate}
                  onChange={(e) => setFgEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">目标类型</label>
              <div className="flex gap-2">
                {(['bulk', 'cut', 'maintain'] as FitnessGoalType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFgType(type)
                      setFgCalorieAdj(type === 'bulk' ? 300 : type === 'cut' ? -500 : 0)
                    }}
                    className={`flex-1 py-1.5 text-sm rounded-lg border ${fgType === type
                      ? type === 'bulk' ? 'bg-blue-500 text-white border-blue-500'
                        : type === 'cut' ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-gray-300 text-gray-600'}`}
                  >
                    {FITNESS_GOAL_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 shrink-0">热量调整</label>
              <input
                type="number"
                value={fgCalorieAdj}
                onChange={(e) => setFgCalorieAdj(parseInt(e.target.value) || 0)}
                step={50}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-400">kcal</span>
            </div>
            <button
              type="button"
              onClick={handleAddFitnessGoal}
              disabled={savingFitness || !fgStartDate || !fgEndDate}
              className="w-full py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {savingFitness ? '保存中...' : '保存目标'}
            </button>
          </div>
        )}

        {/* Existing fitness goals list */}
        {fitnessGoals.length > 0 && (
          <div className="space-y-2">
            {fitnessGoals.map((fg) => (
              <div key={fg.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fg.type === 'bulk' ? 'bg-blue-100 text-blue-600'
                      : fg.type === 'cut' ? 'bg-orange-100 text-orange-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    {FITNESS_GOAL_LABELS[fg.type]}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {fg.startDate} ~ {fg.endDate}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {fg.calorieAdjustment > 0 ? '+' : ''}{fg.calorieAdjustment} kcal
                  </span>
                </div>
                <button
                  onClick={() => deleteFitnessGoal(fg.id)}
                  className="text-gray-300 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
        <h3 className="text-sm font-bold text-gray-700">导出数据</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">开始日期</label>
            <input
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">结束日期</label>
            <input
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !exportStart || !exportEnd}
          className="w-full py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={signOut}
          className="w-full py-2.5 text-red-500 font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
