import { FinalReport } from "../../hooks/usePlanetGraph";

export default function ReportSegment({
  saveReport,
  onClear,
}: {
  saveReport: FinalReport;
  onClear: (id: number) => void;
}) {
  if (saveReport.ok) {
    const formattedDate = saveReport.createdAt.toLocaleString();
    return (
      <div className="flex flex-col gap-1 w-11/12">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-lg">
            Report{" "}
            <span className="font-light text-xs text-white/60">{`(${formattedDate})`}</span>
          </div>
          <button
            onClick={() => onClear(saveReport.createdAt.getTime())}
            className="text-sm font-medium px-2 py-1 rounded-md cursor-pointer border border-gray-700 bg-transparent hover:ring hover:ring-gray-800/80 transition-all duration-300 ease-in-out"
          >
            Clear
          </button>
        </div>
        <span>All operations completed successfully.</span>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Records created:</strong> {saveReport.summary.inserted}
          </li>
          <li>
            <strong>Records updated:</strong> {saveReport.summary.updated}
          </li>
          <li>
            <strong>Records deleted:</strong> {saveReport.summary.deleted}
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-lg">Report</div>
        <button
          onClick={() => onClear(saveReport.createdAt.getTime())}
          className="text-sm font-medium px-2 py-1 rounded-md cursor-pointer border border-gray-700 bg-transparent hover:ring hover:ring-gray-800/80 transition-all duration-300 ease-in-out"
        >
          Clear
        </button>
      </div>
      <span>There were some issues saving your changes.</span>
      <div className="flex flex-col items-center justify-start gap-3 pl-5 space-y-1">
        <div className="flex flex-col items-center">
          <span className="font-medium">Changes rejected</span>
          <ul className="list-none">
            {saveReport.report
              .filter((r) => r.status === "fulfilled")
              .map((r) => {
                return (
                  <li key={r.key}>
                    {r.name === "Updating Planet"
                      ? `Node ID ${r.key}:`
                      : r.name === "Deleting Supply Line"
                      ? `Supply Line ID ${r.key}: `
                      : `Edge ID ${r.key}: `}{" "}
                    {r.supabaseError?.message ?? "Unknown error"}
                  </li>
                );
              })}
          </ul>
        </div>

        <div className="flex flex-col items-center">
          <span>Changes failed</span>
          <ul className="list-none">
            {saveReport.report
              .filter((r) => r.status === "rejected")
              .map((r) => {
                return (
                  <li key={r.key}>
                    {r.name === "Updating Planet"
                      ? `Node ID ${r.key}:`
                      : r.name === "Deleting Supply Line"
                      ? `Supply Line ID ${r.key}: `
                      : `Edge ID ${r.key}: `}{" "}
                    {r.reason}
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </div>
  );
}
