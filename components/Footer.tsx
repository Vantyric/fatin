import React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ShieldCheck, Lock, Fingerprint, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-slate-950/80 backdrop-blur-md text-sm text-slate-400">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Compliance & Zero-Log Architecture Card */}
        <div className="mb-8 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock size={20} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-slate-200">
                Private by Architecture: لا يتم تخزين نصوصك أو بياناتك الحساسة، الفحص يتم عبر بصمات تشفير معزولة.
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                يتم حجب كافة أرقام الهواتف والبطاقات والرموز تلقائياً عبر محرك Redaction معزول قبل بدء التحليل، وتنتهي صلاحية البيانات فور إصدار التقرير الأمني.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/[0.08] text-[11px] font-mono text-emerald-400">
              <Fingerprint size={12} />
              <span>Client-Side PII Masking</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/[0.08] text-[11px] font-mono text-emerald-400">
              <Cpu size={12} />
              <span>Zero-Retention Engine</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/[0.08] text-[11px] font-mono text-emerald-400">
              <ShieldCheck size={12} />
              <span>256-bit Hash Matching</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & description */}
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100">فَطِن</span>
                <span className="text-slate-600">|</span>
                <span className="text-xs font-semibold text-emerald-400 tracking-wider">FATIN Security</span>
              </div>
              <p className="text-xs text-slate-400">
                منصة التحليل الأمني الاستباقي وكشف الهندسة الاجتماعية والتصيد الرقمي
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-xs" aria-label="روابط التذييل">
            <Link href="/scams" className="hover:text-slate-200 transition-colors">
              قواعد التحليل والتهديدات
            </Link>
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">
              الخصوصية والامتثال
            </Link>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              شروط الاستخدام
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} FATIN Security Threat Platform. Zero-Log Architecture.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Private by Architecture • Client-Side PII Masking • Zero-Retention Engine • 256-bit Hash Matching</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
