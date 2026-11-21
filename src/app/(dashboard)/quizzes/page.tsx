'use client'
// Route entry only. The screen lives in QuizzesScreen so the Mock Tests
// route can reuse it; a Next page file may not export anything but the
// default, which must match PageProps.
import QuizzesScreen from './QuizzesScreen'

export default function QuizzesPage() {
  return <QuizzesScreen />
}
