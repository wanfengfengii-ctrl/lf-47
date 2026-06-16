import type {
  PhenologyEvent,
  EventType,
  HistoricalDataPoint,
  PredictionResult,
  AnomalyDetectionResult,
  WarningLevel,
  AnomalyType
} from '@/types'
import { ANOMALY_TYPE_INFO, WARNING_LEVEL_INFO } from '@/types'
import type { WarningLevelInfo } from '@/types'
import { parseDate, getDayOfYear, formatDate, getDateFromDayOfYear } from './dateCalc'

function weightedMean(values: number[], weights: number[]): number {
  if (values.length === 0) return 0
  if (weights.length === 0) {
    return values.reduce((a, b) => a + b, 0) / values.length
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight === 0) {
    return values.reduce((a, b) => a + b, 0) / values.length
  }
  let weightedSum = 0
  for (let i = 0; i < values.length; i++) {
    weightedSum += values[i] * (weights[i] || 0)
  }
  return weightedSum / totalWeight
}

function weightedStdDev(values: number[], weights: number[], mean: number): number {
  if (values.length < 2) return 0
  if (weights.length === 0) {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight === 0) {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }
  let weightedVariance = 0
  for (let i = 0; i < values.length; i++) {
    weightedVariance += (weights[i] || 0) * Math.pow(values[i] - mean, 2)
  }
  return Math.sqrt(weightedVariance / totalWeight)
}

export function collectHistoricalDataPoints(
  allEvents: PhenologyEvent[],
  regionId: string,
  eventName: string,
  eventType: EventType,
  solarTerm: string,
  excludeYear?: number
): HistoricalDataPoint[] {
  const points: HistoricalDataPoint[] = []

  allEvents.forEach(event => {
    if (
      event.regionId === regionId &&
      event.name.trim() === eventName.trim() &&
      event.type === eventType &&
      event.solarTerm === solarTerm &&
      (excludeYear === undefined || event.year !== excludeYear)
    ) {
      const avgReliability = event.sources.length > 0
        ? event.sources.reduce((sum, s) => sum + s.reliabilityScore, 0) / event.sources.length
        : 30

      points.push({
        year: event.year,
        startDate: event.startDate,
        dayOfYear: getDayOfYear(parseDate(event.startDate)),
        durationDays: event.durationDays,
        reliabilityScore: avgReliability,
        sourceCount: event.sources.length
      })
    }
  })

  return points.sort((a, b) => a.year - b.year)
}

export function predictPhenologyEvent(
  historicalPoints: HistoricalDataPoint[],
  targetYear: number
): PredictionResult | undefined {
  if (historicalPoints.length === 0) return undefined

  const startDays = historicalPoints.map(p => p.dayOfYear)
  const durations = historicalPoints.map(p => p.durationDays)
  const weights = historicalPoints.map(p => {
    const recencyBonus = 1 + (p.year - historicalPoints[0].year) * 0.05
    return p.reliabilityScore * recencyBonus * (p.sourceCount > 0 ? Math.min(p.sourceCount, 3) : 1)
  })

  const avgStart = weightedMean(startDays, weights)
  const stdStart = weightedStdDev(startDays, weights, avgStart)
  const avgDuration = weightedMean(durations, weights)
  const stdDuration = weightedStdDev(durations, weights, avgDuration)

  let dataSufficiency: PredictionResult['dataSufficiency'] = 'insufficient'
  let confidence = 0
  const avgReliability = historicalPoints.reduce((sum, p) => sum + p.reliabilityScore, 0) / historicalPoints.length

  if (historicalPoints.length >= 5 && avgReliability >= 70) {
    dataSufficiency = 'high'
    confidence = Math.min(95, 60 + historicalPoints.length * 5 + avgReliability * 0.2)
  } else if (historicalPoints.length >= 3 && avgReliability >= 50) {
    dataSufficiency = 'medium'
    confidence = Math.min(80, 40 + historicalPoints.length * 8 + avgReliability * 0.15)
  } else if (historicalPoints.length >= 2) {
    dataSufficiency = 'low'
    confidence = Math.min(60, 20 + historicalPoints.length * 10 + avgReliability * 0.1)
  } else {
    dataSufficiency = 'insufficient'
    confidence = 30
  }

  const predictedStartDay = Math.round(avgStart)
  const predictedStartDate = formatDate(getDateFromDayOfYear(predictedStartDay, targetYear))
  const predictedDuration = Math.max(1, Math.round(avgDuration))

  return {
    predictedStartDate,
    predictedDayOfYear: predictedStartDay,
    predictedDurationDays: predictedDuration,
    confidence: Math.round(confidence),
    historicalDataPoints: historicalPoints,
    avgStartDayOfYear: avgStart,
    stdStartDayOfYear: stdStart,
    avgDurationDays: avgDuration,
    stdDurationDays: stdDuration,
    dataSufficiency
  }
}

export function detectAnomaly(
  event: PhenologyEvent,
  prediction: PredictionResult
): AnomalyDetectionResult {
  const actualStartDay = getDayOfYear(parseDate(event.startDate))
  const startDeviation = actualStartDay - prediction.avgStartDayOfYear
  const durationDeviation = event.durationDays - prediction.avgDurationDays
  const durationDeviationPercent = prediction.avgDurationDays > 0
    ? (durationDeviation / prediction.avgDurationDays) * 100
    : 0

  const startZScore = prediction.stdStartDayOfYear > 0
    ? startDeviation / prediction.stdStartDayOfYear
    : 0
  const durationZScore = prediction.stdDurationDays > 0
    ? durationDeviation / prediction.stdDurationDays
    : 0

  let anomalyType: AnomalyType = 'none'
  let warningLevel: WarningLevel = 'none'

  const absStartZ = Math.abs(startZScore)
  const absDurationZ = Math.abs(durationZScore)
  const maxZ = Math.max(absStartZ, absDurationZ)

  if (startZScore <= -2 || (startDeviation <= -10 && absStartZ >= 1.5)) {
    anomalyType = 'early_start'
  } else if (startZScore >= 2 || (startDeviation >= 10 && absStartZ >= 1.5)) {
    anomalyType = 'late_start'
  } else if (durationZScore <= -1.5 || durationDeviationPercent <= -30) {
    anomalyType = 'shortened'
  } else if (durationZScore >= 1.5 || durationDeviationPercent >= 30) {
    anomalyType = 'extended'
  }

  if (anomalyType !== 'none') {
    if (maxZ >= 3 || Math.abs(startDeviation) >= 20 || Math.abs(durationDeviationPercent) >= 60) {
      warningLevel = 'critical'
    } else if (maxZ >= 2.5 || Math.abs(startDeviation) >= 15 || Math.abs(durationDeviationPercent) >= 45) {
      warningLevel = 'high'
    } else if (maxZ >= 2 || Math.abs(startDeviation) >= 10 || Math.abs(durationDeviationPercent) >= 30) {
      warningLevel = 'medium'
    } else {
      warningLevel = 'low'
    }
  }

  const anomalyInfo = ANOMALY_TYPE_INFO[anomalyType]
  let description = anomalyInfo.description
  if (anomalyType !== 'none') {
    const details: string[] = []
    if (startDeviation !== 0) {
      details.push(startDeviation < 0 ? `提前${Math.abs(startDeviation)}天` : `延后${startDeviation}天`)
    }
    if (durationDeviationPercent !== 0) {
      details.push(durationDeviationPercent < 0 ? `缩短${Math.abs(Math.round(durationDeviationPercent))}%` : `延长${Math.round(durationDeviationPercent)}%`)
    }
    if (details.length > 0) {
      description += `（${details.join('，')}）`
    }
  }

  return {
    hasAnomaly: anomalyType !== 'none',
    anomalyType,
    warningLevel,
    startDateDeviationDays: Math.round(startDeviation),
    durationDeviationPercent: Math.round(durationDeviationPercent),
    startDateZScore: Math.round(startZScore * 100) / 100,
    durationZScore: Math.round(durationZScore * 100) / 100,
    description
  }
}

export function getWarningLevelInfo(level: WarningLevel): WarningLevelInfo {
  return WARNING_LEVEL_INFO[level]
}

export function getAnomalyTypeInfo(type: AnomalyType) {
  return ANOMALY_TYPE_INFO[type]
}
