<template>
  <div class="compare-view">
    <div class="compare-header">
      <h2 class="compare-title">📊 地区物候差异对比</h2>
      <p class="compare-subtitle">{{ store.state.currentYear }} 年 · 不同地区物候事件时间差异可视化</p>
    </div>

    <div class="compare-controls">
      <div class="region-selector">
        <span class="selector-label">选择对比地区（最多 4 个）：</span>
        <div class="region-chips">
          <NTag
            v-for="region in store.regions"
            :key="region.id"
            :type="selectedRegions.includes(region.id) ? 'primary' : 'default'"
            :checkable="true"
            :checked="selectedRegions.includes(region.id)"
            :bordered="true"
            size="large"
            style="cursor: pointer"
            @click="toggleRegion(region.id)"
          >
            <span style="font-size: 14px">📍 {{ region.name }}</span>
          </NTag>
        </div>
      </div>

      <div class="event-type-legend">
        <NTag v-for="type in EVENT_TYPES" :key="type.key" size="small" :bordered="true">
          <span :style="{ color: type.color }">{{ type.icon }}</span>
          {{ type.label }}
        </NTag>
      </div>
    </div>

    <div class="timeline-container">
      <div class="timeline-axis">
        <div class="axis-labels">
          <div
            v-for="(month, idx) in months"
            :key="idx"
            class="month-label"
            :style="{ width: monthWidth + '%' }"
          >
            {{ month }}
          </div>
        </div>
        <div class="solar-term-axis">
          <div
            v-for="term in groupedSolarTerms"
            :key="term.key"
            class="term-tick"
            :style="{ left: getSolarTermPosition(term) + '%' }"
            :title="`${term.name} ${term.month}月${term.day}日`"
          >
            <div class="tick-line" :class="{ major: isMajorTerm(term.key) }"></div>
            <span class="tick-label" v-if="isMajorTerm(term.key)">{{ term.name }}</span>
          </div>
        </div>
      </div>

      <div class="region-tracks">
        <div
          v-for="region in displayRegions"
          :key="region.id"
          class="region-track"
        >
          <div class="track-header">
            <div class="region-info">
              <span class="region-name">{{ region.name }}</span>
              <NTooltip>
                <template #trigger>
                  <span class="region-latlon">
                    🌍 {{ region.climateZone }}
                  </span>
                </template>
                {{ region.province }} · 纬度 {{ region.latitude }}°N · 经度 {{ region.longitude }}°E
              </NTooltip>
            </div>
            <NTag size="small" type="info">
              {{ getRegionEvents(region.id).length }} 条记录
            </NTag>
          </div>

          <div class="track-content">
            <div class="month-dividers">
              <div
                v-for="(_, idx) in months"
                :key="idx"
                class="divider"
                :style="{ left: (idx + 1) * monthWidth + '%' }"
              ></div>
            </div>

            <div class="events-on-track">
              <div
                v-for="event in getFilteredRegionEvents(region.id)"
                :key="event.id"
                class="event-bar"
                :style="getEventBarStyle(event)"
                :class="{ selected: store.state.selectedEventId === event.id }"
                @click="selectEvent(event.id)"
              >
                <div class="event-bar-tooltip">
                  <div class="tooltip-title">{{ event.name }}</div>
                  <div class="tooltip-date">{{ event.startDate }} · 持续 {{ event.durationDays }} 天</div>
                  <div class="tooltip-term">{{ getSolarTermName(event.solarTerm) }}</div>
                  <div v-if="event.verified" class="tooltip-verified">✓ 已校定</div>
                </div>
                <span v-if="getEventBarWidth(event) > 60" class="event-bar-text">
                  {{ truncateText(event.name, 6) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="compare-stats">
      <NGrid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi>
          <NCard size="small" hoverable>
            <div class="stat-card">
              <div class="stat-icon">📈</div>
              <div class="stat-info">
                <div class="stat-value">{{ displayRegions.length }}</div>
                <div class="stat-label">对比地区数</div>
              </div>
            </div>
          </NCard>
        </NGi>
        <NGi>
          <NCard size="small" hoverable>
            <div class="stat-card">
              <div class="stat-icon">📝</div>
              <div class="stat-info">
                <div class="stat-value">{{ totalEvents }}</div>
                <div class="stat-label">总物候事件</div>
              </div>
            </div>
          </NCard>
        </NGi>
        <NGi>
          <NCard size="small" hoverable>
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <div class="stat-value">{{ verifiedEvents }}</div>
                <div class="stat-label">已校定事件</div>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>
    </div>

    <NDivider style="margin: 24px 0">🌱 物候差异分析</NDivider>

    <div class="difference-analysis" v-if="floweringDifferences.length > 0">
      <h3 class="analysis-title">🌸 花期差异对比</h3>
      <div class="analysis-cards">
        <NCard
          v-for="diff in floweringDifferences"
          :key="diff.name"
          size="small"
          hoverable
          style="flex: 1; min-width: 280px"
        >
          <div class="diff-card">
            <div class="diff-header">
              <span class="diff-name">{{ diff.name }}</span>
              <NTag size="small" type="error">花期</NTag>
            </div>
            <div class="diff-list">
              <div
                v-for="item in diff.items"
                :key="item.region"
                class="diff-item"
              >
                <span class="diff-region">{{ item.region }}</span>
                <div class="diff-bar-container">
                  <div
                    class="diff-bar"
                    :style="{ width: item.width + '%', backgroundColor: '#f472b6' }"
                  ></div>
                </div>
                <span class="diff-date">{{ item.date }}</span>
              </div>
            </div>
            <div class="diff-summary" v-if="diff.items.length > 1">
              南北差异：约 <strong>{{ diff.diffDays }}</strong> 天
            </div>
          </div>
        </NCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NTag,
  NTooltip,
  NGrid,
  NGi,
  NDivider
} from 'naive-ui'
import { usePhenologyStore } from '@/stores/phenology'
import { SOLAR_TERMS, EVENT_TYPES, type PhenologyEvent, type SolarTerm, type SolarTermKey } from '@/types'
import { parseDate, getDayOfYear, getDaysInYear } from '@/utils'

const store = usePhenologyStore()

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const monthWidth = 100 / 12

const selectedRegions = ref<string[]>(['beijing', 'shanghai', 'guangzhou'])

const displayRegions = computed(() => {
  return store.regions.filter(r => selectedRegions.value.includes(r.id))
})

const groupedSolarTerms = computed(() => {
  return [...SOLAR_TERMS].sort((a, b) => {
    const aIdx = (a.month - 1) * 2 + (a.day > 15 ? 1 : 0)
    const bIdx = (b.month - 1) * 2 + (b.day > 15 ? 1 : 0)
    return aIdx - bIdx
  })
})

function getSolarTermPosition(term: SolarTerm): number {
  const year = store.state.currentYear
  const date = new Date(year, term.month - 1, term.day)
  const dayOfYear = getDayOfYear(date)
  const totalDays = getDaysInYear(year)
  return (dayOfYear / totalDays) * 100
}

function isMajorTerm(key: SolarTermKey): boolean {
  const idx = SOLAR_TERMS.findIndex(t => t.key === key)
  return idx % 2 === 0
}

function toggleRegion(regionId: string) {
  const idx = selectedRegions.value.indexOf(regionId)
  if (idx >= 0) {
    if (selectedRegions.value.length > 1) {
      selectedRegions.value.splice(idx, 1)
    }
  } else {
    if (selectedRegions.value.length < 4) {
      selectedRegions.value.push(regionId)
    }
  }
}

function getRegionEvents(regionId: string): PhenologyEvent[] {
  return store.compareEvents.filter(e => e.regionId === regionId)
}

function getFilteredRegionEvents(regionId: string): PhenologyEvent[] {
  return getRegionEvents(regionId).filter(e =>
    store.state.selectedEventTypes.includes(e.type)
  )
}

function getEventBarStyle(event: PhenologyEvent) {
  const year = store.state.currentYear
  const totalDays = getDaysInYear(year)
  const startDay = getDayOfYear(parseDate(event.startDate))
  const left = (startDay / totalDays) * 100
  const width = (Math.min(event.durationDays, totalDays - startDay + 1) / totalDays) * 100
  
  const typeInfo = EVENT_TYPES.find(t => t.key === event.type)
  
  return {
    left: left + '%',
    width: Math.max(width, 0.5) + '%',
    backgroundColor: typeInfo?.color || '#94a3b8'
  }
}

function getEventBarWidth(event: PhenologyEvent): number {
  const year = store.state.currentYear
  const totalDays = getDaysInYear(year)
  return (Math.min(event.durationDays, totalDays) / totalDays) * 100 * 10
}

function getSolarTermName(key: SolarTermKey): string {
  return SOLAR_TERMS.find(t => t.key === key)?.name || key
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

function selectEvent(eventId: string) {
  store.selectEvent(eventId)
  store.setViewMode('disc')
}

const totalEvents = computed(() => {
  return displayRegions.value.reduce((sum, r) => sum + getRegionEvents(r.id).length, 0)
})

const verifiedEvents = computed(() => {
  return displayRegions.value.reduce((sum, r) => {
    return sum + getRegionEvents(r.id).filter(e => e.verified).length
  }, 0)
})

interface FloweringDiffItem {
  region: string
  date: string
  dayOfYear: number
  width: number
}

interface FloweringDiff {
  name: string
  items: FloweringDiffItem[]
  diffDays: number
  maxWidth: number
}

const floweringDifferences = computed<FloweringDiff[]>(() => {
  const floweringEvents: Record<string, PhenologyEvent[]> = {}
  
  displayRegions.value.forEach(region => {
    getFilteredRegionEvents(region.id)
      .filter(e => e.type === 'flowering')
      .forEach(e => {
        if (!floweringEvents[e.name]) {
          floweringEvents[e.name] = []
        }
        floweringEvents[e.name].push(e)
      })
  })

  const result: FloweringDiff[] = []
  
  Object.entries(floweringEvents)
    .filter(([_, events]) => events.length >= 2)
    .forEach(([name, events]) => {
      const items: FloweringDiffItem[] = events.map(e => ({
        region: store.regions.find(r => r.id === e.regionId)?.name || e.regionId,
        date: e.startDate,
        dayOfYear: getDayOfYear(parseDate(e.startDate)),
        width: 0
      })).sort((a, b) => a.dayOfYear - b.dayOfYear)
      
      const maxDay = Math.max(...items.map(i => i.dayOfYear))
      const minDay = Math.min(...items.map(i => i.dayOfYear))
      const maxWidth = Math.max(60, maxDay)
      
      items.forEach(i => {
        i.width = (i.dayOfYear / maxWidth) * 100
      })
      
      result.push({
        name,
        items,
        diffDays: maxDay - minDay,
        maxWidth
      })
    })

  return result.slice(0, 6)
})
</script>

<style scoped>
.compare-view {
  width: 100%;
  padding: 24px;
  overflow-y: auto;
  max-height: calc(100vh - 160px);
}

.compare-header {
  text-align: center;
  margin-bottom: 24px;
}

.compare-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
}

.compare-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 8px 0 0 0;
}

.compare-controls {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.region-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.selector-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.region-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.event-type-legend {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.timeline-axis {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.axis-labels {
  display: flex;
  height: 32px;
  border-bottom: 1px solid #e2e8f0;
}

.month-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  border-right: 1px dashed #e2e8f0;
}

.month-label:last-child {
  border-right: none;
}

.solar-term-axis {
  position: relative;
  height: 40px;
}

.term-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tick-line {
  width: 1px;
  height: 8px;
  background: #cbd5e1;
}

.tick-line.major {
  width: 2px;
  height: 12px;
  background: #94a3b8;
}

.tick-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  white-space: nowrap;
}

.region-tracks {
  display: flex;
  flex-direction: column;
}

.region-track {
  border-bottom: 1px solid #f1f5f9;
}

.region-track:last-child {
  border-bottom: none;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f1f5f9;
}

.region-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.region-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.region-latlon {
  font-size: 12px;
  color: #64748b;
  cursor: help;
}

.track-content {
  position: relative;
  height: 50px;
  padding: 0 8px;
}

.month-dividers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #f1f5f9;
}

.events-on-track {
  position: relative;
  height: 100%;
  padding: 8px 0;
}

.event-bar {
  position: absolute;
  height: 34px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.event-bar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

.event-bar.selected {
  outline: 2px solid #1e293b;
  outline-offset: 1px;
}

.event-bar-text {
  font-size: 11px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 6px;
}

.event-bar-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 100;
  pointer-events: none;
}

.event-bar:hover .event-bar-tooltip {
  opacity: 1;
  visibility: visible;
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 13px;
}

.tooltip-date,
.tooltip-term {
  color: #cbd5e1;
  margin-top: 2px;
}

.tooltip-verified {
  color: #34d399;
  margin-top: 4px;
}

.compare-stats {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 36px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.analysis-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1e293b;
}

.analysis-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.diff-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diff-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-region {
  font-size: 12px;
  color: #475569;
  width: 50px;
  flex-shrink: 0;
}

.diff-bar-container {
  flex: 1;
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.diff-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.diff-date {
  font-size: 12px;
  color: #64748b;
  width: 90px;
  text-align: right;
  flex-shrink: 0;
}

.diff-summary {
  padding: 8px 12px;
  background: #fdf2f8;
  border-radius: 6px;
  font-size: 12px;
  color: #be185d;
  text-align: center;
}
</style>
