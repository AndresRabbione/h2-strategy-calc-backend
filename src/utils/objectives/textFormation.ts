import {
  DBObjectiveInsert,
  DBPlanet,
  ObjectiveTypes,
} from "@/lib/typeDefinitions";
import { parseItemId } from "../parsing/items";
import { getFactionColorFromId } from "../parsing/colors";
import { getFactionNameFromId } from "../parsing/factions";
import { parseSectorId } from "../parsing/sectors";
import { parseStratagemId } from "../parsing/stratagems";
import { parseEnemyId } from "../parsing/enemy";

export async function getObjectiveText(
  objective: DBObjectiveInsert,
  allPlanets: DBPlanet[]
): Promise<{ text: string; color: string; joiner: string }[]> {
  const mainTextColor = "#ffffff";

  if (allPlanets.length === 0)
    return [{ text: "Unknown Objective", color: mainTextColor, joiner: "" }];

  const source: { text: string; color: string; joiner: string }[] = [];
  const planet = objective.planetId ? allPlanets[objective.planetId] : null;
  const hasPlanet = objective.planetId !== null;
  const highlightTextColor = "#ffe711";

  switch (objective.type) {
    case ObjectiveTypes.COLLECT:
      const itemName = await parseItemId(objective.itemId!);

      if (hasPlanet) {
        source.push({ text: "on", color: mainTextColor, joiner: " " });
        source.push({
          text: planet!.name,
          color: getFactionColorFromId(planet!.current_faction, false),
          joiner: ", ",
        });
      }

      if (objective.factionId && !hasPlanet) {
        source.push({ text: `from`, color: mainTextColor, joiner: " " });
        source.push({
          text: getFactionNameFromId(objective.factionId, false),
          color: getFactionColorFromId(objective.factionId, false),
          joiner: " ",
        });
        source.push({ text: `planets`, color: mainTextColor, joiner: ", " });
      }

      if (objective.sectorId && !hasPlanet) {
        source.push({ text: `in the`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${await parseSectorId(objective.sectorId)}`,
          color: highlightTextColor,
          joiner: " ",
        });
        source.push({ text: `sector`, color: mainTextColor, joiner: ", " });
      }

      return [
        {
          text: "Successfully extract with",
          color: mainTextColor,
          joiner: " ",
        },
        {
          text: `${objective.totalAmount!.toLocaleString("en-US")} ${
            itemName + "s"
          }`,
          color: highlightTextColor,
          joiner: " ",
        },
      ].concat(source);
    case ObjectiveTypes.DEFEND:
      if (!hasPlanet) {
        source.push({
          text: objective.totalAmount!.toLocaleString("en-US"),
          color: highlightTextColor,
          joiner: " ",
        });
        source.push({ text: "attacks", color: mainTextColor, joiner: " " });
      }

      if (objective.factionId && !hasPlanet) {
        source.push({ text: `from`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${getFactionNameFromId(objective.factionId, false)}`,
          color: getFactionColorFromId(objective.factionId, false),
          joiner: ", ",
        });
      }

      if (objective.sectorId && !hasPlanet) {
        source.push({ text: `in the`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${await parseSectorId(objective.sectorId)}`,
          color: highlightTextColor,
          joiner: " ",
        });
        source.push({ text: `sector`, color: mainTextColor, joiner: ", " });
      }

      if (hasPlanet) {
        source.push({
          text: planet!.name,
          color: getFactionColorFromId(planet!.current_faction, false),
          joiner: ", ",
        });
      }

      return [
        {
          text: !hasPlanet ? "Defend" : "Defend against",
          color: mainTextColor,
          joiner: " ",
        },
      ].concat(source);
    case ObjectiveTypes.LIBERATE:
      return [
        { text: "Liberate", color: mainTextColor, joiner: " " },
        {
          text: planet!.name,
          color: getFactionColorFromId(planet!.current_faction, false),
          joiner: " ",
        },
      ];
    case ObjectiveTypes.HOLD:
      return [
        { text: "Hold", color: mainTextColor, joiner: " " },
        {
          text: planet!.name,
          color: getFactionColorFromId(planet!.current_faction, false),
          joiner: " ",
        },
      ];
    case ObjectiveTypes.LIBERATE_MORE:
      if (objective.factionId) {
        source.push({ text: `to`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${getFactionNameFromId(objective.factionId, false)}`,
          color: getFactionColorFromId(objective.factionId, false),
          joiner: ", ",
        });
      }

      if (objective.sectorId) {
        source.push({ text: `in the`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${await parseSectorId(objective.sectorId)}`,
          color: highlightTextColor,
          joiner: " ",
        });
        source.push({ text: `sector`, color: mainTextColor, joiner: ", " });
      }

      return [
        {
          text: "Liberate more planets than are lost",
          color: mainTextColor,
          joiner: " ",
        },
      ].concat(source);
    case ObjectiveTypes.OPERATIONS:
      const difficulty =
        objective.difficulty !== null
          ? [
              { text: "at difficulty", color: mainTextColor, joiner: " " },
              {
                text: `${objective.difficulty}`,
                color: highlightTextColor,
                joiner: " ",
              },
              { text: "or higher", color: mainTextColor, joiner: " " },
            ]
          : [];

      if (hasPlanet) {
        source.push({ text: "on", color: mainTextColor, joiner: " " });
        source.push({
          text: planet!.name,
          color: getFactionColorFromId(planet!.current_faction, false),
          joiner: ", ",
        });
      }

      if (objective.factionId && !hasPlanet) {
        source.push({ text: `against`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${getFactionNameFromId(objective.factionId, false)}`,
          color: getFactionColorFromId(objective.factionId, false),
          joiner: ", ",
        });
      }

      if (objective.sectorId && !hasPlanet) {
        source.push({ text: `in the`, color: mainTextColor, joiner: " " });
        source.push({
          text: `${await parseSectorId(objective.sectorId)}`,
          color: highlightTextColor,
          joiner: " ",
        });
        source.push({ text: `sector`, color: mainTextColor, joiner: ", " });
      }

      return [
        { text: "Complete", color: mainTextColor, joiner: " " },
        {
          text: `${objective.totalAmount!.toLocaleString("en-US")}`,
          color: highlightTextColor,
          joiner: " ",
        },
        { text: "operations", color: mainTextColor, joiner: " " },
      ].concat(difficulty, source);
    case ObjectiveTypes.KILL:
      if (hasPlanet) {
        source.push({
          text: "on",
          color: mainTextColor,
          joiner: " ",
        });
        source.push({
          text: planet!.name,
          color: getFactionColorFromId(planet!.current_faction, false),
          joiner: " ",
        });
      }

      if (objective.sectorId && !hasPlanet) {
        source.push({
          text: "in the",
          color: mainTextColor,
          joiner: " ",
        });
        source.push({
          text: `${await parseSectorId(objective.sectorId)} sector`,
          color: highlightTextColor,
          joiner: " ",
        });
      }

      const strategem = objective.stratagemId
        ? [
            { text: "using the", color: mainTextColor, joiner: " " },
            {
              text: await parseStratagemId(objective.stratagemId),
              color: highlightTextColor,
              joiner: " ",
            },
            { text: "stratagem", color: mainTextColor, joiner: " " },
          ]
        : [];

      const enemy = await parseEnemyId(objective.enemyId!, objective.factionId);
      return [
        { text: "Kill", color: mainTextColor, joiner: " " },
        {
          text: `${objective.totalAmount!.toLocaleString("en-US")}`,
          color: highlightTextColor,
          joiner: " ",
        },
        {
          text: enemy.name,
          color: getFactionColorFromId(enemy.faction, false),
          joiner: " ",
        },
      ].concat(source, strategem);
    default:
      return [{ text: "Unknown Objective", color: mainTextColor, joiner: "" }];
  }
}

export async function getObjectiveTextMarkup(
  objective: DBObjectiveInsert,
  allPlanets: DBPlanet[]
): Promise<string> {
  const parsedText = await getObjectiveText(objective, allPlanets);

  let finalText = "";

  parsedText.forEach((segment, index) => {
    if (segment.color === "#ffffff") {
      finalText +=
        index === parsedText.length - 1
          ? `${segment.text}`
          : `${segment.text}${segment.joiner}`;
    } else {
      finalText += `<i col="${segment.color}">${segment.text}</i>${
        index === parsedText.length - 1 ? "" : segment.joiner
      }`;
    }
  });

  return finalText;
}
