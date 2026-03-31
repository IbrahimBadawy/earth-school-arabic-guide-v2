<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Breadcrumb from 'primevue/breadcrumb'
import Textarea from 'primevue/textarea'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()

const levelId = computed(() => Number(route.params.levelId))
const weekId = computed(() => Number(route.params.weekId))
const dayId = computed(() => route.params.dayId)
const level = computed(() => contentStore.getLevelData(levelId.value))
const activities = computed(() => contentStore.getActivities(levelId.value))

const comments = ref([])
const newComment = ref('')
const showCompleteDialog = ref(false)
const completionNotes = ref('')
const dayCompleted = ref(false)

const breadcrumbItems = computed(() => [
  { label: 'الرئيسية', command: () => router.push('/') },
  { label: level.value?.name, command: () => router.push(`/level/${levelId.value}`) },
  { label: `الأسبوع ${weekId.value}`, command: () => router.push(`/level/${levelId.value}/week/${weekId.value}`) },
  { label: `اليوم` }
])

const breadcrumbHome = { icon: 'pi pi-home', command: () => router.push('/') }

const currentLetter = computed(() => {
  if (levelId.value === 1 && level.value?.letters) {
    return level.value.letters[weekId.value - 1] || ''
  }
  return ''
})

const sessionSteps = computed(() => {
  if (levelId.value === 3) {
    return level.value?.session_patterns?.pattern_a?.steps || []
  }
  return level.value?.session_pattern || []
})

onMounted(async () => {
  await contentStore.fetchComments(dayId.value)
  comments.value = contentStore.comments
})

async function submitComment() {
  if (!newComment.value.trim()) return
  const { error } = await contentStore.addComment(dayId.value, newComment.value)
  if (!error) {
    comments.value = contentStore.comments
    newComment.value = ''
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة التعليق بنجاح', life: 3000 })
  }
}

async function markComplete() {
  const { error } = await contentStore.markDayComplete(dayId.value, completionNotes.value)
  if (!error) {
    dayCompleted.value = true
    showCompleteDialog.value = false
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم تحديد اليوم كمكتمل', life: 3000 })
  }
}
</script>

<template>
  <div class="day-view" v-if="level">
    <Breadcrumb :model="breadcrumbItems" :home="breadcrumbHome" class="day-breadcrumb" />

    <!-- Day Header -->
    <div class="day-header animate__animated animate__fadeIn" :style="{ '--lc': level.color }">
      <div class="day-header-content">
        <div>
          <Tag v-if="dayCompleted" severity="success" value="مكتمل" class="completed-tag" />
          <h1>{{ level.name }} - الأسبوع {{ weekId }}</h1>
          <p>سيناريو اليوم التفصيلي - 45 دقيقة</p>
          <p v-if="currentLetter">حرف اليوم: <strong style="font-size: 1.5rem">{{ currentLetter }}</strong></p>
        </div>
        <Button
          v-if="authStore.isAdmin && !dayCompleted"
          label="تحديد كمكتمل"
          icon="pi pi-check-circle"
          class="complete-btn"
          @click="showCompleteDialog = true"
        />
      </div>
    </div>

    <!-- Day Scenario Timeline -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-list-check" :style="{ color: level.color }"></i> سيناريو اليوم (الجدول الزمني)</h2>
      <div class="day-timeline">
        <div
          v-for="(step, idx) in sessionSteps"
          :key="idx"
          class="timeline-item stagger-item"
          :style="{ animationDelay: `${idx * 0.1}s` }"
        >
          <span class="time-label">{{ step.duration }} دقيقة</span>
          <div class="timeline-step-header">
            <span class="timeline-step-num" :style="{ background: level.color }">{{ step.order }}</span>
            <i :class="step.icon" :style="{ color: level.color, fontSize: '1.1rem' }"></i>
            <h3>{{ step.name }}</h3>
          </div>

          <!-- Dynamic content based on step type -->
          <div class="timeline-step-details">
            <template v-if="step.name.includes('قصة')">
              <div class="detail-box">
                <p><i class="pi pi-info-circle"></i> يتم اختيار قصة مناسبة من مكتبة المدرسة</p>
                <ul>
                  <li>قراءة القصة بصوت واضح وتعبيري</li>
                  <li>إشراك الأطفال في التوقع والأسئلة</li>
                  <li>ربط القصة بحرف اليوم إن أمكن</li>
                </ul>
              </div>
            </template>
            <template v-else-if="step.name.includes('نقاش')">
              <div class="detail-box">
                <ul>
                  <li>مناقشة أحداث القصة وشخصياتها</li>
                  <li>استخراج مفردات جديدة وشرحها</li>
                  <li>طرح أسئلة مفتوحة للأطفال</li>
                </ul>
              </div>
            </template>
            <template v-else-if="step.name.includes('صوتي')">
              <div class="detail-box">
                <p><strong>الأنشطة المقترحة:</strong></p>
                <div class="suggested-activities">
                  <div v-for="act in (activities.phonetic || []).slice(0, 2)" :key="act.name" class="mini-activity">
                    <strong>{{ act.name }}</strong>
                    <p>{{ act.description }}</p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="step.name.includes('بصري')">
              <div class="detail-box">
                <p><strong>الأنشطة المقترحة:</strong></p>
                <div class="suggested-activities">
                  <div v-for="act in (activities.visual || activities.reading || []).slice(0, 2)" :key="act.name" class="mini-activity">
                    <strong>{{ act.name }}</strong>
                    <p>{{ act.description }}</p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="step.name.includes('فني') || step.name.includes('خطوط')">
              <div class="detail-box">
                <p><strong>الأنشطة المقترحة:</strong></p>
                <div class="suggested-activities">
                  <div v-for="act in (activities.writing || []).slice(0, 2)" :key="act.name" class="mini-activity">
                    <strong>{{ act.name }}</strong>
                    <p>{{ act.description }}</p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="step.name.includes('كتابة') || step.name.includes('إبداعية')">
              <div class="detail-box">
                <div class="suggested-activities">
                  <div v-for="act in (activities.writing || []).slice(0, 2)" :key="act.name" class="mini-activity">
                    <strong>{{ act.name }}</strong>
                    <p>{{ act.description }}</p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="step.name.includes('دمج')">
              <div class="detail-box">
                <div class="suggested-activities">
                  <div v-for="act in (activities.reading || []).slice(0, 2)" :key="act.name" class="mini-activity">
                    <strong>{{ act.name }}</strong>
                    <p>{{ act.description }}</p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="detail-box">
                <p>تنفيذ النشاط وفق المحور المطلوب مع مراعاة مستوى الأطفال</p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Tips Box -->
    <div class="custom-card no-hover tips-card animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-lightbulb" style="color: var(--warning-color)"></i> نصائح للمعلمة</h2>
      <div class="tips-grid">
        <div class="tip-item">
          <i class="pi pi-heart" style="color: #FF6B6B"></i>
          <p>ابدئي دائماً بتحية حارة وابتسامة</p>
        </div>
        <div class="tip-item">
          <i class="pi pi-volume-up" style="color: #339AF0"></i>
          <p>استخدمي الفصحى المبسطة طوال الحصة</p>
        </div>
        <div class="tip-item">
          <i class="pi pi-users" style="color: #51CF66"></i>
          <p>أشركي جميع الأطفال ولا تتجاهلي أحداً</p>
        </div>
        <div class="tip-item">
          <i class="pi pi-star" style="color: #FFD43B"></i>
          <p>شجّعي كل محاولة ولو كانت بسيطة</p>
        </div>
      </div>
    </div>

    <!-- Comments -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-comments" :style="{ color: level.color }"></i> التعليقات والملاحظات</h2>

      <div class="comment-form">
        <Textarea
          v-model="newComment"
          placeholder="أضف تعليقاً أو ملاحظة..."
          rows="3"
          class="w-full"
        />
        <Button
          label="إضافة تعليق"
          icon="pi pi-send"
          :style="{ background: level.color, borderColor: level.color }"
          @click="submitComment"
          :disabled="!newComment.trim()"
        />
      </div>

      <div class="comments-list" v-if="comments.length">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <strong>{{ comment.profiles?.full_name || 'مستخدم' }}</strong>
            <Tag :value="comment.profiles?.role === 'admin' ? 'مدير' : 'معلمة'" :severity="comment.profiles?.role === 'admin' ? 'warn' : 'info'" />
            <span class="comment-date">{{ new Date(comment.created_at).toLocaleDateString('ar-EG') }}</span>
          </div>
          <p>{{ comment.content }}</p>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 30px">
        <i class="pi pi-comments"></i>
        <p>لا توجد تعليقات بعد</p>
      </div>
    </div>

    <!-- Complete Dialog -->
    <Dialog
      v-model:visible="showCompleteDialog"
      header="تحديد اليوم كمكتمل"
      :style="{ width: '450px' }"
      modal
    >
      <div class="complete-form">
        <p>هل تريد تحديد هذا اليوم كمكتمل؟</p>
        <Textarea
          v-model="completionNotes"
          placeholder="أضف ملاحظات نهائية (اختياري)..."
          rows="4"
          class="w-full"
          style="margin-top: 12px"
        />
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showCompleteDialog = false" />
        <Button label="تأكيد الإكمال" icon="pi pi-check" @click="markComplete" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.day-breadcrumb {
  margin-bottom: 20px;
  background: transparent;
  border: none;
  padding: 0;
}

.day-header {
  background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 70%, black));
  border-radius: 20px;
  padding: 28px 32px;
  color: white;
  margin-bottom: 24px;
}

.day-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.day-header h1 {
  color: white;
  font-size: 1.4rem;
  margin-bottom: 4px;
}

.day-header p {
  opacity: 0.9;
}

.completed-tag {
  margin-bottom: 8px;
}

.complete-btn {
  background: rgba(255,255,255,0.2) !important;
  border: 1px solid rgba(255,255,255,0.4) !important;
  color: white !important;
}

h2 {
  font-size: 1.15rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.timeline-step-header h3 {
  font-size: 1rem;
}

.timeline-step-num {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.timeline-step-details {
  margin-right: 40px;
}

.detail-box {
  background: var(--bg-color);
  border-radius: 10px;
  padding: 14px;
}

.detail-box ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
}

.detail-box li {
  padding: 4px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-box li::before {
  content: '•';
  color: var(--primary-color);
  font-weight: bold;
}

.suggested-activities {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.mini-activity {
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.mini-activity strong {
  font-size: 0.9rem;
  display: block;
  margin-bottom: 4px;
}

.mini-activity p {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 10px;
}

.tip-item i {
  margin-top: 3px;
  flex-shrink: 0;
}

.tip-item p {
  font-size: 0.9rem;
  margin: 0;
  color: var(--text-secondary);
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.comment-form .w-full {
  width: 100%;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  padding: 14px;
  background: var(--bg-color);
  border-radius: 10px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.comment-date {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-right: auto;
}

.comment-item p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.7;
}

.complete-form p {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .day-header-content {
    flex-direction: column;
  }
  .complete-btn {
    margin-top: 12px;
  }
  .timeline-step-details {
    margin-right: 0;
  }
  .tips-grid {
    grid-template-columns: 1fr;
  }
}
</style>
