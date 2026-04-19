import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { subscribeFoods, unsubscribeFoods } from '../store/foodStore'
import { subscribeMeals, unsubscribeMeals } from '../store/mealStore'
import { subscribeDailyLog, unsubscribeDailyLog, useDailyLogStore } from '../store/dailyLogStore'
import { subscribeGoal, unsubscribeGoal } from '../store/goalStore'
import { subscribeUserProfile, unsubscribeUserProfile } from '../store/userProfileStore'
import { subscribeFitnessGoals, unsubscribeFitnessGoals } from '../store/fitnessGoalStore'
import { subscribeAiTasks, unsubscribeAiTasks } from '../store/aiTaskStore'

export function useFirestoreSync() {
  const user = useAuthStore((s) => s.user)
  const selectedDate = useDailyLogStore((s) => s.selectedDate)

  useEffect(() => {
    if (!user) {
      unsubscribeFoods()
      unsubscribeMeals()
      unsubscribeDailyLog()
      unsubscribeGoal()
      unsubscribeUserProfile()
      unsubscribeFitnessGoals()
      unsubscribeAiTasks()
      return
    }

    subscribeFoods()
    subscribeMeals(user.uid)
    subscribeGoal(user.uid)
    subscribeUserProfile(user.uid)
    subscribeFitnessGoals(user.uid)
    subscribeAiTasks(user.uid)

    return () => {
      unsubscribeFoods()
      unsubscribeMeals()
      unsubscribeGoal()
      unsubscribeUserProfile()
      unsubscribeFitnessGoals()
      unsubscribeAiTasks()
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    subscribeDailyLog(user.uid, selectedDate)
    return () => unsubscribeDailyLog()
  }, [user, selectedDate])
}
