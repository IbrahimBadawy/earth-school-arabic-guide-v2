<script setup>
import { ref, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'

const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()
const levels = contentStore.levelsData
const listeningGoals = ref([])
const progression = ref([])
const levelAxesMap = ref({})
const showGoalDialog = ref(false)
const showObjDialog = ref(false)
const editMode = ref(false)
const goalForm = ref({})
const objForm = ref({})

onMounted(async () => { await loadAll() })

async function loadAll() {
  const [lg, prog] = await Promise.all([
    contentStore.fetchListeningGoals(),
    contentStore.fetchProgressionItems()
  ])
  listeningGoals.value = lg || []
  progression.value = prog || []
  for (const level of levels) {
    levelAxesMap.value[level.id] = await contentStore.fetchLevelAxes(level.id)
  }
}

function openAddGoal() {
  editMode.value = false
  goalForm.value = { stage: '', goal: '', sort_order: listeningGoals.value.length + 1 }
  showGoalDialog.value = true
}
function openEditGoal(g) { editMode.value = true; goalForm.value = { ...g }; showGoalDialog.value = true }
async function saveGoal() {
  const { error } = await contentStore.upsertRecord('listening_goals', goalForm.value)
  if (!error) { showGoalDialog.value = false; await loadAll(); toast.add({ severity: 'success', summary: 'تم', life: 3000 }) }
}
async function deleteGoal(id) { await contentStore.deleteRecord('listening_goals', id); await loadAll() }

function openAddObj(axisId) {
  editMode.value = false
  objForm.value = { axis_id: axisId, objective_text: '', sort_order: 0 }
  showObjDialog.value = true
}
function openEditObj(o) { editMode.value = true; objForm.value = { ...o }; showObjDialog.value = true }
async function saveObj() {
  const { error } = await contentStore.upsertRecord('axis_objectives', objForm.value)
  if (!error) { showObjDialog.value = false; await loadAll(); toast.add({ severity: 'success', summary: 'تم', life: 3000 }) }
}
async function deleteObj(id) { await contentStore.deleteRecord('axis_objectives', id); await loadAll() }
</script>

<template>
  <div class="objectives-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-flag" style="color: var(--primary-color)"></i> الأهداف العامة والتفصيلية</h1>
      <p>منهج تعليم اللغة العربية الفصحى للأطفال - منهج تصاعدي من ثلاث مستويات</p>
    </div>

    <!-- Listening & Speaking Goals -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <div class="section-header-row">
        <h2><i class="pi pi-volume-up" style="color: #339AF0"></i> أهداف الاستماع والتحدث (مشتركة)</h2>
        <Button v-if="authStore.isAdmin" label="إضافة هدف" icon="pi pi-plus" size="small" @click="openAddGoal" />
      </div>
      <p class="section-desc">المستويات مرتبة تصاعدياً من التعرّض السلبي إلى الإنتاج الفعّال</p>
      <div class="goals-timeline">
        <div v-for="(goal, idx) in listeningGoals" :key="goal.id || idx" class="goal-item stagger-item" :style="{ animationDelay: `${idx * 0.08}s` }">
          <div class="goal-stage-badge">{{ goal.stage }}</div>
          <p style="flex:1">{{ goal.goal }}</p>
          <div v-if="authStore.isAdmin" class="goal-actions">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEditGoal(goal)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteGoal(goal.id)" />
          </div>
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
                <li v-for="obj in (axis.axis_objectives || [])" :key="obj.id">
                  <span>{{ obj.objective_text }}</span>
                  <div v-if="authStore.isAdmin" class="obj-actions">
                    <Button icon="pi pi-pencil" text rounded size="small" @click="openEditObj(obj)" />
                    <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteObj(obj.id)" />
                  </div>
                </li>
              </ul>
              <Button v-if="authStore.isAdmin" label="إضافة هدف" icon="pi pi-plus" text size="small" @click="openAddObj(axis.id)" />
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

    <!-- Goal Dialog -->
    <Dialog v-model:visible="showGoalDialog" :header="editMode ? 'تعديل هدف' : 'إضافة هدف'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>المرحلة</label><InputText v-model="goalForm.stage" class="w-full" placeholder="مثال: التقبّل" /></div>
        <div class="form-field"><label>الهدف</label><Textarea v-model="goalForm.goal" rows="3" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showGoalDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveGoal" />
      </template>
    </Dialog>

    <!-- Objective Dialog -->
    <Dialog v-model:visible="showObjDialog" :header="editMode ? 'تعديل هدف تفصيلي' : 'إضافة هدف تفصيلي'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>نص الهدف</label><Textarea v-model="objForm.objective_text" rows="3" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showObjDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveObj" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
h2 { font-size: 1.2rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header-row h2 { margin-bottom: 0; }
.goal-actions, .obj-actions { display: flex; gap: 2px; flex-shrink: 0; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
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
.obj-list li { padding: 8px 16px; background: var(--bg-color); border-radius: 8px; font-size: 0.9rem; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
.obj-list li span { flex: 1; }
.obj-list li span::before { content: '✓ '; color: var(--lc); font-weight: bold; }
</style>
