import { Assignment } from "@/lib/typeDefinitions";

const api =
  process.env.NEXT_PUBLIC_HELLDIVERS_API_URL + "/raw/api/v2/Assignment/War/801";

export async function getCurrentMajorOrders(): Promise<Assignment[] | null> {
  try {
    const request = await fetch(`${api}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Super-Client": "helldivers.strategy.calc",
        "X-Super-Contact": "example@email.com",
      },
    });

    if (request.status !== 200) {
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

    const responseJson: Assignment[] = await request.json();

    return responseJson.filter(
      (assignment) => assignment.setting.overrideTitle !== "MAJOR ORDER"
    );
  } catch (e) {
    console.error(e);
    return null;
  }
}
