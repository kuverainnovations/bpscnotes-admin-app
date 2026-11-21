'use client'
// Mock Tests is the Quizzes screen locked to type='mock'. The client wanted
// mock tests pulled out of "Quizzes & Mock Tests" into their own sidebar
// section — not a separate feature, just a separate entry — so this reuses
// the whole quiz CRUD rather than duplicating it.
import QuizzesScreen from '../quizzes/QuizzesScreen'

export default function MockTestsPage() {
  return <QuizzesScreen lockedType="mock" />
}
