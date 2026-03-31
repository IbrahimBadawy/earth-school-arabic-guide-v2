<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const router = useRouter()
const authStore = useAuthStore()
const contentStore = useContentStore()

const levels = contentStore.levelsData
const progression = contentStore.progressionTable

function navigateToLevel(levelId) {
  router.push(`/level/${levelId}`)
}
</script>

<template>
  <div class="dashboard">
    <!-- Welcome -->
    <div class="welcome-section animate__animated animate__fadeIn">
      <div class="welcome-content">
        <h1>مرحباً {{ authStore.displayName }} 👋</h1>
        <p>حقيبة المعلمة الشاملة لفقرة اللغة العربية - مدرسة الأرض</p>
      </div>
      <div class="welcome-decoration">
        <span class="deco-item">📚</span>
        <span class="deco-item">✏️</span>
        <span class="deco-item">🎨</span>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card stagger-item" v-for="(level, idx) in levels" :key="level.id"
           :style="{ animationDelay: `${idx * 0.1}s` }">
        <div class="stat-icon" :style="{ background: level.color + '20', color: level.color }">
          <i :class="level.icon"></i>
        </div>
        <div class="stat-info">
          <h3>{{ level.students_count }}</h3>
          <p>{{ level.name }}</p>
        </div>
      </div>
      <div class="stat-card stagger-item" style="animation-delay: 0.3s">
        <div class="stat-icon" style="background: #F3E5F5; color: #7B1FA2;">
          <i class="pi pi-calendar"></i>
        </div>
        <div class="stat-info">
          <h3>12</h3>
          <p>أسبوع تعليمي</p>
        </div>
      </div>
    </div>

    <!-- Unit Info -->
    <div class="unit-info custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-info-circle" style="color: var(--primary-color)"></i> معلومات الوحدة التعليمية</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-icon" style="background: var(--primary-light); color: var(--primary-color);">
            <i class="pi pi-clock"></i>
          </div>
          <div>
            <strong>مدة الوحدة</strong>
            <p>12 أسبوع</p>
          </div>
        </div>
        <div class="info-item">
          <div class="info-icon" style="background: var(--secondary-light); color: var(--secondary-color);">
            <i class="pi pi-calendar"></i>
          </div>
          <div>
            <strong>عدد الحصص</strong>
            <p>مرتين في الأسبوع</p>
          </div>
        </div>
        <div class="info-item">
          <div class="info-icon" style="background: var(--accent-light); color: var(--accent-color);">
            <i class="pi pi-stopwatch"></i>
          </div>
          <div>
            <strong>مدة الحصة</strong>
            <p>45 دقيقة</p>
          </div>
        </div>
        <div class="info-item">
          <div class="info-icon" style="background: #E3F2FD; color: #1565C0;">
            <i class="pi pi-book"></i>
          </div>
          <div>
            <strong>بداية كل حصة</strong>
            <p>قراءة قصة من مكتبة المدرسة</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Levels Cards -->
    <h2 class="section-title"><i class="pi pi-th-large"></i> المستويات التعليمية</h2>
    <div class="content-grid">
      <div
        v-for="(level, idx) in levels"
        :key="level.id"
        class="level-card custom-card stagger-item"
        :style="{ animationDelay: `${idx * 0.15}s`, '--card-color': level.color }"
        @click="navigateToLevel(level.id)"
      >
        <div class="level-card-header">
          <div class="level-icon-wrap" :style="{ background: level.color + '20' }">
            <i :class="level.icon" :style="{ color: level.color, fontSize: '1.5rem' }"></i>
          </div>
          <div class="level-badge-wrap">
            <span class="level-num" :style="{ background: level.color, color: 'white' }">{{ level.id }}</span>
          </div>
        </div>
        <h3>{{ level.name }}</h3>
        <p class="level-age">{{ level.age_range }} - {{ level.students_count }} طفل</p>
        <p class="level-desc">{{ level.description }}</p>

        <div class="level-axes">
          <div v-for="axis in (level.axes || [])" :key="axis.id" class="axis-tag">
            {{ axis.name }}
          </div>
        </div>

        <Button
          label="عرض التفاصيل"
          icon="pi pi-arrow-left"
          iconPos="left"
          text
          :style="{ color: level.color }"
          class="details-btn"
        />
      </div>
    </div>

    <!-- Progression Table -->
    <h2 class="section-title" style="margin-top: 36px;"><i class="pi pi-chart-line"></i> ملخص التدرّج بين المستويات</h2>
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <DataTable :value="progression" stripedRows class="progression-table">
        <Column field="dimension" header="البُعد" style="width: 15%">
          <template #body="{ data }">
            <strong>{{ data.dimension }}</strong>
          </template>
        </Column>
        <Column field="level1" header="المستوى الأول" style="width: 28%">
          <template #body="{ data }">
            <span class="progression-cell level-1-cell">{{ data.level1 }}</span>
          </template>
        </Column>
        <Column field="level2" header="المستوى الثاني" style="width: 28%">
          <template #body="{ data }">
            <span class="progression-cell level-2-cell">{{ data.level2 }}</span>
          </template>
        </Column>
        <Column field="level3" header="المستوى الثالث" style="width: 28%">
          <template #body="{ data }">
            <span class="progression-cell level-3-cell">{{ data.level3 }}</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.welcome-section {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  border-radius: 20px;
  padding: 32px;
  color: white;
  margin-bottom: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.welcome-section::before {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  top: -50px;
  left: -50px;
}

.welcome-content h1 {
  font-size: 1.6rem;
  color: white;
  margin-bottom: 6px;
}

.welcome-content p {
  opacity: 0.9;
  font-size: 1rem;
}

.welcome-decoration {
  display: flex;
  gap: 12px;
}

.deco-item {
  font-size: 2rem;
  animation: float-items 3s ease-in-out infinite;
}

.deco-item:nth-child(2) { animation-delay: 0.5s; }
.deco-item:nth-child(3) { animation-delay: 1s; }

@keyframes float-items {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.section-title {
  font-size: 1.3rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.section-title i {
  color: var(--primary-color);
}

.unit-info {
  margin-bottom: 32px;
}

.unit-info h2 {
  font-size: 1.2rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-color);
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-item strong {
  font-size: 0.85rem;
  color: var(--text-primary);
  display: block;
}

.info-item p {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.level-card {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.level-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: var(--card-color);
  border-radius: 0 8px 8px 0;
}

.level-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.level-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.level-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
}

.level-card h3 {
  font-size: 1.15rem;
  margin-bottom: 4px;
}

.level-age {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.level-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.level-axes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.axis-tag {
  background: var(--bg-color);
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.details-btn {
  font-weight: 600;
}

.progression-cell {
  font-size: 0.85rem;
  line-height: 1.6;
}

.level-1-cell { color: var(--level1-color); }
.level-2-cell { color: var(--level2-color); }
.level-3-cell { color: var(--level3-color); }

@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }
  .welcome-decoration {
    margin-top: 16px;
  }
  .welcome-content h1 {
    font-size: 1.3rem;
  }
}
</style>
