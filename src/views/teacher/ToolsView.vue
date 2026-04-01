<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import MultiSelect from 'primevue/multiselect'
import IconPicker from '@/components/common/IconPicker.vue'
import { useToast } from 'primevue/usetoast'

const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()

const tools = ref([])
const selectedLevel = ref(null)
const showDialog = ref(false)
const editMode = ref(false)
const form = ref({})

const levelOptions = [
  { label: 'الكل', value: null },
  { label: 'المستوى 1', value: 1 },
  { label: 'المستوى 2', value: 2 },
  { label: 'المستوى 3', value: 3 }
]
const levelMultiOptions = [
  { label: 'المستوى 1', value: 1 },
  { label: 'المستوى 2', value: 2 },
  { label: 'المستوى 3', value: 3 }
]

onMounted(async () => { tools.value = await contentStore.fetchTeachingTools() || [] })

const filteredTools = computed(() => {
  if (!selectedLevel.value) return tools.value
  return tools.value.filter(t => t.levels?.includes(selectedLevel.value))
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

function openAdd() {
  editMode.value = false
  form.value = { name: '', category: '', icon: 'pi pi-box', levels: [], description: '' }
  showDialog.value = true
}

function openEdit(tool) {
  editMode.value = true
  form.value = { ...tool }
  showDialog.value = true
}

async function save() {
  const { error } = await contentStore.upsertRecord('teaching_tools', form.value)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم الحفظ', life: 3000 })
    showDialog.value = false
    tools.value = await contentStore.fetchTeachingTools() || []
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

async function deleteTool(id) {
  await contentStore.deleteRecord('teaching_tools', id)
  tools.value = await contentStore.fetchTeachingTools() || []
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم الحذف', life: 3000 })
}
</script>

<template>
  <div class="tools-view">
    <div class="page-header animate__animated animate__fadeIn">
      <div class="header-row">
        <div>
          <h1><i class="pi pi-wrench" style="color: #FF6B6B"></i> الأدوات والوسائل التعليمية</h1>
          <p>جميع الأدوات والوسائل المستخدمة في فقرة اللغة العربية</p>
        </div>
        <Button v-if="authStore.isAdmin" label="إضافة أداة" icon="pi pi-plus" @click="openAdd" />
      </div>
    </div>

    <div class="filter-bar">
      <SelectButton v-model="selectedLevel" :options="levelOptions" optionLabel="label" optionValue="value" />
    </div>

    <div class="categories-list">
      <div v-for="(catTools, category) in categories" :key="category" class="category-section custom-card no-hover">
        <h2>
          <i :class="catTools[0]?.icon || 'pi pi-box'" style="color: var(--primary-color)"></i>
          {{ category }}
          <Tag :value="`${catTools.length} أداة`" severity="secondary" />
        </h2>
        <div class="tools-grid">
          <div v-for="tool in catTools" :key="tool.id" class="tool-item">
            <div class="tool-icon-wrap"><i :class="tool.icon || 'pi pi-box'" style="color: var(--text-secondary)"></i></div>
            <div class="tool-info">
              <div class="tool-name-row">
                <h4>{{ tool.name }}</h4>
                <div v-if="authStore.isAdmin" class="tool-actions">
                  <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(tool)" />
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteTool(tool.id)" />
                </div>
              </div>
              <p v-if="tool.description" class="tool-desc">{{ tool.description }}</p>
              <div class="tool-levels">
                <span v-for="lvl in (tool.levels || [])" :key="lvl" class="level-dot" :style="{ background: levelColors[lvl] }" v-tooltip.top="`المستوى ${lvl}`">{{ lvl }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showDialog" :header="editMode ? 'تعديل أداة' : 'إضافة أداة جديدة'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>اسم الأداة</label><InputText v-model="form.name" class="w-full" /></div>
        <div class="form-field"><label>التصنيف</label><InputText v-model="form.category" class="w-full" placeholder="بطاقات / أدوات كتابة / ..." /></div>
        <div class="form-field"><label>الوصف</label><Textarea v-model="form.description" rows="2" class="w-full" /></div>
        <div class="form-field"><label>الأيقونة</label><IconPicker v-model="form.icon" /></div>
        <div class="form-field"><label>المستويات</label><MultiSelect v-model="form.levels" :options="levelMultiOptions" optionLabel="label" optionValue="value" placeholder="اختر المستويات" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.filter-bar { margin-bottom: 24px; }
.categories-list { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.tool-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-color); border-radius: 10px; transition: transform 0.2s; }
.tool-item:hover { transform: translateY(-2px); }
.tool-icon-wrap { width: 40px; height: 40px; border-radius: 10px; background: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tool-info { flex: 1; }
.tool-name-row { display: flex; justify-content: space-between; align-items: flex-start; }
.tool-name-row h4 { font-size: 0.9rem; margin-bottom: 4px; }
.tool-actions { display: flex; gap: 2px; flex-shrink: 0; }
.tool-desc { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.5; }
.tool-levels { display: flex; gap: 4px; }
.level-dot { width: 20px; height: 20px; border-radius: 50%; color: white; font-size: 0.65rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
</style>
