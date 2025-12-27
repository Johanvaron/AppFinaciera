import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function useDateFormatter() {
  const formatDate = (dateString: string, formatStr: string = "d 'de' MMM, yyyy") => {
    try {
      return format(new Date(dateString), formatStr, { locale: es })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  const getTodayString = () => {
    return format(new Date(), 'yyyy-MM-dd')
  }

  const isToday = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    return date.toDateString() === today.toDateString()
  }

  const isThisWeek = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)
    return date >= weekAgo && date <= today
  }

  return {
    formatDate,
    getTodayString,
    isToday,
    isThisWeek
  }
}
