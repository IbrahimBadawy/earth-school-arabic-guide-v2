<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const users = ref([])
const loading = ref(false)
const showDialog = ref(false)
const editMode = ref(false)
const showResetDialog = ref(false)
const selectedUser = ref(null)
const newPassword = ref('')

const formData = ref({
  email: '',
  password: '',
  full_name: '',
  role: 'teacher',
  permissions: { levels: [], all_levels: false, all_weeks: true }
})

const roleOptions = [
  { label: 'معلمة', value: 'teacher' },
  { label: 'مدير محتوى', value: 'subject_admin' },
  { label: 'مدير النظام', value: 'admin' }
]

const levelOptions = [
  { label: 'المستوى الأول', value: 1 },
  { label: 'المستوى الثاني', value: 2 },
  { label: 'المستوى الثالث', value: 3 }
]

onMounted(() => fetchUsers())

async function fetchUsers() {
  loading.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (!error) users.value = data || []
  loading.value = false
}

function openAddDialog() {
  editMode.value = false
  formData.value = {
    email: '',
    password: '',
    full_name: '',
    role: 'teacher',
    permissions: { levels: [], all_levels: false, all_weeks: true }
  }
  showDialog.value = true
}

function openEditDialog(user) {
  editMode.value = true
  selectedUser.value = user
  formData.value = {
    email: user.email || '',
    full_name: user.full_name || '',
    role: user.role || 'teacher',
    permissions: user.permissions || { levels: [], all_levels: false, all_weeks: true }
  }
  showDialog.value = true
}

async function saveUser() {
  if (editMode.value) {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.value.full_name,
        role: formData.value.role,
        permissions: formData.value.permissions
      })
      .eq('id', selectedUser.value.id)
    if (!error) {
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم تحديث المستخدم', life: 3000 })
      await fetchUsers()
      showDialog.value = false
    } else {
      toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
    }
  } else {
    // Create user via Supabase Admin API
    const { data, error } = await supabase.auth.signUp({
      email: formData.value.email,
      password: formData.value.password
    })
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: formData.value.email,
        full_name: formData.value.full_name,
        role: formData.value.role,
        permissions: formData.value.permissions
      })
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة المستخدم بنجاح', life: 3000 })
      await fetchUsers()
      showDialog.value = false
    } else {
      toast.add({ severity: 'error', summary: 'خطأ', detail: error?.message || 'حدث خطأ', life: 5000 })
    }
  }
}

function openResetPassword(user) {
  selectedUser.value = user
  newPassword.value = ''
  showResetDialog.value = true
}

async function resetPassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'تنبيه', detail: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', life: 3000 })
    return
  }
  // Note: Resetting password for other users requires admin API or service role
  const { error } = await supabase.auth.admin.updateUserById(selectedUser.value.id, {
    password: newPassword.value
  })
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم تغيير كلمة المرور', life: 3000 })
    showResetDialog.value = false
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

function confirmDelete(user) {
  confirm.require({
    message: `هل أنت متأكد من حذف ${user.full_name || user.email}؟`,
    header: 'تأكيد الحذف',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id)
      if (!error) {
        toast.add({ severity: 'success', summary: 'تم', detail: 'تم حذف المستخدم', life: 3000 })
        await fetchUsers()
      }
    }
  })
}
</script>

<template>
  <div class="users-view">
    <div class="page-header animate__animated animate__fadeIn">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1><i class="pi pi-users" style="color: #E64980"></i> إدارة المستخدمين</h1>
          <p>إضافة وتعديل وحذف المعلمات والمديرين</p>
        </div>
        <Button label="إضافة مستخدم" icon="pi pi-plus" @click="openAddDialog" />
      </div>
    </div>

    <div class="custom-card no-hover">
      <DataTable :value="users" :loading="loading" stripedRows responsiveLayout="scroll"
                 emptyMessage="لا يوجد مستخدمين">
        <Column field="full_name" header="الاسم" sortable>
          <template #body="{ data }">
            <div class="user-name-cell">
              <div class="user-avatar-sm" :class="data.role">
                {{ (data.full_name || data.email || '?').charAt(0) }}
              </div>
              <strong>{{ data.full_name || 'بدون اسم' }}</strong>
            </div>
          </template>
        </Column>
        <Column field="email" header="البريد الإلكتروني" sortable />
        <Column field="role" header="الدور" sortable>
          <template #body="{ data }">
            <Tag :value="data.role === 'admin' ? 'مدير النظام' : data.role === 'subject_admin' ? 'مدير محتوى' : 'معلمة'"
                 :severity="data.role === 'admin' ? 'warn' : data.role === 'subject_admin' ? 'info' : 'secondary'" />
          </template>
        </Column>
        <Column field="permissions" header="الصلاحيات">
          <template #body="{ data }">
            <template v-if="data.role === 'admin'">
              <Tag value="كل الصلاحيات" severity="warn" />
            </template>
            <template v-else-if="data.permissions?.all_levels">
              <Tag value="كل المستويات" severity="success" />
            </template>
            <template v-else-if="data.permissions?.levels?.length">
              <span v-for="l in data.permissions.levels" :key="l" class="level-perm-badge">
                مستوى {{ l }}
              </span>
            </template>
            <template v-else>
              <span class="no-perms">بدون صلاحيات</span>
            </template>
          </template>
        </Column>
        <Column header="الإجراءات" style="width: 200px">
          <template #body="{ data }">
            <div class="actions-cell">
              <Button icon="pi pi-pencil" text rounded severity="info" v-tooltip.top="'تعديل'" @click="openEditDialog(data)" />
              <Button icon="pi pi-key" text rounded severity="warn" v-tooltip.top="'تغيير كلمة المرور'" @click="openResetPassword(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" v-tooltip.top="'حذف'" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog v-model:visible="showDialog" :header="editMode ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>الاسم الكامل</label>
          <InputText v-model="formData.full_name" placeholder="أدخل الاسم" class="w-full" />
        </div>
        <div class="form-field" v-if="!editMode">
          <label>البريد الإلكتروني</label>
          <InputText v-model="formData.email" type="email" placeholder="example@email.com" class="w-full" dir="ltr" />
        </div>
        <div class="form-field" v-if="!editMode">
          <label>كلمة المرور</label>
          <Password v-model="formData.password" placeholder="كلمة المرور" :feedback="false" toggleMask class="w-full" inputClass="w-full" dir="ltr" />
        </div>
        <div class="form-field">
          <label>الدور</label>
          <Dropdown v-model="formData.role" :options="roleOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="form-field" v-if="formData.role === 'teacher'">
          <label>صلاحيات المستويات</label>
          <MultiSelect v-model="formData.permissions.levels" :options="levelOptions" optionLabel="label" optionValue="value" placeholder="اختر المستويات" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showDialog = false" />
        <Button :label="editMode ? 'حفظ التعديلات' : 'إضافة'" icon="pi pi-check" @click="saveUser" />
      </template>
    </Dialog>

    <!-- Reset Password Dialog -->
    <Dialog v-model:visible="showResetDialog" header="تغيير كلمة المرور" :style="{ width: '400px' }" modal>
      <div class="dialog-form">
        <p>تغيير كلمة المرور لـ <strong>{{ selectedUser?.full_name || selectedUser?.email }}</strong></p>
        <div class="form-field">
          <label>كلمة المرور الجديدة</label>
          <Password v-model="newPassword" placeholder="كلمة المرور الجديدة" :feedback="true" toggleMask class="w-full" inputClass="w-full" dir="ltr" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showResetDialog = false" />
        <Button label="تغيير" icon="pi pi-key" @click="resetPassword" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.9rem;
  font-weight: 600;
}

.w-full {
  width: 100%;
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
}

.user-avatar-sm.admin {
  background: #E64980;
}

.user-avatar-sm.teacher {
  background: var(--primary-color);
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.level-perm-badge {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary-dark);
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-left: 4px;
}

.no-perms {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
