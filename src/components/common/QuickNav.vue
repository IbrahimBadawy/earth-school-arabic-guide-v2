<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useContentStore } from '@/stores/content'

const router = useRouter()
const route = useRoute()
const contentStore = useContentStore()

const weeks = ref([])
const days = ref([])
const selectedLevel = ref(null)
const selectedWeekId = ref(null)

const levels = [
  { id: 1, name: 'المستوى الأول', short: 'م1', color: '#4CAF93' },
  { id: 2, name: 'المستوى الثاني', short: 'م2', color: '#FF9F43' },
  { id: 3, name: 'المستوى الثالث', short: 'م3', color: '#6C63FF' }
]

onMounted(async () => {
  if (route.params.levelId) {
    selectedLevel.value = Number(route.params.levelId)
    weeks.value = await contentStore.fetchWeeks(selectedLevel.value) || []
  }
  if (route.params.weekId) {
    selectedWeekId.value = route.params.weekId
    days.value = await contentStore.fetchDays(selectedWeekId.value) || []
  }
})

async function selectLevel(id) {
  selectedLevel.value = id
  selectedWeekId.value = null
  days.value = []
  weeks.value = await contentStore.fetchWeeks(id) || []
  router.push(`/level/${id}`)
}

async function selectWeek(week) {
  selectedWeekId.value = week.id
  days.value = await contentStore.fetchDays(week.id) || []
  router.push(`/level/${selectedLevel.value}/week/${week.id}`)
}

function selectDay(day) {
  router.push(`/level/${selectedLevel.value}/week/${selectedWeekId.value}/day/${day.id}`)
}
</script>

<template>
  <div class="qnav">
    <!-- Levels -->
    <div class="qnav-row">
      <span class="qnav-label">المستوى:</span>
      <div class="qnav-btns">
        <button v-for="l in levels" :key="l.id" class="qnav-btn"
                :class="{ active: selectedLevel === l.id }"
                :style="{ '--bc': l.color }" @click="selectLevel(l.id)">
          {{ l.short }}
        </button>
      </div>
    </div>

    <!-- Weeks -->
    <div v-if="weeks.length" class="qnav-row">
      <span class="qnav-label">الأسبوع:</span>
      <div class="qnav-btns weeks-btns">
        <button v-for="w in weeks" :key="w.id" class="qnav-btn week-btn"
                :class="{ active: selectedWeekId === w.id }"
                :style="{ '--bc': levels.find(l=>l.id===selectedLevel)?.color || '#4CAF93' }"
                @click="selectWeek(w)">
          {{ w.week_number }}
          <span v-if="w.letter" class="week-letter">{{ w.letter }}</span>
        </button>
      </div>
    </div>

    <!-- Days -->
    <div v-if="days.length" class="qnav-row">
      <span class="qnav-label">اليوم:</span>
      <div class="qnav-btns">
        <button v-for="d in days" :key="d.id" class="qnav-btn day-btn"
                :class="{ active: route.params.dayId === d.id, completed: d.is_completed }"
                :style="{ '--bc': levels.find(l=>l.id===selectedLevel)?.color || '#4CAF93' }"
                @click="selectDay(d)">
          {{ d.title || 'يوم ' + d.day_number }}
          <i v-if="d.is_completed" class="pi pi-check" style="font-size:0.6rem"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qnav { background: white; border: 1px solid var(--border-color); border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px; }
.qnav-row { display: flex; align-items: center; gap: 10px; }
.qnav-label { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); white-space: nowrap; min-width: 55px; }
.qnav-btns { display: flex; flex-wrap: wrap; gap: 6px; }
.qnav-btn {
  border: 2px solid var(--border-color); background: white; border-radius: 10px;
  padding: 6px 14px; font-family: var(--font-family); font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;
}
.qnav-btn:hover { border-color: var(--bc); color: var(--bc); transform: translateY(-1px); }
.qnav-btn.active { background: var(--bc); color: white; border-color: var(--bc); }
.week-btn { padding: 4px 10px; font-size: 0.8rem; min-width: 36px; justify-content: center; flex-direction: column; gap: 0; }
.week-letter { font-size: 0.65rem; opacity: 0.8; }
.day-btn { font-size: 0.82rem; }
.day-btn.completed { opacity: 0.6; }
.weeks-btns { gap: 4px; }
@media (max-width: 768px) {
  .qnav-row { flex-direction: column; align-items: flex-start; }
  .qnav-btns { width: 100%; }
}
</style>
