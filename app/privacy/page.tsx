import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, EyeOff, Trash2, Database, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "الخصوصية والامتثال | FATIN Security Zero-Log Architecture",
  description:
    "معمارية الخصوصية الصارمة: حجب البيانات الحساسة فورياً، تشفير البصمات، وانعدام التخزين (Zero-Log Architecture).",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-brand-primary hover:underline mb-4 font-medium"
        >
          <ArrowLeft size={16} className="rotate-180" />
          <span>العودة للرئيسية</span>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-3">الخصوصية والامتثال الأمني (Zero-Log)</h1>
        <p className="text-sm text-muted">آخر تحديث: 2026. خصوصيتك وحماية بياناتك مبنية في صميم معمارية المحرك الأمني برمجياً (Private by Architecture).</p>
      </div>

      <div className="space-y-6 text-foreground/90 text-sm leading-relaxed">
        {/* Core summary */}
        <div className="p-5 rounded-2xl bg-surface border border-brand-primary/30 flex items-start gap-4">
          <ShieldCheck size={28} className="text-brand-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-base text-foreground mb-1">المبدأ الأساسي (Private by Architecture)</h2>
            <p className="text-muted text-xs sm:text-sm">
              نحن لا نبيع بياناتك، ولا نربط استفساراتك بهويتك الشخصية، ولا نحتفظ بنصوصك أو صورك. صُممت المنصة كأداة أمنية استباقية محايدة لكشف التهديدات وحماية المستخدمين عالمياً.
            </p>
          </div>
        </div>

        {/* Section 1: Masking */}
        <section className="p-6 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <EyeOff size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">1. حجب البيانات الشخصية والحساسة (PII Redaction)</h2>
          </div>
          <p className="mb-3 text-muted text-xs sm:text-sm">
            قبل أن يُحلل أي نص عبر المحرك، تقوم خوارزميات الـ Redaction المحلية في الخادم باستبدال وعزل كافة البيانات الحساسة:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm list-inside">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0" />
              <span>أرقام الهواتف الدولية والمحلية (E.164: +1, +44, +971, +964, إلخ) تُعزل برمز <code>[هاتف]</code></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0" />
              <span>أرقام البطاقات المصرفية وحسابات الـ IBAN الدولية تُعزل برمز <code>[بطاقة]</code></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0" />
              <span>عناوين محافظ العملات الرقمية المشفرة (BTC, ETH, USDT) تُعزل برمز <code>[REDACTED]</code></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0" />
              <span>رموز التحقق المؤقتة (OTP) وكلمات المرور تُعزل برمز <code>[رمز]</code></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0" />
              <span>عناوين البريد الإلكتروني تُعزل برمز <code>[بريد]</code></span>
            </li>
          </ul>
        </section>

        {/* Section 2: Storage */}
        <section className="p-6 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <Database size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">2. التخزين وسجل الفحوصات</h2>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-muted">
            <p>
              <strong className="text-foreground">للزوار بدون تسجيل:</strong> لا يتم تخزين نص الرسالة، ولا الرابط، ولا الصورة إطلاقاً في قواعد بياناتنا. يتم فقط احتساب عدد الفحوصات اليومية عبر معرّف مشفر (Salted Hash) لمنع استنزاف الخدمة.
            </p>
            <p>
              <strong className="text-foreground">للمستخدمين المسجلين:</strong> يكون خيار «حفظ سجل الفحوصات» <strong>معطلاً افتراضياً</strong>. إذا قمت بتفعيله بنفسك من الإعدادات، يتم حفظ ملخص التحليل ومقتطف مموّه خالٍ من البيانات الحساسة فقط لتتمكن من مراجعته لاحقاً، ولا يتم تخزين الصور أبداً.
            </p>
          </div>
        </section>

        {/* Section 3: Data Deletion */}
        <section className="p-6 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-verdict-danger/10 text-verdict-danger">
              <Trash2 size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">3. حق الحذف الفوري والكامل</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            إذا كنت مستخدماً مسجلاً، يمكنك بضغطة زر واحدة من صفحة حسابك:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs sm:text-sm list-disc list-inside text-muted">
            <li>حذف كامل سجل الفحوصات فورياً من قاعدة البيانات.</li>
            <li>حذف الحساب نهائياً مع كافة البيانات والملفات المرتبطة به دون رجعة.</li>
          </ul>
        </section>

        {/* Section 4: Safe Browsing and Threat Analysis */}
        <section className="p-6 rounded-2xl bg-surface border border-border">
          <h2 className="text-lg font-bold text-foreground mb-3">4. معالجة الروابط ومحرك التحليل الأمني الاستباقي</h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            نحن <strong>لا نفتح الروابط من خوادمنا</strong> أبداً (عزل تام لمنع البرمجيات الخبيثة)، بل نقوم بتحليل تركيبة الرابط استباقياً (النطاق، تاريخ التسجيل عبر RDAP، الحروف المتشابهة بصرياً، والامتدادات عالية الخطورة). كما يُحلل المحرك الأمني الأنماط اللغوية وتكتيكات الهندسة الاجتماعية في بيئة سحابية معزولة ومشفرة وفق أعلى معايير أمن المعلومات.
          </p>
        </section>

        {/* Section 5: Privacy-Preserving Campaign Memory */}
        <section className="p-6 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">5. ذاكرة الحملات الجماعية وحماية الخصوصية (SimHash)</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
            لحماية المجتمع من حملات الاحتيال المنسقة التي تنتشر بين آلاف الهواتف في وقت واحد (مثل رسائل الجوائز الوهمية أو روابط إيقاف البطاقات المتكررة)، يمتلك النظام ذاكرة لحملات النصب تعمل <strong>بصورة رياضية مجردة لا تخزن النصوص إطلاقاً</strong>:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm list-inside text-muted">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0 mt-0.5" />
              <span><strong>ما الذي يُخزن:</strong> بصمة رياضية رقمية بطول 64 بت (SimHash - عبارة عن 16 رمزاً ست عشرياً مجرداً)، واسم النطاق فقط إن وجد رابط، وعداد لتكرار المشاهدات.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0 mt-0.5" />
              <span><strong>ما لا يُخزن أبداً:</strong> لا يتم تخزين نص الرسالة، ولا محتواها، ولا أرقام الهواتف أو الأسماء أو الصور أو عناوين IP إطلاقاً. من المستحيل رياضياً إعادة توليد النص الأصلي من البصمة.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-verdict-safe shrink-0 mt-0.5" />
              <span><strong>الحماية من التلاعب:</strong> يطبّق النظام قيوداً صارمة تمنع احتساب أكثر من فحص واحد لنفس الحملة من نفس المصدر خلال 24 ساعة، مع تحديد سقف أقصى لتأثير إشارات المجتمع لا يتجاوز 15 نقطة لمنع أي تلاعب مصطنع بالتقييم.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
