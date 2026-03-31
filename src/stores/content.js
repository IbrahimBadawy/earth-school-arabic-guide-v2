import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useContentStore = defineStore('content', () => {
  const levels = ref([])
  const weeks = ref([])
  const days = ref([])
  const activities = ref([])
  const comments = ref([])
  const loading = ref(false)

  const levelsData = [
    {
      id: 1,
      name: 'المستوى الأول',
      age_range: '3-4 سنوات',
      students_count: 12,
      color: '#4CAF93',
      icon: 'pi pi-star',
      description: 'الوعي الصوتي والبصري وما قبل الكتابة',
      axes: [
        { id: 1, name: 'الوعي الصوتي', description: 'الوعي الصوتي بالحرف منفرداً وفي أول الكلمات' },
        { id: 2, name: 'الوعي البصري', description: 'الوعي البصري بالحرف وتمييزه' },
        { id: 3, name: 'ما قبل الكتابة', description: 'تمارين ما قبل الكتابة وتمارين الخطوط' }
      ],
      letters: ['ا', 'ب', 'ح', 'د', 'ر', 'س', 'ش', 'ع', 'ف', 'ك', 'ل', 'م', 'ن'],
      session_pattern: [
        { order: 1, name: 'قراءة القصة', duration: 8, icon: 'pi pi-book' },
        { order: 2, name: 'نقاش حول القصة (المفردات والمحتوى)', duration: 7, icon: 'pi pi-comments' },
        { order: 3, name: 'تنفيذ نشاط متعلق بالقصة', duration: 8, icon: 'pi pi-palette' },
        { order: 4, name: 'نشاط للوعي الصوتي بحرف اليوم', duration: 8, icon: 'pi pi-volume-up' },
        { order: 5, name: 'نشاط للوعي البصري بحرف اليوم', duration: 7, icon: 'pi pi-eye' },
        { order: 6, name: 'نشاط فني (خطوط)', duration: 7, icon: 'pi pi-pencil' }
      ]
    },
    {
      id: 2,
      name: 'المستوى الثاني',
      age_range: '4-5 سنوات',
      students_count: 6,
      color: '#FF9F43',
      icon: 'pi pi-star-fill',
      description: 'القراءة والكتابة المبدئية - مقسمين 3 أطفال من المستوى الأول و3 ممارسين',
      axes: [
        {
          id: 1, name: 'القراءة', description: 'مواضع الحرف ودمج الأصوات والتمييز بين الحروف المتشابهة',
          sub_items: [
            'وعي بمواضع الحرف المختلفة في الكلمة (أول، وسط، آخر)',
            'دمج صوتين وأكثر لتكوين كلمة',
            'التمييز بين الحروف المتشابهة شكلاً',
            'تحليل الأصوات والمقاطع داخل الكلمة'
          ]
        },
        {
          id: 2, name: 'الكتابة', description: 'كتابة الأصوات والاتجاه الصحيح والكتابة الإبداعية',
          sub_items: [
            'كتابة الأصوات داخل الكلمة',
            'الكتابة الإبداعية',
            'الاتجاه الصحيح للكتابة',
            'تمارين خطوط أكثر تعقيداً'
          ]
        }
      ],
      session_pattern: [
        { order: 1, name: 'قراءة القصة / مجلس القرآن', duration: 10, icon: 'pi pi-book' },
        { order: 2, name: 'نشاط متعلق بالقصة', duration: 7, icon: 'pi pi-palette' },
        { order: 3, name: 'نقاش حول القصة وكتابة إبداعية', duration: 10, icon: 'pi pi-pencil' },
        { order: 4, name: 'أنشطة للوعي البصري بالحروف في مواضعها', duration: 10, icon: 'pi pi-eye' },
        { order: 5, name: 'أنشطة لدمج الأصوات وتكوين كلمات', duration: 8, icon: 'pi pi-volume-up' }
      ]
    },
    {
      id: 3,
      name: 'المستوى الثالث',
      age_range: '5-6 سنوات',
      students_count: 5,
      color: '#6C63FF',
      icon: 'pi pi-trophy',
      description: 'القراءة والكتابة المتقدمة - مقسمين 3 أطفال من المستوى الثاني وطفلين ممارسين',
      axes: [
        {
          id: 1, name: 'القراءة', description: 'قراءة كلمات وجمل وقصص متدرجة الصعوبة',
          sub_items: [
            'قراءة كلمات بالفتح ثم الكسر ثم الضم',
            'قراءة من كتاب أو بطاقات',
            'قراءة جمل من كلمتين أو ثلاثة',
            'قراءة تشاركية',
            'وعي بالمدود والتاء المربوطة',
            'قراءة جمل أكبر وقصص متدرجة الصعوبة',
            'التفريق بين الحروف المتشابهة صوتاً'
          ]
        },
        {
          id: 2, name: 'الكتابة', description: 'كتابة كلمات كاملة والكتابة الإبداعية',
          sub_items: [
            'كتابة كلمات كاملة بكل أصواتها مع مراعاة التشبيك والاتجاه',
            'الكتابة الإبداعية',
            'كتابة عدد أكبر من الكلمات'
          ]
        }
      ],
      session_patterns: {
        pattern_a: {
          name: 'النمط (أ)',
          steps: [
            { order: 1, name: 'قراءة المعلمة للقصة', duration: 10, icon: 'pi pi-book' },
            { order: 2, name: 'نقاش عن القصة', duration: 8, icon: 'pi pi-comments' },
            { order: 3, name: 'كتابة إبداعية بمفهوم في القصة', duration: 15, icon: 'pi pi-pencil' },
            { order: 4, name: 'نشاط لغوي', duration: 12, icon: 'pi pi-lightbulb' }
          ]
        },
        pattern_b: {
          name: 'النمط (ب)',
          steps: [
            { order: 1, name: 'قراءة تشاركية / ثنائيات', duration: 12, icon: 'pi pi-users' },
            { order: 2, name: 'دراما عن مفهوم نفسي اجتماعي أو إعادة مشهد', duration: 13, icon: 'pi pi-star' },
            { order: 3, name: 'نشاط لغوي', duration: 12, icon: 'pi pi-lightbulb' }
          ]
        }
      }
    }
  ]

  const listeningGoals = [
    { stage: 'التقبّل', goal: 'يألف الطفل الفصحى ويتقبّلها كلغة طبيعية دون نفور أو استغراب' },
    { stage: 'الفهم والاستجابة', goal: 'يفهم توجيهات المعلمة بالفصحى ويتجاوب معها' },
    { stage: 'الإنتاج المبدئي', goal: 'يرد أحياناً على المعلمات بالفصحى بكلمة أو جملة' },
    { stage: 'الدمج في اللعب', goal: 'يستخدم الفصحى في اللعب الدرامي مع المعلمة أو الأقران' },
    { stage: 'الاستماع للنصوص', goal: 'يستمع إلى نصوص فصيحة مناسبة لعمره (قرآن، قصة، حديث، بيت شعر)' },
    { stage: 'إعادة السرد', goal: 'يعيد سرد أحداث القصة أو ما فهمه منها بترتيب منطقي' },
    { stage: 'التفاعل مع المسموع', goal: 'يعطي تعليقاً أو يسأل سؤالاً متعلقاً بما سمعه بالفصحى' },
    { stage: 'استنتاج المعاني', goal: 'يخمّن معاني المفردات الجديدة عليه من خلال السياق' }
  ]

  const progressionTable = [
    {
      dimension: 'الصوتيات',
      level1: 'تمييز الحرف منفرداً',
      level2: 'تحليل ودمج الأصوات + الحركات',
      level3: 'التمييز بين المخارج + الأصوات الطويلة والقصيرة'
    },
    {
      dimension: 'البصري',
      level1: 'ربط الصوت بالشكل المنفرد',
      level2: 'تمييز أشكال الحرف الثلاثة + قراءة كلمات',
      level3: 'وعي بالاتصال + التاء المربوطة + الهمزة'
    },
    {
      dimension: 'الكتابة',
      level1: 'خطوط أساسية + رسوم',
      level2: 'حروف منفصلة + بداية اتصال',
      level3: 'كلمات كاملة متصلة + تعبير كتابي'
    },
    {
      dimension: 'اللغويات',
      level1: '—',
      level2: '—',
      level3: 'مرادفات، أضداد، جذور مشتركة'
    }
  ]

  const activitiesData = {
    1: {
      phonetic: [
        { name: 'لعبة اقفز حين تسمعني', description: 'المعلمة تنطق كلمات والطفل يقفز عندما يسمع كلمة تبدأ بالحرف المطلوب', tools: ['بطاقات الحروف', 'مساحة للحركة'], duration: 8, type: 'حركي' },
        { name: 'ابحث حولك عن كلمة تبدأ بصوت كذا', description: 'الأطفال يبحثون في الغرفة عن أشياء تبدأ بالحرف المطلوب', tools: ['أشياء متنوعة في الغرفة'], duration: 8, type: 'استكشافي' },
        { name: 'أغنية الحرف', description: 'ترديد أغنية أو نشيد يحتوي على الحرف المطلوب بشكل متكرر', tools: ['أغاني الحروف'], duration: 5, type: 'سمعي' },
        { name: 'صندوق الأصوات', description: 'صندوق بداخله أشياء مختلفة يخرج الطفل شيئاً ويقول اسمه وصوته الأول', tools: ['صندوق', 'أشياء صغيرة متنوعة'], duration: 8, type: 'حسي' }
      ],
      visual: [
        { name: 'لعبة عجلة الحروف', description: 'عجلة دوارة عليها حروف يدورها الطفل ويتعرف على الحرف الذي تقف عنده', tools: ['عجلة حروف دوارة'], duration: 7, type: 'تفاعلي' },
        { name: 'ابحث عن الحرف في شريط التهجئة', description: 'الطفل يبحث عن الحرف المطلوب في شريط الحروف المعلق', tools: ['شريط التهجئة'], duration: 5, type: 'بصري' },
        { name: 'لوّن الحرف المطلوب', description: 'ورقة عمل فيها حروف مختلفة والطفل يلون الحرف المطلوب فقط', tools: ['أوراق عمل', 'ألوان'], duration: 7, type: 'فني' },
        { name: 'تكوين الحرف بالصلصال', description: 'تشكيل الحرف باستخدام الصلصال أو المعجون', tools: ['صلصال', 'لوح تشكيل'], duration: 7, type: 'حسي حركي' }
      ],
      writing: [
        { name: 'تتبع الخطوط الأساسية', description: 'تتبع خطوط رأسية وأفقية ومنحنية ودوائر', tools: ['أوراق خطوط', 'أقلام عريضة'], duration: 7, type: 'كتابي' },
        { name: 'الرسم بالرمل', description: 'رسم أشكال وخطوط على صينية رمل', tools: ['صينية رمل', 'عصا خشبية'], duration: 7, type: 'حسي' },
        { name: 'التلوين داخل الإطار', description: 'تلوين أشكال بسيطة مع الحفاظ على حدود الشكل', tools: ['رسومات للتلوين', 'ألوان شمعية'], duration: 7, type: 'فني' }
      ]
    },
    2: {
      reading: [
        { name: 'ابحث عن الحرف المفقود', description: 'كلمة ناقصة حرف والطفل يختار الحرف المناسب من مجموعة حروف', tools: ['بطاقات كلمات', 'بطاقات حروف'], duration: 8, type: 'تفاعلي' },
        { name: 'اختر الموضع الصحيح للحرف', description: 'الطفل يحدد موضع الحرف في الكلمة (أول، وسط، آخر)', tools: ['بطاقات ملونة', 'لوحة مواضع'], duration: 8, type: 'بصري' },
        { name: 'دمج الأصوات', description: 'بطاقات فيها حروف والطفل يدمج الأصوات لتكوين كلمة مع اختيار الصورة المناسبة', tools: ['بطاقات حروف', 'صور'], duration: 10, type: 'سمعي بصري' },
        { name: 'قصص التفريق بين الحروف المتشابهة', description: 'قصص قصيرة تساعد في التفريق بين الحروف المتشابهة شكلاً', tools: ['قصص مصورة'], duration: 8, type: 'سردي' },
        { name: 'كم صوتاً سمعت؟', description: 'المعلمة تقول كلمة والأطفال يحللون عدد الأصوات فيها', tools: ['مكعبات عد'], duration: 7, type: 'سمعي' }
      ],
      writing: [
        { name: 'كتابة الأصوات', description: 'كتابة الحروف التي يسمعها الطفل في الكلمة', tools: ['سبورة صغيرة', 'أقلام'], duration: 8, type: 'كتابي' },
        { name: 'الكتابة الإبداعية', description: 'كل طفل يختار موضوعاً ويعبر عنه بالكتابة والرسم', tools: ['دفتر الكتابة', 'ألوان', 'أقلام'], duration: 10, type: 'إبداعي' },
        { name: 'سهم الكتابة', description: 'ممارسة الاتجاه الصحيح للكتابة من اليمين لليسار', tools: ['ملصقات أسهم', 'أوراق مسطرة'], duration: 5, type: 'تأسيسي' },
        { name: 'تتبع النقاط', description: 'تتبع نقاط مرسومة لتكوين حرف كامل', tools: ['أوراق تتبع', 'أقلام ملونة'], duration: 7, type: 'كتابي' }
      ]
    },
    3: {
      reading: [
        { name: 'قراءة بالحركات', description: 'قراءة كلمات بالفتحة ثم الكسرة ثم الضمة', tools: ['بطاقات كلمات مشكّلة'], duration: 10, type: 'قرائي' },
        { name: 'القراءة من كتاب', description: 'كل طفل يقرأ صفحة من كتاب مناسب لمستواه', tools: ['كتب قراءة متدرجة'], duration: 10, type: 'قرائي' },
        { name: 'قراءة جمل', description: 'قراءة جمل من كلمتين أو ثلاثة مكتوبة على بطاقات', tools: ['بطاقات جمل'], duration: 8, type: 'قرائي' },
        { name: 'قراءة تشاركية', description: 'كل طفل يقرأ جملة من قصة ويتناوبون', tools: ['قصة مشتركة'], duration: 12, type: 'تشاركي' },
        { name: 'امسك الصوت الخفي', description: 'لعبة لاكتشاف المدود والتاء المربوطة في الكلمات', tools: ['بطاقات كلمات بمدود'], duration: 8, type: 'سمعي' },
        { name: 'الحروف المخادعة', description: 'اختيار الحرف الصحيح بين حروف متشابهة صوتياً مثل ت/ط', tools: ['بطاقات اختيار'], duration: 8, type: 'تمييزي' }
      ],
      writing: [
        { name: 'كتابة كلمات كاملة', description: 'كتابة كلمات مع مراعاة التشبيك والاتجاه الصحيح', tools: ['دفتر كتابة', 'أقلام'], duration: 10, type: 'كتابي' },
        { name: 'الكتابة الإبداعية المتقدمة', description: 'كتابة جمل وتعبيرات عن مواضيع مختلفة', tools: ['دفتر التعبير', 'ألوان', 'أقلام'], duration: 12, type: 'إبداعي' },
        { name: 'إملاء مصور', description: 'رسم صورة وكتابة كلمات تصف الرسم', tools: ['ورق أبيض', 'ألوان', 'أقلام'], duration: 10, type: 'إبداعي' }
      ]
    }
  }

  const assessmentTools = {
    level1: {
      phonetic: [
        'هل يميّز صوت الحرف منفرداً؟',
        'هل يطابق بين كلمات تبدأ بنفس الصوت؟',
        'هل يستجيب لألعاب الوعي الصوتي؟'
      ],
      visual: [
        'هل يربط بين صوت الحرف وشكله؟',
        'هل يستخرج الحرف من شريط التهجئة؟',
        'هل يتعرّف على اتجاه رسم الحرف بإصبعه؟'
      ],
      writing: [
        'هل يكوّن الخطوط الأساسية (رأسي، أفقي، منحني)؟',
        'هل يستخدم الصلصال والألوان بشكل مناسب؟',
        'هل يعبّر عن أفكاره برسوم مفهومة؟'
      ]
    },
    level2: {
      reading: [
        'هل يحلّل الأصوات القصيرة في الكلمة؟',
        'هل يدمج صوتين أو ثلاثة لتكوين كلمة؟',
        'هل يدرك الحركات الثلاث (فتحة، ضمة، كسرة)؟',
        'هل يميّز بين الحروف المتشابهة شكلاً؟',
        'هل يميّز الحرف بأشكاله الثلاثة (أول، وسط، آخر)؟',
        'هل يقرأ كلمات ثنائية وثلاثية؟'
      ],
      writing: [
        'هل يكتب الحروف في صورتها المنفصلة؟',
        'هل يميّز الاتجاه الصحيح للكتابة؟',
        'هل يكتب أصوات الكلمة؟',
        'هل يصف أفكاره برسوم وكلمات؟'
      ]
    },
    level3: {
      reading: [
        'هل يميّز بين الحروف المتشابهة في المخرج؟',
        'هل يفرّق بين الصوت الطويل والقصير؟',
        'هل يدرك التاء المربوطة والهمزة؟',
        'هل يعيد ترتيب كلمات لتكوين جمل؟',
        'هل يعي الحروف التي تتصل والتي لا تتصل؟'
      ],
      writing: [
        'هل يراعي الاتجاه الصحيح للكتابة؟',
        'هل يكتب كلمات كاملة مع الاتصال؟',
        'هل يستعين بشريط التهجئة؟',
        'هل يعبّر عن أفكاره بكلمات كاملة؟'
      ],
      linguistics: [
        'هل يدرك المرادفات والأضداد؟',
        'هل يدرك الكلمات ذات الجذر المشترك؟'
      ]
    }
  }

  const toolsList = [
    { name: 'بطاقات الحروف', category: 'بطاقات', icon: 'pi pi-id-card', levels: [1, 2, 3] },
    { name: 'شريط التهجئة', category: 'وسائل تعليمية', icon: 'pi pi-bars', levels: [1, 2, 3] },
    { name: 'صلصال', category: 'أدوات حسية', icon: 'pi pi-circle', levels: [1] },
    { name: 'ألوان شمعية', category: 'أدوات فنية', icon: 'pi pi-palette', levels: [1, 2] },
    { name: 'أقلام عريضة', category: 'أدوات كتابة', icon: 'pi pi-pencil', levels: [1] },
    { name: 'أوراق عمل', category: 'مطبوعات', icon: 'pi pi-file', levels: [1, 2, 3] },
    { name: 'صينية رمل', category: 'أدوات حسية', icon: 'pi pi-box', levels: [1] },
    { name: 'عجلة الحروف', category: 'ألعاب تعليمية', icon: 'pi pi-sync', levels: [1] },
    { name: 'بطاقات كلمات', category: 'بطاقات', icon: 'pi pi-id-card', levels: [2, 3] },
    { name: 'بطاقات جمل', category: 'بطاقات', icon: 'pi pi-id-card', levels: [3] },
    { name: 'كتب قراءة متدرجة', category: 'كتب', icon: 'pi pi-book', levels: [3] },
    { name: 'قصص مصورة', category: 'كتب', icon: 'pi pi-book', levels: [1, 2, 3] },
    { name: 'سبورة صغيرة', category: 'أدوات كتابة', icon: 'pi pi-tablet', levels: [2, 3] },
    { name: 'دفتر الكتابة', category: 'أدوات كتابة', icon: 'pi pi-book', levels: [2, 3] },
    { name: 'مكعبات عد', category: 'ألعاب تعليمية', icon: 'pi pi-th-large', levels: [2] },
    { name: 'ملصقات أسهم', category: 'وسائل تعليمية', icon: 'pi pi-arrow-right', levels: [2] },
    { name: 'لوحة المواضع', category: 'وسائل تعليمية', icon: 'pi pi-map', levels: [2] },
    { name: 'مكتبة المدرسة', category: 'كتب', icon: 'pi pi-building', levels: [1, 2, 3] }
  ]

  // Supabase functions
  async function fetchWeek(weekId) {
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .eq('id', weekId)
      .single()
    return data
  }

  async function fetchDay(dayId) {
    const { data, error } = await supabase
      .from('days')
      .select('*, weeks(level_id, week_number, letter, title)')
      .eq('id', dayId)
      .single()
    return data
  }

  async function fetchWeeks(levelId) {
    loading.value = true
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .eq('level_id', levelId)
      .order('week_number')
    if (!error) weeks.value = data || []
    loading.value = false
    return data
  }

  async function fetchDays(weekId) {
    loading.value = true
    const { data, error } = await supabase
      .from('days')
      .select('*, day_activities(*)')
      .eq('week_id', weekId)
      .order('day_number')
    if (!error) days.value = data || []
    loading.value = false
    return data
  }

  async function fetchComments(dayId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(full_name, role)')
      .eq('day_id', dayId)
      .order('created_at', { ascending: false })
    if (!error) comments.value = data || []
    return data
  }

  async function addComment(dayId, content) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ day_id: dayId, content, user_id: (await supabase.auth.getUser()).data.user.id })
      .select('*, profiles(full_name, role)')
      .single()
    if (!error && data) {
      comments.value.unshift(data)
    }
    return { data, error }
  }

  async function markDayComplete(dayId, notes) {
    const { error } = await supabase
      .from('days')
      .update({ is_completed: true, completion_notes: notes, completed_at: new Date().toISOString() })
      .eq('id', dayId)
    return { error }
  }

  function getLevelData(levelId) {
    return levelsData.find(l => l.id === Number(levelId))
  }

  function getActivities(levelId) {
    return activitiesData[Number(levelId)] || {}
  }

  function getAssessment(levelId) {
    const key = `level${levelId}`
    return assessmentTools[key] || {}
  }

  return {
    levels, weeks, days, activities, comments, loading,
    levelsData, listeningGoals, progressionTable, activitiesData, assessmentTools, toolsList,
    fetchWeek, fetchDay, fetchWeeks, fetchDays, fetchComments, addComment, markDayComplete,
    getLevelData, getActivities, getAssessment
  }
})
