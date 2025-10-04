import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a timestamp (ISO string or Date) into a human-friendly relative time
export function formatRelativeTime(dateLike: string | Date | number): string {
  try {
    const date = typeof dateLike === 'string' || typeof dateLike === 'number' ? new Date(dateLike) : dateLike
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const sec = Math.round(diffMs / 1000)
    const min = Math.round(sec / 60)
    const hrs = Math.round(min / 60)
    const days = Math.round(hrs / 24)

    if (sec < 10) return 'just now'
    if (sec < 60) return `${sec} sec${sec === 1 ? '' : 's'} ago`
    if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
    if (days < 30) {
      const weeks = Math.round(days / 7)
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`
    }
    // Fallback to locale date for older items
    return date.toLocaleDateString()
  } catch (e) {
    return ''
  }
}
