<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo-section">
        <span class="logo-icon">🌸</span>
        <div class="logo-text">
          <h1 class="app-title">物候资料整理系统</h1>
          <p class="app-subtitle">地方物候数字化记录与可视化平台</p>
        </div>
      </div>
    </div>

    <div class="toolbar-center">
      <div class="control-group">
        <NButtonGroup size="medium">
          <NButton @click="decrementYear">
            <template #icon>
              <span style="font-size: 16px; line-height: 1;">‹</span>
            </template>
          </NButton>
          <NSelect
            :value="store.state.currentYear"
            :options="yearOptions"
            :style="{ width: '120px' }"
            @update:value="handleYearChange"
          />
          <NButton @click="incrementYear">
            <template #icon>
              <span style="font-size: 16px; line-height: 1;">›</span>
            </template>
          </NButton>
        </NButtonGroup>
      </div>

      <div class="control-group">
        <NSelect
          :value="store.state.currentRegionId"
          :options="regionOptions"
          :style="{ width: '160px' }"
          @update:value="handleRegionChange"
        />
      </div>

      <div class="control-group view-toggle">
        <NButtonGroup size="medium">
          <NButton
            :type="store.state.viewMode === 'disc' ? 'primary' : 'default'"
            @click="() => handleViewModeChange('disc')"
          >
            🌐 圆盘视图
          </NButton>
          <NButton
            :type="store.state.viewMode === 'compare' ? 'primary' : 'default'"
            @click="() => handleViewModeChange('compare')"
          >
            📊 地区对比
          </NButton>
        </NButtonGroup>
      </div>
    </div>

    <div class="toolbar-right">
      <div class="event-types-filter">
        <span class="filter-label">事件类型：</span>
        <div class="type-buttons">
          <NButton
            v-for="type in EVENT_TYPES"
            :key="type.key"
            size="small"
            :type="isTypeSelected(type.key) ? 'primary' : 'default'"
            :ghost="!isTypeSelected(type.key)"
            @click="handleToggleType(type.key)"
          >
            <span :style="{ color: isTypeSelected(type.key) ? '#fff' : type.color }">
              {{ type.icon }} {{ type.label }}
            </span>
          </NButton>
        </div>
      </div>

      <NButton type="primary" @click="handleCreateNew">
        <template #icon><PlusOutlined /></template>
        新建事件
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NButton,
  NButtonGroup,
  NSelect,
  type SelectOption
} from 'naive-ui'
import {
  PlusOutlined
} from '@vicons/antd'
import { usePhenologyStore } from '@/stores/phenology'
import { EVENT_TYPES, type EventType } from '@/types'

const store = usePhenologyStore()

const currentYear = new Date().getFullYear()

const yearOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = []
  for (let y = currentYear - 10; y <= currentYear + 5; y++) {
    options.push({
      label: `${y} 年`,
      value: y
    })
  }
  return options
})

const regionOptions = computed<SelectOption[]>(() => {
  return store.regions.map(r => ({
    label: `${r.name} · ${r.province}`,
    value: r.id
  }))
})

function isTypeSelected(type: EventType): boolean {
  return store.state.selectedEventTypes.includes(type)
}

function handleYearChange(year: number) {
  store.setYear(year)
}

function handleRegionChange(regionId: string) {
  store.setRegion(regionId)
}

function handleViewModeChange(mode: 'disc' | 'compare') {
  store.setViewMode(mode)
}

function handleToggleType(type: EventType) {
  store.toggleEventType(type)
}

function handleCreateNew() {
  store.startCreating()
}

function incrementYear() {
  const next = store.state.currentYear + 1
  if (next <= currentYear + 5) {
    store.setYear(next)
  }
}

function decrementYear() {
  const prev = store.state.currentYear - 1
  if (prev >= currentYear - 10) {
    store.setYear(prev)
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  gap: 24px;
  flex-wrap: wrap;
}

.toolbar-left {
  flex-shrink: 0;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 36px;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
  letter-spacing: 0.5px;
}

.app-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.control-group {
  display: flex;
  align-items: center;
}

.view-toggle {
  margin-left: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.event-types-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.type-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .toolbar-center {
    width: 100%;
    justify-content: flex-start;
  }
  
  .toolbar-right {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
