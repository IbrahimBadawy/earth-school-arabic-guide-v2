<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressBar from 'primevue/progressbar'

const stats = ref({
  totalUsers: 0,
  totalWeeks: 0,
  totalDays: 0,
  completedDays: 0,
  totalComments: 0
})

const levelStats = ref([])
const recentComments = ref([])

// Direct execution
onMounted(async () => {
  // Fetch counts
  const [usersRes, weeksRes, daysRes, commentsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('weeks').select('id', { count: 'exact', head: true }),
    supabase.from('days').select('id, is_completed', { count: 'exact' }),
    supabase.from('comments').select('id', { count: 'exact', head: true })
  ])

  stats.value.totalUsers = usersRes.count || 0
  stats.value.totalWeeks = weeksRes.count || 0
  stats.value.totalDays = daysRes.count || 0
  stats.value.completedDays = daysRes.data?.filter(d => d.is_completed).length || 0
  stats.value.totalComments = commentsRes.count || 0

  // Level stats
  for (let lvl = 1; lvl <= 3; lvl++) {
    const { count: weekCount } = await supabase.from('weeks').select('id', { count: 'exact', head: true }).eq('level_id', lvl)
    const { data: daysData } = await supabase.from('days').select('id, is_completed, weeks!inner(level_id)').eq('weeks.level_id', lvl)
    const total = daysData?.length || 0
    const completed = daysData?.filter(d => d.is_completed).length || 0
    levelStats.value.push({
      level: lvl,
      name: `المستوى ${lvl === 1 ? 'الأول' : lvl === 2 ? 'الثاني' : 'الثالث'}`,
      weeks: weekCount || 0,
      totalDays: total,
      completedDays: completed,
      progress: total ? Math.round((completed / total) * 100) : 0
    })
  }

  // Recent comments
  const { data: cmts } = await supabase
    .from('comments')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(10)
  recentComments.value = cmts || []
})()

const completionPercent = computed(() => {
  if (!stats.value.totalDays) return 0
  return Math.round((stats.value.completedDays / stats.value.totalDays) * 100)
})

const levelColors = ['var(--level1-color)', 'var(--level2-color)', 'var(--level3-color)']
</script>

<template>
  <div class="reports-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-chart-bar" style="color: #20C997"></i> التقارير والإحصائيات</h1>
      <p>نظرة عامة على تقدم الوحدة التعليمية</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card stagger-item">
        <div class="stat-icon" style="background: #E3F2FD; color: #1565C0;">
          <i class="pi pi-users"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.totalUsers }}</h3>
          <p>إجمالي المستخدمين</p>
        </div>
      </div>
      <div class="stat-card stagger-item" style="animation-delay: 0.1s">
        <div class="stat-icon" style="background: #FFF3E0; color: #E65100;">
          <i class="pi pi-calendar"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.totalWeeks }}</h3>
          <p>إجمالي الأسابيع</p>
        </div>
      </div>
      <div class="stat-card stagger-item" style="animation-delay: 0.2s">
        <div class="stat-icon" style="background: #E8F5E9; color: #2E7D32;">
          <i class="pi pi-check-circle"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.completedDays }} / {{ stats.totalDays }}</h3>
          <p>الأيام المكتملة</p>
        </div>
      </div>
      <div class="stat-card stagger-item" style="animation-delay: 0.3s">
        <div class="stat-icon" style="background: #F3E5F5; color: #7B1FA2;">
          <i class="pi pi-comments"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.totalComments }}</h3>
          <p>إجمالي التعليقات</p>
        </div>
      </div>
    </div>

    <!-- Overall Progress -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-chart-line" style="color: #20C997"></i> نسبة الإنجاز الكلية</h2>
      <ProgressBar :value="completionPercent" :showValue="true" style="height: 24px; border-radius: 12px" />
    </div>

    <!-- Level Progress -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-th-large" style="color: #845EF7"></i> تقدم كل مستوى</h2>
      <div class="levels-progress">
        <div v-for="(ls, idx) in levelStats" :key="ls.level" class="level-progress-item" :style="{ '--lpc': levelColors[idx] }">
          <div class="lp-header">
            <strong>{{ ls.name }}</strong>
            <span>{{ ls.completedDays }} / {{ ls.totalDays }} يوم</span>
          </div>
          <ProgressBar :value="ls.progress" :showValue="true" style="height: 18px; border-radius: 9px" />
          <div class="lp-meta">
            <span><i class="pi pi-calendar"></i> {{ ls.weeks }} أسبوع</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Comments -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-comments" style="color: #339AF0"></i> آخر التعليقات</h2>
      <DataTable :value="recentComments" stripedRows emptyMessage="لا توجد تعليقات">
        <Column header="المستخدم">
          <template #body="{ data }">{{ data.profiles?.full_name || 'مجهول' }}</template>
        </Column>
        <Column field="content" header="التعليق" />
        <Column header="التاريخ">
          <template #body="{ data }">{{ new Date(data.created_at).toLocaleDateString('ar-EG') }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
h2 {
  font-size: 1.15rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.levels-progress {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.level-progress-item {
  padding: 16px;
  background: var(--bg-color);
  border-radius: 12px;
  border-right: 4px solid var(--lpc);
}

.lp-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.lp-header span {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.lp-meta {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.lp-meta i {
  margin-left: 4px;
}
</style>
