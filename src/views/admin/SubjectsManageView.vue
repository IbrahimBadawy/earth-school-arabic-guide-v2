<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useContentStore } from '@/stores/content'
import IconPicker from '@/components/common/IconPicker.vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()
const contentStore = useContentStore()

const subjects = ref([])
const levels = computed(() => contentStore.levelsData || [])
const loading = ref(false)
const showSubjectDialog = ref(false)
const editMode = ref(false)
const subjectForm = ref({ name: '', description: '', color: '#4CAF93', icon: 'pi pi-book', sort_order: 0 })

// Teacher assignments
const allTeachers = ref([])
const assignmentsMap = ref({}) // { subjectId: [{ teacher_id, level_id, ... }] }
const showAssignDialog = ref(false)
const assignForm = ref({ subject_id: null, teacher_id: null, level_id: null })

// Clone
const showCloneDialog = ref(false)
const cloneSourceId = ref(null)
const cloneTargetId = ref(null)

onMounted(async () => {
  await contentStore.fetchLevels()
  await fetchSubjects()
  await fetchTeachers()
  await fetchAllAssignments()
})

async function fetchSubjects() {
  loading.value = true
  const { data } = await supabase.from('subjects').select('*').order('sort_order')
  subjects.value = data || []
  loading.value = false
}

async function fetchTeachers() {
  const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('role', 'teacher')
  allTeachers.value = data || []
}

async function fetchAllAssignments() {
  const { data } = await supabase.from('teacher_assignments').select('*, profiles(full_name, email)')
  const map = {}
  ;(data || []).forEach(a => {
    if (!map[a.subject_id]) map[a.subject_id] = []
    map[a.subject_id].push(a)
  })
  assignmentsMap.value = map
}

// Subject CRUD
function openAddSubject() {
  editMode.value = false
  subjectForm.value = { name: '', description: '', color: '#4CAF93', icon: 'pi pi-book', sort_order: subjects.value.length + 1 }
  showSubjectDialog.value = true
}

function openEditSubject(subject) {
  editMode.value = true
  subjectForm.value = { ...subject }
  showSubjectDialog.value = true
}

async function saveSubject() {
  const payload = { ...subjectForm.value }
  if (editMode.value && payload.id) {
    const { error } = await supabase.from('subjects').update(payload).eq('id', payload.id)
    if (error) { toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 4000 }); return }
  } else {
    delete payload.id
    const { error } = await supabase.from('subjects').insert(payload)
    if (error) { toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 4000 }); return }
  }
  toast.add({ severity: 'success', summary: 'تم الحفظ', life: 3000 })
  showSubjectDialog.value = false
  await fetchSubjects()
  await contentStore.fetchSubjects()
}

function confirmDeleteSubject(subject) {
  confirm.require({
    message: `حذف "${subject.name}" سيحذف جميع البيانات المرتبطة بهذا المحتوى. هذا إجراء لا يمكن التراجع عنه!`,
    header: 'تأكيد حذف المحتوى',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف نهائي',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await supabase.from('teacher_assignments').delete().eq('subject_id', subject.id)
      await supabase.from('subjects').delete().eq('id', subject.id)
      toast.add({ severity: 'success', summary: 'تم الحذف', life: 3000 })
      await fetchSubjects()
      await fetchAllAssignments()
      await contentStore.fetchSubjects()
    }
  })
}

// Teacher Assignments
function openAssignDialog(subjectId) {
  assignForm.value = { subject_id: subjectId, teacher_id: null, level_id: null }
  showAssignDialog.value = true
}

const teacherOptions = computed(() => allTeachers.value.map(t => ({ label: t.full_name || t.email, value: t.id })))
const levelOptions = computed(() => levels.value.map(l => ({ label: l.name, value: l.id })))

async function saveAssignment() {
  if (!assignForm.value.teacher_id || !assignForm.value.level_id) {
    toast.add({ severity: 'warn', summary: 'تنبيه', detail: 'يرجى اختيار المعلمة والمستوى', life: 3000 })
    return
  }
  const { error } = await supabase.from('teacher_assignments').insert({
    subject_id: assignForm.value.subject_id,
    teacher_id: assignForm.value.teacher_id,
    level_id: assignForm.value.level_id
  })
  if (error) {
    if (error.code === '23505') {
      toast.add({ severity: 'warn', summary: 'تنبيه', detail: 'هذا التعيين موجود مسبقاً', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 4000 })
    }
    return
  }
  toast.add({ severity: 'success', summary: 'تم التعيين', life: 3000 })
  showAssignDialog.value = false
  await fetchAllAssignments()
}

async function removeAssignment(assignmentId) {
  await supabase.from('teacher_assignments').delete().eq('id', assignmentId)
  toast.add({ severity: 'success', summary: 'تم الإزالة', life: 3000 })
  await fetchAllAssignments()
}

// Clone subject structure
function openCloneDialog() {
  cloneSourceId.value = null
  cloneTargetId.value = null
  showCloneDialog.value = true
}

const subjectOptions = computed(() => subjects.value.map(s => ({ label: s.name, value: s.id })))

async function cloneSubjectStructure() {
  if (!cloneSourceId.value || !cloneTargetId.value || cloneSourceId.value === cloneTargetId.value) {
    toast.add({ severity: 'warn', summary: 'تنبيه', detail: 'يرجى اختيار محتوى مصدر ومحتوى هدف مختلفين', life: 3000 })
    return
  }
  loading.value = true

  const tablesToClone = ['level_axes', 'session_patterns', 'assessment_items']
  for (const table of tablesToClone) {
    const { data: rows } = await supabase.from(table).select('*').eq('subject_id', cloneSourceId.value)
    if (rows?.length) {
      for (const row of rows) {
        const { id, created_at, updated_at, ...rest } = row
        const newRecord = { ...rest, subject_id: cloneTargetId.value }
        await supabase.from(table).insert(newRecord)
      }
    }
  }

  // Clone level_axes children (axis_objectives)
  const { data: sourceAxes } = await supabase.from('level_axes').select('id').eq('subject_id', cloneSourceId.value)
  const { data: targetAxes } = await supabase.from('level_axes').select('id').eq('subject_id', cloneTargetId.value).order('created_at', { ascending: false }).limit(sourceAxes?.length || 0)

  if (sourceAxes?.length && targetAxes?.length) {
    for (let i = 0; i < Math.min(sourceAxes.length, targetAxes.length); i++) {
      const { data: objs } = await supabase.from('axis_objectives').select('*').eq('axis_id', sourceAxes[i].id)
      if (objs?.length) {
        const clonedObjs = objs.map(o => {
          const { id, created_at, updated_at, ...rest } = o
          return { ...rest, axis_id: targetAxes[i].id }
        })
        await supabase.from('axis_objectives').insert(clonedObjs)
      }
    }
  }

  loading.value = false
  toast.add({ severity: 'success', summary: 'تم النسخ', detail: 'تم نسخ الهيكل بنجاح', life: 3000 })
  showCloneDialog.value = false
}

function getLevelName(levelId) {
  const lvl = levels.value.find(l => l.id === levelId)
  return lvl?.name || `مستوى ${levelId}`
}
</script>

<template>
  <div class="subjects-manage">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1><i class="pi pi-th-large" style="color: #845EF7"></i> إدارة المحتويات</h1>
          <p>إضافة وتعديل وإدارة المحتويات (المواد) وتعيين المعلمات</p>
        </div>
        <div class="header-btns">
          <Button label="نسخ هيكل محتوى" icon="pi pi-copy" severity="secondary" size="small" @click="openCloneDialog" />
          <Button label="إضافة محتوى" icon="pi pi-plus" size="small" @click="openAddSubject" />
        </div>
      </div>
    </div>

    <!-- Subjects Cards -->
    <div class="subjects-grid">
      <div v-for="subject in subjects" :key="subject.id" class="subject-card custom-card no-hover" :style="{ '--sc': subject.color }">
        <div class="subject-card-header">
          <div class="subject-icon-wrap" :style="{ background: subject.color + '20' }">
            <i :class="subject.icon" :style="{ color: subject.color, fontSize: '1.5rem' }"></i>
          </div>
          <div class="subject-actions">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEditSubject(subject)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDeleteSubject(subject)" />
          </div>
        </div>
        <h3>{{ subject.name }}</h3>
        <p class="subject-desc">{{ subject.description || 'لا يوجد وصف' }}</p>
        <div class="subject-color-bar" :style="{ background: subject.color }"></div>

        <!-- Assignments for this subject -->
        <div class="assignments-section">
          <div class="assignments-header">
            <strong><i class="pi pi-users"></i> تعيينات المعلمات</strong>
            <Button icon="pi pi-plus" text rounded size="small" @click="openAssignDialog(subject.id)" />
          </div>
          <div v-if="assignmentsMap[subject.id]?.length" class="assignments-list">
            <div v-for="assignment in assignmentsMap[subject.id]" :key="assignment.id" class="assignment-row">
              <div class="assignment-info">
                <Tag :value="assignment.profiles?.full_name || 'معلمة'" severity="info" />
                <Tag :value="getLevelName(assignment.level_id)" :style="{ background: subject.color + '20', color: subject.color }" />
              </div>
              <Button icon="pi pi-times" text rounded size="small" severity="danger" @click="removeAssignment(assignment.id)" />
            </div>
          </div>
          <div v-else class="empty-assignments">
            <span>لا توجد تعيينات</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!subjects.length && !loading" class="empty-state" style="padding: 60px">
      <i class="pi pi-th-large" style="font-size: 3rem; color: var(--text-muted)"></i>
      <h3>لا توجد محتويات</h3>
      <p>أضف محتوى جديد للبدء</p>
      <Button label="إضافة محتوى" icon="pi pi-plus" @click="openAddSubject" />
    </div>

    <!-- Subject Dialog -->
    <Dialog v-model:visible="showSubjectDialog" :header="editMode ? 'تعديل محتوى' : 'إضافة محتوى جديد'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>اسم المحتوى</label>
          <InputText v-model="subjectForm.name" class="w-full" placeholder="مثال: اللغة العربية" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="subjectForm.description" rows="3" class="w-full" placeholder="وصف مختصر للمحتوى..." />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>اللون</label>
            <InputText v-model="subjectForm.color" type="color" class="w-full" style="height:40px" />
          </div>
          <div class="form-field">
            <label>الأيقونة</label>
            <IconPicker v-model="subjectForm.icon" />
          </div>
        </div>
        <div class="form-field">
          <label>الترتيب</label>
          <InputText v-model.number="subjectForm.sort_order" type="number" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showSubjectDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveSubject" />
      </template>
    </Dialog>

    <!-- Assignment Dialog -->
    <Dialog v-model:visible="showAssignDialog" header="تعيين معلمة" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>المعلمة</label>
          <Dropdown v-model="assignForm.teacher_id" :options="teacherOptions" optionLabel="label" optionValue="value" placeholder="اختر المعلمة" class="w-full" />
        </div>
        <div class="form-field">
          <label>المستوى</label>
          <Dropdown v-model="assignForm.level_id" :options="levelOptions" optionLabel="label" optionValue="value" placeholder="اختر المستوى" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showAssignDialog = false" />
        <Button label="تعيين" icon="pi pi-check" @click="saveAssignment" />
      </template>
    </Dialog>

    <!-- Clone Dialog -->
    <Dialog v-model:visible="showCloneDialog" header="نسخ هيكل محتوى" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <p style="margin-bottom: 12px; color: var(--text-secondary); font-size: 0.9rem;">
          نسخ المحاور وأنماط الحصص وأدوات التقييم من محتوى إلى آخر
        </p>
        <div class="form-field">
          <label>المحتوى المصدر</label>
          <Dropdown v-model="cloneSourceId" :options="subjectOptions" optionLabel="label" optionValue="value" placeholder="نسخ من..." class="w-full" />
        </div>
        <div class="form-field">
          <label>المحتوى الهدف</label>
          <Dropdown v-model="cloneTargetId" :options="subjectOptions" optionLabel="label" optionValue="value" placeholder="نسخ إلى..." class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showCloneDialog = false" />
        <Button label="نسخ الهيكل" icon="pi pi-copy" :loading="loading" @click="cloneSubjectStructure" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.header-btns { display: flex; gap: 8px; }
.subjects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
.subject-card { position: relative; overflow: hidden; padding: 20px; }
.subject-card::before { content: ''; position: absolute; top: 0; right: 0; width: 4px; height: 100%; background: var(--sc); border-radius: 0 8px 8px 0; }
.subject-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.subject-icon-wrap { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.subject-actions { display: flex; gap: 2px; }
.subject-card h3 { font-size: 1.15rem; margin-bottom: 4px; }
.subject-desc { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
.subject-color-bar { height: 3px; border-radius: 2px; margin-bottom: 16px; }
.assignments-section { border-top: 1px solid var(--border-color); padding-top: 12px; }
.assignments-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.assignments-header strong { font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
.assignments-list { display: flex; flex-direction: column; gap: 6px; }
.assignment-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--bg-color); border-radius: 8px; }
.assignment-info { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.empty-assignments { text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.85rem; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
.empty-state { text-align: center; color: var(--text-muted); }
.empty-state h3 { margin-top: 12px; }

@media (max-width: 768px) {
  .header-row { flex-direction: column; gap: 12px; }
  .subjects-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
