import { createClient } from "@/utils/supabase/server";
import LinkGraphContainer from "./components/linkGraphContainer";

export type GraphDBPlanet = {
  id: number;
  name: string;
  disabled: boolean;
  map_x: number;
  map_y: number;
  current_faction: number;
};

export default async function LinkFlowPage() {
  const supabase = await createClient();

  const [
    { data: planets, error: planetError },
    { data: supplyLines, error: supplyLineError },
  ] = await Promise.all([
    supabase
      .from("planet")
      .select("id, name, disabled, map_x, map_y, current_faction")
      .order("id", { ascending: true }),
    supabase.from("supplyLineFull").select("*"),
  ]);

  if (planetError || supplyLineError) {
    return (
      <div>
        <p>
          There was an error fetching data:
          {planetError && <span>{planetError.message}</span>}
          {supplyLineError && <span>{supplyLineError.message}</span>}
        </p>
      </div>
    );
  }

  return (
    <LinkGraphContainer
      planets={planets}
      supplyLines={supplyLines}
    ></LinkGraphContainer>
  );
}
