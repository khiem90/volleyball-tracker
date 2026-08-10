"use client";

import { useMemo, useState } from "react";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbSelectList } from "@/components/matchbook/SelectList";
import { TeamMark } from "@/components/matchbook/Panel";
import { crestForTeam } from "@/components/matchbook/types";
import { pluralise } from "@/lib/text";
import type { PersistentTeam } from "@/types/game";

/**
 * Adding entrants to a draft competition.
 *
 * The shipped detail screen had no path to this at all — the entrant list was
 * read-only from the moment the competition was created, so a late arrival
 * meant deleting the competition and rebuilding it (brief §2.5). `MbSelectList`
 * carries the `Set`, the search field and the row windowing, so this file is
 * only the eligibility rule and the write.
 */
export const AddEntrantsDialog = ({
  open,
  onOpenChange,
  allTeams,
  enteredIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTeams: PersistentTeam[];
  enteredIds: string[];
  onConfirm: (teamIds: string[]) => void;
}) => {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPicked(new Set());
      setSearch("");
    }
  }

  const eligible = useMemo(() => {
    const entered = new Set(enteredIds);
    const query = search.trim().toLowerCase();
    return allTeams
      .filter((team) => !entered.has(team.id))
      .filter((team) => !query || team.name.toLowerCase().includes(query));
  }, [allTeams, enteredIds, search]);

  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add teams"
      icon="teams"
      size="md"
      description="Only teams that are not already entered are listed. Entrant order is the seeding."
    >
      <MbDialogBody flush className="flex min-h-[16rem] flex-col">
        <MbSelectList
          items={eligible}
          getKey={(team) => team.id}
          selected={picked}
          onToggle={toggle}
          onSelectAll={() =>
            setPicked((prev) =>
              prev.size === eligible.length
                ? new Set()
                : new Set(eligible.map((team) => team.id))
            )
          }
          search={search}
          onSearchChange={setSearch}
          label="Teams"
          emptyMessage={
            allTeams.length === enteredIds.length
              ? "No teams are left to add — every team you have is already entered."
              : "No teams match that search — try a different name."
          }
          renderPrimary={(team) => (
            <TeamMark
              team={{ name: team.name, crest: crestForTeam(team.id, team.name) }}
              size="sm"
              accent={team.color}
            />
          )}
        />
      </MbDialogBody>

      <MbDialogFooter>
        <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </MbButton>
        <MbButton
          variant="coral"
          size="lg"
          icon="plus"
          disabled={picked.size === 0}
          onClick={() => {
            onConfirm([...picked]);
            onOpenChange(false);
          }}
        >
          Add {picked.size} {pluralise("team", picked.size)}
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
