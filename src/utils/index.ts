import { SOLAR_TERMS, SolarTermKey, PhenologyEvent, ValidationError, SourceInfo } from '@/types'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getSolarTermDate(solarTermKey: SolarTermKey, year: number): Date {
  const term = SOLAR_TERMS.find(t => t.key === solarTermKey)!
  let actualYear = year
  if (solarTermKey === 'xiaohan' || solarTermKey === 'dahan') {
    actualYear = year + 1
  }
  return new Date(actualYear, term.month - 1, term.day)
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

export function getSolarTermForDate(date: Date): SolarTermKey {
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  for (let i = SOLAR_TERMS.length - 1; i >= 0; i--) {
    const term = SOLAR_TERMS[i]
    
    if (
      (month > term.month) ||
      (month === term.month && day >= term.day)
    ) {
      if (term.key === 'xiaohan' || term.key === 'dahan') {
        if (month === 12) {
          return SOLAR_TERMS[21].key
        }
      }
      return term.key
    }
  }
  return SOLAR_TERMS[22].key
}

export function getSolarTermIndex(solarTermKey: SolarTermKey): number {
  return SOLAR_TERMS.findIndex(t => t.key === solarTermKey)
}

export function getSolarTermStartEndDates(solarTermKey: SolarTermKey, year: number): { start: Date; end: Date } {
  const index = getSolarTermIndex(solarTermKey)
  const currentTerm = SOLAR_TERMS[index]
  const nextTerm = SOLAR_TERMS[(index + 1) % 24]
  
  let startYear = year
  let endYear = year
  
  if (solarTermKey === 'xiaohan' || solarTermKey === 'dahan') {
    startYear = year + 1
  }
  if (nextTerm.key === 'xiaohan' || nextTerm.key === 'dahan') {
    endYear = year + 1
  }
  
  const start = new Date(startYear, currentTerm.month - 1, currentTerm.day)
  const end = new Date(endYear, nextTerm.month - 1, nextTerm.day - 1)
  
  return { start, end }
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

export function isDateInYear(dateStr: string, year: number): boolean {
  const date = parseDate(dateStr)
  return date.getFullYear() === year
}

export function isValidDate(dateStr: string): boolean {
  const date = parseDate(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

export function validateEvent(
  event: Partial<PhenologyEvent>,
  allEvents: PhenologyEvent[] = []
): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!event.name || event.name.trim().length === 0) {
    errors.push({ field: 'name', message: '事件名称不能为空' })
  }
  
  if (!event.startDate) {
    errors.push({ field: 'startDate', message: '请选择开始日期' })
  } else if (!isValidDate(event.startDate)) {
    errors.push({ field: 'startDate', message: '日期格式无效' })
  } else if (event.year && !isDateInYear(event.startDate, event.year)) {
    errors.push({ field: 'startDate', message: `日期必须落在 ${event.year} 年内` })
  }
  
  if (event.durationDays === undefined || event.durationDays === null) {
    errors.push({ field: 'durationDays', message: '请填写持续天数' })
  } else if (event.durationDays <= 0) {
    errors.push({ field: 'durationDays', message: '持续天数必须大于 0' })
  }
  
  if (!event.type) {
    errors.push({ field: 'type', message: '请选择事件类型' })
  }
  
  if (!event.solarTerm) {
    errors.push({ field: 'solarTerm', message: '请选择所属节气' })
  }
  
  if (event.verified && (!event.sources || event.sources.length === 0)) {
    errors.push({ field: 'verified', message: '缺少来源的事件不能标记为已校定' })
  }
  
  if (event.id !== undefined && event.regionId && event.solarTerm && event.name) {
    const isDuplicate = allEvents.some(e => 
      e.id !== event.id &&
      e.regionId === event.regionId &&
      e.solarTerm === event.solarTerm &&
      e.year === event.year &&
      e.name.trim() === event.name!.trim() &&
      e.type === event.type &&
      e.startDate === event.startDate &&
      e.durationDays === event.durationDays
    )
    if (isDuplicate) {
      errors.push({ field: 'name', message: '同一地区同一节气下已存在完全相同的事件' })
    }
  }
  
  return errors
}

export function createDefaultSource(): SourceInfo {
  return {
    id: generateId(),
    name: '',
    type: 'book',
    url: '',
    note: ''
  }
}
