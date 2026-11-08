import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Gift,
  KeyRound,
  CreditCard,
  Briefcase,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "دليل متجهات التهديد والهندسة الاجتماعية | فَطِن FATIN Security",
  description:
    "مرجع أمني وتحليلي لأبرز أساليب التصيد الإلكتروني وسرقة الحسابات والاحتيال المالي المتقدم وكيفية التصدي لها.",
};

const scamCategories = [
  {
    id: "telecom-prizes",
    icon: Gift,
    title: "جوائز الاتصالات والسحوبات الوهمية",
    badge: "شائع جداً عبر SMS وواتساب",
    description:
      "رسائل تدّعي فوزك بجائزة نقدية ضخمة أو سيارة أو رصيد مجاني من شركات مثل زين، آسياسيل، أو كورك، وتطلب الاتصال برقم أو إدخال بيانات لاستلام الجائزة.",
    redFlags: [
      "طلب تحويل رصيد أو دفع رسوم 'ضريبة' أو 'شحن' لاستلام الجائزة.",
      "رابط خارجي مشبوه لا ينتهي بالنطاق الرسمي للشركة.",
      "لم تشترك بأي مسابقة رسمية مسبقاً وتفاجأ برسالة الفوز.",
    ],
    protection: "شركات الاتصالات الرسمية تعلن عن مسابقاتها وفائزيها حصراً عبر قنواتها الموثقة وتطبيقاتها، ولا تطلب تحويل رصيد أو دفع مبالغ مسبقة لاستلام أي جائزة.",
  },
  {
    id: "whatsapp-takeover",
    icon: KeyRound,
    title: "سرقة حسابات واتساب (كود التحقق)",
    badge: "خطير جداً",
    description:
      "رسالة من صديق أو رقم مجهول يقول: 'دزيت لك كود بالغلط على خطك، فدوة دزلي اياه'. الكود هو كود تسجيل الدخول إلى حسابك على واتساب!",
    redFlags: [
      "أي شخص مهما كانت قرابته يطلب رمز التحقق المكون من 6 أرقام.",
      "وصول رسالة من واتساب تحتوي على رمز سري لم تطلبه أنت.",
      "الاستعجال الشديد والادعاء بأن الأمر طارئ ومحرج.",
    ],
    protection: "لا تشارك رمز التحقق المكون من 6 أرقام مع أي كائن كان، حتى لو كان الرسالة من حساب والدتك أو أخيك (لأن حسابهم قد يكون مخترقاً). فعّل ميزة 'التحقق بخطوتين' برقم تعريف شخصي.",
  },
  {
    id: "fake-wallets",
    icon: CreditCard,
    title: "صفحات المصارف والمحافظ المزيفة",
    badge: "يستهدف زين كاش وكي كارد والمصارف",
    description:
      "رسالة تخيفك بأن 'محفظتك أو بطاقتك معلقة' أو 'تحتاج إلى تحديث بياناتك فوراً لتجنب إيقاف الحساب'، مرفقة برابط لصفحة تشبه موقع البنك تماماً.",
    redFlags: [
      "رسالة تخلق حالة من الذعر لإجبارك على الضغط بسرعة.",
      "رابط غير رسمي يحتوي أخطاء إملائية أو نطاقات غير مألوفة.",
      "الصفحة تطلب منك رقم البطاقة الكامل، وتاريخ الانتهاء، والرمز السري (PIN / OTP).",
    ],
    protection: "المصارف والمحافظ لا تطلب منك تحديث بياناتك عبر رابط نصي عشوائي أبداً. إذا كان لديك شك، افتح تطبيق المحفظة الرسمي مباشرة أو اتصل بالرقم المطبوع على ظهر بطاقتك.",
  },
  {
    id: "fake-jobs",
    icon: Briefcase,
    title: "الوظائف الوهمية والعمل عن بعد",
    badge: "ينتشر على تليجرام وإنستغرام",
    description:
      "عروض عمل برواتب دولارية مغرية جداً لمهام بسيطة (مثل وضع إعجاب لفيديوهات أو كتابة تقييمات)، تطلب في النهاية دفع رسوم تسجيل أو شحن رصيد منصة لبدء العمل.",
    redFlags: [
      "راتب مرتفع جداً مقابل مهام لا تتطلب أي خبرة أو جهد.",
      "طلب مبالغ مالية مسبقة تحت مسمى 'رسوم تدريب' أو 'اشتراك منصة'.",
      "التواصل يتم فقط عبر أرقام واتساب أجنبية مجهولة أو معرفات تليجرام عشوائية.",
    ],
    protection: "الوظيفة الحقيقية تدفع لك مقابل عملك، ولا تطلب منك أن تدفع لها فلساً واحداً لتبدأ.",
  },
  {
    id: "fake-delivery",
    icon: Package,
    title: "رسوم الجمارك وطرود التوصيل الوهمية",
    badge: "شائع عبر الرسائل القصيرة",
    description:
      "رسالة تزعم وجود طرد بانتظارك، وتطلب دفع مبلغ رمزي جداً (مثل دولارين أو 3 آلاف دينار) كرسوم جمركية أو تحديث لعنوان التوصيل من خلال رابط إلكتروني.",
    redFlags: [
      "لم تطلب أي شحنة أو طرد من الخارج مؤخراً.",
      "الرابط يطلب منك إدخال بيانات بطاقتك المصرفية لدفع المبلغ الرمزي.",
      "الموقع مصمم لسرقة بيانات البطاقة وسحب مبالغ كبيرة لاحقاً.",
    ],
    protection: "تتبع شحناتك فقط عبر الموقع الرسمي للشركة التي اشتريت منها، ولا تدخل بطاقتك في أي رابط يصلك عبر رسالة مجهولة.",
  },
  {
    id: "family-impersonation",
    icon: Users,
    title: "انتحال صفة الأقارب والأصدقاء",
    badge: "نصب اجتماعي عاطفي",
    description:
      "رسالة من رقم مجهول بصورة صديق أو قريب: 'هذا رقمي الجديد، سويت حادث أو عندي ظرف طارئ ومحتاج تحول لي مبلغ زين كاش سريع ورجعه لك باجر'.",
    redFlags: [
      "رقم غير معروف يدّعي أنه شخص مقرب بدون اتصال صوتي.",
      "طلب نقود فوري ومستعجل مع رفض الرد على المكالمات بحجة 'المكان مزدحم' أو 'سماعة الهاتف معطلة'.",
      "إصرار على التحويل السريع لمحفظة أو حساب شخص آخر.",
    ],
    protection: "اتصل مباشرة بالرقم القديم للشخص نفسه أو تواصل مع أحد أفراد عائلته للتأكد قبل تحويل أي دينار.",
  },
  {
    id: "guaranteed-investments",
    icon: TrendingUp,
    title: "الاستثمارات المضمونة وتداول العملات",
    badge: "مجموعات تليجرام وتطبيقات وهمية",
    description:
      "دعوات للانضمام إلى منصات تدّعي 'أرباح يومية مضمونة بنسبة 20%' في الذهب أو الكريبتو مع وجود مدير حساب يساعدك على مضاعفة أموالك.",
    redFlags: [
      "وعد بأرباح خيالية 'مضمونة بدون أي خسارة' (لا يوجد استثمار مضمون بلا مخاطر).",
      "المنصة تطلب إيداعاً أولياً، وتعرض أرباحاً وهمية على الشاشة، ثم تطلب مبالغ إضافية بحجة 'رسوم سحب الأرباح'.",
      "لا توجد تراخيص مصرفية أو قانونية معلنة للجهة.",
    ],
    protection: "لا يوجد استثمار في العالم يضمن ربحاً ثابتاً مرتفعاً. أي جهة تطلب دفع أموال لسحب أرباحك هي عملية نصب مؤكدة.",
  },
  {
    id: "sextortion-threats",
    icon: AlertTriangle,
    title: "الابتزاز الإلكتروني والتهديدات المفبركة",
    badge: "خطير نفسياً",
    description:
      "رسائل تزعم اختراق كاميرا هاتفك والتقاط صور حساسة لك، أو تركيب صور ومقاطع مفبركة بالذكاء الاصطناعي، وطلب فدية مالية مقابل عدم نشرها لأصدقائك.",
    redFlags: [
      "رسائل تحتوي على كلمة مرور قديمة سربت من مواقع مخترقة لإيهامك بالاختراق.",
      "لغة تهديد وتحديد مهلة زمنية قصيرة للدفع بالعملات الرقمية أو المحافظ.",
      "عدم تقديم أي دليل حقيقي وملموس على امتلاك صور أو بيانات حديثة.",
    ],
    protection: "لا تدفع الفدية أبداً (الدفع يشجع المبتز على طلب المزيد). قم بحظر المبتز فوراً واحتفظ بلقطات الشاشة كأدلة، وتواصل مع الجهات الأمنية المختصة بمكافحة الجرائم الإلكترونية.",
  },
];

export default function ScamsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-brand-primary hover:underline mb-4 font-medium"
        >
          <ArrowLeft size={16} className="rotate-180" />
          <span>العودة إلى المحرك الأمني</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          دليل متجهات التهديد والهندسة الاجتماعية
        </h1>
        <p className="text-base sm:text-lg text-muted leading-relaxed">
          الاحتيال الإلكتروني لا يعتمد على ذكاء خارق، بل يستغل المشاعر الإنسانية: الطمع في جائزة، الخوف من إيقاف الحساب، أو الرغبة في مساعدة قريب. تعرف على الطرق الأكثر شيوعاً لتكون على دراية بها وتحمي من حولك.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="space-y-8">
        {scamCategories.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.id}
              id={item.id}
              className="p-6 rounded-2xl border border-border bg-surface shadow-soft transition-all scroll-mt-24"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
                    <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-surface-2 text-muted border border-border font-medium">
                      {item.badge}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-foreground/90 text-sm leading-relaxed mb-6">{item.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/70 text-xs">
                {/* Red flags */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-border/50">
                  <h3 className="font-semibold text-verdict-danger flex items-center gap-1.5 mb-2.5">
                    <XCircle size={16} />
                    <span>علامات الخطر في الرسالة:</span>
                  </h3>
                  <ul className="space-y-1.5 text-foreground/80 list-disc list-inside">
                    {item.redFlags.map((flag, idx) => (
                      <li key={idx} className="leading-normal">{flag}</li>
                    ))}
                  </ul>
                </div>

                {/* Protection */}
                <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
                  <h3 className="font-semibold text-brand-primary flex items-center gap-1.5 mb-2.5">
                    <CheckCircle2 size={16} />
                    <span>كيف تتصرف صح:</span>
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">{item.protection}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* General Golden Rule Box */}
      <div className="mt-12 p-6 rounded-2xl border border-brand-primary/40 bg-surface-2 shadow-card text-center">
        <div className="inline-flex p-3 rounded-full bg-brand-primary/10 text-brand-primary mb-3">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">القاعدة الذهبية للأمان</h2>
        <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed mb-6">
          رمز التحقق (OTP) أو كلمة المرور أو رمز البطاقة السري هي مثل مفتاح دارك. لا تعطيها لأحد بالهاتف أو الرسائل مهما ادعى، فالجهات الحقيقية لا تطلبها منك أبداً.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-95 transition-opacity"
        >
          <span>عندك رسالة مشكوك فيها؟ افحصها هسه</span>
        </Link>
      </div>
    </div>
  );
}
