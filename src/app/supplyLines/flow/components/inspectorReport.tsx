import { FinalReport } from "../../hooks/usePlanetGraph";

export default function InspectorReport({
  saveReport,
  onClear,
  isSaving,
}: {
  saveReport: FinalReport | null;
  onClear: () => void;
  isSaving: boolean;
}) {
  if (isSaving || !saveReport) {
    return (
      <div className="mt-6 border-t border-gray-800 pt-4">
        <div className="mt-2 space-y-2 flex flex-col items-center justify-center">
          <span>{isSaving ? "Saving..." : "Waiting for report..."}</span>
          <svg
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative size-13 animate-spin text-white"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="white"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="white"
              d="M 4 12 a 8 8 0 0 1 8 -8 V 0 C 5.373 0 0 5.373 0 12 h 4 Z m 2 5.291 A 7.962 7.962 0 0 1 4 12 H 0 c 0 3.042 1.135 5.824 3 7.938 l 3 -2.647 Z"
            ></path>
          </svg>
        </div>
      </div>
    );
  }

  if (saveReport.ok) {
    return (
      <div className="mt-6 border-t border-gray-800 pt-4 text-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-lg">Report</div>
          <button
            onClick={onClear}
            className="text-sm font-medium px-2 py-1 rounded-md cursor-pointer border border-gray-700 bg-transparent hover:ring hover:ring-gray-800/80 transition-all duration-300 ease-in-out"
          >
            Clear
          </button>
        </div>
        <div className="flex flex-col gap-1">
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
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-gray-800 pt-4 text-sm text-gray-400">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Report</div>
        <button
          onClick={onClear}
          className="text-sm font-medium px-2 py-1 rounded-md border border-gray-700 bg-transparent"
        >
          Clear
        </button>
      </div>
      <span className="self-center">
        There were some issues saving your changes.
      </span>
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
