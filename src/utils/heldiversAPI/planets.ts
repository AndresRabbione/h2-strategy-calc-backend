import { Planet } from "@/lib/typeDefinitions";

const api = process.env.API_URL + "/api/v1/planets";

export async function findPlanetById(id: number): Promise<Planet | null> {
  try {
    const request = await fetch(`${api}/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Super-Client": "helldivers.strategy.calc",
        "X-Super-Contact": "example@email.com",
      },
    });

    return await request.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}
