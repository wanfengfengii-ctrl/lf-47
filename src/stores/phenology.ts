import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useCoreStore } from './core'
import { usePredictionStore } from './prediction'
import { useGraphStore } from './graph'

export const usePhenologyStore = defineStore('phenology', () => {
  const coreStore = useCoreStore()
  const predictionStore = usePredictionStore()
  const graphStore = useGraphStore()

  const state = computed(() => coreStore.state)
  const events = computed(() => coreStore.events)
  const regions = computed(() => coreStore.regions)
  const currentRegion = computed(() => coreStore.currentRegion)
  const filteredEvents = computed(() => coreStore.filteredEvents)
  const selectedEvent = computed(() => coreStore.selectedEvent)
  const eventsBySolarTerm = computed(() => coreStore.eventsBySolarTerm)
  const compareEvents = computed(() => coreStore.compareEvents)

  const graphViewState = computed(() => graphStore.graphViewState)
  const graphSearchFilters = computed(() => graphStore.graphSearchFilters)
  const graphNodePositions = computed(() => graphStore.graphNodePositions)
  const showWarningMarkers = computed(() => predictionStore.showWarningMarkers)
  const predictionsAndWarnings = computed(() => predictionStore.predictionsAndWarnings)
  const warningStats = computed(() => predictionStore.warningStats)
  const anomalousEvents = computed(() => predictionStore.anomalousEvents)

  return {
    state,
    events,
    regions,
    currentRegion,
    filteredEvents,
    selectedEvent,
    eventsBySolarTerm,
    compareEvents,
    graphViewState,
    graphSearchFilters,
    graphNodePositions,
    showWarningMarkers,
    predictionsAndWarnings,
    warningStats,
    anomalousEvents,

    saveGraphNodePosition: graphStore.saveGraphNodePosition,
    getGraphNodePosition: graphStore.getGraphNodePosition,
    clearGraphNodePositions: graphStore.clearGraphNodePositions,
    toggleWarningMarkers: predictionStore.toggleWarningMarkers,
    getEventPrediction: predictionStore.getEventPrediction,
    getOrCreatePredictionAndWarning: predictionStore.getOrCreatePredictionAndWarning,
    getEventWarning: predictionStore.getEventWarning,
    getEventWarningLevel: predictionStore.getEventWarningLevel,
    predictEventForYear: predictionStore.predictEventForYear,
    clearPredictionCache: predictionStore.clearPredictionCache,

    setYear: coreStore.setYear,
    setRegion: coreStore.setRegion,
    toggleEventType: coreStore.toggleEventType,
    selectEvent: coreStore.selectEvent,
    setEditing: coreStore.setEditing,
    startCreating: coreStore.startCreating,
    setViewMode: coreStore.setViewMode,
    createEmptyEvent: coreStore.createEmptyEvent,
    addEvent: coreStore.addEvent,
    updateEvent: coreStore.updateEvent,
    moveEvent: coreStore.moveEvent,
    deleteEvent: coreStore.deleteEvent,
    addSourceRecord: coreStore.addSourceRecord,
    removeSourceRecord: coreStore.removeSourceRecord,
    updateSourceRecord: coreStore.updateSourceRecord,
    verifyEvent: coreStore.verifyEvent,
    unverifyEvent: coreStore.unverifyEvent,
    rollbackToVersion: coreStore.rollbackToVersion,
    refreshEventStatus: coreStore.refreshEventStatus,
    getEventsForSolarTerm: coreStore.getEventsForSolarTerm,
    getEventsForRegion: coreStore.getEventsForRegion,
    createDefaultSource: coreStore.createDefaultSource,
    getDominantType: coreStore.getDominantType,
    getWeightedAverageObservation: coreStore.getWeightedAverageObservation,
    canVerify: coreStore.canVerify,
    analyzeConflicts: coreStore.analyzeConflicts,

    generateGraphData: graphStore.generateGraphData,
    getNodeNeighbors: graphStore.getNodeNeighbors,
    setGraphViewMode: graphStore.setGraphViewMode,
    selectGraphNode: graphStore.selectGraphNode,
    hoverGraphNode: graphStore.hoverGraphNode,
    toggleHighlightSources: graphStore.toggleHighlightSources,
    toggleShowLabels: graphStore.toggleShowLabels,
    setGraphKeyword: graphStore.setGraphKeyword,
    toggleGraphEventType: graphStore.toggleGraphEventType,
    toggleGraphRegion: graphStore.toggleGraphRegion,
    toggleGraphSolarTerm: graphStore.toggleGraphSolarTerm,
    toggleGraphNodeType: graphStore.toggleGraphNodeType,
    setMinReliability: graphStore.setMinReliability,
    setMaxHops: graphStore.setMaxHops,
    resetGraphFilters: graphStore.resetGraphFilters,
    getEventsForFilters: graphStore.getEventsForFilters
  }
})
