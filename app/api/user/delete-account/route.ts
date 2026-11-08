import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey || supabaseUrl.includes("your-project.supabase.co")) {
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

    // Delete user from auth via Admin API (cascades to profiles and checks)
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { error: adminDeleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (adminDeleteError) {
      return NextResponse.json({ error: "فشل حذف الحساب" }, { status: 500 });
    }

    // Sign out user locally
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true, message: "تم حذف الحساب نهائياً" });
    return response;
  } catch {
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء الحذف" }, { status: 500 });
  }
}
