import { FactionIDs, Factions, Planet } from "@/lib/typeDefinitions";

export function getFactionNameFromId(factionId: number): Factions {
  switch (factionId) {
    case FactionIDs.HUMANS:
      return Factions.HUMANS;
    case FactionIDs.AUTOMATONS:
      return Factions.AUTOMATONS;
    case FactionIDs.ILLUMINATE:
      return Factions.ILLUMINATE;
    case FactionIDs.TERMINIDS:
      return Factions.TERMINIDS;
    default:
      return Factions.HUMANS;
  }
}

export function getFactionIdFromName(faction: Factions): FactionIDs {
  switch (faction) {
    case Factions.HUMANS:
      return FactionIDs.HUMANS;
    case Factions.AUTOMATONS:
      return FactionIDs.AUTOMATONS;
    case Factions.ILLUMINATE:
      return FactionIDs.ILLUMINATE;
    case Factions.TERMINIDS:
      return FactionIDs.TERMINIDS;
    default:
      return FactionIDs.HUMANS;
  }
}

export function isUnderAttackByFaction(
  attackers: Planet[],
  faction: Factions
): boolean {
  for (const attacker of attackers) {
    if (attacker.currentOwner === faction) return true;
  }

  return false;
}
