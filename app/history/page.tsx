"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatWesternDate } from "@/lib/text/dateFormat";
import {
  History,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  LogOut,
  Settings,
  ArrowLeft,
  Calendar,
  Lock,
  User,
  Sparkles,
  RefreshCw,
  AlertOctagon,
  Terminal,
  Home,
} from "lucide-react";

interface CheckRecord {
  id: string;
  kind: "text" | "link" | "image";
  verdict: "safe" | "suspicious" | "scam";
  risk_score: number;
  scam_type: string;
  summary: string;
  masked_excerpt: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [supabaseEnabled, setSupabaseEnabled] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [saveHistory, setSaveHistory] = useState(false);
  const [checks, setChecks] = useState<CheckRecord[]>([]);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setSupabaseEnabled(configured);
    if (configured) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail(null);
        setLoading(false);
        return;
      }

      setUserEmail(user.email || "مستخدم مسجل");

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, save_history")
        .eq("id", user.id)
        .single();

      if (profile) {
        setPlan(profile.plan || "free");
        setSaveHistory(!!profile.save_history);
      }

      // Load checks
      const { data: checksData } = await supabase
        .from("checks")
        .select("*")
        .order("created_at", { ascending: false });

      if (checksData) {
        setChecks(checksData as CheckRecord[]);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSaveHistory = async () => {
    setActionLoading(true);
    setNotice("");
    setErrorMsg("");
    const nextState = !saveHistory;

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save_history: nextState }),
      });

      if (!res.ok) throw new Error("فشل تحديث الإعدادات");

      setSaveHistory(nextState);
      setNotice(nextState ? "تم تفعيل حفظ سجل الفحوصات." : "تم تعطيل حفظ السجل.");
    } catch {
      setErrorMsg("تعذر تحديث الإعدادات حالياً.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAllChecks = async () => {
    if (!confirm("هل أنت متأكد من حذف كافة سجلات الفحص المحفوظة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }

    setActionLoading(true);
    setNotice("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/user/delete-data", {
        method: "POST",
      });

      if (!res.ok) throw new Error("فشل حذف البيانات");

      setChecks([]);
      setNotice("تم حذف كامل سجل الفحوصات بنجاح.");
    } catch {
      setErrorMsg("حدث خطأ أثناء محاولة حذف السجل.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "تحذير نهائي: هل ترغب حقاً بحذف حسابك نهائياً؟ سيتم مسح كافة البيانات المرتبطة بك فوراً دون رجعة."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
      });

      if (!res.ok) throw new Error("فشل حذف الحساب");

      router.push("/?deleted=true");
      router.refresh();
    } catch {
      setErrorMsg("تعذر حذف الحساب، يرجى المحاولة لاحقاً.");
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-brand-primary mx-auto mb-4" />
        <p className="text-sm text-muted">جارٍ تحميل بيانات الحساب والسجل…</p>
      </div>
    );
  }

  // Local development mode without Supabase view
  if (!supabaseEnabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-2 text-muted flex items-center justify-center mx-auto mb-6">
          <Terminal size={32} className="text-brand-primary" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-3">
          <span>وضع التطوير المحلي مفعّل</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">سجل الفحوصات غير متاح محلياً</h1>
        <p className="text-xs sm:text-sm text-muted mb-8 leading-relaxed">
          يعمل التطبيق بدون Supabase، وبالتالي فإن حفظ السجل وقاعدة البيانات معطلة تلقائياً ولا يتم تخزين أي رسائل.
        </p>

        <div className="p-6 rounded-2xl bg-surface border border-border text-start space-y-3 shadow-soft mb-6">
          <h2 className="text-xs font-bold text-foreground">لتفعيل حفظ السجل وقاعدة البيانات:</h2>
          <p className="text-xs text-muted leading-relaxed">
            أضف متغيرات Supabase في ملف <code className="text-brand-primary bg-surface-2 px-1 rounded font-mono">.env.local</code> وشغل أمر الهجرة <code className="text-brand-primary bg-surface-2 px-1 rounded font-mono">001_init.sql</code>.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-90 transition-opacity touch-target"
        >
          <Home size={16} />
          <span>العودة للفاحص الرئيسي</span>
        </Link>
      </div>
    );
  }

  // Not logged in view (when Supabase is configured)
  if (!userEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-2 text-muted flex items-center justify-center mx-auto mb-6">
          <User size={32} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">سجل الفحوصات وإعدادات الحساب</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          سجّل دخولك للوصول إلى خيارات الحفظ، ورفع الحد اليومي إلى 10 فحوصات يومياً مجاناً.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-90 transition-opacity touch-target"
        >
          <span>تسجيل الدخول / إنشاء حساب</span>
          <ArrowLeft size={16} className="rotate-180" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline mb-2 font-medium"
          >
            <ArrowLeft size={14} className="rotate-180" />
            <span>العودة للفاحص</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">حسابك وسجل الفحوصات</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            البريد: <span className="text-foreground font-mono">{userEmail}</span> • الخطة:{" "}
            <span className="font-semibold text-brand-primary">
              {plan === "pro" ? "المميزة (100 فحص/يوم)" : "المجانية (10 فحوصات/يوم)"}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-border bg-surface text-muted hover:text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors touch-target"
        >
          <LogOut size={14} />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="mb-6 p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-semibold">
          {notice}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-3 rounded-xl bg-verdict-danger/10 border border-verdict-danger/30 text-verdict-danger text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Privacy & Settings Card */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-soft mb-8 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <Settings size={18} className="text-brand-primary" />
          <h2 className="text-base font-bold text-foreground">إعدادات الخصوصية والتحكم</h2>
        </div>

        {/* Save History Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-sm font-bold text-foreground block">حفظ سجل الفحوصات</span>
            <p className="text-xs text-muted max-w-md leading-relaxed">
              عند التفعيل، يتم حفظ ملخص الفحص ومقتطف مموه خالٍ من الأرقام والبطاقات الشخصية للرجوع إليه لاحقاً. (لا يتم حفظ الصور إطلاقاً).
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={saveHistory}
            disabled={actionLoading}
            onClick={handleToggleSaveHistory}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none ${
              saveHistory ? "bg-brand-primary" : "bg-surface-2 border-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                saveHistory ? "-translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Checks History List */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-primary" />
            <h2 className="text-lg font-bold text-foreground">الفحوصات السابقة</h2>
            <span className="text-xs text-muted">({checks.length})</span>
          </div>

          {checks.length > 0 && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleDeleteAllChecks}
              className="text-xs text-verdict-danger hover:underline flex items-center gap-1 font-medium"
            >
              <Trash2 size={13} />
              <span>مسح كل السجل</span>
            </button>
          )}
        </div>

        {checks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface border border-border text-center space-y-2">
            <Lock size={32} className="text-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">لا توجد فحوصات محفوظة</p>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              {!saveHistory
                ? "خيار حفظ السجل معطّل حالياً لحماية خصوصيتك التامة. لم يتم تخزين أي من رسائلك."
                : "لم تقم بأي عمليات فحص بعد تفعيل السجل."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checks.map((item) => {
              const isScam = item.verdict === "scam";
              const isSuspicious = item.verdict === "suspicious";

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5 text-start">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isScam
                            ? "bg-verdict-danger/15 text-verdict-danger"
                            : isSuspicious
                            ? "bg-verdict-warning/15 text-verdict-warning"
                            : "bg-verdict-safe/15 text-verdict-safe"
                        }`}
                      >
                        {isScam ? "نصب على الأغلب" : isSuspicious ? "مشبوه، انتبه" : "يبدو سليماً"}
                      </span>
                      <span className="text-xs text-muted font-medium">• {item.scam_type}</span>
                    </div>

                    <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                      {item.summary}
                    </p>

                    {item.masked_excerpt && (
                      <p className="text-[11px] text-muted bg-surface-2 p-1.5 rounded-lg max-w-xl truncate">
                        {item.masked_excerpt}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted shrink-0 flex items-center gap-1 sm:self-start">
                    <Calendar size={13} />
                    <span>{formatWesternDate(item.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl border border-verdict-danger/30 bg-verdict-danger/5 space-y-4">
        <h3 className="text-sm font-bold text-verdict-danger flex items-center gap-2">
          <AlertOctagon size={16} />
          <span>منطقة الخطر وحذف البيانات</span>
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          نحن نحترم حقك الكامل في النسيان الرقمي. يمكنك حذف كافة سجلاتك فوراً، أو إغلاق حسابك ومسح كافة البيانات نهائياً.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={actionLoading || checks.length === 0}
            onClick={handleDeleteAllChecks}
            className="px-4 py-2.5 rounded-xl border border-verdict-danger/40 bg-surface text-verdict-danger text-xs font-bold hover:bg-verdict-danger/10 transition-colors disabled:opacity-40"
          >
            حذف كل بيانات الفحص
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleDeleteAccount}
            className="px-4 py-2.5 rounded-xl bg-verdict-danger text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            حذف حسابي نهائياً
          </button>
        </div>
      </div>
    </div>
  );
}
