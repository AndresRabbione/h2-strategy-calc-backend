import { FinalReport } from "../../hooks/usePlanetGraph";
import ReportSegment from "./reportSegment";

export default function InspectorReport({
  saveReports,
  onClear,
  isSaving,
  onSingleClear,
}: {
  saveReports: FinalReport[];
  onClear: () => void;
  onSingleClear: (id: number) => void;
  isSaving: boolean;
}) {
  if (isSaving || saveReports.length === 0) {
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

  return (
    <div className="mt-6 border-t border-gray-800 pt-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-lg">Reports</div>
        <button
          onClick={onClear}
          className="text-sm font-medium px-2 py-1 rounded-md cursor-pointer border border-gray-700 bg-transparent hover:ring hover:ring-gray-800/80 transition-all duration-300 ease-in-out"
        >
          Clear All
        </button>
      </div>
      <div
        className="flex flex-col gap-5 items-center justify-start overflow-y-auto max-h-[45vh] [&::-webkit-scrollbar]:w-1
        [&::-webkit-scrollbar-track]:bg-gray-100
        [&::-webkit-scrollbar-thumb]:bg-gray-300
        dark:[&::-webkit-scrollbar-track]:bg-neutral-700
        dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
      >
        {saveReports.map((saveReport) => (
          <ReportSegment
            key={saveReport.createdAt.getTime()}
            onClear={onSingleClear}
            saveReport={saveReport}
          />
        ))}
      </div>
    </div>
  );
}
