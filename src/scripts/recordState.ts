import { recordCurrentState } from "@/utils/strategies/recording";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

async function main() {
  console.log("Environment check:", {
    SUPABASE_URL: process.env.SUPABASE_URL ? "Set" : "Not set",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "Set"
      : "Not set",
  });

  const supabaseUrl = String(process.env.SUPABASE_URL || "");
  const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

  console.log("URL length:", supabaseUrl.length);
  console.log("Key length:", supabaseKey.length);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const response = await recordCurrentState(supabase);

  if (!response) {
    throw new Error(`Recording failed`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
