<template>
  <div class="version-history" v-if="event">
    <div class="history-header">
      <span class="history-icon">📜</span>
      <span class="history-title">版本历史</span>
      <NTag size="small" round type="info">
        v{{ event.currentVersion }}
      </NTag>
    </div>

    <div v-if="event.versionHistory.length === 0" class="empty-history">
      <NEmpty description="暂无版本记录" size="small" />
    </div>

    <div v-else class="timeline">
      <div
        v-for="entry in reversedHistory"
        :key="entry.id"
        class="timeline-item"
        :class="{ current: entry.version === event.currentVersion }"
      >
        <div class="timeline-dot" :class="getActionClass(entry.action)"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="version-tag">v{{ entry.version }}</span>
            <NTag size="tiny" :type="getActionTagType(entry.action)">
              {{ getActionLabel(entry.action) }}
            </NTag>
            <span class="timeline-time">{{ formatTimestamp(entry.timestamp) }}</span>
          </div>
          <div class="timeline-desc">{{ entry.description }}</div>
          <div class="timeline-operator">操作者：{{ entry.operator }}</div>

          <div v-if="entry.diff.length > 0 && !(entry.diff.length === 1 && entry.diff[0] === '创建新事件')" class="diff-section">
            <div class="diff-label">变更：</div>
            <div class="diff-list">
              <div v-for="(d, i) in entry.diff" :key="i" class="diff-item">
                {{ d }}
              </div>
            </div>
          </div>

          <div v-if="expandedEntry === entry.id && entry.before" class="detail-diff">
            <NDivider style="margin: 8px 0">修改前后对比</NDivider>
            <div class="compare-grid">
              <div class="compare-col before">
                <div class="compare-col-title">修改前</div>
                <div class="compare-rows">
                  <div class="compare-row">
                    <span class="compare-field">名称</span>
                    <span class="compare-val">{{ entry.before.name || '-' }}</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">开始日期</span>
                    <span class="compare-val">{{ entry.before.startDate }}</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">持续天数</span>
                    <span class="compare-val">{{ entry.before.durationDays }}天</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">来源数</span>
                    <span class="compare-val">{{ entry.before.sources.length }}</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">校定</span>
                    <span class="compare-val">{{ entry.before.verified ? '已校定' : '未校定' }}</span>
                  </div>
                </div>
              </div>
              <div class="compare-col after">
                <div class="compare-col-title">修改后</div>
                <div class="compare-rows">
                  <div class="compare-row">
                    <span class="compare-field">名称</span>
                    <span class="compare-val">{{ entry.after.name || '-' }}</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">开始日期</span>
                    <span class="compare-val">{{ entry.after.startDate }}</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">持续天数</span>
                    <span class="compare-val">{{ entry.after.durationDays }}天</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">来源数</span>
                    <span class="compare-val">{{ entry.after.sources.length }}</span>
                  </div>
                  <div class="compare-row">
                    <span class="compare-field">校定</span>
                    <span class="compare-val">{{ entry.after.verified ? '已校定' : '未校定' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="timeline-actions">
            <NButton
              v-if="entry.before"
              quaternary
              size="tiny"
              type="info"
              @click="toggleExpand(entry.id)"
            >
              {{ expandedEntry === entry.id ? '收起对比' : '查看对比' }}
            </NButton>
            <NButton
              v-if="entry.version !== event.currentVersion"
              quaternary
              size="tiny"
              type="warning"
              @click="handleRollback(entry.version)"
            >
              回退到此版本
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NTag,
  NEmpty,
  NButton,
  NDivider
} from 'naive-ui'
import { usePhenologyStore } from '@/stores/phenology'
import type { PhenologyEvent, VersionAction } from '@/types'
import { formatTimestamp } from '@/utils'

const store = usePhenologyStore()

const props = defineProps<{
  event: PhenologyEvent | null
}>()

const expandedEntry = ref<string | null>(null)

const reversedHistory = computed(() => {
  if (!props.event) return []
  return [...props.event.versionHistory].reverse()
})

function toggleExpand(entryId: string) {
  expandedEntry.value = expandedEntry.value === entryId ? null : entryId
}

function getActionClass(action: VersionAction): string {
  const map: Record<string, string> = {
    create: 'action-create',
    edit: 'action-edit',
    move: 'action-move',
    verify: 'action-verify',
    unverify: 'action-unverify',
    add_source: 'action-source',
    remove_source: 'action-source',
    update_source: 'action-source'
  }
  return map[action] || 'action-edit'
}

function getActionTagType(action: VersionAction): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<string, any> = {
    create: 'success',
    edit: 'info',
    move: 'info',
    verify: 'success',
    unverify: 'warning',
    add_source: 'default',
    remove_source: 'error',
    update_source: 'default'
  }
  return map[action] || 'default'
}

function getActionLabel(action: VersionAction): string {
  const map: Record<string, string> = {
    create: '创建',
    edit: '编辑',
    move: '拖动',
    verify: '校定',
    unverify: '取消校定',
    add_source: '添加来源',
    remove_source: '移除来源',
    update_source: '更新来源'
  }
  return map[action] || action
}

function handleRollback(targetVersion: number) {
  if (!props.event) return
  store.rollbackToVersion(props.event.id, targetVersion)
}
</script>

<style scoped>
.version-history {
  padding: 16px;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.history-icon {
  font-size: 18px;
}

.history-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.empty-history {
  padding: 24px 0;
}

.timeline {
  position: relative;
  padding-left: 16px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  position: relative;
  padding-bottom: 16px;
  padding-left: 20px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -12px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  background: #ffffff;
}

.timeline-dot.action-create {
  background: #10b981;
  border-color: #10b981;
}

.timeline-dot.action-verify {
  background: #10b981;
  border-color: #10b981;
}

.timeline-dot.action-unverify {
  background: #f59e0b;
  border-color: #f59e0b;
}

.timeline-dot.action-move {
  background: #3b82f6;
  border-color: #3b82f6;
}

.timeline-dot.action-source {
  background: #8b5cf6;
  border-color: #8b5cf6;
}

.timeline-dot.action-edit {
  background: #64748b;
  border-color: #64748b;
}

.timeline-item.current .timeline-dot {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
}

.timeline-content {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}

.timeline-item.current .timeline-content {
  border-color: #3b82f6;
  background: #eff6ff;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.version-tag {
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
}

.timeline-time {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
}

.timeline-desc {
  font-size: 13px;
  color: #1e293b;
  margin-top: 4px;
}

.timeline-operator {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.diff-section {
  margin-top: 6px;
}

.diff-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 2px;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.diff-item {
  font-size: 12px;
  color: #dc2626;
  padding: 1px 6px;
  background: #fef2f2;
  border-radius: 4px;
}

.detail-diff {
  margin-top: 8px;
}

.compare-grid {
  display: flex;
  gap: 8px;
}

.compare-col {
  flex: 1;
  min-width: 0;
}

.compare-col-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  text-align: center;
  padding: 2px 0;
  border-radius: 4px;
}

.before .compare-col-title {
  background: #fef2f2;
  color: #dc2626;
}

.after .compare-col-title {
  background: #f0fdf4;
  color: #16a34a;
}

.compare-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.compare-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 3px;
}

.compare-field {
  color: #64748b;
}

.compare-val {
  color: #1e293b;
  font-weight: 500;
}

.timeline-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
</style>
