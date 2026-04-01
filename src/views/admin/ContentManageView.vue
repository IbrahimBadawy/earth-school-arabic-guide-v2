<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useContentStore } from '@/stores/content'
import Tree from 'primevue/tree'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'

const contentStore = useContentStore()
const toast = useToast()

const treeNodes = ref([])
const expandedKeys = ref({})
const loading = ref(true)
const showDialog = ref(false)
const dialogTitle = ref('')
const dialogTable = ref('')
const dialogForm = ref({})
const dialogFields = ref([])
const editMode = ref(false)

const stats = ref({ weeks: 0, days: 0, activities: 0, assessments: 0, tools: 0, faqs: 0, tips: 0, goals: 0, axes: 0 })

onMounted(async () => {
  await loadTree()
})

async function loadTree() {
  loading.value = true
  const [weeks, activities, assessments, tools, goals, axes, faqs, tips, patterns, progression] = await Promise.all([
    supabase.from('weeks').select('*, days(id, title, day_number, is_completed)').order('level_id').order('week_number'),
    supabase.from('activities').select('id, name, level_id, category').order('level_id').order('category'),
    supabase.from('assessment_items').select('id, question, level_id, category').order('level_id').order('category'),
    supabase.from('teaching_tools').select('id, name, category').order('category'),
    supabase.from('listening_goals').select('id, stage').order('sort_order'),
    supabase.from('level_axes').select('id, name, level_id, axis_objectives(id, objective_text)').order('level_id').order('sort_order'),
    supabase.from('faq_items').select('id, question, category').order('category'),
    supabase.from('implementation_tips').select('id, title, category').order('category'),
    supabase.from('session_patterns').select('id, level_id, pattern_name, steps').order('level_id'),
    supabase.from('progression_items').select('id, dimension').order('sort_order')
  ])

  stats.value = {
    weeks: weeks.data?.length || 0,
    days: weeks.data?.reduce((s, w) => s + (w.days?.length || 0), 0) || 0,
    activities: activities.data?.length || 0,
    assessments: assessments.data?.length || 0,
    tools: tools.data?.length || 0,
    faqs: faqs.data?.length || 0,
    tips: tips.data?.length || 0,
    goals: goals.data?.length || 0,
    axes: axes.data?.length || 0
  }

  const levelNames = { 1: 'المستوى الأول', 2: 'المستوى الثاني', 3: 'المستوى الثالث' }
  const levelIcons = { 1: 'pi pi-star', 2: 'pi pi-star-fill', 3: 'pi pi-trophy' }

  // Build tree
  const nodes = []

  // Weeks & Days per level
  for (let lvl = 1; lvl <= 3; lvl++) {
    const lvlWeeks = (weeks.data || []).filter(w => w.level_id === lvl)
    nodes.push({
      key: `lvl-${lvl}`,
      label: `${levelNames[lvl]} (${lvlWeeks.length} أسبوع)`,
      icon: levelIcons[lvl],
      children: lvlWeeks.map(w => ({
        key: `week-${w.id}`,
        label: `${w.title}${w.letter ? ' ('+w.letter+')' : ''}`,
        icon: 'pi pi-calendar',
        data: { table: 'weeks', record: w },
        children: (w.days || []).sort((a,b) => a.day_number - b.day_number).map(d => ({
          key: `day-${d.id}`,
          label: `${d.title || 'اليوم '+d.day_number} ${d.is_completed ? '✓' : ''}`,
          icon: d.is_completed ? 'pi pi-check-circle' : 'pi pi-circle',
          data: { table: 'days', record: d }
        }))
      }))
    })
  }

  // Activities
  const actGroups = {}
  ;(activities.data || []).forEach(a => {
    const k = `${a.level_id}-${a.category}`
    if (!actGroups[k]) actGroups[k] = { level_id: a.level_id, category: a.category, items: [] }
    actGroups[k].items.push(a)
  })
  nodes.push({
    key: 'activities',
    label: `الأنشطة (${activities.data?.length || 0})`,
    icon: 'pi pi-palette',
    children: Object.values(actGroups).map(g => ({
      key: `act-group-${g.level_id}-${g.category}`,
      label: `${levelNames[g.level_id]} - ${g.category} (${g.items.length})`,
      icon: 'pi pi-folder',
      children: g.items.map(a => ({
        key: `act-${a.id}`,
        label: a.name,
        icon: 'pi pi-play',
        data: { table: 'activities', record: a }
      }))
    }))
  })

  // Assessment
  const assGroups = {}
  ;(assessments.data || []).forEach(a => {
    const k = `${a.level_id}-${a.category}`
    if (!assGroups[k]) assGroups[k] = { level_id: a.level_id, category: a.category, items: [] }
    assGroups[k].items.push(a)
  })
  nodes.push({
    key: 'assessment',
    label: `أدوات التقييم (${assessments.data?.length || 0})`,
    icon: 'pi pi-check-circle',
    children: Object.values(assGroups).map(g => ({
      key: `ass-group-${g.level_id}-${g.category}`,
      label: `${levelNames[g.level_id]} - ${g.category} (${g.items.length})`,
      icon: 'pi pi-folder',
      children: g.items.map(a => ({
        key: `ass-${a.id}`,
        label: a.question.substring(0, 60) + (a.question.length > 60 ? '...' : ''),
        icon: 'pi pi-check-square',
        data: { table: 'assessment_items', record: a }
      }))
    }))
  })

  // Tools
  const toolGroups = {}
  ;(tools.data || []).forEach(t => {
    if (!toolGroups[t.category]) toolGroups[t.category] = []
    toolGroups[t.category].push(t)
  })
  nodes.push({
    key: 'tools',
    label: `الأدوات (${tools.data?.length || 0})`,
    icon: 'pi pi-wrench',
    children: Object.entries(toolGroups).map(([cat, items]) => ({
      key: `tool-cat-${cat}`,
      label: `${cat} (${items.length})`,
      icon: 'pi pi-folder',
      children: items.map(t => ({
        key: `tool-${t.id}`,
        label: t.name,
        icon: 'pi pi-box',
        data: { table: 'teaching_tools', record: t }
      }))
    }))
  })

  // Axes & Objectives
  nodes.push({
    key: 'axes',
    label: `المحاور والأهداف (${axes.data?.length || 0})`,
    icon: 'pi pi-flag',
    children: [1, 2, 3].map(lvl => ({
      key: `axes-lvl-${lvl}`,
      label: levelNames[lvl],
      icon: levelIcons[lvl],
      children: (axes.data || []).filter(a => a.level_id === lvl).map(ax => ({
        key: `axis-${ax.id}`,
        label: `${ax.name} (${ax.axis_objectives?.length || 0} هدف)`,
        icon: 'pi pi-bookmark',
        data: { table: 'level_axes', record: ax },
        children: (ax.axis_objectives || []).map(obj => ({
          key: `obj-${obj.id}`,
          label: obj.objective_text.substring(0, 50) + '...',
          icon: 'pi pi-check',
          data: { table: 'axis_objectives', record: obj }
        }))
      }))
    }))
  })

  // Listening Goals
  nodes.push({
    key: 'goals',
    label: `أهداف الاستماع (${goals.data?.length || 0})`,
    icon: 'pi pi-volume-up',
    children: (goals.data || []).map(g => ({
      key: `goal-${g.id}`,
      label: g.stage,
      icon: 'pi pi-megaphone',
      data: { table: 'listening_goals', record: g }
    }))
  })

  // Session Patterns
  nodes.push({
    key: 'patterns',
    label: `أنماط الحصة (${patterns.data?.length || 0})`,
    icon: 'pi pi-clock',
    children: (patterns.data || []).map(p => ({
      key: `pat-${p.id}`,
      label: `${levelNames[p.level_id]} - ${p.pattern_name} (${p.steps?.length || 0} خطوات)`,
      icon: 'pi pi-list',
      data: { table: 'session_patterns', record: p }
    }))
  })

  // FAQ
  nodes.push({
    key: 'faq',
    label: `الأسئلة الشائعة (${faqs.data?.length || 0})`,
    icon: 'pi pi-question-circle',
    children: (faqs.data || []).map(f => ({
      key: `faq-${f.id}`,
      label: f.question.substring(0, 50) + (f.question.length > 50 ? '...' : ''),
      icon: 'pi pi-comment',
      data: { table: 'faq_items', record: f }
    }))
  })

  // Tips
  nodes.push({
    key: 'tips',
    label: `نصائح التنفيذ (${tips.data?.length || 0})`,
    icon: 'pi pi-lightbulb',
    children: (tips.data || []).map(t => ({
      key: `tip-${t.id}`,
      label: t.title,
      icon: 'pi pi-info-circle',
      data: { table: 'implementation_tips', record: t }
    }))
  })

  // Progression
  nodes.push({
    key: 'progression',
    label: `جدول التدرّج (${progression.data?.length || 0})`,
    icon: 'pi pi-chart-line',
    children: (progression.data || []).map(p => ({
      key: `prog-${p.id}`,
      label: p.dimension,
      icon: 'pi pi-arrow-up',
      data: { table: 'progression_items', record: p }
    }))
  })

  treeNodes.value = nodes
  loading.value = false
}

async function deleteNode(node) {
  if (!node.data?.table || !node.data?.record?.id) return
  const { error } = await supabase.from(node.data.table).delete().eq('id', node.data.record.id)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم الحذف', life: 3000 })
    await loadTree()
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}
</script>

<template>
  <div class="content-manage">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-cog" style="color: #FF9F43"></i> إدارة المحتوى</h1>
      <p>عرض شجري لجميع محتويات المنصة</p>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="mini-stat"><strong>{{ stats.weeks }}</strong><span>أسبوع</span></div>
      <div class="mini-stat"><strong>{{ stats.days }}</strong><span>يوم</span></div>
      <div class="mini-stat"><strong>{{ stats.activities }}</strong><span>نشاط</span></div>
      <div class="mini-stat"><strong>{{ stats.assessments }}</strong><span>معيار تقييم</span></div>
      <div class="mini-stat"><strong>{{ stats.tools }}</strong><span>أداة</span></div>
      <div class="mini-stat"><strong>{{ stats.axes }}</strong><span>محور</span></div>
      <div class="mini-stat"><strong>{{ stats.goals }}</strong><span>هدف استماع</span></div>
      <div class="mini-stat"><strong>{{ stats.faqs }}</strong><span>سؤال شائع</span></div>
      <div class="mini-stat"><strong>{{ stats.tips }}</strong><span>نصيحة</span></div>
    </div>

    <!-- Tree -->
    <div class="custom-card no-hover">
      <div class="tree-header">
        <h2><i class="pi pi-sitemap" style="color: #FF9F43"></i> شجرة المحتوى</h2>
        <div class="tree-actions">
          <Button label="توسيع الكل" icon="pi pi-plus" text size="small" @click="expandedKeys = Object.fromEntries(treeNodes.map(n => [n.key, true]))" />
          <Button label="طي الكل" icon="pi pi-minus" text size="small" @click="expandedKeys = {}" />
          <Button label="تحديث" icon="pi pi-refresh" text size="small" @click="loadTree" />
        </div>
      </div>

      <Tree :value="treeNodes" v-model:expandedKeys="expandedKeys" :loading="loading" class="content-tree" filterMode="lenient" filterPlaceholder="ابحث...">
        <template #default="{ node }">
          <div class="tree-node-content">
            <span class="tree-node-label">{{ node.label }}</span>
            <div v-if="node.data?.table" class="tree-node-actions">
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" v-tooltip.top="'حذف'" @click.stop="deleteNode(node)" />
            </div>
          </div>
        </template>
      </Tree>
    </div>

    <div class="help-note">
      <i class="pi pi-info-circle"></i>
      <span>لتعديل أو إضافة محتوى، استخدم الصفحات المخصصة (المستويات، مكتبة الأنشطة، الأدوات، إلخ) حيث تتوفر نماذج التعديل الكاملة. هذه الصفحة للعرض الشجري والحذف السريع.</span>
    </div>
  </div>
</template>

<style scoped>
.stats-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.mini-stat { background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 16px; text-align: center; min-width: 80px; }
.mini-stat strong { display: block; font-size: 1.3rem; color: var(--primary-color); }
.mini-stat span { font-size: 0.75rem; color: var(--text-muted); }
.tree-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tree-header h2 { font-size: 1.15rem; display: flex; align-items: center; gap: 8px; margin: 0; }
.tree-actions { display: flex; gap: 4px; }
.content-tree { font-family: var(--font-family); direction: rtl; }
.tree-node-content { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; }
.tree-node-label { flex: 1; font-size: 0.9rem; }
.tree-node-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.2s; }
.tree-node-content:hover .tree-node-actions { opacity: 1; }
.help-note { margin-top: 20px; padding: 14px; background: #E3F2FD; border-radius: 10px; display: flex; align-items: flex-start; gap: 10px; font-size: 0.85rem; color: #1565C0; line-height: 1.7; }
</style>
