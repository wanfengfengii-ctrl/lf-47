<template>
  <div class="graph-search-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-icon">🔍</span>
        <span class="title-text">关联检索</span>
      </div>
      <NButton size="small" quaternary @click="handleReset">
        <template #icon><ReloadOutlined /></template>
        重置
      </NButton>
    </div>

    <div class="panel-content">
      <div class="search-section">
        <NInput
          v-model:value="keywordInput"
          placeholder="搜索事件、地区、节气、来源..."
          clearable
          @update:value="handleKeywordChange"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </NInput>
      </div>

      <NDivider />

      <div class="filter-section">
        <div class="filter-title">节点类型</div>
        <div class="filter-options">
          <div
            v-for="nodeType in nodeTypeOptions"
            :key="nodeType.key"
            class="filter-chip"
            :class="{ active: isNodeTypeSelected(nodeType.key) }"
            :style="{ '--chip-color': nodeType.color }"
            @click="handleToggleNodeType(nodeType.key)"
          >
            <span class="chip-icon">{{ nodeType.icon }}</span>
            <span class="chip-label">{{ nodeType.label }}</span>
          </div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-title">事件类型</div>
        <div class="filter-options">
          <div
            v-for="eventType in EVENT_TYPES"
            :key="eventType.key"
            class="filter-chip"
            :class="{ active: isEventTypeSelected(eventType.key) }"
            :style="{ '--chip-color': eventType.color }"
            @click="handleToggleEventType(eventType.key)"
          >
            <span class="chip-icon">{{ eventType.icon }}</span>
            <span class="chip-label">{{ eventType.label }}</span>
          </div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-title">
          <span>地区</span>
          <span class="filter-count">{{ selectedRegionCount }}/{{ coreStore.regions.length }}</span>
        </div>
        <div class="filter-options">
          <div
            v-for="region in coreStore.regions"
            :key="region.id"
            class="filter-chip"
            :class="{ active: isRegionSelected(region.id) }"
            @click="handleToggleRegion(region.id)"
          >
            <span class="chip-icon">📍</span>
            <span class="chip-label">{{ region.name }}</span>
          </div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-title">
          <span>节气</span>
          <span class="filter-count">{{ selectedTermCount }}/24</span>
        </div>
        <div class="solar-term-grid">
          <div
            v-for="term in SOLAR_TERMS"
            :key="term.key"
            class="term-chip"
            :class="{ active: isSolarTermSelected(term.key) }"
            @click="handleToggleSolarTerm(term.key)"
          >
            {{ term.name }}
          </div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-title">
          <span>最低可信度</span>
          <span class="filter-value">{{ graphStore.graphSearchFilters.minReliability }}%</span>
        </div>
        <NSlider
          :value="graphStore.graphSearchFilters.minReliability"
          :min="0"
          :max="100"
          :step="10"
          :marks="reliabilityMarks"
          @update:value="handleReliabilityChange"
        />
      </div>

      <div class="filter-section">
        <div class="filter-title">
          <span>关联层级</span>
          <span class="filter-value">{{ graphStore.graphSearchFilters.maxHops }} 度</span>
        </div>
        <NSlider
          :value="graphStore.graphSearchFilters.maxHops"
          :min="1"
          :max="4"
          :step="1"
          :marks="hopMarks"
          @update:value="handleHopsChange"
        />
      </div>
    </div>

    <div class="panel-footer">
      <div class="result-stats">
        <span class="stat-label">匹配结果：</span>
        <span class="stat-value">{{ filteredCount }} 条记录</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NInput,
  NDivider,
  NButton,
  NSlider
} from 'naive-ui'
import {
  SearchOutlined,
  ReloadOutlined
} from '@vicons/antd'
import { useGraphStore } from '@/stores/graph'
import { useCoreStore } from '@/stores/core'
import { EVENT_TYPES, SOLAR_TERMS, GRAPH_NODE_TYPE_INFO } from '@/types'
import type { GraphNodeType, EventType, SolarTermKey } from '@/types'

const graphStore = useGraphStore()
const coreStore = useCoreStore()

const keywordInput = ref(graphStore.graphSearchFilters.keyword)

const nodeTypeOptions = computed(() => {
  return (Object.keys(GRAPH_NODE_TYPE_INFO) as GraphNodeType[]).map(key => ({
    key,
    ...GRAPH_NODE_TYPE_INFO[key]
  }))
})

const selectedRegionCount = computed(() => graphStore.graphSearchFilters.regionIds.length)
const selectedTermCount = computed(() => graphStore.graphSearchFilters.solarTermKeys.length)

const filteredCount = computed(() => graphStore.getEventsForFilters().length)

const reliabilityMarks = {
  0: '0%',
  30: '低',
  60: '中',
  90: '高',
  100: '100%'
}

const hopMarks = {
  1: '1度',
  2: '2度',
  3: '3度',
  4: '4度'
}

function isNodeTypeSelected(type: GraphNodeType): boolean {
  return graphStore.graphSearchFilters.nodeTypes.includes(type)
}

function isEventTypeSelected(type: EventType): boolean {
  return graphStore.graphSearchFilters.eventTypes.includes(type)
}

function isRegionSelected(regionId: string): boolean {
  return graphStore.graphSearchFilters.regionIds.includes(regionId)
}

function isSolarTermSelected(termKey: SolarTermKey): boolean {
  return graphStore.graphSearchFilters.solarTermKeys.includes(termKey)
}

function handleKeywordChange(value: string) {
  graphStore.setGraphKeyword(value)
}

function handleToggleNodeType(type: GraphNodeType) {
  graphStore.toggleGraphNodeType(type)
}

function handleToggleEventType(type: EventType) {
  graphStore.toggleGraphEventType(type)
}

function handleToggleRegion(regionId: string) {
  graphStore.toggleGraphRegion(regionId)
}

function handleToggleSolarTerm(termKey: SolarTermKey) {
  graphStore.toggleGraphSolarTerm(termKey)
}

function handleReliabilityChange(value: number) {
  graphStore.setMinReliability(value)
}

function handleHopsChange(value: number) {
  graphStore.setMaxHops(value)
}

function handleReset() {
  keywordInput.value = ''
  graphStore.resetGraphFilters()
}
</script>

<style scoped>
.graph-search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 22px;
}

.title-text {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.search-section {
  margin-bottom: 8px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
}

.filter-count {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 10px;
}

.filter-value {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.filter-chip:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.filter-chip.active {
  background: color-mix(in srgb, var(--chip-color) 12%, white);
  border-color: var(--chip-color);
  color: var(--chip-color);
  font-weight: 600;
}

.chip-icon {
  font-size: 14px;
}

.solar-term-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.term-chip {
  text-align: center;
  padding: 8px 4px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.term-chip:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.term-chip.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: #ffffff;
  font-weight: 600;
}

.panel-footer {
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
  flex-shrink: 0;
}

.result-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
}
</style>
