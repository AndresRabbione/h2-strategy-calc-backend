import { createClient } from "../supabase/server";

export async function parseSectorId(sectorId: number): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sector")
    .select("name")
    .eq("id", sectorId)
    .single();

  return data?.name ?? "Unknown";
}
