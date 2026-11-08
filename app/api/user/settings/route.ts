import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";

const SettingsSchema = z.object({
  save_history: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = SettingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey || supabaseUrl.includes("your-project.supabase.co")) {
      return NextResponse.json(
        { error: "خدمة قاعدة البيانات غير مهيأة (وضع التطوير المحلي مفعّل)" },
        { status: 503 }
      );
    }

    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ save_history: parsed.data.save_history })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "فشل تحديث الإعدادات" }, { status: 500 });
    }

    return NextResponse.json({ success: true, save_history: parsed.data.save_history });
  } catch {
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
