const api =
  process.env.NEXT_PUBLIC_HELLDIVERS_API_URL + "/raw/api/WarSeason/801/Status";

type StatusResponse = {
  warId: number;
  time: number;
  impactMultiplier: number;
  storyBeatId32: number;
  planetStatus: {
    index: number;
    owner: number;
    health: number;
    regenPerSecond: number;
    players: number;
  }[];
  planetAttacks: { source: number; target: number }[];
  campaigns: {
    id: number;
    planetIndex: number;
    type: number;
    count: number;
    race: number;
  }[];
  jointOperations: { id: number; planetIndex: number; hqNodeIndex: number }[];
  planetEvents: {
    id: number;
    planetIndex: number;
    eventType: number;
    race: number;
    health: number;
    maxHealth: number;
    startTime: number;
    expireTime: number;
    campaignId: number;
    jointOperationIds: number[];
  }[];
  planetRegions: {
    planetIndex: number;
    regionIndex: number;
    owner: number;
    health: number;
    regenPerSecond: number;
    availabilityFactor: number;
    isAvailable: boolean;
    players: number;
  }[];
};

export async function getCurrentImpactMultiplier(): Promise<number> {
  try {
    const request = await fetch(`${api}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Super-Client": "helldivers.strategy.calc",
        "X-Super-Contact": "example@email.com",
      },
    });

    if (request.status === 503) {
      return 0;
    }

    const responseJson: StatusResponse = await request.json();
    return responseJson.impactMultiplier;
  } catch (e) {
    console.error(e);
    return 0;
  }
}
