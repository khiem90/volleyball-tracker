"use client";

import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbNotice } from "@/components/matchbook/Notice";
import { Crest } from "@/components/matchbook/Panel";
import { MbField, MbSelect } from "@/components/matchbook/form";
import { crestForTeam } from "@/components/matchbook/types";
import type { Match, PersistentTeam, Competition } from "@/types/game";
import { useEditMatchDialog } from "./useEditMatchDialog";

/* ===========================================================================
   EDIT MATCH ASSIGNMENT

   Three defects the shipped dialog carried, all fixed by the primitives:

     - It said "Edit Match - Court {position}" and "Change which teams are
       playing on this court" for every format. `position` is a bracket slot in
       an elimination bracket and a fixture number in a round robin, and the
       venue word is configurable (R9). The caller now supplies the label.
     - `TeamSelectDropdown` was a bare native `<select>` that truncated to
       "Apex Me…" at 390px. `MbSelect` is 48px with a 16px face and its own
       frame at the `edge` rule tier.
     - The swap key was a shadcn `size="icon"` button, measured under 44px.
       `MbIconButton` guarantees the hit box.

   The team **crest** is shown beside each select so the choice is legible
   without reading the truncated option text.
   =========================================================================== */

export const EditMatchDialog = ({
  open,
  onOpenChange,
  match,
  matches = [],
  teams,
  competition,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  matches?: Match[];
  teams: PersistentTeam[];
  competition?: Competition | null;
  /** Names the fixture: "Round 3 · Match 2", "Court 1". */
  label?: string;
}) => {
  const {
    homeTeamId,
    setHomeTeamId,
    awayTeamId,
    setAwayTeamId,
    error,
    swapInfo,
    availableTeams,
    isValidMatchup,
    hasChanges,
    canEdit,
    getTeamName,
    isTeamPlaying,
    handleSwapTeams,
    handleSave,
  } = useEditMatchDialog({
    match,
    matches,
    teams,
    competition,
    onClose: () => onOpenChange(false),
  });

  if (!canEdit) return null;

  const options = availableTeams.map((team) => ({
    value: team.id,
    label: isTeamPlaying(team.id) ? `${team.name} (playing)` : team.name,
    disabled: isTeamPlaying(team.id),
  }));

  const crestFor = (teamId: string) => ({
    name: getTeamName(teamId),
    crest: crestForTeam(teamId, getTeamName(teamId)),
  });

  const sameTeam = Boolean(homeTeamId) && homeTeamId === awayTeamId;

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change the teams"
      icon="swap"
      kicker={label}
      size="md"
      description="Both teams must be free — a team already playing elsewhere cannot be selected."
    >
      <MbDialogBody className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <MbField label="Home" htmlFor="edit-match-home">
              <div className="flex items-center gap-2">
                {homeTeamId && <Crest team={crestFor(homeTeamId)} size={26} />}
                <MbSelect
                  id="edit-match-home"
                  className="flex-1"
                  options={options}
                  placeholder="Select a team"
                  value={homeTeamId}
                  onChange={(e) => setHomeTeamId(e.target.value)}
                />
              </div>
            </MbField>
          </div>

          <MbIconButton
            icon="swap"
            label="Swap the home and away teams"
            size="md"
            tone="outline-navy"
            onClick={handleSwapTeams}
            className="mb-1 shrink-0"
          />

          <div className="min-w-0 flex-1">
            <MbField label="Away" htmlFor="edit-match-away">
              <div className="flex items-center gap-2">
                {awayTeamId && <Crest team={crestFor(awayTeamId)} size={26} />}
                <MbSelect
                  id="edit-match-away"
                  className="flex-1"
                  options={options}
                  placeholder="Select a team"
                  value={awayTeamId}
                  onChange={(e) => setAwayTeamId(e.target.value)}
                />
              </div>
            </MbField>
          </div>
        </div>

        {sameTeam && (
          <MbNotice tone="danger">A team cannot play against itself.</MbNotice>
        )}
        {isTeamPlaying(homeTeamId) && (
          <MbNotice tone="danger">
            {getTeamName(homeTeamId)} is already playing another match.
          </MbNotice>
        )}
        {isTeamPlaying(awayTeamId) && (
          <MbNotice tone="danger">
            {getTeamName(awayTeamId)} is already playing another match.
          </MbNotice>
        )}

        {swapInfo?.needsSwap && swapInfo.swappingTeamId && swapInfo.displacedTeamId && (
          <MbNotice tone="warn" icon="swap" title="This is a two-way swap">
            {getTeamName(swapInfo.swappingTeamId)} is in another fixture. Saving moves{" "}
            {getTeamName(swapInfo.displacedTeamId)} into that fixture in its place.
          </MbNotice>
        )}

        {error && <MbNotice tone="danger">{error}</MbNotice>}
      </MbDialogBody>

      <MbDialogFooter>
        <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </MbButton>
        <MbButton
          variant="coral"
          size="lg"
          icon="save"
          disabled={!isValidMatchup || !hasChanges}
          onClick={handleSave}
        >
          Save teams
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
