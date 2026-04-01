<script setup>
import { ref } from 'vue'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import MultiSelect from 'primevue/multiselect'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

const toast = useToast()
const contentStore = useContentStore()

const selectedLevels = ref([1, 2, 3])
const selectedSections = ref(['objectives', 'activities', 'assessment', 'tools', 'session_pattern', 'listening', 'progression', 'daily'])
const exporting = ref(false)

const levelOptions = [
  { label: 'المستوى الأول (3-4 سنوات)', value: 1 },
  { label: 'المستوى الثاني (4-5 سنوات)', value: 2 },
  { label: 'المستوى الثالث (5-6 سنوات)', value: 3 }
]

const sectionOptions = [
  { label: 'أهداف الاستماع والتحدث', value: 'listening' },
  { label: 'الأهداف والمحاور التفصيلية', value: 'objectives' },
  { label: 'نمط الحصة', value: 'session_pattern' },
  { label: 'الأنشطة (من المكتبة)', value: 'activities' },
  { label: 'أدوات التقييم', value: 'assessment' },
  { label: 'الأدوات والوسائل', value: 'tools' },
  { label: 'ملخص التدرّج', value: 'progression' },
  { label: 'السيناريو اليومي التفصيلي', value: 'daily' }
]

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, font: 'Arial', rightToLeft: true, bold: opts.bold, italics: opts.italic })],
    heading: opts.heading,
    alignment: opts.align || AlignmentType.RIGHT,
    spacing: { before: opts.before || 0, after: opts.after || 80 }
  })
}

function heading1(text) { return p(text, { bold: true, size: 28, heading: HeadingLevel.HEADING_1, before: 300, after: 200 }) }
function heading2(text) { return p(text, { bold: true, size: 24, heading: HeadingLevel.HEADING_2, before: 200, after: 100 }) }
function bullet(text) { return p(`• ${text}`, { after: 50 }) }
function checkbox(text) { return p(`  □ ${text}`, { size: 20, after: 50 }) }

async function exportToWord() {
  exporting.value = true
  try {
    const sections = []
    const levelsToExport = selectedLevels.value.length ? selectedLevels.value : [1, 2, 3]
    const sel = selectedSections.value

    // Title
    sections.push(p('مدرسة الأرض', { bold: true, size: 48, align: AlignmentType.CENTER, after: 200 }))
    sections.push(p('دليل معلمات اللغة العربية', { bold: true, size: 36, align: AlignmentType.CENTER, after: 200 }))
    sections.push(p('حقيبة المعلمة الشاملة لفقرة اللغة العربية', { size: 24, align: AlignmentType.CENTER, after: 400 }))

    // Unit Info
    sections.push(heading1('معلومات الوحدة التعليمية'))
    ;['مدة الوحدة: 12 أسبوع', 'عدد الحصص: مرتين في الأسبوع', 'مدة الحصة: 45 دقيقة', 'بداية كل حصة: قراءة قصة من مكتبة المدرسة'].forEach(t => sections.push(bullet(t)))

    // Listening Goals
    if (sel.includes('listening')) {
      const goals = await contentStore.fetchListeningGoals()
      if (goals?.length) {
        sections.push(heading1('أهداف الاستماع والتحدث (مشتركة بين المستويات)'))
        goals.forEach(g => {
          sections.push(new Paragraph({
            children: [
              new TextRun({ text: `${g.stage}: `, bold: true, size: 22, font: 'Arial', rightToLeft: true }),
              new TextRun({ text: g.goal, size: 22, font: 'Arial', rightToLeft: true })
            ],
            alignment: AlignmentType.RIGHT, spacing: { after: 100 }
          }))
        })
      }
    }

    // Per-level
    for (const lvl of levelsToExport) {
      const level = contentStore.getLevelData(lvl)
      if (!level) continue

      sections.push(heading1(`${level.name} (${level.age_range})`))
      sections.push(p(level.description))

      // Objectives from DB
      if (sel.includes('objectives')) {
        const axes = await contentStore.fetchLevelAxes(lvl)
        if (axes?.length) {
          sections.push(heading2('المحاور والأهداف التفصيلية'))
          for (const axis of axes) {
            sections.push(p(`${axis.name}: ${axis.description}`, { bold: true, before: 100 }))
            if (axis.axis_objectives?.length) {
              axis.axis_objectives.forEach(obj => sections.push(p(`  ✓ ${obj.objective_text}`, { size: 20, after: 40 })))
            }
          }
        }
      }

      // Session Pattern from DB
      if (sel.includes('session_pattern')) {
        const patterns = await contentStore.fetchSessionPatterns(lvl)
        if (patterns?.length) {
          sections.push(heading2('نمط الحصة'))
          for (const pat of patterns) {
            if (patterns.length > 1) sections.push(p(pat.pattern_name, { bold: true, size: 22 }))
            ;(pat.steps || []).forEach(step => {
              sections.push(p(`${step.order}. ${step.name} (${step.duration} دقيقة)${step.description ? ' - ' + step.description : ''}`))
            })
          }
        }
      }

      // Activities from DB
      if (sel.includes('activities')) {
        const acts = await contentStore.fetchActivities(lvl)
        if (acts?.length) {
          sections.push(heading2('الأنشطة'))
          // Group by category
          const grouped = {}
          acts.forEach(a => { if (!grouped[a.category]) grouped[a.category] = []; grouped[a.category].push(a) })
          for (const [cat, catActs] of Object.entries(grouped)) {
            sections.push(p(cat, { bold: true, size: 22, before: 100 }))
            for (const act of catActs) {
              sections.push(p(`• ${act.name} (${act.duration} دقيقة - ${act.activity_type})`, { bold: true }))
              sections.push(p(`  ${act.description}`, { size: 20 }))
              if (act.steps?.length) {
                sections.push(p('  خطوات التنفيذ:', { bold: true, size: 20 }))
                act.steps.forEach((s, i) => sections.push(p(`    ${i + 1}. ${s}`, { size: 18, after: 30 })))
              }
              if (act.tools?.length) {
                sections.push(p(`  الأدوات: ${act.tools.join('، ')}`, { size: 18, italic: true }))
              }
              if (act.teacher_tips?.length) {
                sections.push(p('  نصائح للمعلمة:', { bold: true, size: 20 }))
                act.teacher_tips.forEach(t => sections.push(p(`    💡 ${t}`, { size: 18, after: 30 })))
              }
            }
          }
        }
      }

      // Assessment from DB
      if (sel.includes('assessment')) {
        const items = await contentStore.fetchAssessmentItems(lvl)
        if (items?.length) {
          sections.push(heading2('أدوات التقييم'))
          const grouped = {}
          items.forEach(it => { if (!grouped[it.category]) grouped[it.category] = []; grouped[it.category].push(it) })
          for (const [cat, catItems] of Object.entries(grouped)) {
            sections.push(p(cat, { bold: true, size: 22 }))
            catItems.forEach(it => sections.push(checkbox(it.question)))
          }
        }
      }

      // Daily Scenario from DB
      if (sel.includes('daily')) {
        const weeks = await contentStore.fetchWeeks(lvl)
        if (weeks?.length) {
          sections.push(heading2('السيناريو اليومي التفصيلي'))
          for (const week of weeks) {
            sections.push(p(`━━━ ${week.title}${week.letter ? ' (حرف: ' + week.letter + ')' : ''} ━━━`, { bold: true, size: 22, before: 200 }))
            const days = await contentStore.fetchDays(week.id)
            if (!days?.length) continue
            for (const day of days) {
              const dayDetail = await contentStore.fetchDay(day.id)
              sections.push(p(`▸ ${day.title || 'اليوم ' + day.day_number}`, { bold: true, before: 100 }))
              if (dayDetail?.summary) sections.push(p(`  ${dayDetail.summary}`, { size: 20 }))
              if (dayDetail?.objectives?.length) {
                sections.push(p('  الأهداف:', { bold: true, size: 20 }))
                dayDetail.objectives.forEach(obj => sections.push(p(`    ✓ ${obj}`, { size: 18, after: 30 })))
              }
              if (dayDetail?.teacher_notes) sections.push(p(`  ملاحظات: ${dayDetail.teacher_notes}`, { size: 18, italic: true }))
              // Day activities
              const dayActs = await contentStore.fetchDayStepActivities(day.id)
              if (dayActs?.length) {
                sections.push(p('  الأنشطة المخصصة لهذا اليوم:', { bold: true, size: 20 }))
                dayActs.forEach(dsa => {
                  const name = dsa.custom_name || dsa.activities?.name || 'نشاط'
                  const desc = dsa.custom_description || dsa.activities?.description || ''
                  sections.push(p(`    • ${name}`, { bold: true, size: 18 }))
                  if (desc) sections.push(p(`      ${desc}`, { size: 16, after: 30 }))
                })
              }
            }
          }
        }
      }
    }

    // Progression
    if (sel.includes('progression')) {
      const prog = await contentStore.fetchProgressionItems()
      if (prog?.length) {
        sections.push(heading1('ملخص التدرّج بين المستويات'))
        prog.forEach(row => {
          sections.push(p(row.dimension, { bold: true }))
          sections.push(p(`  المستوى الأول: ${row.level1_text}`, { size: 20, after: 30 }))
          sections.push(p(`  المستوى الثاني: ${row.level2_text}`, { size: 20, after: 30 }))
          sections.push(p(`  المستوى الثالث: ${row.level3_text}`, { size: 20, after: 100 }))
        })
      }
    }

    // Tools
    if (sel.includes('tools')) {
      const tools = await contentStore.fetchTeachingTools()
      if (tools?.length) {
        sections.push(heading1('الأدوات والوسائل التعليمية'))
        tools.forEach(tool => {
          sections.push(p(`• ${tool.name} (${tool.category})${tool.description ? ' - ' + tool.description : ''}${tool.levels?.length ? ' [المستويات: ' + tool.levels.join('، ') + ']' : ''}`))
        })
      }
    }

    const doc = new Document({ sections: [{ properties: { bidi: true }, children: sections }] })
    const blob = await Packer.toBlob(doc)
    const fileName = selectedLevels.value.length === 3 ? 'دليل_معلمات_اللغة_العربية_كامل.docx' : `دليل_المستويات_${selectedLevels.value.join('-')}.docx`
    saveAs(blob, fileName)
    toast.add({ severity: 'success', summary: 'تم التصدير', detail: 'تم تصدير الملف بنجاح', life: 3000 })
  } catch (err) {
    console.error('Export error:', err)
    toast.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء التصدير: ' + err.message, life: 5000 })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="export-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-file-export" style="color: #845EF7"></i> تصدير وتقارير</h1>
      <p>تصدير محتوى الدليل إلى ملف Word</p>
    </div>

    <div class="export-grid">
      <div class="custom-card no-hover animate__animated animate__fadeInUp">
        <h2><i class="pi pi-sliders-h" style="color: #845EF7"></i> خيارات التصدير</h2>
        <div class="export-options">
          <div class="option-group">
            <label class="option-label">المستويات</label>
            <MultiSelect v-model="selectedLevels" :options="levelOptions" optionLabel="label" optionValue="value" placeholder="اختر المستويات" class="w-full" display="chip" />
          </div>
          <div class="option-group">
            <label class="option-label">الأقسام المطلوبة</label>
            <MultiSelect v-model="selectedSections" :options="sectionOptions" optionLabel="label" optionValue="value" placeholder="اختر الأقسام" class="w-full" display="chip" />
          </div>
          <Button label="تصدير إلى Word" icon="pi pi-file-word" class="export-btn" :loading="exporting" @click="exportToWord" size="large" />
          <Button label="طباعة الصفحة الحالية" icon="pi pi-print" text class="print-btn" @click="window.print()" />
        </div>
      </div>

      <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.1s">
        <h2><i class="pi pi-eye" style="color: #339AF0"></i> معاينة المحتوى</h2>
        <div class="preview-content">
          <div class="preview-item" v-for="section in sectionOptions" :key="section.value">
            <i :class="selectedSections.includes(section.value) ? 'pi pi-check-circle' : 'pi pi-circle'" :style="{ color: selectedSections.includes(section.value) ? '#51CF66' : 'var(--text-muted)' }"></i>
            <span :style="{ color: selectedSections.includes(section.value) ? 'var(--text-primary)' : 'var(--text-muted)' }">{{ section.label }}</span>
          </div>
          <div class="preview-summary">
            <div class="summary-item"><i class="pi pi-file" style="color: #845EF7"></i><span>المستويات: {{ selectedLevels.length === 3 ? 'جميع المستويات' : selectedLevels.length ? `${selectedLevels.length} مستويات` : 'غير محدد' }}</span></div>
            <div class="summary-item"><i class="pi pi-list" style="color: #339AF0"></i><span>الأقسام: {{ selectedSections.length }} من {{ sectionOptions.length }}</span></div>
            <div v-if="selectedSections.includes('daily')" class="summary-item"><i class="pi pi-calendar" style="color: #FF9F43"></i><span>يشمل السيناريو اليومي التفصيلي لكل يوم</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
h2 { font-size: 1.15rem; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.export-options { display: flex; flex-direction: column; gap: 24px; }
.option-group { display: flex; flex-direction: column; gap: 8px; }
.option-label { font-weight: 600; font-size: 0.95rem; }
.level-option { display: flex; align-items: center; gap: 4px; }
.w-full { width: 100%; }
.export-btn { background: #845EF7 !important; border-color: #845EF7 !important; height: 48px; font-size: 1rem; font-weight: 600; }
.print-btn { height: 44px; }
.preview-content { display: flex; flex-direction: column; gap: 12px; }
.preview-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-color); border-radius: 8px; font-size: 0.9rem; }
.preview-summary { margin-top: 16px; padding: 16px; background: #F8F0FF; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; }
.summary-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
@media (max-width: 768px) { .export-grid { grid-template-columns: 1fr; } }
</style>
