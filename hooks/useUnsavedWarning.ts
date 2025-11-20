import { useEffect } from "react";

export default function useUnsavedWarning(shouldWarn: boolean) {
  useEffect(() => {
    const handleUnload = (e: BeforeUnloadEvent) => {
      if (!shouldWarn) return;

      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [shouldWarn]);
}
