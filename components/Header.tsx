"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Sun, Moon, Menu, X, ShieldAlert, Lock, User, History, Terminal, Cpu } from "lucide-react";

export function Header() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [supabaseEnabled, setSupabaseEnabled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const isConfigured = isSupabaseConfigured();
    setSupabaseEnabled(isConfigured);

    if (isConfigured) {
      try {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUserEmail(session?.user?.email || null);
        });

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setUserEmail(session?.user?.email || null);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch {
        // Continue gracefully if initialization throws
      }
    }
  }, []);

  const navLinks = [
    { href: "/#engine", label: "المحرك الأمني", icon: Cpu },
    { href: "/scams", label: "قواعد التحليل وأنواع النصب", icon: ShieldAlert },
    { href: "/privacy", label: "الخصوصية والامتثال", icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/70 border-b border-white/[0.07] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand (Right on RTL) */}
        <Link
          href="/"
          className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-brand-primary rounded-xl p-1 transition-all group"
          aria-label="فَطِن FATIN Security - منصة التحليل الأمني"
        >
          <div className="relative flex items-center justify-center p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] group-hover:border-emerald-500/40 transition-all">
            <Logo size={28} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg sm:text-xl leading-none text-foreground tracking-tight">فَطِن</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-xs sm:text-sm font-bold tracking-wider text-emerald-400">
                FATIN Security
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted leading-tight mt-1 font-medium">
              Threat Intelligence &amp; Fraud Defense
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm"
          aria-label="التنقل الرئيسي"
        >
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                  isActive
                    ? "bg-white/[0.1] text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (Left on RTL) */}
        <div className="flex items-center gap-2">
          {/* Live Status Indicator (Engine: Operational / Local Sandbox) */}
          {!supabaseEnabled ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-slate-300"
              title="وضع التطوير المحلي: يعمل الفحص في الذاكرة دون الحاجة لـ Supabase"
            >
              <Terminal size={12} className="text-emerald-400" />
              <span className="hidden lg:inline text-slate-400">Engine: Sandbox •</span>
              <span>وضع محلي</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Engine: Operational</span>
            </span>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200 transition-colors touch-target flex items-center justify-center"
            aria-label={resolvedTheme === "dark" ? "تفعيل المظهر الفاتح" : "تفعيل المظهر الداكن"}
            title={resolvedTheme === "dark" ? "المظهر الفاتح" : "المظهر الداكن"}
          >
            {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User state / Login Button (Only shown when Supabase is configured) */}
          {supabaseEnabled && (
            <>
              {userEmail ? (
                <Link
                  href="/history"
                  className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 transition-colors touch-target"
                >
                  <History size={15} className="text-emerald-400" />
                  <span>السجل والحساب</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold text-emerald-400 transition-colors touch-target"
                >
                  <User size={15} />
                  <span>تسجيل الدخول</span>
                </Link>
              )}
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200 transition-colors touch-target flex items-center justify-center"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/[0.08] bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fadeIn">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Mobile Auth Links (Only shown when Supabase is configured) */}
          {supabaseEnabled && (
            <div className="pt-2 border-t border-white/[0.08]">
              {userEmail ? (
                <Link
                  href="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/[0.04]"
                >
                  <History size={18} className="text-emerald-400" />
                  <span>سجل الفحوصات والحساب</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                >
                  <User size={18} />
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
