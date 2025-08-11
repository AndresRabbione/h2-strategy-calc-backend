import { Assignment } from "@/lib/typeDefinitions";

const api = process.env.HELLDIVERS_API_URL + "/raw/api/v2/Assignment/War/801";

export async function getLatestMajorOrder(): Promise<Assignment | null> {
  try {
    const request = await fetch(`${api}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Super-Client": "helldivers.strategy.calc",
        "X-Super-Contact": "example@email.com",
      },
    });

    const responseJson = await request.json();

    if (responseJson.length === 0) {
      return null;
    }

    return responseJson[0];
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getStrategicOpportunities(): Promise<
  Assignment[] | null
> {
  try {
    const request = await fetch(`${api}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Super-Client": "helldivers.strategy.calc",
        "X-Super-Contact": "example@email.com",
      },
    });

    const responseJson = await request.json();

    if (responseJson.length < 2) {
      return null;
    }

    return responseJson.slice(1);
  } catch (e) {
    console.error(e);
    return null;
  }
}
