import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  console.log("URL: ", process.env.SUPABASE_URL);
  console.log("KEY: ", process.env.ANON_KEY);

  return createBrowserClient(process.env.SUPABASE_URL!, process.env.ANON_KEY!);
}
