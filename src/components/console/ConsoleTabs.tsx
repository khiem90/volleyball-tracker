"use client";

/** The five sections of the console. A tournament has Standings or a Bracket, never both. */
export type ConsoleTab = "courts" | "schedule" | "standings" | "bracket" | "teams" | "settings";

export interface ConsoleTabSpec {
  id: ConsoleTab;
  label: string;
}

export const consoleTabs = ({
  hasBracket,
  courtsLabel,
}: {
  hasBracket: boolean;
  /** "Courts", or "Fields" when the tournament calls them that. */
  courtsLabel: string;
}): ConsoleTabSpec[] => [
  { id: "courts", label: courtsLabel },
  { id: "schedule", label: "Schedule" },
  hasBracket ? { id: "bracket", label: "Bracket" } : { id: "standings", label: "Standings" },
  { id: "teams", label: "Teams" },
  { id: "settings", label: "Settings" },
];

export const tabId = (tab: ConsoleTab) => `console-tab-${tab}`;
export const panelId = (tab: ConsoleTab) => `console-panel-${tab}`;

/**
 * The phone tab strip, for the foot of the console's page header. Five text
 * tabs, each 48px tall for a thumb. A tab is as wide as its word plus an
 * equal share of the room left over, so a long word such as Standings is
 * not cut on a narrow phone. The open tab is ink over a green underline. Hidden from lg up, where every section is on screen at once.
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
  <div role="tablist" aria-label="Tournament sections" className="-mx-2 flex lg:hidden">
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
          className={`min-h-12 flex-auto whitespace-nowrap border-b-[3px] px-1 text-caption font-semibold transition-colors focus-visible:-outline-offset-2 ${
            selected ? "border-action text-ink" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
