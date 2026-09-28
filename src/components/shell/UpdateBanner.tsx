"use client";

import { useAppUpdate } from "@/context/AppUpdateContext";

/**
 * The offer of a newly deployed version: a strip with Reload, in the flow
 * under the top bar or the scoring header, so it covers nothing. The page
 * reloads only on that tap.
 */
export const UpdateBanner = () => {
  const { status, reload } = useAppUpdate();
  if (status === "current") return null;

  const switching = status === "switching";
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t-[1.5px] border-mb-navy bg-mb-navy py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center text-mb-paper-bright"
    >
      <p className="text-[0.85rem] font-medium">A new version of the app is ready.</p>
      <button
        type="button"
        onClick={reload}
        disabled={switching}
        className="mb-btn mb-btn-coral px-5"
      >
        {switching ? "Reloading..." : "Reload"}
      </button>
    </div>
  );
};
