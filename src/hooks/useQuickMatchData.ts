import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { todayLine } from "@/lib/dates";
import { quickMatchData, type QuickMatchData } from "@/lib/quickMatchData";

/**
 * What the Quick Match page shows of the account's saved matches, read from
 * the roster and the matches the app already holds, plus today's date for
 * the page's header.
 */
export const useQuickMatchData = (): QuickMatchData & { dateLine: string } => {
  const { roster, matches } = useApp();

  return useMemo(
    () => ({
      dateLine: todayLine({ year: true }),
      ...quickMatchData(roster, matches),
    }),
    [roster, matches],
  );
};
