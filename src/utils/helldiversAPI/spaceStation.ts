import { SpaceStationV2 } from "@/lib/typeDefinitions";

const api =
  process.env.NEXT_PUBLIC_HELLDIVERS_API_URL +
  "/api/v2/space-stations/749875195";

export async function getDSS(
  retries: number = 3
): Promise<SpaceStationV2 | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const request = await fetch(`${api}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Super-Client": "helldivers.strategy.calc",
          "X-Super-Contact": "example@email.com",
        },
      });

      if (request.status === 429) {
        const retryAfter = request.headers.get("retry-after");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
        console.warn(`Rate limited. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (request.status === 503) {
        return null;
      }

      return await request.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return null;
}
