import type {
  SourceRecord,
  SourceInfo,
  SourceReliability,
  SourceType,
  ObservationData,
  ConflictAnalysis,
  ConflictDetail,
  VerificationStatus,
  VersionSnapshot,
  VersionHistoryEntry,
  VersionAction,
  PhenologyEvent
} from '@/types'
import { SOURCE_RELIABILITY_SCORE, SOURCE_TYPE_RELIABILITY } from '@/types'
import { dateDiffInDays } from './dateCalc'

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

export function createDefaultSource(): SourceInfo {
  return {
    id: generateId(),
    name: '',
    type: 'book',
    url: '',
    note: ''
  }
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

export function getVerificationStatusInfo(status: VerificationStatus): { label: string; color: string; icon: string } {
  const map: Record<VerificationStatus, { label: string; color: string; icon: string }> = {
    unverified: { label: '未校定', color: '#f59e0b', icon: '⚠️' },
    conflict: { label: '冲突中', color: '#ef4444', icon: '⚡' },
    verified: { label: '已校定', color: '#10b981', icon: '✓' }
  }
  return map[status]
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
