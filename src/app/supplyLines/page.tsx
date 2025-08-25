import { PageProps } from "../../../.next/types/app/supplyLines/page";
import { Suspense } from "react";
import SupplyLinesData from "../../../components/supplyLineServerData";
import SupplyLineFallback from "../../../components/supplyLineSuspense";

export default async function SupplyLines({ searchParams }: PageProps) {
  return (
    <div className="h-full flex flex-col min-h-screen">
      <section className="px-6 py-10  flex flex-col">
        <h1 className="text-center pb-4 text-3xl font-bold">Supply Lines</h1>
        <Suspense fallback={<SupplyLineFallback></SupplyLineFallback>}>
          <SupplyLinesData searchParams={searchParams}></SupplyLinesData>
        </Suspense>
      </section>
    </div>
  );
}
