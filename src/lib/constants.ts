import { Flip, ToastOptions } from "react-toastify";

export const warStartTime = 1707927760000;

export const playerImpactBaselineEstimate = 41;

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

export const helldiversAPIHeaders = {
  "Content-Type": "application/json",
  "X-Super-Client": "helldivers.strategy.gen",
  "X-Super-Contact": "h2strategycalc@gmail.com",
};
