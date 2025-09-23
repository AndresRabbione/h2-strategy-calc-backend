import { generateStrategies } from "@/utils/strategies/generator";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const response = await generateStrategies(supabase);

  if (!response) {
    throw new Error(`Recording failed`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
