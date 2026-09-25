"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";

/** The five sections of the console. A tournament has Standings or a Bracket, never both. */
export type ConsoleTab = "courts" | "schedule" | "standings" | "bracket" | "teams" | "settings";

export interface ConsoleTabSpec {
  id: ConsoleTab;
  label: string;
  icon: string;
}

export const consoleTabs = ({
  hasBracket,
  courtsLabel,
}: {
  hasBracket: boolean;
  /** "Courts", or "Fields" when the tournament calls them that. */
  courtsLabel: string;
}): ConsoleTabSpec[] => [
  { id: "courts", label: courtsLabel, icon: "court" },
  { id: "schedule", label: "Schedule", icon: "calendar" },
  hasBracket
    ? { id: "bracket", label: "Bracket", icon: "bracket" }
    : { id: "standings", label: "Standings", icon: "chart" },
  { id: "teams", label: "Teams", icon: "teams" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export const tabId = (tab: ConsoleTab) => `console-tab-${tab}`;
export const panelId = (tab: ConsoleTab) => `console-panel-${tab}`;

/**
 * The phone tab strip. Five tabs in a fixed grid so they fit a 375px screen
 * without scrolling; each is at least 48px tall for a thumb. Hidden from lg
 * up, where every section is on screen at once.
 */
export const ConsoleTabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: ConsoleTabSpec[];
  active: ConsoleTab;
  onChange: (tab: ConsoleTab) => void;
}) => (
  <div
    role="tablist"
    aria-label="Tournament sections"
    className="mb-4 grid grid-cols-5 border-b-[1.5px] border-mb-navy lg:hidden"
  >
    {tabs.map((tab) => {
      const selected = tab.id === active;
      return (
        <button
          key={tab.id}
          id={tabId(tab.id)}
          type="button"
          role="tab"
          aria-selected={selected}
          aria-controls={panelId(tab.id)}
          onClick={() => onChange(tab.id)}
          className={`matchbook-display -mb-[1.5px] flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 border-b-[3px] px-0.5 pb-1.5 pt-2 text-[0.58rem] font-bold tracking-[0.04em] transition-colors ${
            selected ? "border-mb-coral text-mb-coral" : "border-transparent text-mb-navy"
          }`}
        >
          <MbIcon id={tab.icon} size={18} className="shrink-0" />
          <span className="truncate">{tab.label}</span>
        </button>
      );
    })}
  </div>
);
