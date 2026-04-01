<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import { useToast } from 'primevue/usetoast'

const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()
const levels = computed(() => contentStore.levelsData)
const assessmentData = ref({})
const showDialog = ref(false)
const editMode = ref(false)
const form = ref({})

const categoryOptions = ['الوعي الصوتي', 'الوعي البصري', 'ما قبل الكتابة', 'القراءة', 'الكتابة', 'اللغويات']

// Direct execution
onMounted(async () => { await loadAll() })

async function loadAll() {
  for (const level of levels) {
    const items = await contentStore.fetchAssessmentItems(level.id)
    const grouped = {}
    ;(items || []).forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    })
    assessmentData.value[level.id] = grouped
  }
}

function openAdd(levelId) {
  editMode.value = false
  form.value = { level_id: levelId, category: categoryOptions[0], question: '', sort_order: 0 }
  showDialog.value = true
}

function openEdit(item) {
  editMode.value = true
  form.value = { ...item }
  showDialog.value = true
}

async function save() {
  const { error } = await contentStore.upsertRecord('assessment_items', form.value)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم الحفظ', life: 3000 })
    showDialog.value = false
    await loadAll()
  }
}

async function deleteItem(id) {
  await contentStore.deleteRecord('assessment_items', id)
  await loadAll()
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم الحذف', life: 3000 })
}
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
            <Button v-if="authStore.isAdmin" label="إضافة معيار" icon="pi pi-plus" size="small" style="margin-right: auto" @click="openAdd(level.id)" />
          </div>

          <div v-for="(questions, category) in (assessmentData[level.id] || {})" :key="category" class="assessment-category">
            <h3><Tag :style="{ background: level.color + '20', color: level.color }" :value="category" /></h3>
            <div class="checklist">
              <div v-for="item in questions" :key="item.id" class="checklist-item">
                <div class="check-circle" :style="{ borderColor: level.color }"><i class="pi pi-check" :style="{ color: level.color }"></i></div>
                <span>{{ item.question }}</span>
                <div v-if="authStore.isAdmin" class="item-actions">
                  <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(item)" />
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteItem(item.id)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
    </TabView>

    <Dialog v-model:visible="showDialog" :header="editMode ? 'تعديل معيار' : 'إضافة معيار جديد'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>التصنيف</label><Dropdown v-model="form.category" :options="categoryOptions" placeholder="اختر" class="w-full" /></div>
        <div class="form-field"><label>السؤال / المعيار</label><InputText v-model="form.question" class="w-full" placeholder="هل يميّز صوت الحرف...؟" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="save" />
      </template>
    </Dialog>
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
.checklist-item span { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; flex: 1; }
.item-actions { display: flex; gap: 2px; flex-shrink: 0; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
</style>
