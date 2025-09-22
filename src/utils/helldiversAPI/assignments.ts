import { Assignment } from "@/lib/typeDefinitions";

const api =
  process.env.NEXT_PUBLIC_HELLDIVERS_API_URL + "/raw/api/v2/Assignment/War/801";

export async function getCurrentMajorOrders(
  retries: number = 3
): Promise<Assignment[] | null> {
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

      const responseJson: Assignment[] = await request.json();

      if (responseJson.length === 0) {
        return null;
      }

      return responseJson.filter(
        (assignment) => assignment.setting.overrideTitle === "MAJOR ORDER"
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return null;
}

export async function getStrategicOpportunities(
  retries: number = 3
): Promise<Assignment[] | null> {
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

      const responseJson: Assignment[] = await request.json();

      return responseJson.filter(
        (assignment) => assignment.setting.overrideTitle !== "MAJOR ORDER"
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return null;
}

export async function getAllAssignments(
  retries: number = 3
): Promise<Assignment[] | null> {
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

      const responseJson: Assignment[] = await request.json();

      if (responseJson.length === 0) {
        return null;
      }

      return responseJson;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return null;
}
