import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { subscribeFoods, unsubscribeFoods } from '../store/foodStore'
import { subscribeMeals, unsubscribeMeals } from '../store/mealStore'
import { subscribeDailyLog, unsubscribeDailyLog, useDailyLogStore } from '../store/dailyLogStore'
import { subscribeGoal, unsubscribeGoal } from '../store/goalStore'

export function useFirestoreSync() {
  const user = useAuthStore((s) => s.user)
  const selectedDate = useDailyLogStore((s) => s.selectedDate)

  useEffect(() => {
    if (!user) {
      unsubscribeFoods()
      unsubscribeMeals()
      unsubscribeDailyLog()
      unsubscribeGoal()
      return
    }

    subscribeFoods()
    subscribeMeals()
    subscribeGoal(user.uid)

    return () => {
      unsubscribeFoods()
      unsubscribeMeals()
      unsubscribeGoal()
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    subscribeDailyLog(user.uid, selectedDate)
    return () => unsubscribeDailyLog()
  }, [user, selectedDate])
}
