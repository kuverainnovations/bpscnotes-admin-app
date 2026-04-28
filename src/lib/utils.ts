import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

export function formatDate(date: string): string {
  return date
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    active:    'bg-green-100 text-green-700 border-green-200',
    published: 'bg-green-100 text-green-700 border-green-200',
    sent:      'bg-green-100 text-green-700 border-green-200',
    banned:    'bg-red-100 text-red-700 border-red-200',
    rejected:  'bg-red-100 text-red-700 border-red-200',
    failed:    'bg-red-100 text-red-700 border-red-200',
    expired:   'bg-gray-100 text-gray-600 border-gray-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    review:    'bg-yellow-100 text-yellow-700 border-yellow-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    draft:     'bg-gray-100 text-gray-500 border-gray-200',
    upcoming:  'bg-blue-100 text-blue-700 border-blue-200',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
}

export function getDifficultyColor(d: string) {
  const map: Record<string, string> = {
    easy:   'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard:   'bg-red-100 text-red-700',
  }
  return map[d] ?? 'bg-gray-100 text-gray-600'
}

export const BRAND = '#1565C0'
export const BRAND_LIGHT = '#E8F0FD'
export const GOLD = '#F59E0B'
export const SUCCESS = '#10B981'
export const DANGER = '#EF4444'
export const WARNING = '#F59E0B'
