<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Breadcrumb from 'primevue/breadcrumb'

const route = useRoute()
const router = useRouter()
const contentStore = useContentStore()

const levelId = computed(() => Number(route.params.levelId))
const weekId = computed(() => Number(route.params.weekId))
const level = computed(() => contentStore.getLevelData(levelId.value))
const days = ref([])

const breadcrumbItems = computed(() => [
  { label: 'الرئيسية', command: () => router.push('/') },
  { label: level.value?.name, command: () => router.push(`/level/${levelId.value}`) },
  { label: `الأسبوع ${weekId.value}` }
])

const breadcrumbHome = { icon: 'pi pi-home', command: () => router.push('/') }

onMounted(async () => {
  const data = await contentStore.fetchDays(weekId.value)
  days.value = data || generateDays()
})

function generateDays() {
  return [
    { id: `${weekId.value}-1`, day_number: 1, title: 'اليوم الأول', is_completed: false },
    { id: `${weekId.value}-2`, day_number: 2, title: 'اليوم الثاني', is_completed: false }
  ]
}

function navigateToDay(dayId) {
  router.push(`/level/${levelId.value}/week/${weekId.value}/day/${dayId}`)
}

const currentLetter = computed(() => {
  if (levelId.value === 1 && level.value?.letters) {
    return level.value.letters[weekId.value - 1] || ''
  }
  return ''
})
</script>

<template>
  <div class="week-view" v-if="level">
    <Breadcrumb :model="breadcrumbItems" :home="breadcrumbHome" class="week-breadcrumb" />

    <div class="week-header animate__animated animate__fadeIn" :style="{ '--lc': level.color }">
      <div class="week-header-content">
        <div class="week-number-big" :style="{ background: level.color }">{{ weekId }}</div>
        <div>
          <h1>الأسبوع {{ weekId }} - {{ level.name }}</h1>
          <p v-if="currentLetter">حرف الأسبوع: <strong class="current-letter">{{ currentLetter }}</strong></p>
          <p>حصتان في الأسبوع - كل حصة 45 دقيقة</p>
        </div>
      </div>
    </div>

    <!-- Session Pattern Reminder -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-clock" :style="{ color: level.color }"></i> تذكير بنمط الحصة</h2>
      <div class="pattern-reminder">
        <div
          v-for="(step, idx) in (level.session_pattern || level.session_patterns?.pattern_a?.steps || [])"
          :key="idx"
          class="pattern-step"
          :style="{ '--sc': level.color }"
        >
          <span class="step-num" :style="{ background: level.color }">{{ step.order }}</span>
          <span class="step-name">{{ step.name }}</span>
          <span class="step-duration">{{ step.duration }} د</span>
        </div>
      </div>
    </div>

    <!-- Days -->
    <h2 class="section-title" style="margin-top: 28px;">
      <i class="pi pi-list" :style="{ color: level.color }"></i> أيام الأسبوع
    </h2>
    <div class="days-grid">
      <div
        v-for="(day, idx) in days"
        :key="day.id"
        class="day-card custom-card stagger-item"
        :style="{ animationDelay: `${idx * 0.1}s`, '--dc': level.color }"
        @click="navigateToDay(day.id)"
      >
        <div class="day-card-top">
          <div class="day-badge" :style="{ background: level.color }">
            <i class="pi pi-calendar"></i>
            {{ day.title || `اليوم ${day.day_number}` }}
          </div>
          <span v-if="day.is_completed" class="status-badge completed">
            <i class="pi pi-check"></i> مكتمل
          </span>
        </div>

        <div class="day-details">
          <div class="day-detail-item">
            <i class="pi pi-clock"></i>
            <span>45 دقيقة</span>
          </div>
          <div class="day-detail-item">
            <i class="pi pi-book"></i>
            <span>قراءة قصة + أنشطة</span>
          </div>
          <div v-if="currentLetter" class="day-detail-item">
            <i class="pi pi-bookmark"></i>
            <span>حرف: {{ currentLetter }}</span>
          </div>
        </div>

        <Button
          label="عرض سيناريو اليوم"
          icon="pi pi-arrow-left"
          iconPos="left"
          text
          :style="{ color: level.color }"
          class="view-day-btn"
        />
      </div>
    </div>

    <!-- Navigation -->
    <div class="week-navigation">
      <Button
        v-if="weekId > 1"
        :label="`الأسبوع ${weekId - 1}`"
        icon="pi pi-arrow-right"
        text
        @click="router.push(`/level/${levelId}/week/${weekId - 1}`)"
      />
      <span></span>
      <Button
        v-if="weekId < 12"
        :label="`الأسبوع ${weekId + 1}`"
        icon="pi pi-arrow-left"
        iconPos="left"
        text
        @click="router.push(`/level/${levelId}/week/${weekId + 1}`)"
      />
    </div>
  </div>
</template>

<style scoped>
.week-breadcrumb {
  margin-bottom: 20px;
  background: transparent;
  border: none;
  padding: 0;
}

.week-header {
  background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 70%, black));
  border-radius: 20px;
  padding: 28px 32px;
  color: white;
  margin-bottom: 24px;
}

.week-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.week-number-big {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
  background: rgba(255,255,255,0.2) !important;
  flex-shrink: 0;
}

.week-header h1 {
  color: white;
  font-size: 1.4rem;
  margin-bottom: 4px;
}

.current-letter {
  font-size: 1.5rem;
}

.pattern-reminder {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pattern-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-color);
  border-radius: 10px;
  font-size: 0.85rem;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.step-duration {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.section-title {
  font-size: 1.3rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.day-card {
  cursor: pointer;
}

.day-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.day-badge {
  color: white;
  padding: 6px 16px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.day-detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.day-detail-item i {
  color: var(--dc);
}

.view-day-btn {
  width: 100%;
  justify-content: center;
  font-weight: 600;
}

.week-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

h2 {
  font-size: 1.1rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .week-header-content {
    flex-direction: column;
    text-align: center;
  }
  .days-grid {
    grid-template-columns: 1fr;
  }
  .pattern-reminder {
    flex-direction: column;
  }
}
</style>
