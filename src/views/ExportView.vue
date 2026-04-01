<script setup>
import { ref } from 'vue'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import { useToast } from 'primevue/usetoast'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

const toast = useToast()
const contentStore = useContentStore()

const selectedLevels = ref([1, 2, 3])
const selectedSections = ref(['objectives', 'activities', 'assessment', 'tools', 'session_pattern', 'listening', 'progression', 'daily'])
const exporting = ref(false)
const exportProgress = ref(0)

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

function mkp(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, font: 'Arial', rightToLeft: true, bold: opts.bold, italics: opts.italic })],
    heading: opts.heading, alignment: opts.align || AlignmentType.RIGHT,
    spacing: { before: opts.before || 0, after: opts.after || 80 }
  })
}
function h1(t) { return mkp(t, { bold: true, size: 28, heading: HeadingLevel.HEADING_1, before: 300, after: 200 }) }
function h2(t) { return mkp(t, { bold: true, size: 24, heading: HeadingLevel.HEADING_2, before: 200, after: 100 }) }

async function exportToWord() {
  exporting.value = true
  exportProgress.value = 5
  try {
    const lvls = selectedLevels.value.length ? selectedLevels.value : [1, 2, 3]
    const sel = selectedSections.value

    // ONE batch fetch - 10 requests total
    exportProgress.value = 10
    const db = await contentStore.fetchAllForExport()
    exportProgress.value = 40

    const sections = []

    // Title
    sections.push(mkp('مدرسة الأرض', { bold: true, size: 48, align: AlignmentType.CENTER, after: 200 }))
    sections.push(mkp('دليل المعلمات', { bold: true, size: 36, align: AlignmentType.CENTER, after: 200 }))
    sections.push(mkp('حقيبة المعلمة الشاملة', { size: 24, align: AlignmentType.CENTER, after: 400 }))

    // Unit Info
    sections.push(h1('معلومات الوحدة التعليمية'))
    ;['مدة الوحدة: 12 أسبوع', 'عدد الحصص: مرتين في الأسبوع', 'مدة الحصة: 45 دقيقة', 'بداية كل حصة: قراءة قصة من مكتبة المدرسة'].forEach(t => sections.push(mkp(`• ${t}`, { after: 50 })))

    // Listening Goals
    if (sel.includes('listening') && db.goals.length) {
      sections.push(h1('أهداف الاستماع والتحدث (مشتركة بين المستويات)'))
      db.goals.forEach(g => {
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: `${g.stage}: `, bold: true, size: 22, font: 'Arial', rightToLeft: true }),
            new TextRun({ text: g.goal, size: 22, font: 'Arial', rightToLeft: true })
          ], alignment: AlignmentType.RIGHT, spacing: { after: 100 }
        }))
      })
    }

    exportProgress.value = 50

    // Per-level content
    for (const lvl of lvls) {
      const level = contentStore.getLevelData(lvl)
      if (!level) continue

      sections.push(h1(`${level.name} (${level.age_range})`))
      sections.push(mkp(level.description))

      // Objectives (filter from bulk)
      if (sel.includes('objectives')) {
        const lvlAxes = db.axes.filter(a => a.level_id === lvl)
        if (lvlAxes.length) {
          sections.push(h2('المحاور والأهداف التفصيلية'))
          for (const axis of lvlAxes) {
            sections.push(mkp(`${axis.name}: ${axis.description}`, { bold: true, before: 100 }))
            ;(axis.axis_objectives || []).forEach(obj => sections.push(mkp(`  ✓ ${obj.objective_text}`, { size: 20, after: 40 })))
          }
        }
      }

      // Session Pattern (filter from bulk)
      if (sel.includes('session_pattern')) {
        const lvlPats = db.patterns.filter(p => p.level_id === lvl)
        if (lvlPats.length) {
          sections.push(h2('نمط الحصة'))
          for (const pat of lvlPats) {
            if (lvlPats.length > 1) sections.push(mkp(pat.pattern_name, { bold: true, size: 22 }))
            ;(pat.steps || []).forEach(step => {
              sections.push(mkp(`${step.order}. ${step.name} (${step.duration} دقيقة)${step.description ? ' - ' + step.description : ''}`))
            })
          }
        }
      }

      // Activities (filter from bulk)
      if (sel.includes('activities')) {
        const lvlActs = db.activities.filter(a => a.level_id === lvl)
        if (lvlActs.length) {
          sections.push(h2('الأنشطة'))
          const grouped = {}
          lvlActs.forEach(a => { if (!grouped[a.category]) grouped[a.category] = []; grouped[a.category].push(a) })
          for (const [cat, acts] of Object.entries(grouped)) {
            sections.push(mkp(cat, { bold: true, size: 22, before: 100 }))
            for (const act of acts) {
              sections.push(mkp(`• ${act.name} (${act.duration} دقيقة - ${act.activity_type})`, { bold: true }))
              sections.push(mkp(`  ${act.description}`, { size: 20 }))
              if (act.steps?.length) {
                sections.push(mkp('  خطوات التنفيذ:', { bold: true, size: 20 }))
                act.steps.forEach((s, i) => sections.push(mkp(`    ${i + 1}. ${s}`, { size: 18, after: 30 })))
              }
              if (act.tools?.length) sections.push(mkp(`  الأدوات: ${act.tools.join('، ')}`, { size: 18, italic: true }))
              if (act.teacher_tips?.length) {
                sections.push(mkp('  نصائح للمعلمة:', { bold: true, size: 20 }))
                act.teacher_tips.forEach(t => sections.push(mkp(`    💡 ${t}`, { size: 18, after: 30 })))
              }
            }
          }
        }
      }

      // Assessment (filter from bulk)
      if (sel.includes('assessment')) {
        const lvlAss = db.assessments.filter(a => a.level_id === lvl)
        if (lvlAss.length) {
          sections.push(h2('أدوات التقييم'))
          const grouped = {}
          lvlAss.forEach(it => { if (!grouped[it.category]) grouped[it.category] = []; grouped[it.category].push(it) })
          for (const [cat, items] of Object.entries(grouped)) {
            sections.push(mkp(cat, { bold: true, size: 22 }))
            items.forEach(it => sections.push(mkp(`  □ ${it.question}`, { size: 20, after: 50 })))
          }
        }
      }

      // Daily Scenario (filter from bulk - NO extra requests)
      if (sel.includes('daily')) {
        const lvlWeeks = db.weeks.filter(w => w.level_id === lvl)
        if (lvlWeeks.length) {
          sections.push(h2('السيناريو اليومي التفصيلي'))
          for (const week of lvlWeeks) {
            sections.push(mkp(`━━━ ${week.title}${week.focus_item ? ' (العنصر الأساسي: ' + week.focus_item + ')' : ''} ━━━`, { bold: true, size: 22, before: 200 }))
            const weekDays = db.days.filter(d => d.week_id === week.id)
            for (const day of weekDays) {
              sections.push(mkp(`▸ ${day.title || 'اليوم ' + day.day_number}`, { bold: true, before: 100 }))
              if (day.summary) sections.push(mkp(`  ${day.summary}`, { size: 20 }))
              if (day.objectives?.length) {
                sections.push(mkp('  الأهداف:', { bold: true, size: 20 }))
                day.objectives.forEach(obj => sections.push(mkp(`    ✓ ${obj}`, { size: 18, after: 30 })))
              }
              if (day.teacher_notes) sections.push(mkp(`  ملاحظات: ${day.teacher_notes}`, { size: 18, italic: true }))
              // Day activities from bulk
              const acts = db.dayActs.filter(a => a.day_id === day.id)
              if (acts.length) {
                sections.push(mkp('  الأنشطة المخصصة:', { bold: true, size: 20 }))
                acts.forEach(dsa => {
                  const name = dsa.custom_name || dsa.activities?.name || 'نشاط'
                  const desc = dsa.custom_description || dsa.activities?.description || ''
                  sections.push(mkp(`    • ${name}`, { bold: true, size: 18 }))
                  if (desc) sections.push(mkp(`      ${desc}`, { size: 16, after: 20 }))
                  if (dsa.notes?.length) {
                    dsa.notes.forEach(n => sections.push(mkp(`      📌 ${n}`, { size: 16, after: 15 })))
                  }
                })
              }
            }
          }
        }
      }

      exportProgress.value = 50 + ((lvls.indexOf(lvl) + 1) / lvls.length) * 30
    }

    // Progression (from bulk)
    if (sel.includes('progression') && db.progression.length) {
      sections.push(h1('ملخص التدرّج بين المستويات'))
      db.progression.forEach(row => {
        sections.push(mkp(row.dimension, { bold: true }))
        sections.push(mkp(`  المستوى الأول: ${row.level1_text}`, { size: 20, after: 30 }))
        sections.push(mkp(`  المستوى الثاني: ${row.level2_text}`, { size: 20, after: 30 }))
        sections.push(mkp(`  المستوى الثالث: ${row.level3_text}`, { size: 20, after: 100 }))
      })
    }

    // Tools (from bulk)
    if (sel.includes('tools') && db.tools.length) {
      sections.push(h1('الأدوات والوسائل التعليمية'))
      db.tools.forEach(tool => {
        sections.push(mkp(`• ${tool.name} (${tool.category})${tool.description ? ' - ' + tool.description : ''}${tool.levels?.length ? ' [المستويات: ' + tool.levels.join('، ') + ']' : ''}`))
      })
    }

    exportProgress.value = 85

    const doc = new Document({ sections: [{ properties: { bidi: true }, children: sections }] })
    const blob = await Packer.toBlob(doc)
    exportProgress.value = 95
    const fileName = selectedLevels.value.length === 3 ? 'دليل_معلمات_اللغة_العربية_كامل.docx' : `دليل_المستويات_${selectedLevels.value.join('-')}.docx`
    saveAs(blob, fileName)
    exportProgress.value = 100
    toast.add({ severity: 'success', summary: 'تم التصدير', detail: 'تم تصدير الملف بنجاح', life: 3000 })
  } catch (err) {
    console.error('Export error:', err)
    toast.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء التصدير: ' + err.message, life: 5000 })
  } finally {
    exporting.value = false
    exportProgress.value = 0
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
            <div class="checks-wrap">
              <div v-for="lvl in levelOptions" :key="lvl.value" class="check-item">
                <Checkbox v-model="selectedLevels" :inputId="'lvl'+lvl.value" :value="lvl.value" />
                <label :for="'lvl'+lvl.value">{{ lvl.label }}</label>
              </div>
            </div>
          </div>
          <div class="option-group">
            <label class="option-label">الأقسام المطلوبة</label>
            <div class="checks-wrap">
              <div v-for="sec in sectionOptions" :key="sec.value" class="check-item">
                <Checkbox v-model="selectedSections" :inputId="sec.value" :value="sec.value" />
                <label :for="sec.value">{{ sec.label }}</label>
              </div>
            </div>
          </div>

          <ProgressBar v-if="exporting" :value="exportProgress" :showValue="true" style="height:20px; border-radius:10px; margin-bottom:8px" />

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
            <div v-if="selectedSections.includes('daily')" class="summary-item"><i class="pi pi-calendar" style="color: #FF9F43"></i><span>يشمل السيناريو اليومي لكل يوم مع ملاحظات الأنشطة</span></div>
            <div class="summary-item"><i class="pi pi-bolt" style="color: #51CF66"></i><span>تحميل سريع: كل البيانات تُجلب دفعة واحدة</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
h2 { font-size: 1.15rem; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.export-options { display: flex; flex-direction: column; gap: 20px; }
.option-group { display: flex; flex-direction: column; gap: 8px; }
.option-label { font-weight: 600; font-size: 0.95rem; }
.checks-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.check-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-color); border-radius: 8px; }
.check-item label { font-size: 0.85rem; cursor: pointer; white-space: nowrap; }
.export-btn { background: #845EF7 !important; border-color: #845EF7 !important; height: 48px; font-size: 1rem; font-weight: 600; }
.print-btn { height: 44px; }
.preview-content { display: flex; flex-direction: column; gap: 12px; }
.preview-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-color); border-radius: 8px; font-size: 0.9rem; }
.preview-summary { margin-top: 16px; padding: 16px; background: #F8F0FF; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; }
.summary-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
@media (max-width: 768px) { .export-grid { grid-template-columns: 1fr; } }
</style>
