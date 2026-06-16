import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PhenologyEvent,
  Region,
  SolarTermKey,
  EventType,
  AppState,
  SourceRecord
} from '@/types'
import { EVENT_TYPES, SOLAR_TERMS } from '@/types'
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
  getDominantType,
  getWeightedAverageObservation
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

export const useCoreStore = defineStore('core', () => {
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

  return {
    state,
    events,
    regions,
    currentRegion,
    filteredEvents,
    selectedEvent,
    eventsBySolarTerm,
    compareEvents,
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
    analyzeConflicts
  }
})
