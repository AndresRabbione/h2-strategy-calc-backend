"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Button from "./button";

export default function Pagination({
  currentPage,
  hasNext,
}: {
  currentPage: number;
  hasNext: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between p-3">
      <div>
        {
          <Button
            text={"← Previous Page"}
            onClick={() => page(currentPage - 1)}
            disabled={currentPage <= 0}
          />
        }
      </div>

      <div>Page {currentPage + 1}</div>

      <div>
        <Button
          text={"Next Page →"}
          onClick={() => page(currentPage + 1)}
          disabled={!hasNext}
        />
      </div>
    </div>
  );
}
