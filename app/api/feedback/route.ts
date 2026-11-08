import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const FeedbackSchema = z.object({
  verdict: z.enum(["safe", "suspicious", "scam"]),
  helpful: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = FeedbackSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { verdict, helpful } = parsed.data;

    // Insert server-side into feedback table if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      await supabaseAdmin.from("feedback").insert({
        verdict,
        helpful,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حفظ التقييم" }, { status: 500 });
  }
}
