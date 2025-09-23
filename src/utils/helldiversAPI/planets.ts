import { helldiversAPIHeaders } from "@/lib/constants";
import { Planet } from "@/lib/typeDefinitions";

const api = process.env.NEXT_PUBLIC_HELLDIVERS_API_URL + "/api/v1/planets";

export async function findPlanetById(
  id: number,
  retries: number = 3
): Promise<Planet | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const request = await fetch(`${api}/${id}`, {
        method: "GET",
        headers: helldiversAPIHeaders,
      });

      if (request.status === 503) {
        console.warn(`Service unavailable ${request.status}.`);
        return null;
      }

      if (request.status === 429) {
        const retryAfter = request.headers.get("retry-after");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 + 1000 : 11000;
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

export async function fetchAllPlanets(retries: number = 3): Promise<Planet[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const request = await fetch(`${api}`, {
        method: "GET",
        headers: helldiversAPIHeaders,
      });

      if (request.status === 503) {
        console.warn(`Service unavailable ${request.status}.`);
        return [];
      }

      if (request.status === 429) {
        const retryAfter = request.headers.get("retry-after") ?? "10";
        const delay = retryAfter ? parseInt(retryAfter) * 1000 + 1000 : 11000;
        console.warn(`Rate limited. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return await request.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
}
