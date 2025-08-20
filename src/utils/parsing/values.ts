import { TableNames, ValueTypes } from "@/lib/typeDefinitions";
import { createClient } from "../supabase/client";

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
  const supabase = createClient();

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
      //FIXME: Pray for no duplicate IDs or we're totally fucked
      // value type 6 seems to indiacte if an item or strat is needed
      // but not which one, so this hack is necessary
      let { data: stratagem } = await supabase
        .from("stratagem")
        .select("*")
        .eq("id", value);
      if (!stratagem || stratagem.length === 0) {
        const { data: item } = await supabase
          .from("item")
          .select("*")
          .eq("id", value);
        stratagem = item;
      }
      return stratagem ?? [];
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
      return [{ id: 1, name: value.toLocaleString("en-US") }];
      break;
    case ValueTypes.ITEM_TYPE:
      const { data: itemType } = await supabase
        .from("itemTypeValue")
        .select("*")
        .eq("id", value);
      return itemType ?? [];
      break;
    case ValueTypes.TARGET_TYPE:
      const { data: targetType } = await supabase
        .from("targetTypeValue")
        .select("*")
        .eq("id", value);
      return targetType ?? [];
      break;
    default:
      return [];
      break;
  }
}

export function getTableNameFromType(
  typeId: number,
  auxValue: number
): TableNames {
  if (
    auxValue === 0 &&
    (typeId === ValueTypes.TARGET_ID || typeId === ValueTypes.ITEM)
  ) {
    return "" as TableNames;
  }

  switch (typeId) {
    case ValueTypes.DIFFICULTY:
      return "difficulty";
      break;
    case ValueTypes.ENEMY:
      return "enemy";
      break;
    case ValueTypes.ITEM:
      return "item";
      break;
    case ValueTypes.ITEM_TYPE:
      return "itemTypeValue";
      break;
    case ValueTypes.TARGET_FACTION:
      return "faction";
      break;
    case ValueTypes.TARGET_ID:
      return auxValue === 1 ? "planet" : "sector";
      break;
    case ValueTypes.TARGET_TYPE:
      return "targetTypeValue";
      break;
    default:
      return "" as TableNames;
      break;
  }
}
