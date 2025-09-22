export default function DashboardSuspense() {
  return (
    <div className="flex flex-col justify-center items-center rounded-md bg-slate-500 w-3/5 lg:w-1/2 xl:w-1/3 3xl:w-1/4 animate-pulse min-h-[178px] max-w-[470px]">
      <div className="flex flex-col h-full flex-1 space-y-6 py-3 w-full p-5 justify-center items-center">
        <div className="h-2 rounded bg-gray-200 w-2/5 flex justify-center items-center"></div>
        <div className="space-y-3 w-full h-full flex-1 grid grid-rows-2">
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="h-2 rounded bg-gray-200"></div>
            <div className="h-2 rounded bg-gray-200"></div>
          </div>
          <div className="h-2 rounded bg-gray-200 mt-5"></div>
        </div>
      </div>
    </div>
  );
}
