<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import { useToast } from 'primevue/usetoast'

const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()

const allActivities = ref([])
const allTools = ref([])
const searchQuery = ref('')
const selectedLevel = ref(null)
const selectedCategory = ref(null)
const expandedActivity = ref(null)
const showAddDialog = ref(false)
const editMode = ref(false)
const activityForm = ref({})
const showAddToolDialog = ref(false)
const newToolForm = ref({ name: '', category: '', icon: 'pi pi-box', levels: [], description: '' })

const levelOptions = [
  { label: 'الكل', value: null },
  { label: 'المستوى 1', value: 1 },
  { label: 'المستوى 2', value: 2 },
  { label: 'المستوى 3', value: 3 }
]

const levelColors = { 1: '#4CAF93', 2: '#FF9F43', 3: '#6C63FF' }

onMounted(async () => {
  const { data } = await supabase.from('activities').select('*').order('level_id').order('category').order('sort_order')
  allActivities.value = data || []
  allTools.value = await contentStore.fetchTeachingTools() || []
})

const categories = computed(() => {
  const cats = new Set()
  allActivities.value.forEach(a => cats.add(a.category))
  return Array.from(cats)
})

const filteredActivities = computed(() => {
  let result = allActivities.value
  if (selectedLevel.value) result = result.filter(a => a.level_id === selectedLevel.value)
  if (selectedCategory.value) result = result.filter(a => a.category === selectedCategory.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a => a.name.includes(q) || a.description?.includes(q) || a.activity_type?.includes(q))
  }
  return result
})

function toggleExpand(id) {
  expandedActivity.value = expandedActivity.value === id ? null : id
}

function getToolNames(activity) {
  if (activity.tool_ids?.length) {
    return activity.tool_ids.map(tid => allTools.value.find(t => t.id === tid)?.name).filter(Boolean)
  }
  return activity.tools || []
}

function openAddActivity() {
  editMode.value = false
  activityForm.value = { level_id: 1, category: '', name: '', description: '', activity_type: '', duration: 8, steps: '', tool_ids: [], teacher_tips: '', sort_order: allActivities.value.length + 1, differentiation: { advanced: '', struggling: '' } }
  showAddDialog.value = true
}

function openEditActivity(activity) {
  editMode.value = true
  activityForm.value = {
    ...activity,
    steps: (activity.steps || []).join('\n'),
    tool_ids: activity.tool_ids || [],
    teacher_tips: (activity.teacher_tips || []).join('\n'),
    differentiation: activity.differentiation || { advanced: '', struggling: '' }
  }
  showAddDialog.value = true
}

async function saveActivity() {
  // Build tools text array from tool_ids for backward compat
  const toolNames = activityForm.value.tool_ids.map(tid => allTools.value.find(t => t.id === tid)?.name).filter(Boolean)
  const payload = {
    ...activityForm.value,
    steps: typeof activityForm.value.steps === 'string' ? activityForm.value.steps.split('\n').filter(s => s.trim()) : activityForm.value.steps,
    tools: toolNames,
    teacher_tips: typeof activityForm.value.teacher_tips === 'string' ? activityForm.value.teacher_tips.split('\n').filter(t => t.trim()) : activityForm.value.teacher_tips
  }
  const { error } = await contentStore.upsertRecord('activities', payload)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ النشاط', life: 3000 })
    showAddDialog.value = false
    const { data: refreshed } = await supabase.from('activities').select('*').order('level_id').order('category').order('sort_order')
    allActivities.value = refreshed || []
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

async function addNewTool() {
  if (!newToolForm.value.name.trim()) return
  const { data, error } = await contentStore.upsertRecord('teaching_tools', newToolForm.value)
  if (!error && data) {
    allTools.value.push(data)
    activityForm.value.tool_ids = [...(activityForm.value.tool_ids || []), data.id]
    showAddToolDialog.value = false
    newToolForm.value = { name: '', category: '', icon: 'pi pi-box', levels: [], description: '' }
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة الأداة', life: 3000 })
  }
}

async function deleteActivity(id) {
  const { error } = await contentStore.deleteRecord('activities', id)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حذف النشاط', life: 3000 })
    const { data: refreshed } = await supabase.from('activities').select('*').order('level_id').order('category').order('sort_order')
    allActivities.value = refreshed || []
  }
}
</script>

<template>
  <div class="activities-library">
    <div class="page-header animate__animated animate__fadeIn">
      <div class="header-row">
        <div>
          <h1><i class="pi pi-palette" style="color: var(--secondary-color)"></i> مكتبة الأنشطة</h1>
          <p>جميع الأنشطة التعليمية مع خطوات التنفيذ والأدوات والنصائح</p>
        </div>
        <Button v-if="authStore.isAdmin" label="إضافة نشاط جديد" icon="pi pi-plus" @click="openAddActivity" />
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar custom-card no-hover">
      <div class="filter-group">
        <label>المستوى:</label>
        <SelectButton v-model="selectedLevel" :options="levelOptions" optionLabel="label" optionValue="value" />
      </div>
      <div class="filter-group">
        <label>التصنيف:</label>
        <div class="category-chips">
          <Button :label="'الكل'" :outlined="selectedCategory !== null" size="small" @click="selectedCategory = null" />
          <Button v-for="cat in categories" :key="cat" :label="cat" :outlined="selectedCategory !== cat" size="small" @click="selectedCategory = cat" />
        </div>
      </div>
      <div class="filter-group">
        <label>بحث:</label>
        <InputText v-model="searchQuery" placeholder="ابحث عن نشاط..." class="search-input" />
      </div>
      <div class="results-count">
        <Tag :value="`${filteredActivities.length} نشاط`" severity="info" />
      </div>
    </div>

    <!-- Activities Grid -->
    <div class="activities-list">
      <div v-for="activity in filteredActivities" :key="activity.id"
           class="activity-card custom-card stagger-item"
           :class="{ expanded: expandedActivity === activity.id }"
           :style="{ '--ac': levelColors[activity.level_id] || '#4CAF93' }">

        <!-- Card Header -->
        <div class="act-card-header" @click="toggleExpand(activity.id)">
          <div class="act-title-area">
            <div class="act-level-badge" :style="{ background: levelColors[activity.level_id] }">{{ activity.level_id }}</div>
            <div>
              <h3>{{ activity.name }}</h3>
              <div class="act-tags">
                <Tag :value="activity.category" :style="{ background: (levelColors[activity.level_id] || '#4CAF93') + '20', color: levelColors[activity.level_id] }" />
                <Tag :value="activity.activity_type" severity="secondary" />
                <span class="act-duration"><i class="pi pi-clock"></i> {{ activity.duration }} دقيقة</span>
              </div>
            </div>
          </div>
          <div class="act-actions">
            <Button v-if="authStore.isAdmin" icon="pi pi-pencil" text rounded size="small" @click.stop="openEditActivity(activity)" />
            <Button v-if="authStore.isAdmin" icon="pi pi-trash" text rounded size="small" severity="danger" @click.stop="deleteActivity(activity.id)" />
            <i :class="expandedActivity === activity.id ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="expand-icon"></i>
          </div>
        </div>

        <!-- Card Body (Expandable) -->
        <div v-if="expandedActivity === activity.id" class="act-card-body animate__animated animate__fadeIn">
          <p class="act-description">{{ activity.description }}</p>

          <!-- Steps -->
          <div v-if="activity.steps?.length" class="act-section">
            <h4><i class="pi pi-list-check" :style="{ color: levelColors[activity.level_id] }"></i> خطوات التنفيذ</h4>
            <ol class="steps-list">
              <li v-for="(step, i) in activity.steps" :key="i">{{ step }}</li>
            </ol>
          </div>

          <!-- Tools -->
          <div v-if="getToolNames(activity).length" class="act-section">
            <h4><i class="pi pi-wrench" style="color: #339AF0"></i> الأدوات المطلوبة</h4>
            <div class="tools-chips">
              <span v-for="tool in getToolNames(activity)" :key="tool" class="tool-chip">{{ tool }}</span>
            </div>
          </div>

          <!-- Teacher Tips -->
          <div v-if="activity.teacher_tips?.length" class="act-section tips-section">
            <h4><i class="pi pi-lightbulb" style="color: #FFD43B"></i> نصائح للمعلمة</h4>
            <ul class="tips-list">
              <li v-for="(tip, i) in activity.teacher_tips" :key="i">{{ tip }}</li>
            </ul>
          </div>

          <!-- Differentiation -->
          <div v-if="activity.differentiation && (activity.differentiation.advanced || activity.differentiation.struggling)" class="act-section">
            <h4><i class="pi pi-sliders-h" style="color: #845EF7"></i> التمايز</h4>
            <div class="diff-grid">
              <div v-if="activity.differentiation.advanced" class="diff-card advanced">
                <Tag value="للمتقدمين" severity="success" />
                <p>{{ activity.differentiation.advanced }}</p>
              </div>
              <div v-if="activity.differentiation.struggling" class="diff-card struggling">
                <Tag value="لمن يحتاج دعماً" severity="warn" />
                <p>{{ activity.differentiation.struggling }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Collapsed preview -->
        <p v-else class="act-preview">{{ activity.description }}</p>
      </div>
    </div>

    <div v-if="!filteredActivities.length" class="empty-state">
      <i class="pi pi-search"></i>
      <h3>لا توجد أنشطة مطابقة</h3>
      <p>جرّب تغيير معايير البحث</p>
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog v-model:visible="showAddDialog" :header="editMode ? 'تعديل نشاط' : 'إضافة نشاط جديد'" :style="{ width: '650px' }" modal>
      <div class="dialog-form">
        <div class="form-row">
          <div class="form-field">
            <label>المستوى</label>
            <Dropdown v-model="activityForm.level_id" :options="[{l:'المستوى 1',v:1},{l:'المستوى 2',v:2},{l:'المستوى 3',v:3}]" optionLabel="l" optionValue="v" class="w-full" />
          </div>
          <div class="form-field">
            <label>التصنيف</label>
            <InputText v-model="activityForm.category" placeholder="مثال: الوعي الصوتي" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>اسم النشاط</label>
          <InputText v-model="activityForm.name" class="w-full" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="activityForm.description" rows="2" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>النوع</label>
            <InputText v-model="activityForm.activity_type" placeholder="حركي / بصري / سمعي..." class="w-full" />
          </div>
          <div class="form-field">
            <label>المدة (دقيقة)</label>
            <InputText v-model.number="activityForm.duration" type="number" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>خطوات التنفيذ (كل خطوة في سطر)</label>
          <Textarea v-model="activityForm.steps" rows="5" class="w-full" placeholder="1. الخطوة الأولى&#10;2. الخطوة الثانية&#10;3. الخطوة الثالثة" />
        </div>
        <div class="form-field">
          <label>الأدوات (اختر من القائمة)</label>
          <div class="tools-picker-row">
            <MultiSelect v-model="activityForm.tool_ids" :options="allTools" optionLabel="name" optionValue="id" placeholder="اختر الأدوات" class="w-full" filter filterPlaceholder="ابحث عن أداة..." display="chip" />
            <Button icon="pi pi-plus" v-tooltip.top="'إضافة أداة جديدة'" size="small" @click="showAddToolDialog = true" />
          </div>
        </div>
        <div class="form-field">
          <label>نصائح للمعلمة (كل نصيحة في سطر)</label>
          <Textarea v-model="activityForm.teacher_tips" rows="4" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>تعديلات للمتقدمين</label>
            <InputText v-model="activityForm.differentiation.advanced" class="w-full" />
          </div>
          <div class="form-field">
            <label>تعديلات لمن يحتاج دعماً</label>
            <InputText v-model="activityForm.differentiation.struggling" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showAddDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveActivity" />
      </template>
    </Dialog>

    <!-- Add New Tool Dialog -->
    <Dialog v-model:visible="showAddToolDialog" header="إضافة أداة تعليمية جديدة" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>اسم الأداة</label><InputText v-model="newToolForm.name" class="w-full" placeholder="مثال: بطاقات ملونة" /></div>
        <div class="form-field"><label>التصنيف</label><InputText v-model="newToolForm.category" class="w-full" placeholder="مثال: بطاقات" /></div>
        <div class="form-field"><label>الوصف</label><InputText v-model="newToolForm.description" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showAddToolDialog = false" />
        <Button label="إضافة" icon="pi pi-check" @click="addNewTool" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.tools-picker-row { display: flex; gap: 8px; align-items: flex-start; }
.tools-picker-row .w-full { flex: 1; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.filters-bar { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; margin-bottom: 24px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.category-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.search-input { min-width: 200px; }
.results-count { margin-right: auto; }
.activities-list { display: flex; flex-direction: column; gap: 14px; }
.activity-card { cursor: default; transition: all 0.3s ease; border-right: 4px solid var(--ac); }
.act-card-header { display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; padding: 4px 0; }
.act-title-area { display: flex; align-items: flex-start; gap: 14px; flex: 1; }
.act-level-badge { width: 36px; height: 36px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; }
.act-title-area h3 { font-size: 1rem; margin-bottom: 6px; }
.act-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.act-duration { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.act-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.expand-icon { color: var(--text-muted); font-size: 0.85rem; margin-right: 4px; }
.act-preview { font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 0; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.act-card-body { padding-top: 16px; border-top: 1px solid var(--border-color); margin-top: 12px; }
.act-description { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.8; margin-bottom: 16px; }
.act-section { margin-bottom: 16px; }
.act-section h4 { font-size: 0.95rem; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.steps-list { padding-right: 20px; margin: 0; }
.steps-list li { font-size: 0.88rem; color: var(--text-secondary); line-height: 2; padding: 2px 0; }
.tools-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tool-chip { background: #E3F2FD; color: #1565C0; padding: 4px 12px; border-radius: 8px; font-size: 0.82rem; display: flex; align-items: center; gap: 4px; }
.tips-section { background: #FFFDE7; padding: 14px; border-radius: 10px; }
.tips-list { list-style: none; padding: 0; margin: 0; }
.tips-list li { font-size: 0.85rem; color: var(--text-secondary); padding: 4px 0; line-height: 1.8; }
.tips-list li::before { content: '💡 '; }
.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.diff-card { padding: 12px; border-radius: 10px; }
.diff-card.advanced { background: #E8F5E9; }
.diff-card.struggling { background: #FFF3E0; }
.diff-card p { font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 0; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
@media (max-width: 768px) {
  .header-row { flex-direction: column; gap: 12px; }
  .filters-bar { flex-direction: column; }
  .form-row { grid-template-columns: 1fr; }
  .diff-grid { grid-template-columns: 1fr; }
}
</style>
