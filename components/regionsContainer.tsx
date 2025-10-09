"use client";

import { useRouter } from "next/navigation";
import { Flip, toast, ToastContainer } from "react-toastify";
import { useState } from "react";
import CreateRegionBtn from "./createRegionButton";
import RegionsView from "./regionsView";
import { RegionView } from "@/lib/typeDefinitions";

export default function RegionsContainer({
  regions,
  planets,
}: {
  regions: RegionView[];
  planets: { name: string; id: number }[];
}) {
  const [isRefreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const handleClose = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      router.refresh();
    }, 1000);
  };
  const handleDelete = () => {
    toast.success("Region deleted", {
      position: "bottom-left",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Flip,
    });
  };
  return (
    <div className="flex flex-col ml-0 md:ml-5 md:mr-5 justify-center items-center">
      <ToastContainer
        position="bottom-left"
        autoClose={1000}
        limit={3}
        hideProgressBar={false}
        newestOnTop
        closeOnClick={false}
        rtl={false}
        draggable
        pauseOnHover
        theme="dark"
        transition={Flip}
      ></ToastContainer>
      <CreateRegionBtn
        onDelete={handleDelete}
        onClose={handleClose}
        disabled={isRefreshing}
        planets={planets}
      ></CreateRegionBtn>
      {regions && regions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 p-3 md:p-0 md:py-5 items-center justify-center gap-2 w-full">
          {regions.map((region) => (
            <RegionsView
              key={region.region_id}
              region={region}
              planets={planets}
              onClose={handleClose}
              onDelete={handleDelete}
              disabled={isRefreshing}
            ></RegionsView>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-6 p-5">
          <p className="text-red-800 text-2xl">
            {!regions ? "Something went wrong" : "No regions could be found"}
          </p>
        </div>
      )}
    </div>
  );
}
