<script setup>
import { ref, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

const contentStore = useContentStore()
const levels = contentStore.levelsData
const listeningGoals = ref([])
const progression = ref([])
const levelAxesMap = ref({})

onMounted(async () => {
  const [lg, prog] = await Promise.all([
    contentStore.fetchListeningGoals(),
    contentStore.fetchProgressionItems()
  ])
  listeningGoals.value = lg || []
  progression.value = prog || []

  for (const level of levels) {
    levelAxesMap.value[level.id] = await contentStore.fetchLevelAxes(level.id)
  }
})
</script>

<template>
  <div class="objectives-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-flag" style="color: var(--primary-color)"></i> الأهداف العامة والتفصيلية</h1>
      <p>منهج تعليم اللغة العربية الفصحى للأطفال - منهج تصاعدي من ثلاث مستويات</p>
    </div>

    <!-- Listening & Speaking Goals -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-volume-up" style="color: #339AF0"></i> أهداف الاستماع والتحدث (مشتركة بين المستويات الثلاث)</h2>
      <p class="section-desc">المستويات مرتبة تصاعدياً من التعرّض السلبي إلى الإنتاج الفعّال</p>
      <div class="goals-timeline">
        <div v-for="(goal, idx) in listeningGoals" :key="goal.id || idx" class="goal-item stagger-item" :style="{ animationDelay: `${idx * 0.08}s` }">
          <div class="goal-stage-badge">{{ goal.stage }}</div>
          <p>{{ goal.goal }}</p>
        </div>
      </div>
    </div>

    <!-- Reading & Writing Goals per Level from DB -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-book" style="color: #51CF66"></i> أهداف القراءة والكتابة (حسب المستوى)</h2>
      <TabView>
        <TabPanel v-for="level in levels" :key="level.id" :header="level.name">
          <div class="level-objectives" :style="{ '--lc': level.color }">
            <div v-for="axis in (levelAxesMap[level.id] || [])" :key="axis.id" class="objective-section">
              <h3><Tag :style="{ background: level.color + '20', color: level.color }" :value="axis.name" /></h3>
              <p v-if="axis.description" class="axis-desc">{{ axis.description }}</p>
              <ul class="obj-list">
                <li v-for="obj in (axis.axis_objectives || [])" :key="obj.id">{{ obj.objective_text }}</li>
              </ul>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>

    <!-- Progression Table -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-chart-line" style="color: #845EF7"></i> ملخص التدرّج بين المستويات</h2>
      <DataTable :value="progression" stripedRows responsiveLayout="scroll">
        <Column field="dimension" header="البُعد" style="width: 15%; font-weight: 700" />
        <Column header="المستوى الأول">
          <template #body="{ data }"><span style="color: var(--level1-color)">{{ data.level1_text }}</span></template>
        </Column>
        <Column header="المستوى الثاني">
          <template #body="{ data }"><span style="color: var(--level2-color)">{{ data.level2_text }}</span></template>
        </Column>
        <Column header="المستوى الثالث">
          <template #body="{ data }"><span style="color: var(--level3-color)">{{ data.level3_text }}</span></template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
h2 { font-size: 1.2rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.section-desc { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px; }
.goals-timeline { display: flex; flex-direction: column; gap: 12px; }
.goal-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px; background: var(--bg-color); border-radius: 12px; border-right: 4px solid var(--primary-color); }
.goal-stage-badge { background: var(--primary-light); color: var(--primary-dark); padding: 4px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.goal-item p { font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.7; }
.level-objectives { padding: 12px 0; }
.objective-section { margin-bottom: 20px; }
.objective-section h3 { margin-bottom: 8px; }
.axis-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; }
.obj-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.obj-list li { padding: 8px 16px; background: var(--bg-color); border-radius: 8px; font-size: 0.9rem; color: var(--text-secondary); position: relative; padding-right: 28px; }
.obj-list li::before { content: '✓'; position: absolute; right: 8px; color: var(--lc); font-weight: bold; }
</style>
