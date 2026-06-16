import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type {
  GraphViewState,
  GraphSearchFilters,
  GraphNodeType,
  EventType,
  SolarTermKey,
  GraphData,
  GraphNode,
  GraphEdge
} from '@/types'
import { EVENT_TYPES } from '@/types'
import { useCoreStore } from './core'
import { usePredictionStore } from './prediction'
import {
  filterEventsForGraph,
  generateGraphData as generateGraphDataPure,
  getNodeNeighbors as getNodeNeighborsPure
} from '@/utils/graphGen'
import type { GraphGenerationOptions } from '@/utils/graphGen'

export const useGraphStore = defineStore('graph', () => {
  const coreStore = useCoreStore()
  const predictionStore = usePredictionStore()

  const graphViewState = reactive<GraphViewState>({
    selectedNodeId: null,
    hoveredNodeId: null,
    highlightSources: true,
    showLabels: true,
    layoutMode: 'force'
  })

  const graphSearchFilters = reactive<GraphSearchFilters>({
    keyword: '',
    eventTypes: [...EVENT_TYPES.map(t => t.key)],
    regionIds: [],
    solarTermKeys: [],
    nodeTypes: ['event', 'solarTerm', 'region', 'source'],
    minReliability: 0,
    maxHops: 2
  })

  const graphNodePositions = ref<Map<string, { x: number; y: number }>>(new Map())

  function saveGraphNodePosition(nodeId: string, x: number, y: number) {
    graphNodePositions.value.set(nodeId, { x, y })
  }

  function getGraphNodePosition(nodeId: string): { x: number; y: number } | undefined {
    return graphNodePositions.value.get(nodeId)
  }

  function clearGraphNodePositions() {
    graphNodePositions.value.clear()
  }

  function getEventsForFilters() {
    return filterEventsForGraph(
      coreStore.events,
      graphSearchFilters,
      coreStore.regions.map(r => ({
        id: r.id,
        name: r.name,
        province: r.province,
        climateZone: r.climateZone
      }))
    )
  }

  function generateGraphData(): GraphData {
    const filteredEventsList = getEventsForFilters()

    const options: GraphGenerationOptions = {
      filteredEvents: filteredEventsList,
      filters: graphSearchFilters,
      nodePositions: graphNodePositions.value,
      showWarningMarkers: predictionStore.showWarningMarkers,
      getEventWarning: (eventId: string) => {
        const warning = predictionStore.getEventWarning(eventId)
        return warning ? {
          warningLevel: warning.warningLevel,
          description: warning.description,
          anomalyType: warning.anomalyType
        } : undefined
      }
    }

    return generateGraphDataPure(options)
  }

  function getNodeNeighbors(nodeId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const graphData = generateGraphData()
    return getNodeNeighborsPure(nodeId, graphData, graphSearchFilters.maxHops)
  }

  function setGraphViewMode(mode: 'force' | 'circular' | 'hierarchical') {
    graphViewState.layoutMode = mode
    clearGraphNodePositions()
  }

  function selectGraphNode(nodeId: string | null) {
    graphViewState.selectedNodeId = nodeId
  }

  function hoverGraphNode(nodeId: string | null) {
    graphViewState.hoveredNodeId = nodeId
  }

  function toggleHighlightSources(value: boolean) {
    graphViewState.highlightSources = value
  }

  function toggleShowLabels(value: boolean) {
    graphViewState.showLabels = value
  }

  function setGraphKeyword(keyword: string) {
    graphSearchFilters.keyword = keyword
  }

  function toggleGraphEventType(type: EventType) {
    const idx = graphSearchFilters.eventTypes.indexOf(type)
    if (idx >= 0) {
      graphSearchFilters.eventTypes.splice(idx, 1)
    } else {
      graphSearchFilters.eventTypes.push(type)
    }
  }

  function toggleGraphRegion(regionId: string) {
    const idx = graphSearchFilters.regionIds.indexOf(regionId)
    if (idx >= 0) {
      graphSearchFilters.regionIds.splice(idx, 1)
    } else {
      graphSearchFilters.regionIds.push(regionId)
    }
  }

  function toggleGraphSolarTerm(termKey: SolarTermKey) {
    const idx = graphSearchFilters.solarTermKeys.indexOf(termKey)
    if (idx >= 0) {
      graphSearchFilters.solarTermKeys.splice(idx, 1)
    } else {
      graphSearchFilters.solarTermKeys.push(termKey)
    }
  }

  function toggleGraphNodeType(nodeType: GraphNodeType) {
    const idx = graphSearchFilters.nodeTypes.indexOf(nodeType)
    if (idx >= 0) {
      if (graphSearchFilters.nodeTypes.length > 1) {
        graphSearchFilters.nodeTypes.splice(idx, 1)
      }
    } else {
      graphSearchFilters.nodeTypes.push(nodeType)
    }
  }

  function setMinReliability(value: number) {
    graphSearchFilters.minReliability = value
  }

  function setMaxHops(value: number) {
    graphSearchFilters.maxHops = value
  }

  function resetGraphFilters() {
    graphSearchFilters.keyword = ''
    graphSearchFilters.eventTypes = [...EVENT_TYPES.map(t => t.key)]
    graphSearchFilters.regionIds = []
    graphSearchFilters.solarTermKeys = []
    graphSearchFilters.nodeTypes = ['event', 'solarTerm', 'region', 'source']
    graphSearchFilters.minReliability = 0
    graphSearchFilters.maxHops = 2
    graphViewState.selectedNodeId = null
    graphViewState.hoveredNodeId = null
  }

  return {
    graphViewState,
    graphSearchFilters,
    graphNodePositions,
    saveGraphNodePosition,
    getGraphNodePosition,
    clearGraphNodePositions,
    getEventsForFilters,
    generateGraphData,
    getNodeNeighbors,
    setGraphViewMode,
    selectGraphNode,
    hoverGraphNode,
    toggleHighlightSources,
    toggleShowLabels,
    setGraphKeyword,
    toggleGraphEventType,
    toggleGraphRegion,
    toggleGraphSolarTerm,
    toggleGraphNodeType,
    setMinReliability,
    setMaxHops,
    resetGraphFilters
  }
})
