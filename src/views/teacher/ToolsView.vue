<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'

const contentStore = useContentStore()
const tools = ref([])
const selectedLevel = ref(null)

const levelOptions = [
  { label: 'الكل', value: null },
  { label: 'المستوى 1', value: 1 },
  { label: 'المستوى 2', value: 2 },
  { label: 'المستوى 3', value: 3 }
]

onMounted(async () => {
  tools.value = await contentStore.fetchTeachingTools() || []
})

const filteredTools = computed(() => {
  if (!selectedLevel.value) return tools.value
  return tools.value.filter(t => t.levels && t.levels.includes(selectedLevel.value))
})

const categories = computed(() => {
  const cats = {}
  filteredTools.value.forEach(tool => {
    if (!cats[tool.category]) cats[tool.category] = []
    cats[tool.category].push(tool)
  })
  return cats
})

const levelColors = { 1: 'var(--level1-color)', 2: 'var(--level2-color)', 3: 'var(--level3-color)' }
</script>

<template>
  <div class="tools-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-wrench" style="color: #FF6B6B"></i> الأدوات والوسائل التعليمية</h1>
      <p>جميع الأدوات والوسائل المستخدمة في فقرة اللغة العربية لكل مستوى</p>
    </div>

    <div class="filter-bar">
      <SelectButton v-model="selectedLevel" :options="levelOptions" optionLabel="label" optionValue="value" />
    </div>

    <div class="categories-list">
      <div v-for="(catTools, category) in categories" :key="category" class="category-section custom-card no-hover stagger-item animate__animated animate__fadeInUp">
        <h2>
          <i :class="catTools[0]?.icon || 'pi pi-box'" style="color: var(--primary-color)"></i>
          {{ category }}
          <Tag :value="`${catTools.length} أداة`" severity="secondary" />
        </h2>
        <div class="tools-grid">
          <div v-for="tool in catTools" :key="tool.id" class="tool-item">
            <div class="tool-icon-wrap">
              <i :class="tool.icon || 'pi pi-box'" style="color: var(--text-secondary)"></i>
            </div>
            <div class="tool-info">
              <h4>{{ tool.name }}</h4>
              <p v-if="tool.description" class="tool-desc">{{ tool.description }}</p>
              <div class="tool-levels">
                <span v-for="lvl in (tool.levels || [])" :key="lvl" class="level-dot" :style="{ background: levelColors[lvl] }" v-tooltip.top="`المستوى ${lvl}`">
                  {{ lvl }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar { margin-bottom: 24px; }
.categories-list { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.tool-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-color); border-radius: 10px; transition: transform 0.2s; }
.tool-item:hover { transform: translateY(-2px); }
.tool-icon-wrap { width: 40px; height: 40px; border-radius: 10px; background: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tool-info h4 { font-size: 0.9rem; margin-bottom: 4px; }
.tool-desc { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.5; }
.tool-levels { display: flex; gap: 4px; }
.level-dot { width: 20px; height: 20px; border-radius: 50%; color: white; font-size: 0.65rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
</style>
