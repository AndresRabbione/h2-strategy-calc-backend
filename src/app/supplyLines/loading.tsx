export default function LoadingLinkPage() {
  return (
    <div className="fixed flex flex-col left-1/2 right-1/2 top-1/2 bottom-1/2">
      <div className="flex flex-col items-center gap-4">
        <span className="relative text-4xl font-semibold">Loading</span>
        <svg
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative size-13 animate-spin text-white"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="white"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="white"
            d="M 4 12 a 8 8 0 0 1 8 -8 V 0 C 5.373 0 0 5.373 0 12 h 4 Z m 2 5.291 A 7.962 7.962 0 0 1 4 12 H 0 c 0 3.042 1.135 5.824 3 7.938 l 3 -2.647 Z"
          ></path>
        </svg>
      </div>
    </div>
  );
}
