<template>
  <div class="graph-view">
    <div class="graph-sidebar-left">
      <GraphSearchPanel />
    </div>

    <div class="graph-main-area">
      <KnowledgeGraph />
    </div>

    <div class="graph-sidebar-right">
      <GraphNodeDetail />
    </div>
  </div>
</template>

<script setup lang="ts">
import KnowledgeGraph from '@/components/KnowledgeGraph.vue'
import GraphSearchPanel from '@/components/GraphSearchPanel.vue'
import GraphNodeDetail from '@/components/GraphNodeDetail.vue'
</script>

<style scoped>
.graph-view {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.graph-sidebar-left {
  width: 300px;
  min-width: 260px;
  max-width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
  overflow: hidden;
}

.graph-main-area {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.graph-sidebar-right {
  width: 340px;
  min-width: 300px;
  max-width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e2e8f0;
  background: #ffffff;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .graph-sidebar-left {
    width: 260px;
    min-width: 260px;
  }

  .graph-sidebar-right {
    width: 300px;
    min-width: 300px;
  }
}

@media (max-width: 900px) {
  .graph-view {
    flex-direction: column;
  }

  .graph-sidebar-left {
    width: 100% !important;
    max-width: 100% !important;
    height: 40%;
    min-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .graph-main-area {
    height: 60%;
  }

  .graph-sidebar-right {
    display: none;
  }
}
</style>
