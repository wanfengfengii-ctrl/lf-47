<template>
  <NConfigProvider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <NDialogProvider>
        <div class="app-layout">
          <Toolbar />

          <div class="main-content">
            <div class="content-area" v-show="store.state.viewMode !== 'graph'">
              <div class="disc-area" v-show="store.state.viewMode === 'disc'">
                <PhenologyDisc />
              </div>
              <div class="compare-area" v-show="store.state.viewMode === 'compare'">
                <RegionCompare />
              </div>
            </div>
            <div class="graph-area" v-show="store.state.viewMode === 'graph'">
              <GraphView />
            </div>

            <div class="editor-sidebar" v-show="store.state.viewMode !== 'graph'">
              <EventEditor />
            </div>
          </div>

          <footer class="app-footer">
            <div class="footer-content">
              <span class="footer-text">
                🌸 物候资料整理系统 · 基于 Vue3 + TypeScript + Pinia + SVG + Naive UI 构建
              </span>
              <span class="footer-hint">
                💡 提示：在圆盘上拖动事件可调整日期；点击事件查看详情并编辑
              </span>
            </div>
          </footer>
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, zhCN, dateZhCN } from 'naive-ui'
import { usePhenologyStore } from '@/stores/phenology'
import Toolbar from '@/components/Toolbar.vue'
import PhenologyDisc from '@/components/PhenologyDisc.vue'
import EventEditor from '@/components/EventEditor.vue'
import RegionCompare from '@/components/RegionCompare.vue'
import GraphView from '@/components/GraphView.vue'

const themeOverrides = {
  common: {
    primaryColor: '#2080f0',
    primaryColorHover: '#4098fc',
    primaryColorPressed: '#1060c9',
    borderRadius: '8px'
  }
}

const store = usePhenologyStore()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f1f5f9;
}

#app {
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
}

.content-area {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
}

.disc-area {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.compare-area {
  width: 100%;
  height: 100%;
}

.graph-area {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
}

.editor-sidebar {
  width: 420px;
  min-width: 360px;
  max-width: 480px;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.editor-sidebar > *) {
  height: 100%;
}

.app-footer {
  flex-shrink: 0;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 10px 24px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-text {
  font-size: 12px;
  color: #64748b;
}

.footer-hint {
  font-size: 12px;
  color: #94a3b8;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }

  .main-content:not(:has(.graph-area)) .editor-sidebar {
    width: 100%;
    max-width: 100%;
    min-width: 100%;
    height: 45%;
    border-left: none;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  }

  .main-content:not(:has(.graph-area)) .content-area {
    height: 55%;
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
