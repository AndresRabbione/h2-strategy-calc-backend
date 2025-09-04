"use client";

import { useRouter } from "next/navigation";
import Button from "./button";

export default function Pagination({
  hasNext,
  searchParamsString,
}: {
  hasNext: boolean;
  searchParamsString: string;
}) {
  const router = useRouter();
  const searchParams = new URLSearchParams(searchParamsString);

  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page") as string, 10)
    : 0;

  const pageChange = (pageNumber: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("page", pageNumber.toString());
    router.push(`?${newParams.toString()}`);
  };

  return (
    <div className="flex items-center justify-between p-3 pb-1.5 md:pb-3 gap-3">
      <div>
        {
          <Button
            text={"← Previous Page"}
            onClick={() => pageChange(page - 1)}
            disabled={page <= 0}
          />
        }
      </div>

      <div>Page {page + 1}</div>

      <div>
        <Button
          text={"Next Page →"}
          onClick={() => pageChange(page + 1)}
          disabled={!hasNext}
        />
      </div>
    </div>
  );
}
