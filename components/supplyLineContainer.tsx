"use client";

import { useRouter } from "next/navigation";
import SupplyLineView from "./supplyLineView";
import CreateSupplyLineBtn from "./createSupplyLineButton";
import { Flip, toast, ToastContainer } from "react-toastify";

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
  const router = useRouter();
  const handleSave = () => {
    router.refresh();
    toast.success("Supply Line updated", {
      position: "bottom-left",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Flip,
    });
  };
  const handleDelete = () => {
    router.refresh();
    toast.success("Supply Line deleted", {
      position: "bottom-left",
      autoClose: 3000,
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
    <div className="flex flex-col ml-5">
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
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
        onSave={handleSave}
        onDelete={handleDelete}
        onInsert={() => router.refresh()}
      ></CreateSupplyLineBtn>
      {links && links.length > 0 ? (
        <div className="grid grid-cols-1 p-3 pl-0 md:p-5 md:pl-0 items-center">
          {links.map((link) => (
            <SupplyLineView
              key={link.supply_line_id}
              link={link}
              onDelete={handleDelete}
              onSave={handleSave}
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
