import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { subscribeFoods, unsubscribeFoods } from '../store/foodStore'
import { subscribeMeals, unsubscribeMeals } from '../store/mealStore'
import { subscribeDailyLog, unsubscribeDailyLog, useDailyLogStore } from '../store/dailyLogStore'
import { subscribeGoal, unsubscribeGoal } from '../store/goalStore'
import { subscribeUserProfile, unsubscribeUserProfile } from '../store/userProfileStore'
import { subscribeFitnessGoals, unsubscribeFitnessGoals } from '../store/fitnessGoalStore'
import { useAiTaskStore } from '../store/aiTaskStore'

export function useFirestoreSync() {
  const user = useAuthStore((s) => s.user)
  const selectedDate = useDailyLogStore((s) => s.selectedDate)
  const resumeProcessingTasks = useAiTaskStore((s) => s.resumeProcessingTasks)

  useEffect(() => {
    if (!user) {
      unsubscribeFoods()
      unsubscribeMeals()
      unsubscribeDailyLog()
      unsubscribeGoal()
      unsubscribeUserProfile()
      unsubscribeFitnessGoals()
      return
    }

    subscribeFoods()
    subscribeMeals(user.uid)
    subscribeGoal(user.uid)
    subscribeUserProfile(user.uid)
    subscribeFitnessGoals(user.uid)

    // Resume any AI tasks that were in-flight when the app was last closed
    resumeProcessingTasks(user.uid)

    return () => {
      unsubscribeFoods()
      unsubscribeMeals()
      unsubscribeGoal()
      unsubscribeUserProfile()
      unsubscribeFitnessGoals()
    }
  }, [user, resumeProcessingTasks])

  useEffect(() => {
    if (!user) return
    subscribeDailyLog(user.uid, selectedDate)
    return () => unsubscribeDailyLog()
  }, [user, selectedDate])
}
