import { createClient } from "../supabase/server";

export async function parseItemId(itemId: number): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("item")
    .select("name")
    .eq("id", itemId)
    .single();
  return data?.name ?? "Unknown";
}
