import { ValueTypes } from "@/lib/typeDefinitions";
import { createClient } from "../supabase/server";

export async function parseValueType(
  valueType: number,
  value: number,
  auxValue: number | null = null
): Promise<{ id: number; name: string }[]> {
  if (
    auxValue === 0 &&
    (valueType === ValueTypes.TARGET_ID || valueType === ValueTypes.ITEM)
  ) {
    return [{ id: 1, name: "None" }];
  }
  const supabase = await createClient();

  switch (valueType) {
    case ValueTypes.DIFFICULTY:
      const { data: difficulty } = await supabase
        .from("difficulty")
        .select("*")
        .eq("id", value);
      return difficulty ?? [];
      break;
    case ValueTypes.ENEMY:
      const { data: enemy } = await supabase
        .from("enemy")
        .select("*")
        .eq("id", value);
      return enemy ?? [];
      break;
    case ValueTypes.ITEM:
      const { data: item } = await supabase
        .from(auxValue === 1 ? "stratagem" : "item")
        .select("*")
        .eq("id", value);
      return item ?? [];
      break;
    case ValueTypes.TARGET_ID:
      const { data: planet } = await supabase
        .from(auxValue === 1 ? "planet" : "sector")
        .select("*")
        .eq("id", value);
      return planet ?? [];
      break;
    case ValueTypes.TARGET_FACTION:
      const { data: faction } = await supabase
        .from("faction")
        .select("*")
        .eq("id", value);
      return faction ?? [];
      break;
    case ValueTypes.AMOUNT:
      return [{ id: 1, name: String(value) }];
      break;
    case ValueTypes.ITEM_TYPE:
      const { data: itemType } = await supabase
        .from("itemTypeValues")
        .select("*")
        .eq("id", value);
      return itemType ?? [];
      break;
    case ValueTypes.TARGET_TYPE:
      const { data: targetType } = await supabase
        .from("targetTypeValues")
        .select("*")
        .eq("id", value);
      return targetType ?? [];
      break;
    default:
      return [];
      break;
  }
}
