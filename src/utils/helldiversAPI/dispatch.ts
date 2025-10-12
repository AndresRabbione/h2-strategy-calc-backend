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

export function sanitizeDispatchMessage(message: string): {
  title: string;
  body: string;
} {
  let sanitizedText = message.replace(/\\n/g, "\n");

  const matches = [
    ...sanitizedText.matchAll(/<i=(?:1|3)>([\s\S]*?)(?:<\/i>|\n\s*\n)/g),
  ];

  let title = "";
  let titleEndIndex = 0;
  let i = 0;

  while (title.length == 0 && i < matches.length) {
    const match = matches[i];
    const candidate = match[1].trim();
    const isAllCaps = /^[^a-z]*$/.test(candidate);

    if (isAllCaps) {
      title = candidate;
      titleEndIndex = match.index! + match[0].length;
    }

    i++;
  }

  if (titleEndIndex !== 0) {
    sanitizedText = sanitizedText.slice(titleEndIndex);
  }

  const body = sanitizedText.replace(/<[^>]+>/g, "").trim();

  return { title, body };
}
