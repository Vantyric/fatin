"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckerCard } from "@/components/CheckerCard";
import { ResultCard } from "@/components/ResultCard";
import { JsonLd } from "@/components/JsonLd";
import { AnalyzeResult } from "@/lib/ai/schemas";
import {
  Sparkles,
  ArrowLeft,
  Gift,
  KeyRound,
  CreditCard,
  Briefcase,
  Package,
  Users,
  ChevronDown,
} from "lucide-react";

export default function HomePage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);

  const handleReset = () => {
    setAnalysisResult(null);
    const container = document.getElementById("checker-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scamCards = [
    {
      id: "telecom-prizes",
      icon: Gift,
      title: "سحوبات وجوائز اليانصيب الوهمية",
      desc: "رسائل فوز وهمية بجوائز ضخمة تطلب تحويل رصيد أو رسوم 'تخليص' أو ضرائب مسبقة لاستلام الجائزة.",
    },
    {
      id: "whatsapp-takeover",
      icon: KeyRound,
      title: "سرقة رموز التحقق (OTP & Takeover)",
      desc: "رسائل تدّعي إرسال رمز بالخطأ أو تطلب تأكيد حساب للاستيلاء على حسابات واتساب وتليجرام والمنصات.",
    },
    {
      id: "fake-wallets",
      icon: CreditCard,
      title: "التصيد المصرفي والمحافظ المالية",
      desc: "رسائل انتحال صفة البنوك والمحافظ الرقمية بادعاء إيقاف البطاقة لسرقة بيانات الدخول وأرقام CVV.",
    },
    {
      id: "fake-jobs",
      icon: Briefcase,
      title: "عروض التوظيف والمهام الوهمية",
      desc: "إعلانات وظائف عن بعد برواتب خيالية تنتهي بطلب دفع رسوم فتح حساب أو شحن رصيد منصات تداول وهمية.",
    },
    {
      id: "fake-delivery",
      icon: Package,
      title: "طرود البريد والشحنات المعلقة (Smishing)",
      desc: "رسائل تزعم وجود شحنة دولية معلقة (DHL / Aramex / Post) وتطلب دفع مبالغ ضئيلة عبر رابط لاختراق البطاقات.",
    },
    {
      id: "family-impersonation",
      icon: Users,
      title: "انتحال الهوية والهندسة الاجتماعية (Whaling)",
      desc: "رسائل من أرقام جديدة تدعي أنها لصديق أو قريب أو مسؤول في ورطة طارئة تطلب تحويل أموال عاجل.",
    },
  ];

  const faqs = [
    {
      q: "هل خدمة فَطِن مجانية؟",
      a: "نعم، منصة فَطِن متاحة مجاناً لجميع المستخدمين لتعزيز الأمان الرقمي ومكافحة تهديدات التصيد والاحتيال الإلكتروني بدون أي رسوم.",
    },
    {
      q: "هل يتم تخزين رسائلي أو الصور التي أرفعها؟",
      a: "إطلاقاً. نعتمد معمارية Zero-Log Privacy الصارمة؛ يتم حجب البيانات الشخصية وأرقام الهواتف والبطاقات والرموز فورياً قبل التحليل، ولا يتم تخزين نصوص رسائلك في أي قاعدة بيانات.",
    },
    {
      q: "هل يمكن للتحليل الأمني أن يخطئ في التقييم؟",
      a: "النتائج الصادرة هي تحليل أمني استباقي ومساعد لتقدير مؤشرات الخطر وليس حكماً قانونياً أو مصرفياً قاطعاً. إذا ساورك الشك بأي رسالة، تواصل دائماً مع الجهة الرسمية عبر قنواتها المعتمدة فقط.",
    },
    {
      q: "ماذا أفعل إذا وقعت في الفخ بالفعل ونفذت المطلوب؟",
      a: "تواصل فوراً مع مصرفك أو مزود محفظتك لإيقاف البطاقة وحظر العمليات، غيّر كلمات المرور وسجل الخروج من كافة الجلسات النشطة، واستخدم زر (إجراءات طارئة) في التقرير للاطلاع على خطوات الاحتواء الفوري.",
    },
  ];

  return (
    <div className="w-full">
      {/* Hero & Checker Section */}
      <section id="engine" className="hero-bg-pattern pt-10 sm:pt-14 pb-20 px-4 border-b border-white/[0.06] overflow-hidden scroll-mt-20">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Glowing Trust Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] text-emerald-400 text-xs font-semibold mb-6 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>محرك فطن للتحليل الأمني والاستباقي • Zero-Log Threat Intelligence</span>
          </div>

          {/* Headline with subtle emerald-to-cyan gradient */}
          <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight mb-4 leading-[1.2]">
            قبل ما تضغط.. <span className="bg-gradient-to-l from-cyan-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">اكشف التهديد بثوانٍ</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed font-normal">
            منصة تحليل متقدمة لفحص الرسائل المشبوهة، الروابط الخبيثة، ولقطات الشاشة وكشف أساليب الهندسة الاجتماعية قبل الوقوع في الفخ.
          </p>

          {/* Checker or Result View */}
          <div id="checker-container" className="scroll-mt-24">
            {analysisResult ? (
              <ResultCard result={analysisResult} onReset={handleReset} />
            ) : (
              <CheckerCard onResult={setAnalysisResult} />
            )}
          </div>
        </div>
      </section>

      {/* How it works (3 steps) */}
      <section className="py-16 px-4 max-w-5xl mx-auto border-b border-border/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">كيف يعمل المحرك الأمني؟</h2>
          <p className="text-sm text-muted">منظومة تحليل استباقية تكشف الهندسة الاجتماعية والتهديدات الرقمية فور ورودها</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface border border-border text-start relative overflow-hidden">
            <span className="absolute top-4 end-4 text-4xl font-black text-brand-primary/10 select-none">
              01
            </span>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">إدخال الرسالة أو الرابط أو اللقطة</h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              الصق نص الرسالة الواردة، أو الرابط المشبوه، أو ارفع لقطة شاشة للمحادثة من أي تطبيق مراسلة أو بريد إلكتروني.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border text-start relative overflow-hidden">
            <span className="absolute top-4 end-4 text-4xl font-black text-brand-primary/10 select-none">
              02
            </span>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">التحليل السلوكي وكشف الهندسة الاجتماعية</h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              يقوم المحرك بحجب البيانات الشخصية فورياً، وفحص الروابط والنطاقات، وتحليل مسار المحادثة لكشف أساليب التلاعب والضغط النفسي والاحتيال.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border text-start relative overflow-hidden">
            <span className="absolute top-4 end-4 text-4xl font-black text-brand-primary/10 select-none">
              03
            </span>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">تقرير أمني فوري وتوجيه وقائي</h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              الحصول على تقرير تصنيف تهديد فوري (Incident Triage)، وتحديد نية المهاجم، مع قائمة إجراءات وقائية واضحة لمنع الاختراق.
            </p>
          </div>
        </div>
      </section>

      {/* Common Scams Section (6 cards linking to /scams) */}
      <section className="py-16 px-4 max-w-5xl mx-auto border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">متجهات التهديد والهندسة الاجتماعية الشائعة</h2>
            <p className="text-sm text-muted">أحدث أساليب التصيد الإلكتروني والاحتيال الرقمي المنتشرة إقليمياً وعالمياً</p>
          </div>
          <Link
            href="/scams"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline"
          >
            <span>عرض كافة متجهات التهديد في الدليل</span>
            <ArrowLeft size={16} className="rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {scamCards.map((scam) => {
            const Icon = scam.icon;
            return (
              <Link
                key={scam.id}
                href={`/scams#${scam.id}`}
                className="group p-6 rounded-2xl bg-surface border border-border hover:border-brand-primary/50 transition-all shadow-sm hover:shadow-soft flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2 group-hover:text-brand-primary transition-colors">
                    {scam.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">{scam.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center text-xs font-semibold text-brand-primary">
                  <span>تفاصيل الحماية</span>
                  <ArrowLeft size={14} className="rotate-180 ms-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Honest FAQ Section */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">الأسئلة الشائعة</h2>
          <p className="text-sm text-muted">إجابات صريحة ومباشرة حول الأمان وطريقة العمل</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group p-5 rounded-2xl bg-surface border border-border open:border-brand-primary/40 transition-colors"
            >
              <summary className="font-bold text-foreground text-sm sm:text-base cursor-pointer list-none flex items-center justify-between gap-4">
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  className="text-muted group-open:rotate-180 transition-transform shrink-0"
                />
              </summary>
              <p className="mt-3 pt-3 border-t border-border/60 text-xs sm:text-sm text-muted leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: "فَطِن | FATIN Security",
              url: "https://fatin.iq",
              description: "منصة التحليل الأمني الاستباقي لكشف رسائل التصيد والاحتيال الرقمي والروابط الخبيثة",
              applicationCategory: "SecurityApplication",
              operatingSystem: "All",
              inLanguage: "ar",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "IQD",
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.a,
                },
              })),
            },
          ],
        }}
      />
    </div>
  );
}
