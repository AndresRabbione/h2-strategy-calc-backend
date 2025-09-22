import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordCurrentState } from "@/utils/strategies/recording";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const response = await recordCurrentState(supabase);

    if (!response) {
      return NextResponse.json(
        { error: "Failed to record current state" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
