# مدرسة الأرض - دليل معلمات اللغة العربية

## المشروع
تطبيق ويب شامل (حقيبة معلمة) لفقرة اللغة العربية في مدرسة الأرض. يشمل دليل تفصيلي لجميع المستويات الثلاثة مع سيناريوهات يومية وأنشطة وأدوات تقييم.

## التقنيات
- **Frontend**: Vue 3 + Vite + PrimeVue + Pinia + Vue Router
- **Backend**: Supabase (Auth + Database + RLS)
- **Styling**: PrimeVue Aura theme + Custom CSS + animate.css
- **Export**: docx library for Word export
- **Deployment**: GitHub Pages

## البنية
```
src/
├── router/          # Vue Router configuration
├── stores/          # Pinia stores
├── views/           # Page components
│   ├── auth/        # Login pages
│   ├── admin/       # Admin dashboard & management
│   └── teacher/     # Teacher guide views
├── components/      # Reusable components
│   ├── common/      # Shared components
│   ├── content/     # Content display components
│   └── admin/       # Admin-specific components
├── layouts/         # App layout (AppBar, Sidebar)
├── lib/             # Supabase client & utilities
└── assets/          # Static assets & styles
```

## المنهج
- **المستوى الأول**: أطفال 3-4 سنوات (12 طفل) - الوعي الصوتي والبصري وما قبل الكتابة
- **المستوى الثاني**: أطفال 4-5 سنوات (6 أطفال) - القراءة والكتابة المبدئية
- **المستوى الثالث**: أطفال 5-6 سنوات (5 أطفال) - القراءة والكتابة المتقدمة

## الوحدة التعليمية
- مدة الوحدة: 12 أسبوع
- عدد الحصص: مرتين في الأسبوع
- مدة الحصة: 45 دقيقة
- كل حصة تبدأ بقراءة قصة من مكتبة المدرسة

## المستخدمون
- **Admin**: إدارة كاملة (مستخدمين، محتوى، تقارير)
- **معلمة**: عرض المحتوى حسب الصلاحيات، إضافة تعليقات

## القواعد
- الموقع RTL بالكامل
- التصميم فاتح وجذاب مع animations
- Responsive لجميع الأجهزة
- PrimeVue components مع Aura theme
- اللغة العربية هي اللغة الأساسية
