import {
  SOLAR_TERMS,
  SolarTermKey,
  PhenologyEvent,
  ValidationError,
  SourceInfo,
  SourceRecord,
  SourceReliability,
  SourceType,
  SOURCE_RELIABILITY_SCORE,
  SOURCE_TYPE_RELIABILITY,
  ConflictAnalysis,
  ConflictDetail,
  VersionSnapshot,
  VersionHistoryEntry,
  VersionAction,
  VerificationStatus,
  ObservationData,
  EventType
} from '@/types'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function getSourceReliability(type: SourceType): SourceReliability {
  return SOURCE_TYPE_RELIABILITY[type] || 'medium'
}

export function getReliabilityScore(reliability: SourceReliability): number {
  return SOURCE_RELIABILITY_SCORE[reliability] || 60
}

export function getSourceTypeReliabilityScore(type: SourceType): number {
  return getReliabilityScore(getSourceReliability(type))
}

export function createSourceRecord(
  sourceInfo: SourceInfo,
  observation: ObservationData,
  options?: { reliability?: SourceReliability; recorder?: string; note?: string }
): SourceRecord {
  const reliability = options?.reliability || getSourceReliability(sourceInfo.type)
  return {
    id: generateId(),
    sourceInfo: { ...sourceInfo },
    observation: { ...observation },
    reliability,
    reliabilityScore: getReliabilityScore(reliability),
    recordedAt: Date.now(),
    recorder: options?.recorder,
    note: options?.note
  }
}

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

export function analyzeConflicts(sources: SourceRecord[]): ConflictAnalysis {
  if (sources.length < 2) {
    return {
      hasConflict: false,
      conflicts: [],
      overallSeverity: 'none',
      consensusScore: sources.length === 1 ? 100 : 0
    }
  }

  const conflicts: ConflictDetail[] = []

  const startDates = sources.map(s => ({
    sourceId: s.id,
    value: s.observation.startDate
  }))
  const startDateValues = startDates.map(d => d.value as string)
  if (new Set(startDateValues).size > 1) {
    let maxDiff = 0
    for (let i = 0; i < startDateValues.length; i++) {
      for (let j = i + 1; j < startDateValues.length; j++) {
        const diff = dateDiffInDays(startDateValues[i], startDateValues[j])
        if (diff > maxDiff) maxDiff = diff
      }
    }
    const severity = maxDiff > 14 ? 'high' : maxDiff > 7 ? 'medium' : 'low'
    conflicts.push({
      field: 'startDate',
      values: startDates,
      maxDiff,
      severity
    })
  }

  const durations = sources.map(s => ({
    sourceId: s.id,
    value: s.observation.durationDays
  }))
  const durationValues = durations.map(d => d.value as number)
  if (new Set(durationValues).size > 1) {
    const maxDuration = Math.max(...durationValues)
    const minDuration = Math.min(...durationValues)
    const maxDiff = maxDuration - minDuration
    const avgDuration = durationValues.reduce((a, b) => a + b, 0) / durationValues.length
    const diffRatio = maxDiff / avgDuration
    const severity = diffRatio > 0.5 ? 'high' : diffRatio > 0.2 ? 'medium' : 'low'
    conflicts.push({
      field: 'durationDays',
      values: durations,
      maxDiff,
      severity
    })
  }

  const types = sources.map(s => ({
    sourceId: s.id,
    value: s.observation.type || ''
  }))
  const typeValues = types.map(t => t.value as string)
  const validTypes = typeValues.filter(t => t !== '')
  if (validTypes.length > 1 && new Set(validTypes).size > 1) {
    const uniqueTypes = new Set(validTypes)
    const maxDiff = uniqueTypes.size
    const severity: 'high' | 'medium' | 'low' = maxDiff > 2 ? 'high' : maxDiff > 1 ? 'medium' : 'low'
    conflicts.push({
      field: 'type',
      values: types.filter(t => t.value !== ''),
      maxDiff,
      severity
    })
  }

  const hasConflict = conflicts.length > 0
  const overallSeverity = hasConflict
    ? (conflicts.some(c => c.severity === 'high')
      ? 'high'
      : conflicts.some(c => c.severity === 'medium')
        ? 'medium'
        : 'low')
    : 'none'

  let consensusScore = 100
  if (hasConflict) {
    const totalWeight = conflicts.reduce((sum, c) => {
      return sum + (c.severity === 'high' ? 3 : c.severity === 'medium' ? 2 : 1)
    }, 0)
    consensusScore = Math.max(0, 100 - totalWeight * 20)
  }

  return {
    hasConflict,
    conflicts,
    overallSeverity,
    consensusScore
  }
}

export function sortSourcesByReliability(sources: SourceRecord[]): SourceRecord[] {
  return [...sources].sort((a, b) => b.reliabilityScore - a.reliabilityScore)
}

export function getWeightedAverageObservation(sources: SourceRecord[]): ObservationData {
  if (sources.length === 0) {
    return { startDate: '', durationDays: 7 }
  }

  const sorted = sortSourcesByReliability(sources)
  const totalWeight = sorted.reduce((sum, s) => sum + s.reliabilityScore, 0)

  let weightedDuration = 0
  sorted.forEach(s => {
    weightedDuration += s.observation.durationDays * s.reliabilityScore
  })
  const avgDuration = Math.round(weightedDuration / totalWeight)

  const medianIndex = Math.floor(sorted.length / 2)
  const medianStartDate = sorted[medianIndex].observation.startDate

  return {
    startDate: medianStartDate,
    durationDays: avgDuration
  }
}

export function canVerify(sources: SourceRecord[], conflictAnalysis: ConflictAnalysis): boolean {
  if (sources.length === 0) return false
  if (sources.length < 2) return false
  if (conflictAnalysis.hasConflict && conflictAnalysis.overallSeverity === 'high') return false
  if (conflictAnalysis.consensusScore < 60) return false
  return true
}

export function determineVerificationStatus(
  sources: SourceRecord[],
  verified: boolean,
  conflictAnalysis?: ConflictAnalysis
): VerificationStatus {
  const analysis = conflictAnalysis || analyzeConflicts(sources)
  if (verified && canVerify(sources, analysis)) {
    return 'verified'
  }
  if (analysis.hasConflict && sources.length >= 2) {
    return 'conflict'
  }
  return 'unverified'
}

export function createVersionSnapshot(event: PhenologyEvent): VersionSnapshot {
  return {
    name: event.name,
    type: event.type,
    solarTerm: event.solarTerm,
    startDate: event.startDate,
    durationDays: event.durationDays,
    sources: event.sources.map(s => ({ ...s, sourceInfo: { ...s.sourceInfo } })),
    verified: event.verified,
    verificationStatus: event.verificationStatus,
    description: event.description
  }
}

export function createVersionEntry(
  event: PhenologyEvent,
  action: VersionAction,
  description: string,
  beforeSnapshot: VersionSnapshot | null,
  operator: string = '系统'
): VersionHistoryEntry {
  const afterSnapshot = createVersionSnapshot(event)
  const diff = generateDiff(beforeSnapshot, afterSnapshot)

  return {
    id: generateId(),
    version: event.currentVersion + 1,
    action,
    description,
    timestamp: Date.now(),
    operator,
    before: beforeSnapshot,
    after: afterSnapshot,
    diff
  }
}

export function generateDiff(before: VersionSnapshot | null, after: VersionSnapshot): string[] {
  if (!before) {
    return ['创建新事件']
  }

  const diffs: string[] = []

  if (before.name !== after.name) {
    diffs.push(`名称: "${before.name}" → "${after.name}"`)
  }
  if (before.type !== after.type) {
    diffs.push(`类型: ${before.type} → ${after.type}`)
  }
  if (before.startDate !== after.startDate) {
    diffs.push(`开始日期: ${before.startDate} → ${after.startDate}`)
  }
  if (before.durationDays !== after.durationDays) {
    diffs.push(`持续天数: ${before.durationDays} → ${after.durationDays}`)
  }
  if (before.solarTerm !== after.solarTerm) {
    diffs.push(`所属节气: ${before.solarTerm} → ${after.solarTerm}`)
  }
  if (before.verified !== after.verified) {
    diffs.push(`校定状态: ${before.verified ? '已校定' : '未校定'} → ${after.verified ? '已校定' : '未校定'}`)
  }
  if (before.sources.length !== after.sources.length) {
    diffs.push(`来源数量: ${before.sources.length} → ${after.sources.length}`)
  }
  if (before.description !== after.description) {
    diffs.push('描述已更新')
  }

  if (diffs.length === 0) {
    diffs.push('无明显变化')
  }

  return diffs
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

export function getVerificationStatusInfo(status: VerificationStatus): { label: string; color: string; icon: string } {
  const map: Record<VerificationStatus, { label: string; color: string; icon: string }> = {
    unverified: { label: '未校定', color: '#f59e0b', icon: '⚠️' },
    conflict: { label: '冲突中', color: '#ef4444', icon: '⚡' },
    verified: { label: '已校定', color: '#10b981', icon: '✓' }
  }
  return map[status]
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

export function createDefaultSource(): SourceInfo {
  return {
    id: generateId(),
    name: '',
    type: 'book',
    url: '',
    note: ''
  }
}
