<template>
  <div class="knowledge-graph-container">
    <svg
      ref="svgRef"
      class="graph-svg"
      @mousedown="handleSvgMouseDown"
      @mousemove="handleSvgMouseMove"
      @mouseup="handleSvgMouseUp"
      @mouseleave="handleSvgMouseUp"
      @wheel="handleWheel"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2" />
        </filter>
      </defs>

      <g :transform="`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`">
        <g class="edges-group">
          <line
            v-for="edge in displayEdges"
            :key="edge.id"
            :x1="getNodeById(edge.source)?.x || 0"
            :y1="getNodeById(edge.source)?.y || 0"
            :x2="getNodeById(edge.target)?.x || 0"
            :y2="getNodeById(edge.target)?.y || 0"
            :stroke="getEdgeColor(edge)"
            :stroke-width="getEdgeWidth(edge)"
            :stroke-dasharray="getEdgeDash(edge)"
            :opacity="getEdgeOpacity(edge)"
            class="graph-edge"
          />
          <text
            v-for="edge in labeledEdges"
            :key="`label-${edge.id}`"
            :x="((getNodeById(edge.source)?.x || 0) + (getNodeById(edge.target)?.x || 0)) / 2"
            :y="((getNodeById(edge.source)?.y || 0) + (getNodeById(edge.target)?.y || 0)) / 2 - 5"
            text-anchor="middle"
            class="edge-label"
            :opacity="getEdgeOpacity(edge)"
          >
            {{ edge.label }}
          </text>
        </g>

        <g class="nodes-group">
          <g
            v-for="node in displayNodes"
            :key="node.id"
            :transform="`translate(${node.x || 0}, ${node.y || 0})`"
            :class="{
              'node-group': true,
              'node-selected': isSelected(node),
              'node-highlighted': isHighlighted(node),
              'node-dimmed': isDimmed(node)
            }"
            @mousedown.stop="handleNodeMouseDown($event, node)"
            @mouseenter.stop="handleNodeMouseEnter(node)"
            @mouseleave.stop="handleNodeMouseLeave"
            @click.stop="handleNodeClick(node)"
          >
            <circle
              :r="node.size"
              :fill="node.color"
              :opacity="getNodeOpacity(node)"
              :filter="isSelected(node) ? 'url(#glow)' : 'url(#nodeShadow)'"
              class="node-circle"
            />
            <text
              text-anchor="middle"
              dominant-baseline="central"
              class="node-icon"
              :font-size="node.size * 0.9"
            >
              {{ node.icon }}
            </text>
            <text
              v-if="store.graphViewState.showLabels"
              text-anchor="middle"
              :y="node.size + 16"
              class="node-label"
              :opacity="getNodeOpacity(node)"
            >
              {{ node.label }}
            </text>
            <text
              v-if="store.graphViewState.showLabels && node.subLabel"
              text-anchor="middle"
              :y="node.size + 30"
              class="node-sublabel"
              :opacity="getNodeOpacity(node)"
            >
              {{ node.subLabel }}
            </text>
          </g>
        </g>
      </g>
    </svg>

    <div class="graph-controls">
      <div class="control-group">
        <NButton size="small" @click="zoomIn">
          <template #icon><ZoomInOutlined /></template>
        </NButton>
        <NButton size="small" @click="zoomOut">
          <template #icon><ZoomOutOutlined /></template>
        </NButton>
        <NButton size="small" @click="resetView">
          <template #icon><CompressOutlined /></template>
          重置视图
        </NButton>
      </div>

      <div class="control-group">
        <span class="control-label">布局：</span>
        <NButtonGroup size="small">
          <NButton
            :type="store.graphViewState.layoutMode === 'force' ? 'primary' : 'default'"
            @click="setLayout('force')"
          >
            力导向
          </NButton>
          <NButton
            :type="store.graphViewState.layoutMode === 'circular' ? 'primary' : 'default'"
            @click="setLayout('circular')"
          >
            环形
          </NButton>
          <NButton
            :type="store.graphViewState.layoutMode === 'hierarchical' ? 'primary' : 'default'"
            @click="setLayout('hierarchical')"
          >
            层级
          </NButton>
        </NButtonGroup>
      </div>

      <div class="control-group">
        <NCheckbox
          :checked="store.graphViewState.showLabels"
          @update:checked="store.toggleShowLabels"
        >
          显示标签
        </NCheckbox>
        <NCheckbox
          :checked="store.graphViewState.highlightSources"
          @update:checked="store.toggleHighlightSources"
        >
          高亮重要来源
        </NCheckbox>
      </div>

      <div class="control-group stats">
        <span class="stat-item">节点: {{ displayNodes.length }}</span>
        <span class="stat-item">连线: {{ displayEdges.length }}</span>
      </div>
    </div>

    <div v-if="isSimulating" class="simulation-indicator">
      <div class="spinner"></div>
      <span>布局计算中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  NButton,
  NButtonGroup,
  NCheckbox
} from 'naive-ui'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  CompressOutlined
} from '@vicons/antd'
import { usePhenologyStore } from '@/stores/phenology'
import type { GraphNode, GraphEdge } from '@/types'
import { GRAPH_EDGE_TYPE_INFO } from '@/types'

const store = usePhenologyStore()

const svgRef = ref<SVGSVGElement | null>(null)
const transform = ref({ x: 0, y: 0, scale: 1 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const draggingNode = ref<GraphNode | null>(null)
const isSimulating = ref(false)

const graphData = computed(() => store.generateGraphData())

const displayNodes = computed(() => {
  const selectedId = store.graphViewState.selectedNodeId
  const hoveredId = store.graphViewState.hoveredNodeId
  const highlightSources = store.graphViewState.highlightSources

  if (!selectedId && !hoveredId) {
    return graphData.value.nodes.map(node => ({
      ...node,
      highlight: false,
      dim: false
    }))
  }

  const focusId = selectedId || hoveredId
  const neighbors = store.getNodeNeighbors(focusId!)
  const neighborIds = new Set(neighbors.nodes.map(n => n.id))

  return graphData.value.nodes.map(node => {
    const isNeighbor = neighborIds.has(node.id)
    const isFocus = node.id === focusId
    let highlight = isFocus || isNeighbor

    if (highlightSources && node.type === 'source' && node.data?.reliabilityScore >= 80) {
      highlight = true
    }

    return {
      ...node,
      highlight,
      dim: !highlight
    }
  })
})

const displayEdges = computed(() => {
  const selectedId = store.graphViewState.selectedNodeId
  const hoveredId = store.graphViewState.hoveredNodeId

  if (!selectedId && !hoveredId) {
    return graphData.value.edges.map(edge => ({
      ...edge,
      highlight: false,
      dim: false
    }))
  }

  const focusId = selectedId || hoveredId
  const neighbors = store.getNodeNeighbors(focusId!)
  const neighborEdgeIds = new Set(neighbors.edges.map(e => e.id))

  return graphData.value.edges.map(edge => {
    const isRelated = neighborEdgeIds.has(edge.id)
    return {
      ...edge,
      highlight: isRelated,
      dim: !isRelated
    }
  })
})

const labeledEdges = computed(() => displayEdges.value.filter(e => e.label))

function getNodeById(id: string): GraphNode | undefined {
  return displayNodes.value.find(n => n.id === id)
}

function getEdgeColor(edge: GraphEdge): string {
  if (edge.highlight) {
    return GRAPH_EDGE_TYPE_INFO[edge.type].color
  }
  return edge.dim ? '#e2e8f0' : '#94a3b8'
}

function getEdgeWidth(edge: GraphEdge): number {
  const base = edge.highlight ? 2.5 : 1.5
  return base * (0.5 + edge.weight)
}

function getEdgeDash(edge: GraphEdge): string {
  return GRAPH_EDGE_TYPE_INFO[edge.type].dashed ? '5,5' : 'none'
}

function getEdgeOpacity(edge: GraphEdge): number {
  if (edge.highlight) return 1
  if (edge.dim) return 0.15
  return 0.6
}

function getNodeOpacity(node: GraphNode): number {
  if (node.highlight) return 1
  if (node.dim) return 0.2
  return 1
}

function isSelected(node: GraphNode): boolean {
  return node.id === store.graphViewState.selectedNodeId
}

function isHighlighted(node: GraphNode): boolean {
  return node.highlight === true
}

function isDimmed(node: GraphNode): boolean {
  return node.dim === true
}

function handleNodeMouseDown(e: MouseEvent, node: GraphNode) {
  e.preventDefault()
  draggingNode.value = node
}

function handleNodeMouseEnter(node: GraphNode) {
  store.hoverGraphNode(node.id)
}

function handleNodeMouseLeave() {
  store.hoverGraphNode(null)
}

function handleNodeClick(node: GraphNode) {
  if (store.graphViewState.selectedNodeId === node.id) {
    store.selectGraphNode(null)
  } else {
    store.selectGraphNode(node.id)
  }
}

function handleSvgMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (draggingNode.value) return
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - transform.value.x,
    y: e.clientY - transform.value.y
  }
}

function handleSvgMouseMove(e: MouseEvent) {
  if (draggingNode.value) {
    const svg = svgRef.value
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = (e.clientX - rect.left - transform.value.x) / transform.value.scale
    const y = (e.clientY - rect.top - transform.value.y) / transform.value.scale
    draggingNode.value.x = x
    draggingNode.value.y = y
    return
  }

  if (!isDragging.value) return
  transform.value.x = e.clientX - dragStart.value.x
  transform.value.y = e.clientY - dragStart.value.y
}

function handleSvgMouseUp() {
  isDragging.value = false
  draggingNode.value = null
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.3, Math.min(3, transform.value.scale * delta))
  const scaleRatio = newScale / transform.value.scale

  const svg = svgRef.value
  if (svg) {
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    transform.value.x = mouseX - (mouseX - transform.value.x) * scaleRatio
    transform.value.y = mouseY - (mouseY - transform.value.y) * scaleRatio
  }

  transform.value.scale = newScale
}

function zoomIn() {
  transform.value.scale = Math.min(3, transform.value.scale * 1.2)
}

function zoomOut() {
  transform.value.scale = Math.max(0.3, transform.value.scale / 1.2)
}

function resetView() {
  transform.value = { x: 0, y: 0, scale: 1 }
  initLayout()
}

function setLayout(mode: 'force' | 'circular' | 'hierarchical') {
  store.setGraphViewMode(mode)
  initLayout()
}

function initLayout() {
  const mode = store.graphViewState.layoutMode
  const nodes = graphData.value.nodes
  const svg = svgRef.value
  if (!svg || nodes.length === 0) return

  const width = svg.clientWidth
  const height = svg.clientHeight
  const centerX = width / 2
  const centerY = height / 2

  if (mode === 'circular') {
    const radius = Math.min(width, height) * 0.35
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
      node.x = centerX + Math.cos(angle) * radius
      node.y = centerY + Math.sin(angle) * radius
      node.vx = 0
      node.vy = 0
    })
  } else if (mode === 'hierarchical') {
    const layers: Record<string, GraphNode[]> = {
      region: [],
      solarTerm: [],
      event: [],
      source: []
    }
    nodes.forEach(node => {
      if (layers[node.type]) {
        layers[node.type].push(node)
      }
    })

    const layerOrder = ['region', 'solarTerm', 'event', 'source']
    const layerWidth = width / (layerOrder.length + 1)

    layerOrder.forEach((layerType, layerIdx) => {
      const layerNodes = layers[layerType]
      const x = layerWidth * (layerIdx + 1)
      const layerHeight = height / (layerNodes.length + 1)
      layerNodes.forEach((node, nodeIdx) => {
        node.x = x
        node.y = layerHeight * (nodeIdx + 1)
        node.vx = 0
        node.vy = 0
      })
    })
  } else {
    nodes.forEach((node) => {
      node.x = centerX + (Math.random() - 0.5) * 300
      node.y = centerY + (Math.random() - 0.5) * 300
      node.vx = 0
      node.vy = 0
    })
    startForceSimulation()
  }
}

let animationFrameId: number | null = null

function startForceSimulation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  isSimulating.value = true
  let iterations = 0
  const maxIterations = 200

  function simulate() {
    const nodes = graphData.value.nodes
    const edges = graphData.value.edges

    if (nodes.length < 2) {
      isSimulating.value = false
      return
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    nodes.forEach(node => {
      node.vx = node.vx || 0
      node.vy = node.vy || 0
    })

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i]
        const n2 = nodes[j]
        const dx = (n2.x || 0) - (n1.x || 0)
        const dy = (n2.y || 0) - (n1.y || 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const repulsion = 2000 / (dist * dist)
        const fx = (dx / dist) * repulsion
        const fy = (dy / dist) * repulsion
        n1.vx! -= fx
        n1.vy! -= fy
        n2.vx! += fx
        n2.vy! += fy
      }
    }

    edges.forEach(edge => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) return

      const dx = (target.x || 0) - (source.x || 0)
      const dy = (target.y || 0) - (source.y || 0)
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const idealDist = 120 / edge.weight
      const attraction = (dist - idealDist) * 0.02 * edge.weight
      const fx = (dx / dist) * attraction
      const fy = (dy / dist) * attraction
      source.vx! += fx
      source.vy! += fy
      target.vx! -= fx
      target.vy! -= fy
    })

    const svg = svgRef.value
    const centerX = svg ? svg.clientWidth / 2 : 400
    const centerY = svg ? svg.clientHeight / 2 : 300

    nodes.forEach(node => {
      const dx = centerX - (node.x || 0)
      const dy = centerY - (node.y || 0)
      node.vx! += dx * 0.001
      node.vy! += dy * 0.001
    })

    nodes.forEach(node => {
      node.vx! *= 0.9
      node.vy! *= 0.9
      node.x! += node.vx!
      node.y! += node.vy!
    })

    iterations++

    const totalVelocity = nodes.reduce((sum, n) =>
      sum + Math.abs(n.vx || 0) + Math.abs(n.vy || 0), 0)

    if (totalVelocity < 0.5 || iterations >= maxIterations) {
      isSimulating.value = false
      return
    }

    animationFrameId = requestAnimationFrame(simulate)
  }

  simulate()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  setTimeout(() => {
    initLayout()
  }, 100)

  if (svgRef.value) {
    resizeObserver = new ResizeObserver(() => {
      initLayout()
    })
    resizeObserver.observe(svgRef.value)
  }
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

watch(
  () => [store.graphSearchFilters, store.state.currentYear],
  () => {
    setTimeout(() => initLayout(), 50)
  },
  { deep: true }
)
</script>

<style scoped>
.knowledge-graph-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
}

.graph-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-svg:active {
  cursor: grabbing;
}

.node-group {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.node-group:hover {
  transform: scale(1.1);
}

.node-group.node-selected {
  filter: url(#glow);
}

.node-circle {
  transition: all 0.2s ease;
}

.node-icon {
  pointer-events: none;
  user-select: none;
}

.node-label {
  font-size: 12px;
  font-weight: 600;
  fill: #1e293b;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
}

.node-sublabel {
  font-size: 10px;
  fill: #64748b;
  pointer-events: none;
  user-select: none;
}

.graph-edge {
  transition: all 0.2s ease;
  pointer-events: none;
}

.edge-label {
  font-size: 10px;
  fill: #94a3b8;
  pointer-events: none;
}

.graph-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 10;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stats {
  margin-left: auto;
  padding-left: 16px;
  border-left: 1px solid #e2e8f0;
}

.stat-item {
  font-size: 12px;
  color: #64748b;
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 12px;
  font-weight: 500;
}

.simulation-indicator {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 13px;
  color: #64748b;
  z-index: 10;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
