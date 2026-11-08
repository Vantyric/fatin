"use client";

import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  KeyRound,
  MessageSquareWarning,
  Send,
  Download,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
} from "lucide-react";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScenario?: string;
}

interface ScenarioDetails {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  urgentNotice: string;
  steps: Array<{
    title: string;
    details: string;
  }>;
}

const EMERGENCY_SCENARIOS: ScenarioDetails[] = [
  {
    id: "otp",
    title: "شاركت رمز التحقق (OTP) أو كود التفعيل",
    desc: "أرسلت رمز الدخول السري المكون من 6 أرقام لشخص ما.",
    icon: <MessageSquareWarning size={20} className="text-verdict-danger" />,
    urgentNotice: "قد يحاول المهاجم الآن فتح حسابك أو سحب جلسات تسجيل الدخول.",
    steps: [
      {
        title: "إنهاء الجلسات المفتوحة فوراً",
        details: "إذا كان الرمز يخص واتساب: افتح التطبيق > الإعدادات > الأجهزة المرتبطة > واضغط (تسجيل الخروج) من أي جهاز متصل.",
      },
      {
        title: "تفعيل التحقق بخطوتين (PIN)",
        details: "من إعدادات الحساب، فعّل ميزة التحقق بخطوتين برمز سري من 6 أرقام تحفظه بنفسك وبريد إلكتروني للطوارئ.",
      },
      {
        title: "تحذير جهات الاتصال الخاصة بك",
        details: "انشر تنبيهاً سريعاً لأصدقائك ومجموعاتك بأن حسابك تعرض لمحاولة اختراق وألا يصدقوا أي طلب لتحويل رصيد أو مال باسمك.",
      },
      {
        title: "تغيير كلمة مرور البريد الإلكتروني المرتبط",
        details: "غيّر كلمة مرور حسابك البريدي (Gmail أو iCloud) للتأكد من عدم وصول المهاجم لأي رسائل استرداد.",
      },
    ],
  },
  {
    id: "password",
    title: "أدخلت كلمة المرور أو اسم المستخدم في صفحة مشبوهة",
    desc: "كتبت كلمة سر حسابك أو بريدك في رابط غير موثوق.",
    icon: <KeyRound size={20} className="text-verdict-warning" />,
    urgentNotice: "المهاجم يمتلك بيانات الدخول الآن، السرعة مطلوبة قبل أن يغير هو كلمة المرور.",
    steps: [
      {
        title: "تغيير كلمة المرور فوراً من الموقع أو التطبيق الرسمي",
        details: "افتح التطبيق الرسمي أو الموقع الحقيقي للخدمة (وليس الرابط الذي فتحته)، وغيّر كلمة السر إلى كلمة جديدة قوية وغير مكررة.",
      },
      {
        title: "تسجيل الخروج من كل الأجهزة",
        details: "اختر خيار (تسجيل الخروج من جميع الجلسات والأجهزة الأخرى) أثناء تغيير كلمة المرور.",
      },
      {
        title: "تغيير الحسابات الأخرى التي تستخدم نفس كلمة السر",
        details: "إذا كنت تستخدم نفس كلمة المرور في حسابات بنكية أو بريدك الإلكتروني، غيّرها فوراً ولا تكرر نفس الرمز أبداً.",
      },
      {
        title: "فحص طرق الاسترداد",
        details: "تأكد من أن رقم الهاتف وبريد الاسترداد المسجلين في حسابك هما أرقامك الشخصية ولم يتم تغييرهما.",
      },
    ],
  },
  {
    id: "money",
    title: "حوّلت أموالاً أو رصيد شحن للمحتال",
    desc: "أرسلت مبالغ عبر زين كاش، كي كارد، محفظة، أو رصيد هاتف.",
    icon: <Send size={20} className="text-verdict-danger" />,
    urgentNotice: "المعاملات المالية تحتاج تدخلاً عاجلاً لإيقافها أو توثيقها رسمياً.",
    steps: [
      {
        title: "الاتصال المباشر بالمصرف أو مزود المحفظة",
        details: "اتصل فوراً عبر الرقم المطبوع خلف بطاقتك المصرفية أو الرقم الرسمي لمزود المحفظة (زين كاش، كي كارد) للإبلاغ عن عملية احتيال وطلب تجميد الحساب المستلم إن أمكن.",
      },
      {
        title: "حفظ وتوثيق كافة الأدلة",
        details: "التقط لقطات شاشة (Screenshots) واضحة لرسائل المحادثة، إيصال التحويل، رقم الهاتف، ورقم الحساب أو المحفظة التي تم التحويل لها.",
      },
      {
        title: "عدم إرسال أي مبالغ إضافية تحت أي ذريعة",
        details: "المحتال سيزعم غالباً أنك تحتاج لدفع 'رسوم استرداد' أو 'رسوم نظامية' لاسترجاع أموالك؛ هذا فخ ثانٍ، لا تدفع درهماً واحداً.",
      },
      {
        title: "تقديم بلاغ رسمي",
        details: "توجه إلى أقرب مركز شرطة أو تواصل مع مديرية مكافحة الجريمة المنظمة والإلكترونية الرسمية وقدم لقطات المحادثة والإيصال.",
      },
    ],
  },
  {
    id: "app",
    title: "حمّلت تطبيقاً خارجياً أو ملفاً (.apk / AnyDesk)",
    desc: "ثبتّ تطبيقاً من خارج المتجر أو منحت شخصاً تحكماً عن بعد.",
    icon: <Download size={20} className="text-verdict-danger" />,
    urgentNotice: "قد يحتوي التطبيق على برمجية تجسس أو تحكم كامل بجهازك وقراءة رسائلك.",
    steps: [
      {
        title: "قطع الاتصال بالإنترنت فوراً (وضع الطيران)",
        details: "افصل الواي فاي وبيانات الهاتف فوراً أو شغّل وضع الطيران لمنع التطبيق من إرسال بياناتك أو استقبال أوامر خارجية.",
      },
      {
        title: "حذف التطبيق فوراً من إدارة التطبيقات",
        details: "اذهب إلى إعدادات الهاتف > التطبيقات > ابحث عن التطبيق المشبوه أو أي تطبيق تحكم عن بعد (مثل AnyDesk أو TeamViewer أو RustDesk) وقم بإلغاء تثبيته.",
      },
      {
        title: "فحص أمان الجهاز (Google Play Protect)",
        details: "افتح متجر Google Play > اضغط على صورة حسابك > Play Protect > واضغط (فحص) لاكتشاف أي برمجيات ضارة خفية.",
      },
      {
        title: "تغيير كلمات المرور من جهاز آخر نظيف",
        details: "استخدم جهازاً آخر غير المصاب لتغيير كلمات مرور حساباتك المصرفية وحسابات التواصل الاجتماعي.",
      },
    ],
  },
  {
    id: "link",
    title: "فتحت رابطاً مشبوهاً وسجلت بيانات شخصية",
    desc: "فتحت موقعاً غير معروف وشاركت اسمك أو بطاقتك أو معلوماتك.",
    icon: <Link2 size={20} className="text-verdict-warning" />,
    urgentNotice: "الروابط المزورة تسجل مدخلاتك بمجرد الضغط على إرسال.",
    steps: [
      {
        title: "إغلاق الصفحة ومسح سجل المتصفح",
        details: "أغلق علامة التبويب المشبوهة فوراً، وادخل إلى إعدادات المتصفح وامسح ملفات تعريف الارتباط (Cookies) وبيانات الموقع.",
      },
      {
        title: "إذا أدخلت أرقام بطاقتك المصرفية",
        details: "ادخل إلى تطبيق البنك الرسمي فوراً وقم بـ (إيقاف مؤقت للبطاقة / Freeze Card)، أو اتصل بالبنك فوراً واطلب إلغاء البطاقة واستبدالها.",
      },
      {
        title: "احذر المكالمات اللاحقة المنتحلة",
        details: "سيتصل بك المحتال لاحقاً منتحلاً صفة 'الدعم الفني للمصرف' أو 'الأمن السيبراني' مستغلاً البيانات التي عرفها عنك؛ تذكر أن البنك لا يطلب أسرارك هاتفياً.",
      },
    ],
  },
  {
    id: "blackmail",
    title: "ابتزاز بصور شخصية أو تسجيلات أو محادثات",
    desc: "شخص يهددك بنشر محتوى خاص بك إذا لم تدفع أو تنفذ طلباته.",
    icon: <AlertTriangle size={20} className="text-verdict-danger" />,
    urgentNotice: "أهم قاعدة: لا تدفع أبداً ولا ترضخ للتهديد، لأن الدفع يفتح باب طلبات لا تنتهي.",
    steps: [
      {
        title: "لا تدفع فلساً واحداً ولا تنفذ أي طلب",
        details: "المبتز لن يحذف الصور بعد استلام المال، بل سيزيد من قيمة الطلبات لأنه عرف أن التهديد يؤتي ثماره.",
      },
      {
        title: "لا تحذف المحادثات أو الحساب",
        details: "احتفظ بكافة لقطات الشاشة (Screenshots) للمحادثة، اسم المستخدم، ورابط الحساب، ورقم الهاتف، لأنها الأدلة الجنائية الوحيدة لإدانته.",
      },
      {
        title: "إغلاق وتأمين حساباتك الشخصية",
        details: "حوّل حساباتك على إنستغرام وفيسبوك وتيليجرام إلى (خاص / Private)، وأخفِ قائمة الأصدقاء والمتابعين حتى لا يستطيع التواصل مع عائلتك.",
      },
      {
        title: "التوجه للجهات الأمنية المختصة بسرية تامة",
        details: "تعامل السلطات الرسمية (مديرية مكافحة الجريمة الإلكترونية والشرطة المجتمعية) قضايا الابتزاز بسرية تامة وبدون أي تشهير، وتستطيع تتبع المبتز والقبض عليه قانونياً.",
      },
    ],
  },
];

export function EmergencyModal({ isOpen, onClose, initialScenario }: EmergencyModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialScenario || null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentScenario = EMERGENCY_SCENARIOS.find((s) => s.id === selectedId);

  const handleCopySteps = () => {
    if (!currentScenario) return;
    const text = `🚨 إجراءات طوارئ عاجلة من فَطِن (${currentScenario.title}):\n\n` +
      currentScenario.steps.map((st, i) => `${i + 1}. ${st.title}:\n${st.details}`).join("\n\n") +
      `\n\nتأكد وتحقق دائماً عبر فَطِن: https://fatin.iq`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-surface border-2 border-verdict-danger/40 shadow-2xl overflow-hidden text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-verdict-danger/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-surface text-verdict-danger border border-verdict-danger/30">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 id="emergency-modal-title" className="font-black text-foreground text-lg">
                إجراءات الطوارئ: سويت اللي طلبه!
              </h2>
              <p className="text-xs text-muted">
                خطوات فورية للحد من الأضرار واستعادة الأمان وحماية نفسك.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface-2 transition-colors touch-target"
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {!selectedId || !currentScenario ? (
            // Scenario Selection
            <div className="space-y-3">
              <p className="font-semibold text-foreground text-sm">
                اختر التصرف الذي قمت به لتطبيق الخطوات المناسبة فوراً:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {EMERGENCY_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedId(sc.id)}
                    className="p-3.5 rounded-2xl border border-border bg-surface-2/60 hover:bg-surface-2 hover:border-brand-primary/40 transition-all flex items-center justify-between gap-3 text-start touch-target group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-surface border border-border shrink-0">
                        {sc.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm group-hover:text-brand-primary transition-colors">
                          {sc.title}
                        </h4>
                        <p className="text-[11px] text-muted leading-relaxed">{sc.desc}</p>
                      </div>
                    </div>
                    <ChevronLeft size={18} className="text-muted group-hover:text-brand-primary shrink-0 transition-transform group-hover:-translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Active Scenario Steps
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-xs text-brand-primary font-bold hover:underline flex items-center gap-1"
              >
                ← العودة لاختيار تصرف آخر
              </button>

              <div className="p-4 rounded-2xl bg-verdict-danger/10 border border-verdict-danger/30 space-y-1.5">
                <div className="flex items-center gap-2 text-verdict-danger font-bold text-sm">
                  {currentScenario.icon}
                  <h4>{currentScenario.title}</h4>
                </div>
                <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                  {currentScenario.urgentNotice}
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                  الخطوات المرتبة للتعامل مع الخطر الآن:
                </h5>
                <ol className="space-y-3">
                  {currentScenario.steps.map((st, i) => (
                    <li
                      key={i}
                      className="p-3.5 rounded-xl border border-border bg-surface-2/40 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-brand-primary text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="space-y-1">
                        <h6 className="font-bold text-foreground text-xs sm:text-sm">
                          {st.title}
                        </h6>
                        <p className="text-xs text-foreground/80 leading-relaxed">
                          {st.details}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-2/50 flex items-center justify-between gap-3 shrink-0">
          {currentScenario ? (
            <button
              type="button"
              onClick={handleCopySteps}
              className="px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-surface-2 transition-colors touch-target"
            >
              {copied ? <Check size={14} className="text-verdict-safe" /> : <Copy size={14} />}
              <span>{copied ? "تم نسخ الخطوات!" : "نسخ الخطوات"}</span>
            </button>
          ) : (
            <span className="text-[11px] text-muted">
              لا ترتبك، التصرف السريع ينقذ حسابك وأموالك.
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground font-bold text-xs hover:bg-surface-2 transition-colors touch-target"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
