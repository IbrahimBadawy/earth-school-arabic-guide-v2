<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'

const route = useRoute()
const router = useRouter()
const contentStore = useContentStore()

const levelId = computed(() => Number(route.params.levelId))
const level = computed(() => contentStore.getLevelData(levelId.value))
const activities = computed(() => contentStore.getActivities(levelId.value))
const weeks = ref([])

onMounted(async () => {
  const data = await contentStore.fetchWeeks(levelId.value)
  weeks.value = data || generateWeeks()
})

function generateWeeks() {
  const w = []
  for (let i = 1; i <= 12; i++) {
    w.push({
      id: i,
      week_number: i,
      level_id: levelId.value,
      letter: level.value?.letters?.[i - 1] || '',
      title: `الأسبوع ${i}`,
      is_completed: false
    })
  }
  return w
}

function navigateToWeek(weekId) {
  router.push(`/level/${levelId.value}/week/${weekId}`)
}

const sessionPattern = computed(() => {
  if (levelId.value === 3) {
    return level.value?.session_patterns || {}
  }
  return level.value?.session_pattern || []
})
</script>

<template>
  <div class="level-view" v-if="level">
    <!-- Level Header -->
    <div class="level-header animate__animated animate__fadeIn" :style="{ '--lc': level.color }">
      <div class="level-header-content">
        <div class="level-icon-big" :style="{ background: level.color + '20' }">
          <i :class="level.icon" :style="{ color: level.color, fontSize: '2rem' }"></i>
        </div>
        <div>
          <h1>{{ level.name }}</h1>
          <p>{{ level.age_range }} - {{ level.students_count }} طفل</p>
          <p class="level-desc-text">{{ level.description }}</p>
        </div>
      </div>
    </div>

    <!-- Letters (Level 1) -->
    <div v-if="levelId === 1" class="letters-section custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-bookmark" :style="{ color: level.color }"></i> الحروف المقررة (حرف كل أسبوع)</h2>
      <div class="letters-grid">
        <div
          v-for="(letter, idx) in level.letters"
          :key="idx"
          class="letter-item stagger-item"
          :style="{ animationDelay: `${idx * 0.05}s`, '--lc': level.color }"
        >
          <span class="letter-char">{{ letter }}</span>
          <span class="letter-week">أسبوع {{ idx + 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Axes / Objectives -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.1s">
      <h2><i class="pi pi-flag" :style="{ color: level.color }"></i> المحاور الأساسية</h2>
      <Accordion>
        <AccordionPanel v-for="axis in level.axes" :key="axis.id" :value="String(axis.id)">
          <AccordionHeader>
            <span class="axis-header">
              <Tag :style="{ background: level.color + '20', color: level.color }" :value="axis.name" />
              <span style="margin-right: 8px">{{ axis.description }}</span>
            </span>
          </AccordionHeader>
          <AccordionContent>
            <ul v-if="axis.sub_items" class="sub-items-list">
              <li v-for="(item, i) in axis.sub_items" :key="i">
                <i class="pi pi-check-circle" :style="{ color: level.color }"></i>
                {{ item }}
              </li>
            </ul>
            <p v-else class="axis-full-desc">{{ axis.description }}</p>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>

    <!-- Session Pattern -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.2s; margin-top: 20px;">
      <h2><i class="pi pi-clock" :style="{ color: level.color }"></i> نمط الحصة</h2>

      <!-- Level 1 & 2 -->
      <div v-if="levelId !== 3" class="session-timeline">
        <div
          v-for="(step, idx) in sessionPattern"
          :key="idx"
          class="session-step stagger-item"
          :style="{ animationDelay: `${idx * 0.1}s`, '--step-color': level.color }"
        >
          <div class="step-number">{{ step.order }}</div>
          <div class="step-content">
            <div class="step-header">
              <i :class="step.icon" :style="{ color: level.color }"></i>
              <strong>{{ step.name }}</strong>
            </div>
            <Tag severity="info" :value="`${step.duration} دقيقة`" />
          </div>
        </div>
      </div>

      <!-- Level 3 patterns -->
      <div v-else class="patterns-grid">
        <div v-for="(pattern, key) in sessionPattern" :key="key" class="pattern-card">
          <h3 :style="{ color: level.color }">{{ pattern.name }}</h3>
          <div class="session-timeline">
            <div
              v-for="(step, idx) in pattern.steps"
              :key="idx"
              class="session-step"
              :style="{ '--step-color': level.color }"
            >
              <div class="step-number">{{ step.order }}</div>
              <div class="step-content">
                <div class="step-header">
                  <i :class="step.icon" :style="{ color: level.color }"></i>
                  <strong>{{ step.name }}</strong>
                </div>
                <Tag severity="info" :value="`${step.duration} دقيقة`" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activities -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.3s; margin-top: 20px;">
      <h2><i class="pi pi-palette" :style="{ color: level.color }"></i> الأنشطة</h2>
      <div v-for="(catActivities, category) in activities" :key="category" class="activity-category">
        <h3 class="category-title">
          <span class="category-badge" :style="{ background: level.color + '20', color: level.color }">
            {{ category === 'phonetic' ? 'الوعي الصوتي' :
               category === 'visual' ? 'الوعي البصري' :
               category === 'writing' ? 'الكتابة' :
               category === 'reading' ? 'القراءة' : category }}
          </span>
        </h3>
        <div class="activities-grid">
          <div
            v-for="(activity, idx) in catActivities"
            :key="idx"
            class="activity-card stagger-item"
            :style="{ animationDelay: `${idx * 0.08}s` }"
          >
            <div class="activity-header">
              <h4>{{ activity.name }}</h4>
              <Tag :value="activity.type" :style="{ background: level.color + '15', color: level.color }" />
            </div>
            <p>{{ activity.description }}</p>
            <div class="activity-meta">
              <span class="meta-item"><i class="pi pi-clock"></i> {{ activity.duration }} دقيقة</span>
              <div class="tools-list">
                <span v-for="tool in activity.tools" :key="tool" class="tool-tag">
                  <i class="pi pi-wrench"></i> {{ tool }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Weeks Grid -->
    <h2 class="section-title" style="margin-top: 32px;">
      <i class="pi pi-calendar" :style="{ color: level.color }"></i> الأسابيع التعليمية
    </h2>
    <div class="weeks-grid">
      <div
        v-for="(week, idx) in weeks"
        :key="week.id || idx"
        class="week-card custom-card stagger-item"
        :style="{ animationDelay: `${idx * 0.06}s`, '--wc': level.color }"
        @click="navigateToWeek(week.id || week.week_number)"
      >
        <div class="week-number-badge" :style="{ background: level.color }">
          {{ week.week_number }}
        </div>
        <div class="week-info">
          <h4>{{ week.title || `الأسبوع ${week.week_number}` }}</h4>
          <p v-if="week.letter">حرف: <strong class="week-letter">{{ week.letter }}</strong></p>
        </div>
        <div class="week-status">
          <span v-if="week.is_completed" class="status-badge completed">
            <i class="pi pi-check"></i> مكتمل
          </span>
          <i v-else class="pi pi-chevron-left" :style="{ color: level.color }"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.level-header {
  background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 70%, black));
  border-radius: 20px;
  padding: 32px;
  color: white;
  margin-bottom: 28px;
}

.level-header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.level-icon-big {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2) !important;
  flex-shrink: 0;
}

.level-icon-big i {
  color: white !important;
}

.level-header h1 {
  color: white;
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.level-header p {
  opacity: 0.9;
}

.level-desc-text {
  font-size: 0.9rem;
  margin-top: 4px;
}

.letters-section {
  margin-bottom: 20px;
}

.letters-section h2 {
  font-size: 1.2rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.letters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.letter-item {
  width: 80px;
  height: 90px;
  border-radius: 14px;
  border: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.3s ease;
  cursor: default;
}

.letter-item:hover {
  border-color: var(--lc);
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.letter-char {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
}

.letter-week {
  font-size: 0.7rem;
  color: var(--text-muted);
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.axis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-items-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sub-items-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.7;
}

.session-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-step {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 12px;
  transition: transform 0.2s;
}

.session-step:hover {
  transform: translateX(-4px);
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--step-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patterns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.pattern-card {
  padding: 20px;
  background: var(--bg-color);
  border-radius: 14px;
}

.pattern-card h3 {
  margin-bottom: 16px;
  font-size: 1.1rem;
}

.activity-category {
  margin-bottom: 24px;
}

.category-title {
  margin-bottom: 12px;
}

.category-badge {
  padding: 4px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.activity-card {
  padding: 16px;
  background: var(--bg-color);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.activity-header h4 {
  font-size: 0.95rem;
}

.activity-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.7;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-tag {
  font-size: 0.75rem;
  background: white;
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.weeks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.week-card {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 16px;
}

.week-number-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.week-info {
  flex: 1;
}

.week-info h4 {
  font-size: 0.95rem;
  margin-bottom: 2px;
}

.week-info p {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.week-letter {
  font-size: 1.1rem;
  color: var(--wc);
}

.week-status {
  flex-shrink: 0;
}

.section-title {
  font-size: 1.3rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .level-header-content {
    flex-direction: column;
    text-align: center;
  }
  .activities-grid,
  .patterns-grid {
    grid-template-columns: 1fr;
  }
  .weeks-grid {
    grid-template-columns: 1fr;
  }
  .step-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
