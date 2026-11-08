import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertCircle, FileText, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "شروط الاستخدام وإخلاء المسؤولية | فَطِن",
  description:
    "شروط استخدام أداة فَطِن للتحقق من الاحتيال، وحدود المسؤولية، والتوجيهات الواجب اتباعها عند التعامل مع الرسائل المشبوهة.",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-foreground mb-3">شروط الاستخدام وإخلاء المسؤولية</h1>
        <p className="text-sm text-muted">باستخدامك لتطبيق «فَطِن»، فإنك توافق على البنود التوضيحية التالية.</p>
      </div>

      <div className="space-y-6 text-foreground/90 text-sm leading-relaxed">
        {/* Core disclaimer */}
        <div className="p-5 rounded-2xl bg-verdict-warning/10 border border-verdict-warning/30 flex items-start gap-4">
          <AlertCircle size={24} className="text-verdict-warning shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-base text-foreground mb-1">طبيعة الخدمة التقديرية</h2>
            <p className="text-xs sm:text-sm text-muted">
              منصة «فَطِن | FATIN Security» هي منظومة برمجية متقدمة لتحليل التهديدات وتصنيف مؤشرات الخطورة واستكشاف أساليب الهندسة الاجتماعية. النتائج الصادرة هي <strong>إرشادات تنبيهية استباقية وليست حكماً قانونياً أو مصرفياً قاطعاً</strong>.
            </p>
          </div>
        </div>

        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-foreground">1. حدود المسؤولية</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            لا يتحمل مطورو أو مشغلو تطبيق «فَطِن» أي مسؤولية قانونية أو مالية مباشرة أو غير مباشرة عن:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm list-inside text-muted">
            <li className="flex items-start gap-2">
              <Check size={16} className="text-brand-primary shrink-0 mt-1" />
              <span>أي خسائر مالية قد يتعرض لها المستخدم نتيجة التفاعل مع رسائل أو روابط أو أطراف خارجية.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-brand-primary shrink-0 mt-1" />
              <span>اعتماد المستخدم على تقييم سليم لرسالة تبين لاحقاً أنها احتيالية، أو العكس (خطأ التنبيه).</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-brand-primary shrink-0 mt-1" />
              <span>انقطاع الخدمة أو بطء استجابة النماذج الذكية لأسباب تقنية خارجة عن السيطرة.</span>
            </li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl bg-surface border border-border space-y-3">
          <h2 className="text-lg font-bold text-foreground">2. الاستخدام العادل والمسموح به</h2>
          <p className="text-xs sm:text-sm text-muted">
            الخدمة مخصصة للاستخدام الشخصي لحماية الأفراد والعائلات. يُمنع منعاً باتاً:
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm list-disc list-inside text-muted">
            <li>محاولة استنزاف موارد الخدمة أو تنفيذ هجمات حجب الخدمة (DDoS).</li>
            <li>إرسال محتويات خبيثة، فيروسات، أو محاولات حقن برمجية لاختراق الخوادم.</li>
            <li>استخدام الخدمة في أنشطة غير مشروعة أو تنتهك القوانين والأنظمة السارية.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl bg-surface border border-border space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. ما يجب فعله في حال تعرضك للاحتيال</h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            إذا قمت بتحويل أموال أو مشاركة بيانات بطاقتك أو حسابك بالفعل، فإن الخطوة الصحيحة الأولى ليست التردد، بل التواصل الفوري مع الجهة المالية الرسمية (المصرف أو شركة المحفظة) لإيقاف البطاقة وحظر الحساب، ومراجعة الجهات الأمنية الرسمية المختصة بمكافحة الجرائم الإلكترونية لتقديم بلاغ رسمي.
          </p>
        </section>
      </div>
    </div>
  );
}
