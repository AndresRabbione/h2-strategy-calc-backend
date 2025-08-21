import { Flip, ToastOptions } from "react-toastify";

export const warStartTime = 1706040313 * 1000;

export const sidebarToastConfig = {
  position: "bottom-left",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
  transition: Flip,
} as ToastOptions;
