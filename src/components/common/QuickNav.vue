<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useContentStore } from '@/stores/content'
import Dropdown from 'primevue/dropdown'

const router = useRouter()
const route = useRoute()
const contentStore = useContentStore()

const allWeeks = ref([])
const selectedLevel = ref(null)
const selectedWeek = ref(null)
const selectedDay = ref(null)
const daysForWeek = ref([])

const levelOptions = [
  { label: 'المستوى الأول (3-4)', value: 1, color: '#4CAF93' },
  { label: 'المستوى الثاني (4-5)', value: 2, color: '#FF9F43' },
  { label: 'المستوى الثالث (5-6)', value: 3, color: '#6C63FF' }
]

onMounted(async () => {
  // Set current selections from route
  if (route.params.levelId) selectedLevel.value = Number(route.params.levelId)
  if (route.params.weekId) selectedWeek.value = route.params.weekId
  if (route.params.dayId) selectedDay.value = route.params.dayId

  // Load weeks for current level
  if (selectedLevel.value) {
    await loadWeeks(selectedLevel.value)
  }
  if (selectedWeek.value) {
    await loadDays(selectedWeek.value)
  }
})

async function loadWeeks(levelId) {
  const data = await contentStore.fetchWeeks(levelId)
  allWeeks.value = (data || []).map(w => ({ label: `${w.title}${w.letter ? ' ('+w.letter+')' : ''}`, value: w.id }))
}

async function loadDays(weekId) {
  const data = await contentStore.fetchDays(weekId)
  daysForWeek.value = (data || []).map(d => ({ label: d.title || `اليوم ${d.day_number}`, value: d.id }))
}

async function onLevelChange() {
  selectedWeek.value = null
  selectedDay.value = null
  allWeeks.value = []
  daysForWeek.value = []
  if (selectedLevel.value) {
    await loadWeeks(selectedLevel.value)
    router.push(`/level/${selectedLevel.value}`)
  }
}

async function onWeekChange() {
  selectedDay.value = null
  daysForWeek.value = []
  if (selectedWeek.value) {
    await loadDays(selectedWeek.value)
    router.push(`/level/${selectedLevel.value}/week/${selectedWeek.value}`)
  }
}

function onDayChange() {
  if (selectedDay.value && selectedWeek.value && selectedLevel.value) {
    router.push(`/level/${selectedLevel.value}/week/${selectedWeek.value}/day/${selectedDay.value}`)
  }
}
</script>

<template>
  <div class="quick-nav">
    <div class="quick-nav-inner">
      <span class="nav-label"><i class="pi pi-compass"></i> تنقل سريع:</span>
      <Dropdown
        v-model="selectedLevel"
        :options="levelOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="المستوى"
        class="nav-dropdown"
        @change="onLevelChange"
      />
      <Dropdown
        v-if="allWeeks.length"
        v-model="selectedWeek"
        :options="allWeeks"
        optionLabel="label"
        optionValue="value"
        placeholder="الأسبوع"
        class="nav-dropdown"
        @change="onWeekChange"
      />
      <Dropdown
        v-if="daysForWeek.length"
        v-model="selectedDay"
        :options="daysForWeek"
        optionLabel="label"
        optionValue="value"
        placeholder="اليوم"
        class="nav-dropdown"
        @change="onDayChange"
      />
    </div>
  </div>
</template>

<style scoped>
.quick-nav {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.quick-nav-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.nav-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.nav-dropdown {
  min-width: 160px;
}
@media (max-width: 768px) {
  .quick-nav-inner {
    flex-direction: column;
    align-items: stretch;
  }
  .nav-dropdown {
    width: 100%;
  }
}
</style>
