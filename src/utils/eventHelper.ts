import type {
  PhenologyEvent,
  EventType,
  SourceRecord,
  ValidationError
} from '@/types'
import { isDateInYear, isValidDate } from './dateCalc'
import { analyzeConflicts } from './conflict'

export function getDominantType(sources: SourceRecord[]): EventType | undefined {
  if (sources.length === 0) return undefined
  const typeCounts: Record<string, { count: number; totalScore: number }> = {}
  sources.forEach(s => {
    if (s.observation.type) {
      if (!typeCounts[s.observation.type]) {
        typeCounts[s.observation.type] = { count: 0, totalScore: 0 }
      }
      typeCounts[s.observation.type].count++
      typeCounts[s.observation.type].totalScore += s.reliabilityScore
    }
  })
  const entries = Object.entries(typeCounts)
  if (entries.length === 0) return undefined
  entries.sort((a, b) => b[1].totalScore - a[1].totalScore)
  return entries[0][0] as EventType
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

  if (event.verified) {
    if (!event.sources || event.sources.length === 0) {
      errors.push({ field: 'verified', message: '缺少来源的事件不能标记为已校定' })
    } else if (event.sources.length < 2) {
      errors.push({ field: 'verified', message: '来源不足（至少 2 条），不能标记为已校定' })
    } else if (event.conflictAnalysis && event.conflictAnalysis.overallSeverity === 'high') {
      errors.push({ field: 'verified', message: '存在严重冲突，不能标记为已校定' })
    } else if (event.conflictAnalysis && event.conflictAnalysis.consensusScore < 60) {
      errors.push({ field: 'verified', message: `一致度过低（${event.conflictAnalysis.consensusScore}%），不能标记为已校定` })
    } else if (!event.conflictAnalysis) {
      const analysis = analyzeConflicts(event.sources as SourceRecord[])
      if (analysis.overallSeverity === 'high') {
        errors.push({ field: 'verified', message: '存在严重冲突，不能标记为已校定' })
      } else if (analysis.consensusScore < 60) {
        errors.push({ field: 'verified', message: `一致度过低（${analysis.consensusScore}%），不能标记为已校定` })
      }
    }
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
