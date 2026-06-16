import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import type {
  PhenologyEvent,
  Region,
  SolarTermKey,
  EventType,
  AppState,
  SourceRecord,
  GraphData,
  GraphNode,
  GraphEdge,
  GraphNodeType,
  GraphSearchFilters,
  GraphViewState,
  SourceInfo
} from '@/types'
import {
  EVENT_TYPES,
  SOLAR_TERMS,
  GRAPH_NODE_TYPE_INFO
} from '@/types'
import {
  generateId,
  getSolarTermForDate,
  parseDate,
  validateEvent,
  formatDate,
  createDefaultSource,
  analyzeConflicts,
  determineVerificationStatus,
  createSourceRecord,
  createVersionSnapshot,
  createVersionEntry,
  canVerify,
  getWeightedAverageObservation,
  getDominantType
} from '@/utils'

const DEFAULT_REGIONS: Region[] = [
  { id: 'beijing', name: '北京', province: '北京', latitude: 39.9, longitude: 116.4, climateZone: '暖温带半湿润大陆性季风气候' },
  { id: 'shanghai', name: '上海', province: '上海', latitude: 31.2, longitude: 121.5, climateZone: '亚热带季风气候' },
  { id: 'guangzhou', name: '广州', province: '广东', latitude: 23.1, longitude: 113.3, climateZone: '南亚热带海洋性季风气候' },
  { id: 'chengdu', name: '成都', province: '四川', latitude: 30.7, longitude: 104.1, climateZone: '亚热带季风性湿润气候' },
  { id: 'harbin', name: '哈尔滨', province: '黑龙江', latitude: 45.8, longitude: 126.5, climateZone: '中温带大陆性季风气候' }
]

function makeSourceRecord(name: string, type: 'book' | 'paper' | 'website' | 'oral' | 'other', startDate: string, durationDays: number, reliability?: 'high' | 'medium' | 'low'): SourceRecord {
  return createSourceRecord(
    { id: generateId(), name, type },
    { startDate, durationDays },
    { reliability }
  )
}

function createSampleEvents(): PhenologyEvent[] {
  const now = Date.now()
  const events: PhenologyEvent[] = [
    {
      id: generateId(),
      name: '迎春花开',
      type: 'flowering',
      solarTerm: 'lichun',
      startDate: '2024-02-05',
      durationDays: 20,
      regionId: 'beijing',
      year: 2024,
      sources: [
        makeSourceRecord('北京植物志', 'book', '2024-02-05', 20),
        makeSourceRecord('华北物候观测报告', 'paper', '2024-02-08', 18),
        makeSourceRecord('民间口述记录', 'oral', '2024-01-28', 25, 'low')
      ],
      verified: false,
      verificationStatus: 'conflict',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '播种小麦',
      type: 'farming',
      solarTerm: 'jingzhe',
      startDate: '2024-03-10',
      durationDays: 7,
      regionId: 'beijing',
      year: 2024,
      sources: [
        makeSourceRecord('华北农事历', 'book', '2024-03-10', 7),
        makeSourceRecord('现代农业气象数据', 'website', '2024-03-12', 5)
      ],
      verified: true,
      verificationStatus: 'verified',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '燕子归来',
      type: 'migration',
      solarTerm: 'chunfen',
      startDate: '2024-03-25',
      durationDays: 10,
      regionId: 'beijing',
      year: 2024,
      sources: [
        makeSourceRecord('中国鸟类迁徙报告', 'paper', '2024-03-25', 10)
      ],
      verified: false,
      verificationStatus: 'unverified',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '清明祭扫',
      type: 'folklore',
      solarTerm: 'qingming',
      startDate: '2024-04-04',
      durationDays: 3,
      regionId: 'beijing',
      year: 2024,
      sources: [
        makeSourceRecord('中华民俗大典', 'book', '2024-04-04', 3),
        makeSourceRecord('地方志·北京卷', 'book', '2024-04-04', 3)
      ],
      verified: true,
      verificationStatus: 'verified',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '桃花盛开',
      type: 'flowering',
      solarTerm: 'chunfen',
      startDate: '2024-03-20',
      durationDays: 15,
      regionId: 'shanghai',
      year: 2024,
      sources: [
        makeSourceRecord('上海园林植物记录', 'book', '2024-03-20', 15),
        makeSourceRecord('江南花讯网', 'website', '2024-03-25', 12),
        makeSourceRecord('老园丁口述', 'oral', '2024-03-15', 18, 'low')
      ],
      verified: false,
      verificationStatus: 'conflict',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '梅花绽放',
      type: 'flowering',
      solarTerm: 'lichun',
      startDate: '2024-01-28',
      durationDays: 30,
      regionId: 'guangzhou',
      year: 2024,
      sources: [
        makeSourceRecord('岭南花卉志', 'book', '2024-01-28', 30),
        makeSourceRecord('华南植物观测站', 'paper', '2024-01-30', 28)
      ],
      verified: true,
      verificationStatus: 'verified',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '大雁南飞',
      type: 'migration',
      solarTerm: 'qiufen',
      startDate: '2024-09-25',
      durationDays: 15,
      regionId: 'chengdu',
      year: 2024,
      sources: [],
      verified: false,
      verificationStatus: 'unverified',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    },
    {
      id: generateId(),
      name: '瑞雪兆丰年',
      type: 'folklore',
      solarTerm: 'daxue',
      startDate: '2024-12-10',
      durationDays: 2,
      regionId: 'harbin',
      year: 2024,
      sources: [
        makeSourceRecord('东北民俗录', 'book', '2024-12-10', 2)
      ],
      verified: false,
      verificationStatus: 'unverified',
      createdAt: now,
      updatedAt: now,
      currentVersion: 1,
      versionHistory: []
    }
  ]

  events.forEach(event => {
    const analysis = analyzeConflicts(event.sources)
    event.conflictAnalysis = analysis
    event.verificationStatus = determineVerificationStatus(event.sources, event.verified, analysis)
    const snapshot = createVersionSnapshot(event)
    event.versionHistory = [{
      id: generateId(),
      version: 1,
      action: 'create',
      description: '创建事件',
      timestamp: now,
      operator: '系统',
      before: null,
      after: snapshot,
      diff: ['创建新事件']
    }]
  })

  return events
}

export const usePhenologyStore = defineStore('phenology', () => {
  const state = ref<AppState>({
    currentYear: 2024,
    currentRegionId: 'beijing',
    selectedEventTypes: EVENT_TYPES.map(t => t.key),
    selectedEventId: null,
    isEditing: false,
    viewMode: 'disc'
  })

  const events = ref<PhenologyEvent[]>(createSampleEvents())
  const regions = ref<Region[]>(DEFAULT_REGIONS)

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

  const currentRegion = computed(() =>
    regions.value.find(r => r.id === state.value.currentRegionId)!
  )

  const filteredEvents = computed(() => {
    return events.value.filter(e =>
      e.year === state.value.currentYear &&
      e.regionId === state.value.currentRegionId &&
      state.value.selectedEventTypes.includes(e.type)
    )
  })

  const selectedEvent = computed(() =>
    events.value.find(e => e.id === state.value.selectedEventId) || null
  )

  const eventsBySolarTerm = computed(() => {
    const map = new Map<SolarTermKey, PhenologyEvent[]>()
    SOLAR_TERMS.forEach(t => map.set(t.key, []))
    filteredEvents.value.forEach(e => {
      map.get(e.solarTerm)?.push(e)
    })
    return map
  })

  const compareEvents = computed(() => {
    return events.value.filter(e => e.year === state.value.currentYear)
  })

  function setYear(year: number) {
    state.value.currentYear = year
  }

  function setRegion(regionId: string) {
    state.value.currentRegionId = regionId
  }

  function toggleEventType(type: EventType) {
    const idx = state.value.selectedEventTypes.indexOf(type)
    if (idx >= 0) {
      if (state.value.selectedEventTypes.length > 1) {
        state.value.selectedEventTypes.splice(idx, 1)
      }
    } else {
      state.value.selectedEventTypes.push(type)
    }
  }

  function selectEvent(eventId: string | null) {
    state.value.selectedEventId = eventId
    if (eventId !== null) {
      state.value.isEditing = false
    }
  }

  function setEditing(editing: boolean) {
    state.value.isEditing = editing
  }

  function startCreating() {
    state.value.selectedEventId = null
    state.value.isEditing = true
    state.value.viewMode = 'disc'
  }

  function setViewMode(mode: 'disc' | 'compare' | 'graph') {
    state.value.viewMode = mode
    if (mode === 'graph') {
      state.value.selectedEventId = null
      state.value.isEditing = false
      resetGraphFilters()
    } else {
      selectGraphNode(null)
      hoverGraphNode(null)
    }
  }

  function refreshEventStatus(event: PhenologyEvent) {
    const analysis = analyzeConflicts(event.sources)
    event.conflictAnalysis = analysis
    event.verificationStatus = determineVerificationStatus(event.sources, event.verified, analysis)
  }

  function createEmptyEvent(): PhenologyEvent {
    const now = Date.now()
    return {
      id: generateId(),
      name: '',
      type: 'flowering',
      solarTerm: 'lichun',
      startDate: formatDate(new Date(state.value.currentYear, 1, 4)),
      durationDays: 7,
      regionId: state.value.currentRegionId,
      year: state.value.currentYear,
      sources: [],
      verified: false,
      verificationStatus: 'unverified',
      conflictAnalysis: { hasConflict: false, conflicts: [], overallSeverity: 'none', consensusScore: 0 },
      createdAt: now,
      updatedAt: now,
      currentVersion: 0,
      versionHistory: []
    }
  }

  function addEvent(eventData: Partial<PhenologyEvent>) {
    const errors = validateEvent(eventData, events.value)
    if (errors.length > 0) {
      return { success: false, errors }
    }

    const now = Date.now()
    const newEvent: PhenologyEvent = {
      ...createEmptyEvent(),
      ...eventData,
      id: generateId(),
      year: state.value.currentYear,
      regionId: state.value.currentRegionId,
      currentVersion: 0,
      versionHistory: [],
      createdAt: now,
      updatedAt: now
    } as PhenologyEvent

    refreshEventStatus(newEvent)

    const snapshot = createVersionSnapshot(newEvent)
    newEvent.versionHistory = [{
      id: generateId(),
      version: 1,
      action: 'create',
      description: '创建事件',
      timestamp: now,
      operator: '当前用户',
      before: null,
      after: snapshot,
      diff: ['创建新事件']
    }]
    newEvent.currentVersion = 1

    events.value.push(newEvent)
    state.value.selectedEventId = newEvent.id
    return { success: true, event: newEvent, errors: [] }
  }

  function updateEvent(eventId: string, updates: Partial<PhenologyEvent>) {
    const idx = events.value.findIndex(e => e.id === eventId)
    if (idx < 0) return { success: false, errors: [{ field: 'id', message: '事件不存在' }] }

    const beforeSnapshot = createVersionSnapshot(events.value[idx])
    const mergedEvent = { ...events.value[idx], ...updates }
    const errors = validateEvent(mergedEvent, events.value)
    if (errors.length > 0) {
      return { success: false, errors }
    }

    events.value[idx] = {
      ...events.value[idx],
      ...updates,
      updatedAt: Date.now()
    }

    const event = events.value[idx]
    refreshEventStatus(event)

    const entry = createVersionEntry(event, 'edit', '编辑事件', beforeSnapshot, '当前用户')
    event.versionHistory.push(entry)
    event.currentVersion = entry.version

    return { success: true, event: events.value[idx], errors: [] }
  }

  function moveEvent(eventId: string, newStartDate: string) {
    const idx = events.value.findIndex(e => e.id === eventId)
    if (idx < 0) return { success: false, errors: [{ field: 'id', message: '事件不存在' }] }

    const event = events.value[idx]
    const beforeSnapshot = createVersionSnapshot(event)
    const newSolarTerm = getSolarTermForDate(parseDate(newStartDate))

    const updatedEvent = {
      ...event,
      startDate: newStartDate,
      solarTerm: newSolarTerm,
      updatedAt: Date.now()
    }

    const errors = validateEvent(updatedEvent, events.value)
    if (errors.length > 0) {
      return { success: false, errors }
    }

    events.value[idx] = updatedEvent
    refreshEventStatus(events.value[idx])

    const entry = createVersionEntry(events.value[idx], 'move', `拖动至 ${newStartDate}`, beforeSnapshot, '当前用户')
    events.value[idx].versionHistory.push(entry)
    events.value[idx].currentVersion = entry.version

    return { success: true, event: events.value[idx], errors: [] }
  }

  function deleteEvent(eventId: string) {
    const idx = events.value.findIndex(e => e.id === eventId)
    if (idx >= 0) {
      events.value.splice(idx, 1)
      if (state.value.selectedEventId === eventId) {
        state.value.selectedEventId = null
        state.value.isEditing = false
      }
    }
  }

  function addSourceRecord(eventId: string, sourceRecord: SourceRecord) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return

    const beforeSnapshot = createVersionSnapshot(event)
    event.sources.push({ ...sourceRecord, id: sourceRecord.id || generateId() })
    event.updatedAt = Date.now()
    refreshEventStatus(event)

    const entry = createVersionEntry(event, 'add_source', `添加来源：${sourceRecord.sourceInfo.name}`, beforeSnapshot, '当前用户')
    event.versionHistory.push(entry)
    event.currentVersion = entry.version
  }

  function removeSourceRecord(eventId: string, sourceId: string) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return

    const beforeSnapshot = createVersionSnapshot(event)
    const sourceIdx = event.sources.findIndex(s => s.id === sourceId)
    if (sourceIdx >= 0) {
      const sourceName = event.sources[sourceIdx].sourceInfo.name
      event.sources.splice(sourceIdx, 1)
      if (event.sources.length === 0) {
        event.verified = false
      }
      event.updatedAt = Date.now()
      refreshEventStatus(event)

      const entry = createVersionEntry(event, 'remove_source', `移除来源：${sourceName}`, beforeSnapshot, '当前用户')
      event.versionHistory.push(entry)
      event.currentVersion = entry.version
    }
  }

  function updateSourceRecord(eventId: string, sourceId: string, updates: Partial<SourceRecord>) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return

    const beforeSnapshot = createVersionSnapshot(event)
    const source = event.sources.find(s => s.id === sourceId)
    if (source) {
      Object.assign(source, updates)
      event.updatedAt = Date.now()
      refreshEventStatus(event)

      const entry = createVersionEntry(event, 'update_source', `更新来源：${source.sourceInfo.name}`, beforeSnapshot, '当前用户')
      event.versionHistory.push(entry)
      event.currentVersion = entry.version
    }
  }

  function verifyEvent(eventId: string) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return false

    const analysis = event.conflictAnalysis || analyzeConflicts(event.sources)
    if (!canVerify(event.sources, analysis)) return false

    const beforeSnapshot = createVersionSnapshot(event)
    event.verified = true
    event.updatedAt = Date.now()
    refreshEventStatus(event)

    const entry = createVersionEntry(event, 'verify', '标记为已校定', beforeSnapshot, '当前用户')
    event.versionHistory.push(entry)
    event.currentVersion = entry.version
    return true
  }

  function unverifyEvent(eventId: string) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return

    const beforeSnapshot = createVersionSnapshot(event)
    event.verified = false
    event.updatedAt = Date.now()
    refreshEventStatus(event)

    const entry = createVersionEntry(event, 'unverify', '取消校定', beforeSnapshot, '当前用户')
    event.versionHistory.push(entry)
    event.currentVersion = entry.version
  }

  function rollbackToVersion(eventId: string, targetVersion: number) {
    const event = events.value.find(e => e.id === eventId)
    if (!event) return false

    const targetEntry = event.versionHistory.find(v => v.version === targetVersion)
    if (!targetEntry) return false

    const beforeSnapshot = createVersionSnapshot(event)
    const after = targetEntry.after

    event.name = after.name
    event.type = after.type
    event.solarTerm = after.solarTerm
    event.startDate = after.startDate
    event.durationDays = after.durationDays
    event.sources = after.sources.map(s => ({ ...s, sourceInfo: { ...s.sourceInfo } }))
    event.verified = after.verified
    event.verificationStatus = after.verificationStatus
    event.description = after.description
    event.updatedAt = Date.now()

    refreshEventStatus(event)

    const newEntry = createVersionEntry(event, 'edit', `回退到版本 v${targetVersion}`, beforeSnapshot, '当前用户')
    event.versionHistory.push(newEntry)
    event.currentVersion = newEntry.version

    return true
  }

  function getEventsForSolarTerm(solarTerm: SolarTermKey): PhenologyEvent[] {
    return filteredEvents.value.filter(e => e.solarTerm === solarTerm)
  }

  function getEventsForRegion(regionId: string): PhenologyEvent[] {
    return events.value.filter(e =>
      e.year === state.value.currentYear && e.regionId === regionId
    )
  }

  function getEventsForFilters(): PhenologyEvent[] {
    return events.value.filter(e => {
      if (graphSearchFilters.eventTypes.length > 0 && !graphSearchFilters.eventTypes.includes(e.type)) {
        return false
      }
      if (graphSearchFilters.regionIds.length > 0 && !graphSearchFilters.regionIds.includes(e.regionId)) {
        return false
      }
      if (graphSearchFilters.solarTermKeys.length > 0 && !graphSearchFilters.solarTermKeys.includes(e.solarTerm)) {
        return false
      }
      if (graphSearchFilters.minReliability > 0) {
        const maxReliability = e.sources.length > 0
          ? Math.max(...e.sources.map(s => s.reliabilityScore))
          : 0
        if (maxReliability < graphSearchFilters.minReliability) {
          return false
        }
      }
      if (graphSearchFilters.keyword) {
        const keyword = graphSearchFilters.keyword.toLowerCase()
        const matchName = e.name.toLowerCase().includes(keyword)
        const matchDesc = e.description?.toLowerCase().includes(keyword)
        const matchSource = e.sources.some(s =>
          s.sourceInfo.name.toLowerCase().includes(keyword) ||
          s.sourceInfo.note?.toLowerCase().includes(keyword)
        )
        if (!matchName && !matchDesc && !matchSource) {
          return false
        }
      }
      return true
    })
  }

  function generateGraphData(): GraphData {
    const filteredEventsList = getEventsForFilters()
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const nodeIdSet = new Set<string>()
    const edgeIdSet = new Set<string>()

    const allSources = new Map<string, SourceInfo>()
    filteredEventsList.forEach(e => {
      e.sources.forEach(s => {
        if (!allSources.has(s.sourceInfo.id)) {
          allSources.set(s.sourceInfo.id, s.sourceInfo)
        }
      })
    })

    const allRegions = new Set<string>()
    const allSolarTerms = new Set<SolarTermKey>()
    filteredEventsList.forEach(e => {
      allRegions.add(e.regionId)
      allSolarTerms.add(e.solarTerm)
    })

    if (graphSearchFilters.nodeTypes.includes('event')) {
      filteredEventsList.forEach(event => {
        const eventTypeInfo = EVENT_TYPES.find(t => t.key === event.type)!
        const avgReliability = event.sources.length > 0
          ? event.sources.reduce((sum, s) => sum + s.reliabilityScore, 0) / event.sources.length
          : 50
        const size = 20 + (avgReliability / 100) * 15

        nodes.push({
          id: `event-${event.id}`,
          type: 'event',
          label: event.name,
          subLabel: eventTypeInfo.label,
          description: event.description,
          color: eventTypeInfo.color,
          icon: eventTypeInfo.icon,
          size,
          data: { eventId: event.id, event }
        })
        nodeIdSet.add(`event-${event.id}`)
      })
    }

    if (graphSearchFilters.nodeTypes.includes('solarTerm')) {
      allSolarTerms.forEach(termKey => {
        const term = SOLAR_TERMS.find(t => t.key === termKey)!
        const eventCount = filteredEventsList.filter(e => e.solarTerm === termKey).length
        const size = 18 + Math.min(eventCount * 3, 15)

        nodes.push({
          id: `solarTerm-${termKey}`,
          type: 'solarTerm',
          label: term.name,
          subLabel: `${term.month}月${term.day}日`,
          description: `二十四节气之${term.name}`,
          color: GRAPH_NODE_TYPE_INFO.solarTerm.color,
          icon: GRAPH_NODE_TYPE_INFO.solarTerm.icon,
          size,
          data: { solarTermKey: termKey, term }
        })
        nodeIdSet.add(`solarTerm-${termKey}`)
      })
    }

    if (graphSearchFilters.nodeTypes.includes('region')) {
      allRegions.forEach(regionId => {
        const region = regions.value.find(r => r.id === regionId)
        if (!region) return
        const eventCount = filteredEventsList.filter(e => e.regionId === regionId).length
        const size = 18 + Math.min(eventCount * 3, 15)

        nodes.push({
          id: `region-${regionId}`,
          type: 'region',
          label: region.name,
          subLabel: region.province,
          description: region.climateZone,
          color: GRAPH_NODE_TYPE_INFO.region.color,
          icon: GRAPH_NODE_TYPE_INFO.region.icon,
          size,
          data: { regionId, region }
        })
        nodeIdSet.add(`region-${regionId}`)
      })
    }

    if (graphSearchFilters.nodeTypes.includes('source')) {
      allSources.forEach((sourceInfo, sourceId) => {
        const citingEvents = filteredEventsList.filter(e =>
          e.sources.some(s => s.sourceInfo.id === sourceId)
        )
        const avgReliability = citingEvents.length > 0
          ? citingEvents.reduce((sum, e) => {
              const source = e.sources.find(s => s.sourceInfo.id === sourceId)
              return sum + (source?.reliabilityScore || 0)
            }, 0) / citingEvents.length
          : 50
        const size = 16 + Math.min(citingEvents.length * 2, 12)

        nodes.push({
          id: `source-${sourceId}`,
          type: 'source',
          label: sourceInfo.name,
          subLabel: sourceInfo.type,
          description: sourceInfo.note,
          color: GRAPH_NODE_TYPE_INFO.source.color,
          icon: GRAPH_NODE_TYPE_INFO.source.icon,
          size,
          data: { sourceId, sourceInfo, reliabilityScore: avgReliability }
        })
        nodeIdSet.add(`source-${sourceId}`)
      })
    }

    filteredEventsList.forEach(event => {
      const eventNodeId = `event-${event.id}`
      if (!nodeIdSet.has(eventNodeId)) return

      if (graphSearchFilters.nodeTypes.includes('solarTerm')) {
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

      if (graphSearchFilters.nodeTypes.includes('region')) {
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

      if (graphSearchFilters.nodeTypes.includes('source')) {
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

    if (graphSearchFilters.maxHops >= 2) {
      for (let i = 0; i < filteredEventsList.length; i++) {
        for (let j = i + 1; j < filteredEventsList.length; j++) {
          const e1 = filteredEventsList[i]
          const e2 = filteredEventsList[j]
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

  function getNodeNeighbors(nodeId: string): { nodes: GraphNode[], edges: GraphEdge[] } {
    const graphData = generateGraphData()
    const neighborNodeIds = new Set<string>([nodeId])
    const neighborEdges: GraphEdge[] = []

    for (let hop = 0; hop < graphSearchFilters.maxHops; hop++) {
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

  function setGraphViewMode(mode: 'force' | 'circular' | 'hierarchical') {
    graphViewState.layoutMode = mode
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
    setYear,
    setRegion,
    toggleEventType,
    selectEvent,
    setEditing,
    startCreating,
    setViewMode,
    createEmptyEvent,
    addEvent,
    updateEvent,
    moveEvent,
    deleteEvent,
    addSourceRecord,
    removeSourceRecord,
    updateSourceRecord,
    verifyEvent,
    unverifyEvent,
    rollbackToVersion,
    refreshEventStatus,
    getEventsForSolarTerm,
    getEventsForRegion,
    createDefaultSource,
    getDominantType,
    getWeightedAverageObservation,
    canVerify,
    analyzeConflicts,
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
    resetGraphFilters,
    getEventsForFilters
  }
})
