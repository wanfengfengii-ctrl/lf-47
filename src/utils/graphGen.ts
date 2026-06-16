import type {
  PhenologyEvent,
  SourceInfo,
  GraphNode,
  GraphEdge,
  GraphData,
  GraphSearchFilters,
  SolarTermKey
} from '@/types'
import {
  EVENT_TYPES,
  SOLAR_TERMS,
  GRAPH_NODE_TYPE_INFO,
  WARNING_LEVEL_INFO
} from '@/types'
import type { WarningLevel } from '@/types'

export function filterEventsForGraph(
  events: PhenologyEvent[],
  filters: GraphSearchFilters,
  regions: { id: string; name: string; province: string; climateZone: string }[]
): PhenologyEvent[] {
  return events.filter(e => {
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(e.type)) {
      return false
    }
    if (filters.regionIds.length > 0 && !filters.regionIds.includes(e.regionId)) {
      return false
    }
    if (filters.solarTermKeys.length > 0 && !filters.solarTermKeys.includes(e.solarTerm)) {
      return false
    }
    if (filters.minReliability > 0) {
      const maxReliability = e.sources.length > 0
        ? Math.max(...e.sources.map(s => s.reliabilityScore))
        : 0
      if (maxReliability < filters.minReliability) {
        return false
      }
    }
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      const matchName = e.name.toLowerCase().includes(keyword)
      const matchDesc = e.description?.toLowerCase().includes(keyword) || false
      const matchSource = e.sources.some(s =>
        s.sourceInfo.name.toLowerCase().includes(keyword) ||
        (s.sourceInfo.note?.toLowerCase().includes(keyword) || false)
      )
      const region = regions.find(r => r.id === e.regionId)
      const matchRegion = region ? (
        region.name.toLowerCase().includes(keyword) ||
        region.province.toLowerCase().includes(keyword) ||
        region.climateZone.toLowerCase().includes(keyword)
      ) : false
      const term = SOLAR_TERMS.find(t => t.key === e.solarTerm)
      const matchSolarTerm = term ? term.name.toLowerCase().includes(keyword) : false
      if (!matchName && !matchDesc && !matchSource && !matchRegion && !matchSolarTerm) {
        return false
      }
    }
    return true
  })
}

export interface GraphGenerationOptions {
  filteredEvents: PhenologyEvent[]
  filters: GraphSearchFilters
  nodePositions: Map<string, { x: number; y: number }>
  showWarningMarkers: boolean
  getEventWarning: (eventId: string) => { warningLevel: WarningLevel; description?: string; anomalyType?: string } | undefined
}

export function generateGraphData(options: GraphGenerationOptions): GraphData {
  const { filteredEvents, filters, nodePositions, showWarningMarkers, getEventWarning } = options
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIdSet = new Set<string>()
  const edgeIdSet = new Set<string>()

  const allSources = new Map<string, SourceInfo>()
  filteredEvents.forEach(e => {
    e.sources.forEach(s => {
      if (!allSources.has(s.sourceInfo.id)) {
        allSources.set(s.sourceInfo.id, s.sourceInfo)
      }
    })
  })

  const allRegions = new Set<string>()
  const allSolarTerms = new Set<SolarTermKey>()
  filteredEvents.forEach(e => {
    allRegions.add(e.regionId)
    allSolarTerms.add(e.solarTerm)
  })

  if (filters.nodeTypes.includes('event')) {
    filteredEvents.forEach(event => {
      const eventTypeInfo = EVENT_TYPES.find(t => t.key === event.type)!
      const avgReliability = event.sources.length > 0
        ? event.sources.reduce((sum, s) => sum + s.reliabilityScore, 0) / event.sources.length
        : 50
      const size = 20 + (avgReliability / 100) * 15
      const nodeId = `event-${event.id}`
      const savedPos = nodePositions.get(nodeId)
      const warning = getEventWarning(event.id)
      const warningLevel = warning?.warningLevel || 'none'
      const warningInfo = WARNING_LEVEL_INFO[warningLevel]
      let nodeColor = eventTypeInfo.color
      if (showWarningMarkers && warningLevel !== 'none') {
        nodeColor = warningInfo.color
      }

      nodes.push({
        id: nodeId,
        type: 'event',
        label: event.name,
        subLabel: eventTypeInfo.label,
        description: warning?.description || event.description,
        color: nodeColor,
        icon: eventTypeInfo.icon,
        size,
        x: savedPos?.x,
        y: savedPos?.y,
        data: {
          eventId: event.id,
          event,
          warningLevel,
          anomalyType: warning?.anomalyType || 'none',
          warningInfo,
          warning
        }
      })
      nodeIdSet.add(nodeId)
    })
  }

  if (filters.nodeTypes.includes('solarTerm')) {
    allSolarTerms.forEach(termKey => {
      const term = SOLAR_TERMS.find(t => t.key === termKey)!
      const eventCount = filteredEvents.filter(e => e.solarTerm === termKey).length
      const size = 18 + Math.min(eventCount * 3, 15)
      const nodeId = `solarTerm-${termKey}`
      const savedPos = nodePositions.get(nodeId)

      nodes.push({
        id: nodeId,
        type: 'solarTerm',
        label: term.name,
        subLabel: `${term.month}月${term.day}日`,
        description: `二十四节气之${term.name}`,
        color: GRAPH_NODE_TYPE_INFO.solarTerm.color,
        icon: GRAPH_NODE_TYPE_INFO.solarTerm.icon,
        size,
        x: savedPos?.x,
        y: savedPos?.y,
        data: { solarTermKey: termKey, term }
      })
      nodeIdSet.add(nodeId)
    })
  }

  if (filters.nodeTypes.includes('region')) {
    allRegions.forEach(regionId => {
      const eventCount = filteredEvents.filter(e => e.regionId === regionId).length
      const size = 18 + Math.min(eventCount * 3, 15)
      const nodeId = `region-${regionId}`
      const savedPos = nodePositions.get(nodeId)

      nodes.push({
        id: nodeId,
        type: 'region',
        label: regionId,
        subLabel: regionId,
        description: '',
        color: GRAPH_NODE_TYPE_INFO.region.color,
        icon: GRAPH_NODE_TYPE_INFO.region.icon,
        size,
        x: savedPos?.x,
        y: savedPos?.y,
        data: { regionId }
      })
      nodeIdSet.add(nodeId)
    })
  }

  if (filters.nodeTypes.includes('source')) {
    allSources.forEach((sourceInfo, sourceId) => {
      const citingEvents = filteredEvents.filter(e =>
        e.sources.some(s => s.sourceInfo.id === sourceId)
      )
      const avgReliability = citingEvents.length > 0
        ? citingEvents.reduce((sum, e) => {
            const source = e.sources.find(s => s.sourceInfo.id === sourceId)
            return sum + (source?.reliabilityScore || 0)
          }, 0) / citingEvents.length
        : 50
      const size = 16 + Math.min(citingEvents.length * 2, 12)
      const nodeId = `source-${sourceId}`
      const savedPos = nodePositions.get(nodeId)

      nodes.push({
        id: nodeId,
        type: 'source',
        label: sourceInfo.name,
        subLabel: sourceInfo.type,
        description: sourceInfo.note,
        color: GRAPH_NODE_TYPE_INFO.source.color,
        icon: GRAPH_NODE_TYPE_INFO.source.icon,
        size,
        x: savedPos?.x,
        y: savedPos?.y,
        data: { sourceId, sourceInfo, reliabilityScore: avgReliability }
      })
      nodeIdSet.add(nodeId)
    })
  }

  filteredEvents.forEach(event => {
    const eventNodeId = `event-${event.id}`
    if (!nodeIdSet.has(eventNodeId)) return

    if (filters.nodeTypes.includes('solarTerm')) {
      const termNodeId = `solarTerm-${event.solarTerm}`
      const edgeId = `${eventNodeId}-${termNodeId}`
      if (nodeIdSet.has(termNodeId) && !edgeIdSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: eventNodeId,
          target: termNodeId,
          type: 'belongs_to_solar_term',
          weight: 1
        })
        edgeIdSet.add(edgeId)
      }
    }

    if (filters.nodeTypes.includes('region')) {
      const regionNodeId = `region-${event.regionId}`
      const edgeId = `${eventNodeId}-${regionNodeId}`
      if (nodeIdSet.has(regionNodeId) && !edgeIdSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: eventNodeId,
          target: regionNodeId,
          type: 'occurs_in_region',
          weight: 1
        })
        edgeIdSet.add(edgeId)
      }
    }

    if (filters.nodeTypes.includes('source')) {
      event.sources.forEach(source => {
        const sourceNodeId = `source-${source.sourceInfo.id}`
        const edgeId = `${eventNodeId}-${sourceNodeId}`
        if (nodeIdSet.has(sourceNodeId) && !edgeIdSet.has(edgeId)) {
          const weight = source.reliabilityScore / 100
          edges.push({
            id: edgeId,
            source: eventNodeId,
            target: sourceNodeId,
            type: 'cited_from_source',
            weight
          })
          edgeIdSet.add(edgeId)
        }
      })
    }
  })

  if (filters.maxHops >= 2) {
    for (let i = 0; i < filteredEvents.length; i++) {
      for (let j = i + 1; j < filteredEvents.length; j++) {
        const e1 = filteredEvents[i]
        const e2 = filteredEvents[j]
        const id1 = `event-${e1.id}`
        const id2 = `event-${e2.id}`
        if (!nodeIdSet.has(id1) || !nodeIdSet.has(id2)) continue

        if (e1.type === e2.type) {
          const edgeId = `same-type-${e1.id}-${e2.id}`
          if (!edgeIdSet.has(edgeId)) {
            edges.push({
              id: edgeId,
              source: id1,
              target: id2,
              type: 'same_type',
              weight: 0.4
            })
            edgeIdSet.add(edgeId)
          }
        }

        if (e1.solarTerm === e2.solarTerm) {
          const edgeId = `same-term-${e1.id}-${e2.id}`
          if (!edgeIdSet.has(edgeId)) {
            edges.push({
              id: edgeId,
              source: id1,
              target: id2,
              type: 'related_event',
              weight: 0.6,
              label: '同节气'
            })
            edgeIdSet.add(edgeId)
          }
        }
      }
    }
  }

  return { nodes, edges }
}

export function getNodeNeighbors(
  nodeId: string,
  graphData: GraphData,
  maxHops: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const neighborNodeIds = new Set<string>([nodeId])
  const neighborEdges: GraphEdge[] = []

  for (let hop = 0; hop < maxHops; hop++) {
    const currentIds = new Set(neighborNodeIds)
    graphData.edges.forEach(edge => {
      if (currentIds.has(edge.source) || currentIds.has(edge.target)) {
        neighborNodeIds.add(edge.source)
        neighborNodeIds.add(edge.target)
        if (!neighborEdges.find(e => e.id === edge.id)) {
          neighborEdges.push(edge)
        }
      }
    })
  }

  const neighborNodes = graphData.nodes.filter(n => neighborNodeIds.has(n.id))
  return { nodes: neighborNodes, edges: neighborEdges }
}
