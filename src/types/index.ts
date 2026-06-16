export type EventType = 'flowering' | 'farming' | 'migration' | 'folklore'

export interface EventTypeInfo {
  key: EventType
  label: string
  color: string
  icon: string
}

export const EVENT_TYPES: EventTypeInfo[] = [
  { key: 'flowering', label: '花期', color: '#f472b6', icon: '🌸' },
  { key: 'farming', label: '农事', color: '#65a30d', icon: '🌾' },
  { key: 'migration', label: '候鸟迁徙', color: '#3b82f6', icon: '🦢' },
  { key: 'folklore', label: '民俗活动', color: '#f59e0b', icon: '🏮' }
]

export type SolarTermKey =
  | 'lichun' | 'yushui' | 'jingzhe' | 'chunfen' | 'qingming' | 'guyu'
  | 'lixia' | 'xiaoman' | 'mangzhong' | 'xiazhi' | 'xiaoshu' | 'dashu'
  | 'liqiu' | 'chushu' | 'bailu' | 'qiufen' | 'hanlu' | 'shuangjiang'
  | 'lidong' | 'xiaoxue' | 'daxue' | 'dongzhi' | 'xiaohan' | 'dahan'

export interface SolarTerm {
  key: SolarTermKey
  name: string
  month: number
  day: number
}

export const SOLAR_TERMS: SolarTerm[] = [
  { key: 'lichun', name: '立春', month: 2, day: 4 },
  { key: 'yushui', name: '雨水', month: 2, day: 19 },
  { key: 'jingzhe', name: '惊蛰', month: 3, day: 6 },
  { key: 'chunfen', name: '春分', month: 3, day: 21 },
  { key: 'qingming', name: '清明', month: 4, day: 5 },
  { key: 'guyu', name: '谷雨', month: 4, day: 20 },
  { key: 'lixia', name: '立夏', month: 5, day: 6 },
  { key: 'xiaoman', name: '小满', month: 5, day: 21 },
  { key: 'mangzhong', name: '芒种', month: 6, day: 6 },
  { key: 'xiazhi', name: '夏至', month: 6, day: 21 },
  { key: 'xiaoshu', name: '小暑', month: 7, day: 7 },
  { key: 'dashu', name: '大暑', month: 7, day: 23 },
  { key: 'liqiu', name: '立秋', month: 8, day: 8 },
  { key: 'chushu', name: '处暑', month: 8, day: 23 },
  { key: 'bailu', name: '白露', month: 9, day: 8 },
  { key: 'qiufen', name: '秋分', month: 9, day: 23 },
  { key: 'hanlu', name: '寒露', month: 10, day: 8 },
  { key: 'shuangjiang', name: '霜降', month: 10, day: 24 },
  { key: 'lidong', name: '立冬', month: 11, day: 8 },
  { key: 'xiaoxue', name: '小雪', month: 11, day: 22 },
  { key: 'daxue', name: '大雪', month: 12, day: 7 },
  { key: 'dongzhi', name: '冬至', month: 12, day: 22 },
  { key: 'xiaohan', name: '小寒', month: 1, day: 6 },
  { key: 'dahan', name: '大寒', month: 1, day: 20 }
]

export type SourceType = 'book' | 'paper' | 'website' | 'oral' | 'other'

export type SourceReliability = 'high' | 'medium' | 'low'

export const SOURCE_RELIABILITY_SCORE: Record<SourceReliability, number> = {
  high: 90,
  medium: 60,
  low: 30
}

export const SOURCE_TYPE_RELIABILITY: Record<SourceType, SourceReliability> = {
  book: 'high',
  paper: 'high',
  website: 'medium',
  oral: 'low',
  other: 'medium'
}

export interface ObservationData {
  startDate: string
  durationDays: number
  type?: EventType
}

export interface SourceRecord {
  id: string
  sourceInfo: SourceInfo
  observation: ObservationData
  reliability: SourceReliability
  reliabilityScore: number
  recordedAt: number
  recorder?: string
  note?: string
}

export type VerificationStatus = 'unverified' | 'conflict' | 'verified'

export interface ConflictDetail {
  field: 'startDate' | 'durationDays' | 'type'
  values: { sourceId: string; value: string | number }[]
  maxDiff: number
  severity: 'high' | 'medium' | 'low'
}

export interface ConflictAnalysis {
  hasConflict: boolean
  conflicts: ConflictDetail[]
  overallSeverity: 'high' | 'medium' | 'low' | 'none'
  consensusScore: number
}

export interface VersionSnapshot {
  name: string
  type: EventType
  solarTerm: SolarTermKey
  startDate: string
  durationDays: number
  sources: SourceRecord[]
  verified: boolean
  verificationStatus: VerificationStatus
  description?: string
}

export type VersionAction = 'create' | 'edit' | 'move' | 'verify' | 'unverify' | 'add_source' | 'remove_source' | 'update_source'

export interface VersionHistoryEntry {
  id: string
  version: number
  action: VersionAction
  description: string
  timestamp: number
  operator: string
  before: VersionSnapshot | null
  after: VersionSnapshot
  diff: string[]
}

export interface SourceInfo {
  id: string
  name: string
  type: SourceType
  url?: string
  note?: string
  publisher?: string
  publishDate?: string
}

export interface PhenologyEvent {
  id: string
  name: string
  type: EventType
  solarTerm: SolarTermKey
  startDate: string
  durationDays: number
  regionId: string
  year: number
  sources: SourceRecord[]
  verified: boolean
  verificationStatus: VerificationStatus
  conflictAnalysis?: ConflictAnalysis
  description?: string
  versionHistory: VersionHistoryEntry[]
  currentVersion: number
  createdAt: number
  updatedAt: number
}

export interface Region {
  id: string
  name: string
  province: string
  latitude: number
  longitude: number
  climateZone: string
}

export interface AppState {
  currentYear: number
  currentRegionId: string
  selectedEventTypes: EventType[]
  selectedEventId: string | null
  isEditing: boolean
  viewMode: 'disc' | 'compare'
}

export interface ValidationError {
  field: string
  message: string
}
