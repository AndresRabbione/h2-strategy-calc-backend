"use client";

import { useRouter } from "next/navigation";
import SupplyLineView from "./supplyLineView";
import CreateSupplyLineBtn from "./createSupplyLineButton";
import { Flip, toast, ToastContainer } from "react-toastify";
import { useState } from "react";

export default function SupplyLineContainer({
  links,
}: {
  links:
    | {
        bidirectional: boolean | null;
        destination_disabled: boolean | null;
        destination_planet_name: string | null;
        linkedPlanetId: number | null;
        origin_disabled: boolean | null;
        origin_planet_name: string | null;
        planetId: number | null;
        supply_line_id: number | null;
      }[]
    | null;
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
    toast.success("Supply Line deleted", {
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
    <div className="flex flex-col ml-0 md:ml-5 justify-center items-center">
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
      <CreateSupplyLineBtn
        onDelete={handleDelete}
        onClose={handleClose}
        disabled={isRefreshing}
      ></CreateSupplyLineBtn>
      {links && links.length > 0 ? (
        <div className="grid grid-cols-1 p-3 md:p-0 md:py-5 items-center justify-center">
          {links.map((link) => (
            <SupplyLineView
              key={link.supply_line_id}
              link={link}
              onClose={handleClose}
              onDelete={handleDelete}
              disabled={isRefreshing}
            ></SupplyLineView>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-6 p-5">
          <p className="text-red-800 text-2xl">
            {!links ? "Something went wrong" : "No Supply Lines could be found"}
          </p>
        </div>
      )}
    </div>
  );
}
