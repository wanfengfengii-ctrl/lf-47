<template>
  <div class="disc-container" ref="containerRef">
    <svg
      :width="svgSize"
      :height="svgSize"
      :viewBox="`0 0 ${svgSize} ${svgSize}`"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.15" />
        </filter>
        <filter id="conflictGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#ef4444" flood-opacity="0.6" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.2" />
        </filter>
        <filter id="verifiedGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.3" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.15" />
        </filter>
        <linearGradient id="discGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
      </defs>

      <circle
        :cx="center"
        :cy="center"
        :r="outerRadius"
        fill="url(#discGradient)"
        stroke="#cbd5e1"
        stroke-width="2"
      />

      <circle
        :cx="center"
        :cy="center"
        :r="innerRadius"
        fill="#ffffff"
        stroke="#e2e8f0"
        stroke-width="1"
      />

      <g v-for="(term, index) in SOLAR_TERMS" :key="term.key">
        <path
          :d="getSolarTermSectorPath(index)"
          :fill="getSolarTermColor(index)"
          :stroke="draggingEvent ? 'transparent' : '#f1f5f9'"
          stroke-width="1"
          :opacity="0.6"
          class="solar-term-sector"
          @click="handleSolarTermClick(term.key)"
        />
        <line
          :x1="getSolarTermBoundaryStart(index).x"
          :y1="getSolarTermBoundaryStart(index).y"
          :x2="getSolarTermBoundaryEnd(index).x"
          :y2="getSolarTermBoundaryEnd(index).y"
          stroke="#cbd5e1"
          stroke-width="1"
          :stroke-dasharray="index % 2 === 0 ? '0' : '2,2'"
        />
        <text
          :x="getSolarTermLabelPosition(index).x"
          :y="getSolarTermLabelPosition(index).y"
          :transform="getSolarTermLabelTransform(index)"
          text-anchor="middle"
          dominant-baseline="middle"
          :fill="isMajorTerm(index) ? '#1e293b' : '#64748b'"
          :font-size="isMajorTerm(index) ? 14 : 11"
          :font-weight="isMajorTerm(index) ? 600 : 400"
          class="solar-term-label"
          pointer-events="none"
        >
          {{ term.name }}
        </text>
      </g>

      <g v-for="event in filteredEvents" :key="event.id">
        <path
          :d="getEventArcPath(event)"
          :fill="getEventFillColor(event)"
          :stroke="getEventStrokeColor(event)"
          :stroke-width="getEventStrokeWidth(event)"
          :opacity="getEventOpacity(event)"
          class="event-arc"
          :filter="getEventFilter(event)"
          :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
          @mousedown="handleEventMouseDown($event, event.id)"
          @click.stop="handleEventClick(event.id)"
        />
        <text
          v-if="getEventArcLength(event) > 40"
          :x="getEventLabelPosition(event).x"
          :y="getEventLabelPosition(event).y"
          :transform="getEventLabelTransform(event)"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="#ffffff"
          font-size="10"
          font-weight="500"
          class="event-label"
          pointer-events="none"
        >
          {{ truncateText(event.name, 8) }}
        </text>
        <g :transform="`translate(${getStatusBadgePosition(event).x}, ${getStatusBadgePosition(event).y})`">
          <circle
            r="8"
            :fill="getStatusBadgeColor(event)"
            stroke="#ffffff"
            stroke-width="2"
            pointer-events="none"
          />
          <text
            text-anchor="middle"
            dominant-baseline="middle"
            fill="#ffffff"
            :font-size="event.verificationStatus === 'conflict' ? 10 : 9"
            font-weight="bold"
            pointer-events="none"
          >
            {{ getStatusBadgeText(event) }}
          </text>
        </g>
      </g>

      <g v-if="isDragging && draggingEvent">
        <path
          :d="getDraggingPreviewPath()"
          fill="#3b82f6"
          opacity="0.3"
          stroke="#3b82f6"
          stroke-width="2"
          stroke-dasharray="4,4"
        />
      </g>

      <text
        :x="center"
        :y="center - 20"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#1e293b"
        font-size="20"
        font-weight="700"
      >
        {{ store.state.currentYear }}年
      </text>
      <text
        :x="center"
        :y="center + 5"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#64748b"
        font-size="13"
      >
        {{ store.currentRegion.name }}
      </text>
      <text
        :x="center"
        :y="center + 28"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#94a3b8"
        font-size="11"
      >
        {{ filteredEvents.length }} 条物候记录
      </text>
      <g :transform="`translate(${center}, ${center + 50})`">
        <circle r="5" fill="#10b981" />
        <text x="10" text-anchor="start" dominant-baseline="middle" fill="#64748b" font-size="10">已校定</text>
        <circle cx="70" r="5" fill="#f59e0b" />
        <text x="80" text-anchor="start" dominant-baseline="middle" fill="#64748b" font-size="10">未校定</text>
        <circle cx="140" r="5" fill="#ef4444" />
        <text x="150" text-anchor="start" dominant-baseline="middle" fill="#64748b" font-size="10">冲突中</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">import { ref, computed } from 'vue';
import { usePhenologyStore } from '@/stores/phenology';
import { SOLAR_TERMS, EVENT_TYPES, type PhenologyEvent, type SolarTermKey, type VerificationStatus } from '@/types';
import { dayOfYearToAngle, getDayOfYear, getDaysInYear, parseDate, angleToDayOfYear, formatDate, getDateFromDayOfYear, getVerificationStatusInfo } from '@/utils';
const store = usePhenologyStore();
const svgSize = 700;
const center = svgSize / 2;
const outerRadius = 320;
const innerRadius = 170;
const eventTrackWidth = 60;
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const draggingEventId = ref<string | null>(null);
const dragStartAngle = ref(0);
const dragCurrentAngle = ref(0);
const draggingEvent = computed(() => {
 if (!draggingEventId.value)
 return null;
 return store.events.find(e => e.id === draggingEventId.value) || null;
});
const selectedEventId = computed(() => store.state.selectedEventId);
const filteredEvents = computed(() => store.filteredEvents);
function polarToCartesian(radius: number, angleDeg: number) {
 const angleRad = (angleDeg - 90) * Math.PI / 180;
 return {
 x: center + radius * Math.cos(angleRad),
 y: center + radius * Math.sin(angleRad)
 };
}
function getSolarTermStartAngle(index: number): number {
 return (index / 24) * 360;
}
function getSolarTermEndAngle(index: number): number {
 return ((index + 1) / 24) * 360;
}
function describeArc(startAngle: number, endAngle: number, innerR: number, outerR: number) {
 const startOuter = polarToCartesian(outerR, endAngle);
 const endOuter = polarToCartesian(outerR, startAngle);
 const startInner = polarToCartesian(innerR, startAngle);
 const endInner = polarToCartesian(innerR, endAngle);
 const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
 return [
 'M', startOuter.x, startOuter.y,
 'A', outerR, outerR, 0, largeArc, 0, endOuter.x, endOuter.y,
 'L', startInner.x, startInner.y,
 'A', innerR, innerR, 0, largeArc, 1, endInner.x, endInner.y,
 'Z'
 ].join(' ');
}
function getSolarTermSectorPath(index: number) {
 const startAngle = getSolarTermStartAngle(index);
 const endAngle = getSolarTermEndAngle(index);
 return describeArc(startAngle, endAngle, innerRadius, outerRadius);
}
function getSolarTermColor(index: number) {
 const colors = [
 '#fef3c7', '#fef9c3', '#dcfce7', '#d1fae5',
 '#ccfbf1', '#cffafe', '#e0f2fe', '#dbeafe',
 '#dbeafe', '#e0e7ff', '#e0e7ff', '#ede9fe',
 '#f5f3ff', '#faf5ff', '#fdf4ff', '#fce7f3',
 '#fce7f3', '#ffe4e6', '#fee2e2', '#fef2f2',
 '#fef3c7', '#fef9c3', '#ecfccb', '#f0fdf4'
 ];
 return colors[index % colors.length];
}
function getSolarTermBoundaryStart(index: number) {
 const angle = getSolarTermStartAngle(index);
 return polarToCartesian(innerRadius, angle);
}
function getSolarTermBoundaryEnd(index: number) {
 const angle = getSolarTermStartAngle(index);
 return polarToCartesian(outerRadius, angle);
}
function getSolarTermLabelPosition(index: number) {
 const midAngle = (getSolarTermStartAngle(index) + getSolarTermEndAngle(index)) / 2;
 const radius = outerRadius + 25;
 return polarToCartesian(radius, midAngle);
}
function getSolarTermLabelTransform(index: number) {
 const midAngle = (getSolarTermStartAngle(index) + getSolarTermEndAngle(index)) / 2;
 return `rotate(${midAngle}, ${getSolarTermLabelPosition(index).x}, ${getSolarTermLabelPosition(index).y})`;
}
function isMajorTerm(index: number) {
 return index % 2 === 0;
}
function getEventStartAngle(event: PhenologyEvent): number {
 const date = parseDate(event.startDate);
 const dayOfYear = getDayOfYear(date);
 return dayOfYearToAngle(dayOfYear, event.year);
}
function getEventEndAngle(event: PhenologyEvent): number {
 const startDate = parseDate(event.startDate);
 const startDay = getDayOfYear(startDate);
 const endDay = Math.min(startDay + event.durationDays, getDaysInYear(event.year));
 return dayOfYearToAngle(endDay, event.year);
}
function getEventTrackIndex(event: PhenologyEvent): number {
 const sameTermEvents = store.getEventsForSolarTerm(event.solarTerm);
 return sameTermEvents.findIndex(e => e.id === event.id) % 3;
}
function getEventArcPath(event: PhenologyEvent) {
 const startAngle = getEventStartAngle(event);
 const endAngle = getEventEndAngle(event);
 const trackIdx = getEventTrackIndex(event);
 const inner = innerRadius + 5 + trackIdx * (eventTrackWidth / 3);
 const outer = inner + (eventTrackWidth / 3) - 4;
 return describeArc(startAngle, endAngle, inner, outer);
}
function getEventArcLength(event: PhenologyEvent): number {
 const startAngle = getEventStartAngle(event);
 const endAngle = getEventEndAngle(event);
 const angleSpan = endAngle - startAngle;
 const avgRadius = innerRadius + eventTrackWidth / 2;
 return (angleSpan / 360) * 2 * Math.PI * avgRadius;
}
function getEventLabelPosition(event: PhenologyEvent) {
 const startAngle = getEventStartAngle(event);
 const endAngle = getEventEndAngle(event);
 const midAngle = (startAngle + endAngle) / 2;
 const trackIdx = getEventTrackIndex(event);
 const midRadius = innerRadius + 5 + trackIdx * (eventTrackWidth / 3) + (eventTrackWidth / 6) - 2;
 return polarToCartesian(midRadius, midAngle);
}
function getEventLabelTransform(event: PhenologyEvent) {
 const pos = getEventLabelPosition(event);
 const startAngle = getEventStartAngle(event);
 const endAngle = getEventEndAngle(event);
 const midAngle = (startAngle + endAngle) / 2;
 return `rotate(${midAngle}, ${pos.x}, ${pos.y})`;
}
function getStatusBadgePosition(event: PhenologyEvent) {
 const endAngle = getEventEndAngle(event);
 const trackIdx = getEventTrackIndex(event);
 const radius = innerRadius + 5 + trackIdx * (eventTrackWidth / 3) + (eventTrackWidth / 6) - 2;
 return polarToCartesian(radius, endAngle - 2);
}
function getEventFillColor(event: PhenologyEvent): string {
  const typeInfo = EVENT_TYPES.find(t => t.key === event.type);
  const baseColor = typeInfo?.color || '#94a3b8';
  return baseColor;
}

function getEventFilter(event: PhenologyEvent): string {
  const status: VerificationStatus = event.verificationStatus || 'unverified';
  if (status === 'conflict') return 'url(#conflictGlow)';
  if (status === 'verified') return 'url(#verifiedGlow)';
  return 'url(#shadow)';
}
function getEventStrokeColor(event: PhenologyEvent): string {
 const status: VerificationStatus = event.verificationStatus || 'unverified';
 if (selectedEventId.value === event.id) return '#1e293b';
 if (status === 'conflict') return '#ef4444';
 if (status === 'unverified') return '#f59e0b';
 return 'transparent';
}
function getEventStrokeWidth(event: PhenologyEvent): number {
 const status: VerificationStatus = event.verificationStatus || 'unverified';
 if (selectedEventId.value === event.id) return 2;
 if (status === 'conflict') return 3;
 if (status === 'unverified') return 2;
 return 0;
}
function getStatusBadgeColor(event: PhenologyEvent): string {
 const info = getVerificationStatusInfo(event.verificationStatus || 'unverified');
 return info.color;
}
function getStatusBadgeText(event: PhenologyEvent): string {
 const status: VerificationStatus = event.verificationStatus || 'unverified';
 if (status === 'verified') return '✓';
 if (status === 'conflict') return '!';
 return '?';
}
function getEventOpacity(event: PhenologyEvent): number {
 if (selectedEventId.value === event.id)
 return 1;
 return 0.9;
}
function truncateText(text: string, maxLen: number): string {
 if (text.length <= maxLen)
 return text;
 return text.slice(0, maxLen) + '…';
}
function getDraggingPreviewPath() {
 if (!draggingEvent.value)
 return '';
 const offsetAngle = dragCurrentAngle.value - dragStartAngle.value;
 const origStart = getEventStartAngle(draggingEvent.value);
 const origEnd = getEventEndAngle(draggingEvent.value);
 const trackIdx = getEventTrackIndex(draggingEvent.value);
 const inner = innerRadius + 5 + trackIdx * (eventTrackWidth / 3);
 const outer = inner + (eventTrackWidth / 3) - 4;
 return describeArc(origStart + offsetAngle, origEnd + offsetAngle, inner, outer);
}
function getMouseAngle(event: MouseEvent): number {
 const svg = containerRef.value?.querySelector('svg');
 if (!svg)
 return 0;
 const rect = svg.getBoundingClientRect();
 const x = event.clientX - rect.left - (rect.width / 2);
 const y = event.clientY - rect.top - (rect.height / 2);
 let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
 if (angle < 0)
 angle += 360;
 return angle;
}
function handleEventMouseDown(event: MouseEvent, eventId: string) {
 event.preventDefault();
 event.stopPropagation();
 isDragging.value = true;
 draggingEventId.value = eventId;
 dragStartAngle.value = getMouseAngle(event);
 dragCurrentAngle.value = dragStartAngle.value;
}
function handleMouseMove(event: MouseEvent) {
 if (!isDragging.value)
 return;
 dragCurrentAngle.value = getMouseAngle(event);
}
function handleMouseUp() {
 if (!isDragging.value || !draggingEventId.value || !draggingEvent.value) {
 resetDragState();
 return;
 }
 const offsetAngle = dragCurrentAngle.value - dragStartAngle.value;
 const origStart = getEventStartAngle(draggingEvent.value);
 const newStartAngle = ((origStart + offsetAngle) % 360 + 360) % 360;
 const year = store.state.currentYear;
 const newDayOfYear = angleToDayOfYear(newStartAngle, year);
 const newDate = getDateFromDayOfYear(newDayOfYear, year);
 const newDateStr = formatDate(newDate);
 store.moveEvent(draggingEventId.value, newDateStr);
 resetDragState();
}
function resetDragState() {
 isDragging.value = false;
 draggingEventId.value = null;
 dragStartAngle.value = 0;
 dragCurrentAngle.value = 0;
}
function handleEventClick(eventId: string) {
 if (!isDragging.value) {
 store.selectEvent(eventId);
 }
}
function handleSolarTermClick(solarTerm: SolarTermKey) {
 console.log('Selected solar term:', solarTerm);
}
</script>

<style scoped>
.disc-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px;
}

.solar-term-sector {
  transition: opacity 0.2s ease;
}

.solar-term-sector:hover {
  opacity: 1 !important;
}

.event-arc {
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.event-arc:hover {
  opacity: 1 !important;
  filter: url(#shadow) brightness(1.05);
}

.solar-term-label {
  user-select: none;
}

.event-label {
  user-select: none;
  white-space: nowrap;
}
</style>
