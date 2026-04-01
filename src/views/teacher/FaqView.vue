<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import { useToast } from 'primevue/usetoast'

const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()

const faqs = ref([])
const tips = ref([])
const showFaqDialog = ref(false)
const showTipDialog = ref(false)
const editMode = ref(false)
const faqForm = ref({ category: '', question: '', answer: '', sort_order: 0 })
const tipForm = ref({ category: '', title: '', content: '', sort_order: 0 })

const faqCategories = ['إدارة الصف', 'الحروف والقراءة', 'الكتابة', 'التقييم', 'المنهج الإسلامي', 'عام']
const tipCategories = ['بداية الحصة', 'قراءة القصة', 'الأنشطة', 'التشجيع', 'نهاية الحصة']

// Direct execution
onMounted(async () => {
  faqs.value = await contentStore.fetchFaqItems() || []
  tips.value = await contentStore.fetchImplementationTips() || []
})()

const faqsByCategory = computed(() => {
  const grouped = {}
  faqs.value.forEach(f => {
    if (!grouped[f.category]) grouped[f.category] = []
    grouped[f.category].push(f)
  })
  return grouped
})

const tipsByCategory = computed(() => {
  const grouped = {}
  tips.value.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  })
  return grouped
})

const categoryIcons = {
  'إدارة الصف': 'pi pi-users',
  'الحروف والقراءة': 'pi pi-book',
  'الكتابة': 'pi pi-pencil',
  'التقييم': 'pi pi-check-circle',
  'المنهج الإسلامي': 'pi pi-star',
  'عام': 'pi pi-info-circle',
  'بداية الحصة': 'pi pi-play',
  'قراءة القصة': 'pi pi-book',
  'الأنشطة': 'pi pi-palette',
  'التشجيع': 'pi pi-heart',
  'نهاية الحصة': 'pi pi-flag'
}

function openAddFaq() {
  editMode.value = false
  faqForm.value = { category: faqCategories[0], question: '', answer: '', sort_order: faqs.value.length + 1 }
  showFaqDialog.value = true
}

function openEditFaq(faq) {
  editMode.value = true
  faqForm.value = { ...faq }
  showFaqDialog.value = true
}

async function saveFaq() {
  const { data, error } = await contentStore.upsertRecord('faq_items', faqForm.value)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ السؤال', life: 3000 })
    faqs.value = await contentStore.fetchFaqItems() || []
    showFaqDialog.value = false
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

async function deleteFaq(id) {
  await contentStore.deleteRecord('faq_items', id)
  faqs.value = await contentStore.fetchFaqItems() || []
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم الحذف', life: 3000 })
}

function openAddTip() {
  editMode.value = false
  tipForm.value = { category: tipCategories[0], title: '', content: '', sort_order: tips.value.length + 1 }
  showTipDialog.value = true
}

function openEditTip(tip) {
  editMode.value = true
  tipForm.value = { ...tip }
  showTipDialog.value = true
}

async function saveTip() {
  const { data, error } = await contentStore.upsertRecord('implementation_tips', tipForm.value)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ النصيحة', life: 3000 })
    tips.value = await contentStore.fetchImplementationTips() || []
    showTipDialog.value = false
  }
}

async function deleteTip(id) {
  await contentStore.deleteRecord('implementation_tips', id)
  tips.value = await contentStore.fetchImplementationTips() || []
}
</script>

<template>
  <div class="faq-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-question-circle" style="color: #20C997"></i> الأسئلة الشائعة ونصائح التنفيذ</h1>
      <p>إجابات على الأسئلة الشائعة ونصائح عملية للمعلمات</p>
    </div>

    <!-- Implementation Tips -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <div class="section-header">
        <h2><i class="pi pi-lightbulb" style="color: #FFD43B"></i> نصائح التنفيذ</h2>
        <Button v-if="authStore.isAdmin" label="إضافة نصيحة" icon="pi pi-plus" size="small" @click="openAddTip" />
      </div>

      <div v-for="(catTips, category) in tipsByCategory" :key="category" class="tip-category">
        <h3 class="category-header">
          <i :class="categoryIcons[category] || 'pi pi-info-circle'" style="color: #20C997"></i>
          {{ category }}
        </h3>
        <div class="tips-grid">
          <div v-for="tip in catTips" :key="tip.id" class="tip-card stagger-item">
            <div class="tip-card-header">
              <h4>{{ tip.title }}</h4>
              <div v-if="authStore.isAdmin" class="tip-actions">
                <Button icon="pi pi-pencil" text rounded size="small" @click="openEditTip(tip)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteTip(tip.id)" />
              </div>
            </div>
            <p>{{ tip.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 24px;">
      <div class="section-header">
        <h2><i class="pi pi-question-circle" style="color: #339AF0"></i> الأسئلة الشائعة</h2>
        <Button v-if="authStore.isAdmin" label="إضافة سؤال" icon="pi pi-plus" size="small" @click="openAddFaq" />
      </div>

      <div v-for="(catFaqs, category) in faqsByCategory" :key="category" class="faq-category">
        <h3 class="category-header">
          <i :class="categoryIcons[category] || 'pi pi-info-circle'" style="color: #339AF0"></i>
          {{ category }}
          <Tag :value="`${catFaqs.length} سؤال`" severity="secondary" />
        </h3>
        <Accordion>
          <AccordionPanel v-for="faq in catFaqs" :key="faq.id" :value="faq.id">
            <AccordionHeader>
              <div class="faq-q-header">
                <span>{{ faq.question }}</span>
                <div v-if="authStore.isAdmin" class="faq-actions" @click.stop>
                  <Button icon="pi pi-pencil" text rounded size="small" @click.stop="openEditFaq(faq)" />
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click.stop="deleteFaq(faq.id)" />
                </div>
              </div>
            </AccordionHeader>
            <AccordionContent>
              <p class="faq-answer">{{ faq.answer }}</p>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>
    </div>

    <!-- FAQ Dialog -->
    <Dialog v-model:visible="showFaqDialog" :header="editMode ? 'تعديل سؤال' : 'إضافة سؤال جديد'" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>التصنيف</label>
          <Dropdown v-model="faqForm.category" :options="faqCategories" placeholder="اختر التصنيف" class="w-full" />
        </div>
        <div class="form-field">
          <label>السؤال</label>
          <InputText v-model="faqForm.question" placeholder="اكتب السؤال" class="w-full" />
        </div>
        <div class="form-field">
          <label>الإجابة</label>
          <Textarea v-model="faqForm.answer" placeholder="اكتب الإجابة التفصيلية" rows="5" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showFaqDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveFaq" />
      </template>
    </Dialog>

    <!-- Tip Dialog -->
    <Dialog v-model:visible="showTipDialog" :header="editMode ? 'تعديل نصيحة' : 'إضافة نصيحة جديدة'" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>التصنيف</label>
          <Dropdown v-model="tipForm.category" :options="tipCategories" placeholder="اختر التصنيف" class="w-full" />
        </div>
        <div class="form-field">
          <label>العنوان</label>
          <InputText v-model="tipForm.title" placeholder="عنوان النصيحة" class="w-full" />
        </div>
        <div class="form-field">
          <label>المحتوى</label>
          <Textarea v-model="tipForm.content" placeholder="محتوى النصيحة" rows="4" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showTipDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveTip" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.tip-category, .faq-category {
  margin-bottom: 24px;
}

.category-header {
  font-size: 1.05rem;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.tip-card {
  padding: 16px;
  background: var(--bg-color);
  border-radius: 12px;
  border-right: 4px solid #20C997;
  transition: transform 0.2s;
}

.tip-card:hover {
  transform: translateY(-2px);
}

.tip-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.tip-card h4 {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.tip-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
}

.tip-actions, .faq-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.faq-q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 10px;
}

.faq-answer {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.9;
  padding: 8px 0;
  white-space: pre-line;
}

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

.w-full { width: 100%; }

@media (max-width: 768px) {
  .tips-grid {
    grid-template-columns: 1fr;
  }
}
</style>
