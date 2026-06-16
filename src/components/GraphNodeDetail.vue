<template>
  <div class="graph-node-detail">
    <div v-if="!selectedNode" class="empty-state">
      <div class="empty-icon">👆</div>
      <div class="empty-title">点击图谱节点</div>
      <div class="empty-desc">查看详细信息与关联关系</div>
    </div>

    <div v-else class="detail-content">
      <div class="detail-header" :style="{ borderColor: selectedNode.color }">
        <div class="node-avatar" :style="{ backgroundColor: selectedNode.color }">
          <span class="avatar-icon">{{ selectedNode.icon }}</span>
        </div>
        <div class="node-basic">
          <div class="node-type-tag" :style="{ color: selectedNode.color, backgroundColor: selectedNode.color + '15' }">
            {{ getNodeTypeLabel(selectedNode.type) }}
          </div>
          <h3 class="node-title">{{ selectedNode.label }}</h3>
          <div v-if="selectedNode.subLabel" class="node-subtitle">
            {{ selectedNode.subLabel }}
          </div>
        </div>
        <NButton
          size="small"
          quaternary
          @click="handleClose"
        >
          <template #icon><CloseOutlined /></template>
        </NButton>
      </div>

      <div class="detail-body">
        <div v-if="selectedNode.description" class="detail-section">
          <div class="section-label">描述</div>
          <div class="section-content">{{ selectedNode.description }}</div>
        </div>

        <div v-if="selectedNode.type === 'event'" class="detail-section">
          <div class="section-label">物候事件信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">开始日期</span>
              <span class="info-value">{{ eventData?.startDate }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">持续天数</span>
              <span class="info-value">{{ eventData?.durationDays }} 天</span>
            </div>
            <div class="info-item">
              <span class="info-label">节气</span>
              <span class="info-value">{{ getSolarTermName(eventData?.solarTerm) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">校定状态</span>
              <span
                class="info-value"
                :class="getStatusClass(eventData?.verificationStatus)"
              >
                {{ getStatusLabel(eventData?.verificationStatus) }}
              </span>
            </div>
          </div>
          <div v-if="eventData?.conflictAnalysis" class="conflict-info">
            <div class="conflict-score">
              <span class="conflict-label">一致度</span>
              <n-progress
                type="line"
                :percentage="eventData.conflictAnalysis.consensusScore"
                :color="getConsensusColor(eventData.conflictAnalysis.consensusScore)"
                :stroke-width="8"
              />
            </div>
          </div>
        </div>

        <div v-if="selectedNode.type === 'source'" class="detail-section">
          <div class="section-label">来源文献信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">类型</span>
              <span class="info-value">{{ getSourceTypeLabel(sourceData?.sourceInfo.type) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">可信度</span>
              <span class="info-value reliability-high">
                {{ selectedNode.data?.reliabilityScore?.toFixed(0) }}%
              </span>
            </div>
            <div v-if="sourceData?.sourceInfo.publisher" class="info-item full-width">
              <span class="info-label">出版机构</span>
              <span class="info-value">{{ sourceData.sourceInfo.publisher }}</span>
            </div>
            <div v-if="sourceData?.sourceInfo.publishDate" class="info-item">
              <span class="info-label">出版日期</span>
              <span class="info-value">{{ sourceData.sourceInfo.publishDate }}</span>
            </div>
            <div v-if="sourceData?.sourceInfo.url" class="info-item full-width">
              <span class="info-label">链接</span>
              <a :href="sourceData.sourceInfo.url" target="_blank" class="info-link">
                {{ sourceData.sourceInfo.url }}
              </a>
            </div>
          </div>
        </div>

        <div v-if="selectedNode.type === 'region'" class="detail-section">
          <div class="section-label">地区信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">省份</span>
              <span class="info-value">{{ regionData?.province }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">气候带</span>
              <span class="info-value">{{ regionData?.climateZone }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">纬度</span>
              <span class="info-value">{{ regionData?.latitude }}°N</span>
            </div>
            <div class="info-item">
              <span class="info-label">经度</span>
              <span class="info-value">{{ regionData?.longitude }}°E</span>
            </div>
          </div>
        </div>

        <div v-if="selectedNode.type === 'solarTerm'" class="detail-section">
          <div class="section-label">节气信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">日期</span>
              <span class="info-value">{{ solarTermData?.month }}月{{ solarTermData?.day }}日</span>
            </div>
            <div class="info-item">
              <span class="info-label">关联事件</span>
              <span class="info-value">{{ relatedEvents.length }} 条</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-header">
            <div class="section-label">关联关系</div>
            <NTag size="small" type="info">
              {{ neighborNodes.length }} 个关联节点
            </NTag>
          </div>
          <div class="relation-list">
            <div
              v-for="node in neighborNodes"
              :key="node.id"
              class="relation-item"
              @click="handleJumpToNode(node)"
            >
              <div class="relation-icon" :style="{ backgroundColor: node.color }">
                {{ node.icon }}
              </div>
              <div class="relation-info">
                <div class="relation-label">{{ node.label }}</div>
                <div class="relation-type">{{ getNodeTypeLabel(node.type) }}</div>
              </div>
              <div class="relation-edge">
                <span class="edge-label" :style="{ color: getEdgeColor(node) }">
                  {{ getEdgeLabel(selectedNode, node) }}
                </span>
              </div>
              <RightOutlined class="jump-icon" />
            </div>
          </div>
        </div>

        <div v-if="eventData?.sources && eventData.sources.length > 0" class="detail-section">
          <div class="section-header">
            <div class="section-label">参考来源</div>
            <NTag size="small" type="info">
              {{ eventData.sources.length }} 条
            </NTag>
          </div>
          <div class="source-list">
            <div
              v-for="source in eventData.sources"
              :key="source.id"
              class="source-item"
            >
              <div class="source-header">
                <span class="source-name">{{ source.sourceInfo.name }}</span>
                <span
                  class="reliability-tag"
                  :class="getReliabilityClass(source.reliability)"
                >
                  {{ source.reliabilityScore }}分
                </span>
              </div>
              <div class="source-meta">
                <span class="source-type">{{ getSourceTypeLabel(source.sourceInfo.type) }}</span>
                <span class="source-date">{{ formatTimestamp(source.recordedAt) }}</span>
              </div>
              <div v-if="source.note" class="source-note">{{ source.note }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NButton,
  NTag,
  NProgress
} from 'naive-ui'
import {
  CloseOutlined,
  RightOutlined
} from '@vicons/antd'
import { useGraphStore } from '@/stores/graph'
import {
  SOLAR_TERMS,
  GRAPH_NODE_TYPE_INFO,
  GRAPH_EDGE_TYPE_INFO
} from '@/types'
import type { GraphNode, PhenologyEvent, VerificationStatus } from '@/types'
import { formatTimestamp as formatTs } from '@/utils'

const graphStore = useGraphStore()

const selectedNode = computed<GraphNode | null>(() => {
  if (!graphStore.graphViewState.selectedNodeId) return null
  const graphData = graphStore.generateGraphData()
  return graphData.nodes.find(n => n.id === graphStore.graphViewState.selectedNodeId) || null
})

const neighbors = computed(() => {
  if (!selectedNode.value) return { nodes: [], edges: [] }
  return graphStore.getNodeNeighbors(selectedNode.value.id)
})

const neighborNodes = computed(() => {
  return neighbors.value.nodes.filter(n => n.id !== selectedNode.value?.id)
})

const eventData = computed<PhenologyEvent | undefined>(() => {
  if (selectedNode.value?.type !== 'event') return undefined
  return selectedNode.value.data?.event
})

const sourceData = computed(() => {
  if (selectedNode.value?.type !== 'source') return undefined
  return {
    sourceInfo: selectedNode.value.data?.sourceInfo,
    reliabilityScore: selectedNode.value.data?.reliabilityScore
  }
})

const regionData = computed(() => {
  if (selectedNode.value?.type !== 'region') return undefined
  return selectedNode.value.data?.region
})

const solarTermData = computed(() => {
  if (selectedNode.value?.type !== 'solarTerm') return undefined
  return selectedNode.value.data?.term
})

const relatedEvents = computed(() => {
  if (!selectedNode.value) return []
  return graphStore.getEventsForFilters()
})

function getNodeTypeLabel(type: string): string {
  return GRAPH_NODE_TYPE_INFO[type as keyof typeof GRAPH_NODE_TYPE_INFO]?.label || type
}

function getSolarTermName(key?: string): string {
  if (!key) return '-'
  return SOLAR_TERMS.find(t => t.key === key)?.name || key
}

function getSourceTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    book: '书籍',
    paper: '论文',
    website: '网站',
    oral: '口述',
    other: '其他'
  }
  return map[type || ''] || type || '-'
}

function getStatusLabel(status?: VerificationStatus): string {
  const map: Record<string, string> = {
    verified: '已校定',
    conflict: '冲突中',
    unverified: '未校定'
  }
  return map[status || ''] || '-'
}

function getStatusClass(status?: VerificationStatus): string {
  const map: Record<string, string> = {
    verified: 'status-verified',
    conflict: 'status-conflict',
    unverified: 'status-unverified'
  }
  return map[status || ''] || ''
}

function getReliabilityClass(reliability: string): string {
  const map: Record<string, string> = {
    high: 'reliability-high',
    medium: 'reliability-medium',
    low: 'reliability-low'
  }
  return map[reliability] || 'reliability-medium'
}

function getConsensusColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function getEdgeColor(node: GraphNode): string {
  const edge = neighbors.value.edges.find(e =>
    (e.source === selectedNode.value?.id && e.target === node.id) ||
    (e.target === selectedNode.value?.id && e.source === node.id)
  )
  return edge ? GRAPH_EDGE_TYPE_INFO[edge.type].color : '#94a3b8'
}

function getEdgeLabel(from: GraphNode | null, to: GraphNode): string {
  if (!from) return ''
  const edge = neighbors.value.edges.find(e =>
    (e.source === from.id && e.target === to.id) ||
    (e.target === from.id && e.source === to.id)
  )
  if (!edge) return ''
  return GRAPH_EDGE_TYPE_INFO[edge.type].label
}

function formatTimestamp(ts: number): string {
  return formatTs(ts)
}

function handleClose() {
  graphStore.selectGraphNode(null)
}

function handleJumpToNode(node: GraphNode) {
  graphStore.selectGraphNode(node.id)
}
</script>

<style scoped>
.graph-node-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 13px;
  color: #94a3b8;
}

.detail-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 4px solid;
  flex-shrink: 0;
}

.node-avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.avatar-icon {
  font-size: 28px;
}

.node-basic {
  flex: 1;
  min-width: 0;
}

.node-type-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
}

.node-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
  word-break: break-all;
}

.node-subtitle {
  font-size: 13px;
  color: #64748b;
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.section-header .section-label {
  margin-bottom: 0;
}

.section-content {
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

.info-link {
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
  word-break: break-all;
}

.info-link:hover {
  text-decoration: underline;
}

.status-verified {
  color: #10b981;
}

.status-conflict {
  color: #ef4444;
}

.status-unverified {
  color: #f59e0b;
}

.conflict-info {
  margin-top: 12px;
}

.conflict-score {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.conflict-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.relation-item:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.relation-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.relation-info {
  flex: 1;
  min-width: 0;
}

.relation-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-type {
  font-size: 11px;
  color: #94a3b8;
}

.relation-edge {
  flex-shrink: 0;
}

.edge-label {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: currentColor;
  color: white;
  border-radius: 8px;
  opacity: 0.9;
}

.jump-icon {
  font-size: 14px;
  color: #cbd5e1;
  flex-shrink: 0;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}

.source-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.reliability-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  flex-shrink: 0;
}

.reliability-high {
  background: #dcfce7;
  color: #166534;
}

.reliability-medium {
  background: #fef3c7;
  color: #92400e;
}

.reliability-low {
  background: #fee2e2;
  color: #991b1b;
}

.source-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.source-note {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}
</style>
