import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  EventPredictionAndWarning,
  PredictionResult,
  AnomalyDetectionResult,
  WarningLevel
} from '@/types'
import { useCoreStore } from './core'
import {
  collectHistoricalDataPoints,
  predictPhenologyEvent,
  detectAnomaly
} from '@/utils/prediction'

export const usePredictionStore = defineStore('prediction', () => {
  const coreStore = useCoreStore()

  const predictionsAndWarnings = ref<Map<string, EventPredictionAndWarning>>(new Map())
  const showWarningMarkers = ref(true)

  function toggleWarningMarkers(value: boolean) {
    showWarningMarkers.value = value
  }

  function getEventPrediction(eventId: string): PredictionResult | undefined {
    const event = coreStore.events.find(e => e.id === eventId)
    if (!event) return undefined

    const historicalPoints = collectHistoricalDataPoints(
      coreStore.events,
      event.regionId,
      event.name,
      event.type,
      event.solarTerm,
      event.year
    )
    return predictPhenologyEvent(historicalPoints, event.year)
  }

  function getOrCreatePredictionAndWarning(eventId: string): EventPredictionAndWarning | undefined {
    const event = coreStore.events.find(e => e.id === eventId)
    if (!event) return undefined

    const cached = predictionsAndWarnings.value.get(eventId)
    if (cached && cached.lastUpdated >= event.updatedAt) {
      return cached
    }

    const prediction = getEventPrediction(eventId)
    const anomaly = prediction ? detectAnomaly(event, prediction) : undefined

    const result: EventPredictionAndWarning = {
      eventId,
      prediction,
      anomaly,
      lastUpdated: Date.now()
    }
    predictionsAndWarnings.value.set(eventId, result)
    return result
  }

  function getEventWarning(eventId: string): AnomalyDetectionResult | undefined {
    return getOrCreatePredictionAndWarning(eventId)?.anomaly
  }

  function getEventWarningLevel(eventId: string): WarningLevel {
    const warning = getEventWarning(eventId)
    return warning?.warningLevel || 'none'
  }

  function predictEventForYear(eventId: string, targetYear: number): PredictionResult | undefined {
    const event = coreStore.events.find(e => e.id === eventId)
    if (!event) return undefined

    const historicalPoints = collectHistoricalDataPoints(
      coreStore.events,
      event.regionId,
      event.name,
      event.type,
      event.solarTerm
    )
    return predictPhenologyEvent(historicalPoints, targetYear)
  }

  function clearPredictionCache() {
    predictionsAndWarnings.value.clear()
  }

  const warningStats = computed(() => {
    let total = 0
    let critical = 0
    let high = 0
    let medium = 0
    let low = 0
    let normal = 0

    coreStore.events.forEach(event => {
      if (event.year !== coreStore.state.currentYear) return
      if (event.regionId !== coreStore.state.currentRegionId) return
      if (!coreStore.state.selectedEventTypes.includes(event.type)) return
      total++
      const level = getEventWarningLevel(event.id)
      if (level === 'critical') critical++
      else if (level === 'high') high++
      else if (level === 'medium') medium++
      else if (level === 'low') low++
      else normal++
    })

    return { total, critical, high, medium, low, normal }
  })

  const anomalousEvents = computed(() => {
    return coreStore.events.filter(event => {
      if (event.year !== coreStore.state.currentYear) return false
      const warning = getEventWarning(event.id)
      return warning?.hasAnomaly || false
    })
  })

  return {
    predictionsAndWarnings,
    showWarningMarkers,
    warningStats,
    anomalousEvents,
    toggleWarningMarkers,
    getEventPrediction,
    getOrCreatePredictionAndWarning,
    getEventWarning,
    getEventWarningLevel,
    predictEventForYear,
    clearPredictionCache
  }
})
