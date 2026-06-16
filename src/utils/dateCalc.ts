

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function dateDiffInDays(date1: string, date2: string): number {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

export function getDateFromDayOfYear(dayOfYear: number, year: number): Date {
  const date = new Date(year, 0, 1)
  date.setDate(date.getDate() + dayOfYear - 1)
  return date
}

export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

export function isDateInYear(dateStr: string, year: number): boolean {
  const date = parseDate(dateStr)
  return date.getFullYear() === year
}

export function isValidDate(dateStr: string): boolean {
  const date = parseDate(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

export function angleToDayOfYear(angle: number, year: number): number {
  const totalDays = getDaysInYear(year)
  let normalizedAngle = angle % 360
  if (normalizedAngle < 0) normalizedAngle += 360
  return Math.round((normalizedAngle / 360) * totalDays) + 1
}

export function dayOfYearToAngle(dayOfYear: number, year: number): number {
  const totalDays = getDaysInYear(year)
  return ((dayOfYear - 1) / totalDays) * 360
}
