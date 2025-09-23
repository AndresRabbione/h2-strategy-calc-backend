import { recordCurrentState } from "@/utils/strategies/recording";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

async function main() {
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
  console.error(err);
  process.exit(1);
});
