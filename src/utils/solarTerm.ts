import type { SolarTermKey } from '@/types'
import { SOLAR_TERMS } from '@/types'

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

export function getSolarTermDate(solarTermKey: SolarTermKey, year: number): Date {
  const term = SOLAR_TERMS.find(t => t.key === solarTermKey)!
  let actualYear = year
  if (solarTermKey === 'xiaohan' || solarTermKey === 'dahan') {
    actualYear = year + 1
  }
  return new Date(actualYear, term.month - 1, term.day)
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
