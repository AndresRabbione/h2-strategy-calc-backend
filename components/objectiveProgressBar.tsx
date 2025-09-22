export default function ObjectiveProgressBar({
  innerText,
  factionColor,
  percentage,
}: {
  innerText: string;
  factionColor: string;
  percentage: number;
}) {
  return (
    <div
      className={`bg-[${factionColor}] w-4/5 before:top-1 before:right-0 relative h-6 before:absolute before:left-0 before:mr-2 before:text-end before:text-sm before:content-[attr(data-label)]`}
      data-label={innerText}
    >
      <span
        className="inline-block h-full bg-[--super-earth-blue]"
        style={{ width: `${percentage}%` }}
      ></span>
    </div>
  );
}
