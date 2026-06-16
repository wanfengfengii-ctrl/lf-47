<template>
  <div class="conflict-panel" v-if="event">
    <div class="panel-header">
      <span class="panel-icon">⚡</span>
      <span class="panel-title">冲突校定</span>
      <NTag :type="statusTagType" size="small" round>
        {{ statusInfo.label }}
      </NTag>
    </div>

    <div v-if="event.sources.length === 0" class="no-sources">
      <NAlert type="warning" :bordered="false">
        尚无来源记录，无法进行校定。请先添加来源。
      </NAlert>
    </div>

    <div v-else-if="event.sources.length === 1" class="single-source">
      <NAlert type="info" :bordered="false">
        仅有一条来源记录，来源不足，暂不可标记为已校定。建议添加更多来源以便交叉验证。
      </NAlert>
    </div>

    <template v-if="conflictAnalysis && conflictAnalysis.hasConflict">
      <NDivider style="margin: 12px 0">冲突详情</NDivider>

      <div class="conflict-list">
        <div
          v-for="(conflict, idx) in conflictAnalysis.conflicts"
          :key="idx"
          class="conflict-item"
        >
          <div class="conflict-field">
            <NTag :type="conflict.severity === 'high' ? 'error' : conflict.severity === 'medium' ? 'warning' : 'info'" size="small">
              {{ getFieldLabel(conflict.field) }}
            </NTag>
            <span class="severity-text" :class="conflict.severity">
              {{ getSeverityLabel(conflict.severity) }} · 最大差异 {{ conflict.maxDiff }}{{ conflict.field === 'startDate' ? '天' : '' }}
            </span>
          </div>
          <div class="conflict-values">
            <div
              v-for="val in conflict.values"
              :key="val.sourceId"
              class="conflict-value"
            >
              <span class="source-name">{{ getSourceName(val.sourceId) }}</span>
              <span class="source-value">{{ formatConflictValue(conflict.field, val.value) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="consensus-bar">
        <span class="consensus-label">一致度</span>
        <NProgress
          :percentage="conflictAnalysis.consensusScore"
          :status="conflictAnalysis.consensusScore >= 60 ? 'success' : 'error'"
          :show-indicator="true"
          :height="16"
          :border-radius="8"
        />
      </div>
    </template>

    <template v-if="!conflictAnalysis?.hasConflict && event.sources.length >= 2">
      <NDivider style="margin: 12px 0">来源一致</NDivider>
      <NAlert type="success" :bordered="false">
        所有来源数据一致，可以进行校定。
      </NAlert>
    </template>

    <NDivider style="margin: 12px 0">来源可信度排序</NDivider>

    <div class="credibility-list">
      <div
        v-for="(source, idx) in sortedSources"
        :key="source.id"
        class="credibility-item"
      >
        <div class="credibility-rank">
          <span class="rank-number" :class="idx === 0 ? 'top' : ''">{{ idx + 1 }}</span>
        </div>
        <div class="credibility-info">
          <div class="credibility-name">
            {{ source.sourceInfo.name }}
            <NTag size="tiny" :type="getSourceTagType(source.sourceInfo.type)" style="margin-left: 6px">
              {{ getSourceTypeLabel(source.sourceInfo.type) }}
            </NTag>
          </div>
          <div class="credibility-obs">
            开始：{{ source.observation.startDate }} · 持续：{{ source.observation.durationDays }}天
          </div>
        </div>
        <div class="credibility-score">
          <NProgress
            type="circle"
            :percentage="source.reliabilityScore"
            :size="36"
            :status="source.reliabilityScore >= 80 ? 'success' : source.reliabilityScore >= 50 ? 'warning' : 'error'"
          />
        </div>
      </div>
    </div>

    <div v-if="event.sources.length >= 2 && conflictAnalysis" class="weighted-summary">
      <NDivider style="margin: 12px 0">加权平均观测值</NDivider>
      <div class="weighted-values">
        <div class="weighted-item">
          <span class="weighted-label">推荐开始日期</span>
          <span class="weighted-value">{{ weightedObs.startDate || '-' }}</span>
        </div>
        <div class="weighted-item">
          <span class="weighted-label">推荐持续天数</span>
          <span class="weighted-value">{{ weightedObs.durationDays }}天</span>
        </div>
        <div v-if="dominantType" class="weighted-item">
          <span class="weighted-label">推荐事件类型</span>
          <span class="weighted-value">{{ getTypeLabel(dominantType) }}</span>
        </div>
      </div>
    </div>

    <div class="verify-action">
      <NButton
        v-if="!event.verified"
        type="primary"
        block
        :disabled="!canVerifyEvent"
        @click="handleVerify"
      >
        <template #icon>✓</template>
        标记为已校定
      </NButton>
      <NButton
        v-else
        type="warning"
        block
        ghost
        @click="handleUnverify"
      >
        取消校定
      </NButton>
      <div v-if="!canVerifyEvent && event.sources.length > 0" class="verify-hint">
        <NText depth="3" style="font-size: 12px">
          {{ getVerifyBlockReason }}
        </NText>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NTag,
  NAlert,
  NDivider,
  NProgress,
  NButton,
  NText
} from 'naive-ui'
import { usePhenologyStore } from '@/stores/phenology'
import type { PhenologyEvent } from '@/types'
import {
  sortSourcesByReliability,
  getWeightedAverageObservation,
  canVerify,
  getVerificationStatusInfo,
  getDominantType
} from '@/utils'

const store = usePhenologyStore()

const props = defineProps<{
  event: PhenologyEvent | null
}>()

const conflictAnalysis = computed(() => props.event?.conflictAnalysis || null)

const sortedSources = computed(() => {
  if (!props.event) return []
  return sortSourcesByReliability(props.event.sources)
})

const weightedObs = computed(() => {
  if (!props.event) return { startDate: '', durationDays: 7 }
  return getWeightedAverageObservation(props.event.sources)
})

const dominantType = computed(() => {
  if (!props.event) return undefined
  return getDominantType(props.event.sources)
})

const canVerifyEvent = computed(() => {
  if (!props.event) return false
  const analysis = props.event.conflictAnalysis
  if (!analysis) return false
  return canVerify(props.event.sources, analysis)
})

const getVerifyBlockReason = computed(() => {
  if (!props.event || !props.event.conflictAnalysis) return ''
  const analysis = props.event.conflictAnalysis
  if (props.event.sources.length < 2) return '来源不足，至少需要 2 条来源记录'
  if (analysis.overallSeverity === 'high') return '存在严重冲突，请先解决后再校定'
  if (analysis.consensusScore < 60) return `一致度过低（${analysis.consensusScore}%），需达到 60% 以上`
  return ''
})

const statusInfo = computed(() => {
  return getVerificationStatusInfo(props.event?.verificationStatus || 'unverified')
})

const statusTagType = computed(() => {
  const status = props.event?.verificationStatus || 'unverified'
  if (status === 'verified') return 'success' as const
  if (status === 'conflict') return 'error' as const
  return 'warning' as const
})

function getFieldLabel(field: string): string {
  const map: Record<string, string> = {
    startDate: '开始日期',
    durationDays: '持续天数',
    type: '事件类型'
  }
  return map[field] || field
}

function getSeverityLabel(severity: string): string {
  const map: Record<string, string> = {
    high: '严重',
    medium: '中等',
    low: '轻微'
  }
  return map[severity] || severity
}

function getSourceName(sourceId: string): string {
  if (!props.event) return ''
  const source = props.event.sources.find(s => s.id === sourceId)
  return source?.sourceInfo.name || '未知来源'
}

function formatConflictValue(field: string, value: string | number): string {
  if (field === 'durationDays') return `${value}天`
  if (field === 'type') {
    const typeMap: Record<string, string> = {
      flowering: '🌸 花期',
      farming: '🌾 农事',
      migration: '🦢 候鸟迁徙',
      folklore: '🏮 民俗活动'
    }
    return typeMap[String(value)] || String(value)
  }
  return String(value)
}

function getSourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    book: '书籍',
    paper: '论文',
    website: '网站',
    oral: '口述',
    other: '其他'
  }
  return map[type] || type
}

function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    flowering: '🌸 花期',
    farming: '🌾 农事',
    migration: '🦢 候鸟迁徙',
    folklore: '🏮 民俗活动'
  }
  return typeMap[type] || type
}

function getSourceTagType(type: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<string, any> = {
    book: 'default',
    paper: 'info',
    website: 'success',
    oral: 'warning',
    other: 'default'
  }
  return map[type] || 'default'
}

function handleVerify() {
  if (!props.event) return
  const success = store.verifyEvent(props.event.id)
  if (!success) {
    console.warn('校定失败：条件不满足')
  }
}

function handleUnverify() {
  if (!props.event) return
  store.unverifyEvent(props.event.id)
}
</script>

<style scoped>
.conflict-panel {
  padding: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.no-sources,
.single-source {
  margin-top: 8px;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conflict-item {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
}

.conflict-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.severity-text {
  font-size: 12px;
  font-weight: 500;
}

.severity-text.high {
  color: #dc2626;
}

.severity-text.medium {
  color: #d97706;
}

.severity-text.low {
  color: #2563eb;
}

.conflict-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 8px;
}

.conflict-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.source-name {
  color: #64748b;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-value {
  color: #1e293b;
  font-weight: 500;
}

.consensus-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.consensus-label {
  font-size: 13px;
  color: #475569;
  white-space: nowrap;
  min-width: 52px;
}

.credibility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.credibility-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.credibility-rank {
  flex-shrink: 0;
}

.rank-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.rank-number.top {
  background: #dbeafe;
  color: #2563eb;
}

.credibility-info {
  flex: 1;
  min-width: 0;
}

.credibility-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  display: flex;
  align-items: center;
}

.credibility-obs {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.credibility-score {
  flex-shrink: 0;
}

.weighted-summary {
  margin-top: 4px;
}

.weighted-values {
  display: flex;
  gap: 16px;
}

.weighted-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.weighted-label {
  font-size: 11px;
  color: #64748b;
}

.weighted-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.verify-action {
  margin-top: 16px;
}

.verify-hint {
  margin-top: 6px;
  text-align: center;
}
</style>
