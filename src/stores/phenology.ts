import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PhenologyEvent, Region, SolarTermKey, EventType, AppState, SourceInfo } from '@/types'
import { EVENT_TYPES, SOLAR_TERMS } from '@/types'
import {
  generateId,
  getSolarTermForDate,
  parseDate,
  validateEvent,
  formatDate,
  createDefaultSource
} from '@/utils'

const DEFAULT_REGIONS: Region[] = [
  { id: 'beijing', name: '北京', province: '北京', latitude: 39.9, longitude: 116.4, climateZone: '暖温带半湿润大陆性季风气候' },
  { id: 'shanghai', name: '上海', province: '上海', latitude: 31.2, longitude: 121.5, climateZone: '亚热带季风气候' },
  { id: 'guangzhou', name: '广州', province: '广东', latitude: 23.1, longitude: 113.3, climateZone: '南亚热带海洋性季风气候' },
  { id: 'chengdu', name: '成都', province: '四川', latitude: 30.7, longitude: 104.1, climateZone: '亚热带季风性湿润气候' },
  { id: 'harbin', name: '哈尔滨', province: '黑龙江', latitude: 45.8, longitude: 126.5, climateZone: '中温带大陆性季风气候' }
]

function createSampleEvents(): PhenologyEvent[] {
  const now = Date.now()
  return [
    {
      id: generateId(),
      name: '迎春花开',
      type: 'flowering',
      solarTerm: 'lichun',
      startDate: '2024-02-05',
      durationDays: 20,
      regionId: 'beijing',
      year: 2024,
      sources: [{ id: generateId(), name: '北京植物志', type: 'book' }],
      verified: true,
      createdAt: now,
      updatedAt: now
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
      sources: [{ id: generateId(), name: '华北农事历', type: 'book' }],
      verified: true,
      createdAt: now,
      updatedAt: now
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
      sources: [{ id: generateId(), name: '中国鸟类迁徙报告', type: 'paper' }],
      verified: true,
      createdAt: now,
      updatedAt: now
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
      sources: [{ id: generateId(), name: '中华民俗大典', type: 'book' }],
      verified: true,
      createdAt: now,
      updatedAt: now
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
      sources: [{ id: generateId(), name: '上海园林植物记录', type: 'book' }],
      verified: true,
      createdAt: now,
      updatedAt: now
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
      sources: [{ id: generateId(), name: '岭南花卉志', type: 'book' }],
      verified: true,
      createdAt: now,
      updatedAt: now
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
      createdAt: now,
      updatedAt: now
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
      sources: [{ id: generateId(), name: '东北民俗录', type: 'book' }],
      verified: true,
      createdAt: now,
      updatedAt: now
    }
  ]
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
    state.value.isEditing = eventId !== null
  }

  function setEditing(editing: boolean) {
    state.value.isEditing = editing
  }

  function setViewMode(mode: 'disc' | 'compare') {
    state.value.viewMode = mode
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
      createdAt: now,
      updatedAt: now
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
      createdAt: now,
      updatedAt: now
    } as PhenologyEvent

    events.value.push(newEvent)
    state.value.selectedEventId = newEvent.id
    return { success: true, event: newEvent, errors: [] }
  }

  function updateEvent(eventId: string, updates: Partial<PhenologyEvent>) {
    const idx = events.value.findIndex(e => e.id === eventId)
    if (idx < 0) return { success: false, errors: [{ field: 'id', message: '事件不存在' }] }

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
    return { success: true, event: events.value[idx], errors: [] }
  }

  function moveEvent(eventId: string, newStartDate: string) {
    const idx = events.value.findIndex(e => e.id === eventId)
    if (idx < 0) return { success: false, errors: [{ field: 'id', message: '事件不存在' }] }

    const event = events.value[idx]
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

  function addSource(eventId: string, source: SourceInfo) {
    const event = events.value.find(e => e.id === eventId)
    if (event) {
      event.sources.push({ ...source, id: source.id || generateId() })
      event.updatedAt = Date.now()
    }
  }

  function removeSource(eventId: string, sourceId: string) {
    const event = events.value.find(e => e.id === eventId)
    if (event) {
      const idx = event.sources.findIndex(s => s.id === sourceId)
      if (idx >= 0) {
        event.sources.splice(idx, 1)
        if (event.sources.length === 0) {
          event.verified = false
        }
        event.updatedAt = Date.now()
      }
    }
  }

  function updateSource(eventId: string, sourceId: string, updates: Partial<SourceInfo>) {
    const event = events.value.find(e => e.id === eventId)
    if (event) {
      const source = event.sources.find(s => s.id === sourceId)
      if (source) {
        Object.assign(source, updates)
        event.updatedAt = Date.now()
      }
    }
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
    setViewMode,
    createEmptyEvent,
    addEvent,
    updateEvent,
    moveEvent,
    deleteEvent,
    addSource,
    removeSource,
    updateSource,
    getEventsForSolarTerm,
    getEventsForRegion,
    createDefaultSource
  }
})
