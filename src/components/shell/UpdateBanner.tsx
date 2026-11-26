"use client";

import { useAppUpdate } from "@/context/AppUpdateContext";

/**
 * The offer of a newly deployed version: an ink strip with a green Reload,
 * in the flow under the top bar or the scoring header, so it covers nothing.
 * The page reloads only on that tap.
 */
export const UpdateBanner = () => {
  const { status, reload } = useAppUpdate();
  if (status === "current") return null;

  const switching = status === "switching";
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-ink py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center text-white"
    >
      <p className="text-label font-medium">A new version of the app is ready.</p>
      {/* The main button at a toolbar's height, with a white focus ring, since its ink one is lost on this strip. */}
      <button
        type="button"
        onClick={reload}
        disabled={switching}
        className="btn btn-action min-h-11 px-5 text-label focus-visible:outline-white"
      >
        {switching ? "Reloading..." : "Reload"}
      </button>
    </div>
  );
};
