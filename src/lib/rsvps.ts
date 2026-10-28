import { deleteField, type Firestore } from "firebase/firestore";
import { rsvpProblems, type RsvpSetup } from "@/lib/rsvp";
import { updateTournamentFields } from "@/lib/tournaments";
import type { RsvpSettings, Tournament } from "@/types/game";

/**
 * RSVPs on Firestore: the owner's RSVP settings on the tournament document.
 * The pure derivations are in src/lib/rsvp.ts.
 */

/**
 * Save a tournament's scheduled time and RSVP settings through the same
 * revision-carrying field write a rename uses, so a result racing it is
 * never overwritten (ADR-0003). A scheduled time that changes is stored
 * with `zone`, the zone it was entered in; one that stays keeps the zone it
 * was set in. Throws the first problem with the setup, before anything is
 * written, so the link cannot go on without both times. Only the owner can
 * write these fields; anyone else is refused by the rules.
 */
export const saveRsvpSettings = async (
  db: Firestore,
  tournament: Pick<Tournament, "id" | "scheduledAt" | "scheduledZone" | "rsvp">,
  setup: RsvpSetup,
  zone: string,
): Promise<void> => {
  const [problem] = Object.values(rsvpProblems(setup));
  if (problem) throw new Error(problem);

  const rsvp: RsvpSettings = {
    enabled: setup.enabled,
    capacity: setup.capacity,
    ...(setup.opensAt !== null && { opensAt: setup.opensAt }),
    closed: tournament.rsvp?.closed ?? false,
  };
  const fields: Record<string, unknown> = { rsvp };
  if (setup.scheduledAt === null) {
    fields.scheduledAt = deleteField();
    fields.scheduledZone = deleteField();
  } else if (setup.scheduledAt !== tournament.scheduledAt || !tournament.scheduledZone) {
    fields.scheduledAt = setup.scheduledAt;
    fields.scheduledZone = zone;
  }
  await updateTournamentFields(db, tournament.id, fields);
};
