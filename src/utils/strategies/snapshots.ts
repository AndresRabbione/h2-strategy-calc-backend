import { Planet, PlanetSnapshotFull } from "@/lib/typeDefinitions";
import {
  calcPlanetProgressPercentage,
  calcPlanetRegenPercentage,
} from "../helldiversAPI/formulas";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

/**
 * Utilizes the last hour's snapshots to get the progress for all recorded planets/events
 * @returns
 * The returned object has a simple result for a more direct calculation,
 * the regression figure eliminates outliers to get a true figure without GM
 * interference
 */
export function calculateHourlyPlayerProcessForAll(
  allPlanets: Planet[],
  snapshots: PlanetSnapshotFull[]
): { simple: number; regression: number }[] {
  const allEstimations: { simple: number; regression: number }[] = [];

  for (const planet of allPlanets) {
    const filteredSnasphots = snapshots?.filter(
      (snapshot) => snapshot.planetId === planet.index
    );

    if (!filteredSnasphots || filteredSnasphots.length === 0) continue;

    if (planet.event) {
      const eventId = planet.event.id;

      const filteredEventSnasphots = filteredSnasphots?.filter(
        (snapshot) => snapshot.eventId === eventId
      );
      const estimation = estimateHourlyRateForPlanet(
        filteredEventSnasphots ?? []
      );

      allEstimations.push(estimation);
    } else {
      const estimation = estimateHourlyRateForPlanet(filteredSnasphots ?? []);
      allEstimations.push(estimation);
    }
  }

  return allEstimations;
}

export async function getLatestPlanetSnapshots(
  supabase: SupabaseClient<Database>
): Promise<PlanetSnapshotFull[]> {
  const { data: snapshots } = await supabase
    .from("progressSnapshot")
    .select("*")
    .gte("createdAt", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  return snapshots ?? [];
}

/**
 *  Estimates how much each player currently contributes per hour
 */
export function estimatePlayerImpactPerHour(
  allPlanets: Planet[],
  snapshots: PlanetSnapshotFull[]
): number {
  const boosetedProgressLimit = 8;

  const sortedPlanets = allPlanets.filter((planet) => !planet.event);
  sortedPlanets.sort(
    (a, b) => b.statistics.playerCount - a.statistics.playerCount
  );

  let i = 0;
  let filteredSnasphots = snapshots.filter(
    (snapshot) => snapshot.planetId === sortedPlanets[i].index
  );
  let progress = estimateHourlyRateForPlanet(filteredSnasphots);

  while (
    progress.regression >= boosetedProgressLimit &&
    i < sortedPlanets.length - 1
  ) {
    i++;

    filteredSnasphots = snapshots.filter(
      (snapshot) => snapshot.planetId === sortedPlanets[i].index
    );
    progress = estimateHourlyRateForPlanet(filteredSnasphots);
  }

  const healthPerHourTotal =
    sortedPlanets[i].maxHealth * (progress.regression / 100);

  return healthPerHourTotal / sortedPlanets[i].statistics.playerCount;
}

/**
 * Estimates the Hourly progress for a specific planet/event
 * @param snapshots
 * These must belong to a specific planet/event
 * @returns
 * The returned object has a simple result for a more direct calculation,
 * the regression figure eliminates outliers to get a true figure without GM
 * interference
 */
export function estimateHourlyRateForPlanet(snapshots: PlanetSnapshotFull[]): {
  simple: number;
  regression: number;
} {
  if (snapshots.length < 2) return { simple: 0, regression: 0 };

  const regenPerHour = calcPlanetRegenPercentage(
    snapshots[snapshots.length - 1].regenPerSecond,
    snapshots[snapshots.length - 1].maxHealth
  );

  // normalize health %
  const points = snapshots.map((s) => ({
    t: new Date(s.createdAt).getTime() / 1000 / 60, // minutes since epoch
    p: calcPlanetProgressPercentage(s.health, s.maxHealth, null),
  }));

  const t0 = points[0].t;
  const normalized = points.map((p) => ({ t: p.t - t0, p: p.p })); // time since first snapshot in minutes

  // --- simple slope (start to end) ---
  const dtHours = (normalized.at(-1)!.t - normalized[0].t) / 60;
  const rateSimple = (normalized.at(-1)!.p - normalized[0].p) / dtHours;

  // --- regression slope (least squares) ---
  const n = normalized.length;
  const meanT = normalized.reduce((a, p) => a + p.t, 0) / n;
  const meanP = normalized.reduce((a, p) => a + p.p, 0) / n;
  let num = 0,
    den = 0;
  for (const { t, p } of normalized) {
    num += (t - meanT) * (p - meanP);
    den += (t - meanT) ** 2;
  }
  const slopePerMinute = num / den; // % per minute
  const rateRegression = slopePerMinute * 60; // % per hour

  return {
    simple: rateSimple + regenPerHour,
    regression: rateRegression + regenPerHour,
  };
}

/**
 * Estimates the maximum achievable hourly progress by taking the per
 * player progress and multiplying it by the total player count
 */
export function estimateMaximumPlayerImpactPerHour(
  allPlanets: Planet[],
  snapshots: PlanetSnapshotFull[],
  totalPlayerCount: number
): number {
  const estimatedPercentage = estimatePlayerImpactPerHour(
    allPlanets,
    snapshots
  );

  return estimatedPercentage * totalPlayerCount;
}
