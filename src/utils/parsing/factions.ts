import { FactionIDs, Factions, Planet } from "@/lib/typeDefinitions";

export function getAPIFactionNameFromId(factionId: number): Factions {
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
export function getFactionNameFromId(
  factionId: number,
  isCountable: boolean
): string {
  switch (factionId) {
    case FactionIDs.HUMANS:
      return isCountable ? "Humans" : "Super Earth";
    case FactionIDs.AUTOMATONS:
      return isCountable ? "Automatons" : "the Automatons";
    case FactionIDs.ILLUMINATE:
      return isCountable ? "Illuminate" : "the Illuminate";
    case FactionIDs.TERMINIDS:
      return isCountable ? "Terminids" : "the Terminids";
    default:
      return isCountable ? "Humans" : "Super Earth";
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
