import { helldiversAPIHeaders } from "@/lib/constants";
import { DispatchV1 } from "@/lib/typeDefinitions";

const api = process.env.NEXT_PUBLIC_HELLDIVERS_API_URL + "/api/v1/dispatches";

export async function getAllDispatches(
  retries: number = 3
): Promise<DispatchV1[]> {
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
        const retryAfter = request.headers.get("retry-after");
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

export async function getDispatchById(
  id: number,
  retries: number = 3
): Promise<DispatchV1 | null> {
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

      return await request.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return null;
}

export async function getDispatchesAfterId(
  id: number,
  retries: number = 3
): Promise<DispatchV1[]> {
  const dispatches = await getAllDispatches(retries);

  return dispatches.filter((dispatch) => dispatch.id > id);
}

export function sanitizeDispatchMessage(message: string): string {
  // Remove tags like <i=1>...</i> and <i=3>
  let clean = message.replace(/<[^>]+>/g, "");
  // Remove any remaining HTML entities
  clean = clean.replace(/&[a-z]+;/gi, "");
  // Normalize whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}
