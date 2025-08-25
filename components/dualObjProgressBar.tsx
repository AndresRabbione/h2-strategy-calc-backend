export default function DualObjectiveProgressBar({
  factionColor,
  friendlyCount,
  enemyCount,
}: {
  factionColor: string;
  friendlyCount: number;
  enemyCount: number;
}) {
  const totalCount = friendlyCount - enemyCount;
  const friendlyPercent: string = `${
    4 + totalCount > 0 && 4 + totalCount < 8
      ? 4 + totalCount
      : 4 + totalCount < 0
      ? 1
      : 8
  }/8`;

  return (
    <div
      className={`bg-[${factionColor}] w-4/5 relative h-6 before:top-1 before:right-0 before:absolute before:left-0 before:mr-2 before:text-center before:text-sm before:content-[attr(data-label)]`}
      data-label={totalCount}
    >
      <span
        className={`inline-block h-full bg-[--super-earth-blue] w-${friendlyPercent}`}
      ></span>
    </div>
  );
}
