import Pagination from "../../../components/pagination";

export default function SupplyLineFallback() {
  return (
    <div className="h-full flex flex-col min-h-screen">
      <section className="px-6 py-10  flex flex-col">
        <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
        <div className="bg-gray-700 flex flex-col animate-pulse">
          <div className="flex flex-col md:flex-row md:justify-between w-full">
            <Pagination currentPage={0} hasNext={false} />
            <div className="p-3 pt-1.5 md:pt-6 md:p-6 md:pr-3 rounded-xl">
              <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
              ></link>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 md:gap-3">
                <div className="relative w-full sm:w-auto">
                  <input
                    disabled={true}
                    className="rounded-sm border border-[#545454b7] w-full pl-10 py-2 bg-gray-900"
                  />
                  <span className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2"></span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col ml-3 md:ml-5">
            <div className="pt-3 h-2 rounded bg-gray-200 mt-5 w-1/10"></div>
            <div className="grid grid-cols-1 p-3 pl-0 md:p-5 md:pl-0 items-center gap-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <div className="h-4 rounded bg-gray-200 mt-5" key={index}></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
