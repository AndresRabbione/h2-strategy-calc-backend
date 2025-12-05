import { EnemyIds } from "@/lib/typeDefinitions";
import { getFactionNameFromId } from "./factions";
import { createClient } from "../supabase/server";

export async function parseEnemyId(
  enemyId: number,
  factionId: number | null
): Promise<{ id: number; name: string; faction: number }> {
  if (factionId && enemyId === EnemyIds.ANY) {
    return {
      id: 0,
      name: getFactionNameFromId(factionId, true),
      faction: factionId,
    };
  } else if (!factionId && enemyId === EnemyIds.ANY) {
    return { id: 0, name: "enemies", faction: 0 };
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("enemy")
      .select("*")
      .eq("id", enemyId)
      .single();
    return data ?? { id: -1, name: "Unknown Enemy", faction: 0 };
  }
}
