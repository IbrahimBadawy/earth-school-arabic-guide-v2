<script setup>
import { ref, onMounted, computed } from 'vue'
import { useContentStore } from '@/stores/content'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

const contentStore = useContentStore()
const levels = contentStore.levelsData
const assessmentData = ref({})

onMounted(async () => {
  for (const level of levels) {
    const items = await contentStore.fetchAssessmentItems(level.id)
    // Group by category
    const grouped = {}
    ;(items || []).forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    })
    assessmentData.value[level.id] = grouped
  }
})
</script>

<template>
  <div class="assessment-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-check-circle" style="color: #51CF66"></i> أدوات التقييم وتحديد المستوى</h1>
      <p>معايير تقييم الأطفال في كل مستوى - يمكن استخدامها كقائمة تحقق</p>
    </div>

    <TabView>
      <TabPanel v-for="level in levels" :key="level.id" :header="level.name">
        <div class="assessment-content" :style="{ '--lc': level.color }">
          <div class="assessment-header" :style="{ background: level.color + '10', borderColor: level.color }">
            <i :class="level.icon" :style="{ color: level.color, fontSize: '1.3rem' }"></i>
            <div>
              <h2 :style="{ color: level.color }">{{ level.name }}</h2>
              <p>{{ level.age_range }} - {{ level.students_count }} طفل</p>
            </div>
          </div>

          <div v-for="(questions, category) in (assessmentData[level.id] || {})" :key="category" class="assessment-category">
            <h3>
              <Tag :style="{ background: level.color + '20', color: level.color }" :value="category" />
            </h3>
            <div class="checklist">
              <div v-for="(item, idx) in questions" :key="item.id" class="checklist-item stagger-item" :style="{ animationDelay: `${idx * 0.05}s` }">
                <div class="check-circle" :style="{ borderColor: level.color }">
                  <i class="pi pi-check" :style="{ color: level.color }"></i>
                </div>
                <span>{{ item.question }}</span>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>

<style scoped>
.assessment-header { display: flex; align-items: center; gap: 14px; padding: 20px; border-radius: 14px; border: 1px solid; margin-bottom: 24px; }
.assessment-header h2 { font-size: 1.2rem; margin: 0; }
.assessment-header p { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
.assessment-category { margin-bottom: 24px; }
.assessment-category h3 { margin-bottom: 14px; }
.checklist { display: flex; flex-direction: column; gap: 10px; }
.checklist-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-color); border-radius: 10px; transition: transform 0.2s; }
.checklist-item:hover { transform: translateX(-4px); }
.check-circle { width: 28px; height: 28px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.5; }
.checklist-item span { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; }
</style>
