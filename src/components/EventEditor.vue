<template>
  <NCard
    title="事件详情"
    :bordered="false"
    size="huge"
    class="event-editor"
    :segmented="{ content: true, action: true }"
  >
    <template #header-extra>
      <NButton quaternary size="small" @click="handleClose">
        <template #icon>
          <CloseOutlined />
        </template>
      </NButton>
    </template>

    <div v-if="isEditing || isCreating" class="form-container">
      <NForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="80"
        size="medium"
        show-label
        @submit="handleSubmit"
      >
        <NFormItem label="名称" path="name" :show-label="true">
          <NInput
            v-model:value="formData.name"
            placeholder="请输入事件名称"
            :status="getFieldStatus('name')"
          />
        </NFormItem>

        <NFormItem label="类型" path="type">
          <NSelect
            v-model:value="formData.type"
            :options="typeOptions"
            placeholder="选择事件类型"
            :status="getFieldStatus('type')"
          />
        </NFormItem>

        <NFormItem label="节气" path="solarTerm">
          <NSelect
            v-model:value="formData.solarTerm"
            :options="solarTermOptions"
            placeholder="选择所属节气"
            :status="getFieldStatus('solarTerm')"
          />
        </NFormItem>

        <NFormItem label="开始日期" path="startDate">
          <NDatePicker
            v-model:value="datePickerValue"
            type="date"
            :status="getFieldStatus('startDate')"
            placeholder="选择开始日期"
            @update:value="onDateChange"
          />
        </NFormItem>

        <NFormItem label="持续天数" path="durationDays">
          <NInputNumber
            v-model:value="formData.durationDays"
            :min="1"
            :max="365"
            :status="getFieldStatus('durationDays')"
            placeholder="持续天数"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem label="地区">
          <NSelect :value="store.currentRegion.name" :options="regionOptions" disabled />
        </NFormItem>

        <NFormItem label="年份">
          <NInputNumber :value="store.state.currentYear" disabled style="width: 100%" />
        </NFormItem>

        <NFormItem label="已校定" path="verified">
          <NCheckbox v-model:checked="formData.verified">
            <span :class="{ 'text-warning': formData.verified && formData.sources.length === 0 }">
              标记为已校定
            </span>
          </NCheckbox>
          <NAlert
            v-if="formData.verified && formData.sources.length === 0"
            type="warning"
            size="small"
            style="margin-top: 8px"
          >
            缺少来源的事件不能标记为已校定，请先添加可信来源
          </NAlert>
        </NFormItem>

        <NFormItem label="描述">
          <NInput
            v-model:value="formData.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="可选：添加事件描述"
          />
        </NFormItem>
      </NForm>

      <NDivider style="margin: 16px 0">可信来源</NDivider>

      <div class="sources-list">
        <div
          v-for="(source, index) in formData.sources"
          :key="source.id"
          class="source-item"
        >
          <NCard size="small" :bordered="true">
            <div class="source-header">
              <NTag size="small" :type="getSourceTagType(source.type)">
                {{ getSourceTypeLabel(source.type) }}
              </NTag>
              <NButton
                quaternary
                size="tiny"
                type="error"
                @click="removeSource(index)"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
              </NButton>
            </div>
            <div class="source-form">
              <NInput
                v-model:value="source.name"
                placeholder="来源名称"
                size="small"
                style="margin-bottom: 8px"
              />
              <NInput
                v-if="source.type === 'website'"
                v-model:value="source.url"
                placeholder="链接地址"
                size="small"
                style="margin-bottom: 8px"
              />
              <NInput
                v-model:value="source.note"
                placeholder="备注信息（可选）"
                size="small"
                type="textarea"
                :autosize="{ minRows: 1, maxRows: 2 }"
              />
              <NSelect
                v-model:value="source.type"
                :options="sourceTypeOptions"
                size="small"
                style="margin-top: 8px"
              />
            </div>
          </NCard>
        </div>

        <NButton block dashed type="primary" size="small" @click="addSource">
          <template #icon>
            <PlusOutlined />
          </template>
          添加可信来源
        </NButton>
      </div>
    </div>

    <div v-else-if="currentEvent" class="detail-view">
      <NDescriptions :bordered="true" :column="1" label-placement="left" size="medium">
        <NDescriptionsItem label="名称">
          <span class="detail-name">{{ currentEvent.name }}</span>
        </NDescriptionsItem>
        <NDescriptionsItem label="类型">
          <NTag :type="getTagType(currentEvent.type)" :bordered="true">
            <span :style="{ color: getEventTypeInfo(currentEvent.type).color }">
              {{ getEventTypeInfo(currentEvent.type).icon }} {{ getEventTypeInfo(currentEvent.type).label }}
            </span>
          </NTag>
        </NDescriptionsItem>
        <NDescriptionsItem label="所属节气">
          {{ getSolarTermName(currentEvent.solarTerm) }}
        </NDescriptionsItem>
        <NDescriptionsItem label="开始日期">
          {{ currentEvent.startDate }}
        </NDescriptionsItem>
        <NDescriptionsItem label="持续天数">
          {{ currentEvent.durationDays }} 天
        </NDescriptionsItem>
        <NDescriptionsItem label="地区">
          {{ store.currentRegion.name }} · {{ store.currentRegion.climateZone }}
        </NDescriptionsItem>
        <NDescriptionsItem label="年份">
          {{ currentEvent.year }}
        </NDescriptionsItem>
        <NDescriptionsItem label="校定状态">
          <NTag :type="currentEvent.verified ? 'success' : 'warning'" size="small">
            {{ currentEvent.verified ? '✓ 已校定' : '待校定' }}
          </NTag>
        </NDescriptionsItem>
        <NDescriptionsItem v-if="currentEvent.description" label="描述">
          {{ currentEvent.description }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="currentEvent.sources.length > 0" label="可信来源">
          <div class="sources-display">
            <div v-for="source in currentEvent.sources" :key="source.id" class="source-display-item">
              <NTag size="small" :type="getSourceTagType(source.type)" style="margin-right: 8px">
                {{ getSourceTypeLabel(source.type) }}
              </NTag>
              <span>{{ source.name }}</span>
              <a v-if="source.url" :href="source.url" target="_blank" style="margin-left: 8px">
                ↗
              </a>
            </div>
          </div>
        </NDescriptionsItem>
      </NDescriptions>
    </div>

    <div v-else class="empty-state">
      <NEmpty description="选择圆盘上的事件查看详情，或点击下方按钮创建新事件">
        <template #extra>
          <NButton type="primary" size="large" @click="startCreate">
            <template #icon>
              <PlusOutlined />
            </template>
            创建物候事件
          </NButton>
        </template>
      </NEmpty>
    </div>

    <template #action>
      <div class="action-bar">
        <div v-if="!isEditing && !isCreating && currentEvent" class="left-actions">
          <NButton type="error" @click="handleDelete">
            <template #icon>
              <DeleteOutlined />
            </template>
            删除
          </NButton>
        </div>
        <div class="right-actions">
          <NButton v-if="isEditing || isCreating" @click="handleCancel">
            取消
          </NButton>
          <NButton
            v-if="!isEditing && !isCreating && currentEvent"
            type="primary"
            @click="startEdit"
          >
            <template #icon>
              <EditOutlined />
            </template>
            编辑
          </NButton>
          <NButton
            v-if="isEditing || isCreating"
            type="primary"
            :loading="isSubmitting"
            @click="handleSubmit"
          >
            {{ isCreating ? '创建' : '保存' }}
          </NButton>
        </div>
      </div>
    </template>
  </NCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NDatePicker,
  NCheckbox,
  NButton,
  NDivider,
  NTag,
  NAlert,
  NEmpty,
  NDescriptions,
  NDescriptionsItem,
  type FormInst,
  type FormRules
} from 'naive-ui'
import {
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined
} from '@vicons/antd'
import { usePhenologyStore } from '@/stores/phenology'
import { SOLAR_TERMS, EVENT_TYPES, type PhenologyEvent, type SourceInfo, type EventType, type SolarTermKey } from '@/types'
import { validateEvent, createDefaultSource, parseDate, getSolarTermForDate, formatDate } from '@/utils'
import { useMessage, useDialog } from 'naive-ui'

const store = usePhenologyStore()
const message = useMessage()
const dialog = useDialog()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)
const datePickerValue = ref<number | null>(null)

type FormData = {
  name: string
  type: EventType
  solarTerm: SolarTermKey
  startDate: string
  durationDays: number
  verified: boolean
  description: string
  sources: SourceInfo[]
}

const formData = reactive<FormData>({
  name: '',
  type: 'flowering',
  solarTerm: 'lichun',
  startDate: '',
  durationDays: 7,
  verified: false,
  description: '',
  sources: []
})

const currentEvent = computed(() => store.selectedEvent)
const isEditing = computed(() => store.state.isEditing && store.state.selectedEventId !== null)
const isCreating = computed(() => store.state.isEditing && store.state.selectedEventId === null)

const typeOptions = EVENT_TYPES.map(t => ({
  label: `${t.icon} ${t.label}`,
  value: t.key
}))

const solarTermOptions = SOLAR_TERMS.map(t => ({
  label: t.name,
  value: t.key
}))

const regionOptions = store.regions.map(r => ({
  label: r.name,
  value: r.id
}))

const sourceTypeOptions = [
  { label: '书籍', value: 'book' },
  { label: '论文', value: 'paper' },
  { label: '网站', value: 'website' },
  { label: '口述', value: 'oral' },
  { label: '其他', value: 'other' }
]

const formRules: FormRules = {
  name: {
    required: true,
    message: '事件名称不能为空',
    trigger: ['blur', 'input']
  },
  type: {
    required: true,
    message: '请选择事件类型',
    trigger: ['change']
  },
  solarTerm: {
    required: true,
    message: '请选择所属节气',
    trigger: ['change']
  },
  startDate: {
    required: true,
    message: '请选择开始日期',
    trigger: ['change']
  },
  durationDays: {
    required: true,
    type: 'number',
    min: 1,
    message: '持续天数必须大于 0',
    trigger: ['change']
  }
}

const fieldErrors = ref<Record<string, string[]>>({})

watch(() => formData.startDate, (newDate) => {
  if (newDate) {
    const parsedDate = parseDate(newDate)
    formData.solarTerm = getSolarTermForDate(parsedDate)
  }
})

watch(currentEvent, (event) => {
  if (event && isEditing.value) {
    fillFormFromEvent(event)
  }
}, { immediate: true })

function fillFormFromEvent(event: PhenologyEvent) {
  formData.name = event.name
  formData.type = event.type
  formData.solarTerm = event.solarTerm
  formData.startDate = event.startDate
  formData.durationDays = event.durationDays
  formData.verified = event.verified
  formData.description = event.description || ''
  formData.sources = event.sources.map(s => ({ ...s }))
  datePickerValue.value = parseDate(event.startDate).getTime()
}

function resetForm() {
  const empty = store.createEmptyEvent()
  formData.name = ''
  formData.type = empty.type
  formData.solarTerm = empty.solarTerm
  formData.startDate = empty.startDate
  formData.durationDays = empty.durationDays
  formData.verified = false
  formData.description = ''
  formData.sources = []
  fieldErrors.value = {}
  datePickerValue.value = parseDate(empty.startDate).getTime()
}

function onDateChange(value: number | null) {
  if (value !== null) {
    formData.startDate = formatDate(new Date(value))
  }
}

function getTagType(type: EventType): 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' {
  const map: Record<string, any> = {
    flowering: 'error',
    farming: 'success',
    migration: 'info',
    folklore: 'warning'
  }
  return map[type] || 'default'
}

function getFieldStatus(field: string): 'error' | 'success' | 'warning' | undefined {
  if (fieldErrors.value[field]?.length) return 'error'
  return undefined
}

function getEventTypeInfo(type: EventType) {
  return EVENT_TYPES.find(t => t.key === type)!
}

function getSolarTermName(key: SolarTermKey) {
  return SOLAR_TERMS.find(t => t.key === key)?.name || key
}

function getSourceTypeLabel(type: string) {
  const option = sourceTypeOptions.find(o => o.value === type)
  return option?.label || type
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

function addSource() {
  formData.sources.push(createDefaultSource())
}

function removeSource(index: number) {
  formData.sources.splice(index, 1)
  if (formData.sources.length === 0 && formData.verified) {
    formData.verified = false
  }
}

function startCreate() {
  resetForm()
  store.setEditing(true)
  store.selectEvent(null)
}

function startEdit() {
  if (currentEvent.value) {
    fillFormFromEvent(currentEvent.value)
    store.setEditing(true)
  }
}

function handleClose() {
  store.selectEvent(null)
  store.setEditing(false)
  resetForm()
}

function handleCancel() {
  if (isCreating.value) {
    resetForm()
  } else if (currentEvent.value) {
    fillFormFromEvent(currentEvent.value)
  }
  store.setEditing(false)
  if (isCreating.value) {
    store.selectEvent(null)
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  isSubmitting.value = true

  try {
    const validSources = formData.sources.filter(s => s.name.trim().length > 0)
    
    if (formData.verified && validSources.length === 0) {
      message.warning('缺少来源的事件不能标记为已校定')
      isSubmitting.value = false
      return
    }

    const eventData: Partial<PhenologyEvent> = {
      ...formData,
      sources: validSources
    }

    const errors = validateEvent(eventData, store.events)
    if (errors.length > 0) {
      fieldErrors.value = {}
      errors.forEach(err => {
        if (!fieldErrors.value[err.field]) {
          fieldErrors.value[err.field] = []
        }
        fieldErrors.value[err.field].push(err.message)
        message.error(err.message)
      })
      isSubmitting.value = false
      return
    }

    if (isCreating.value) {
      const result = store.addEvent(eventData)
      if (result.success) {
        message.success('事件创建成功')
        store.setEditing(false)
      } else {
        result.errors.forEach(err => message.error(err.message))
      }
    } else if (isEditing.value && store.state.selectedEventId) {
      const result = store.updateEvent(store.state.selectedEventId, eventData)
      if (result.success) {
        message.success('事件保存成功')
        store.setEditing(false)
      } else {
        result.errors.forEach(err => message.error(err.message))
      }
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleDelete() {
  if (!currentEvent.value) return
  
  dialog.warning({
    title: '确认删除',
    content: `确定要删除事件「${currentEvent.value.name}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      store.deleteEvent(currentEvent.value!.id)
      message.success('事件已删除')
    }
  })
}
</script>

<style scoped>
.event-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.n-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.n-card__content) {
  flex: 1;
  overflow-y: auto;
  padding: 20px !important;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-item {
  width: 100%;
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.source-form {
  display: flex;
  flex-direction: column;
}

.detail-view {
  width: 100%;
}

.detail-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.sources-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-display-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.text-warning {
  color: #d97706;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.right-actions {
  display: flex;
  gap: 8px;
}
</style>
