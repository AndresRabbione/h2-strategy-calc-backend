import { FactionIDs } from "@/lib/typeDefinitions";

export function getFactionColorFromId(
  factionId: FactionIDs,
  isProgressBar: boolean
): string {
  switch (factionId) {
    case FactionIDs.HUMANS:
      return isProgressBar ? "#ffe711" : "#219ffb";
    case FactionIDs.AUTOMATONS:
      return "#fe6d6a";
    case FactionIDs.ILLUMINATE:
      return "#ce64f8";
    case FactionIDs.TERMINIDS:
      return "#fdc300";
    default:
      return "#ffe711";
  }
}
