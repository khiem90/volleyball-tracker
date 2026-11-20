import { arrayUnion, writeBatch, type Firestore } from "firebase/firestore";
import { isEnteringMixedTeam, isJoiningTeam, type SetupInput } from "@/lib/creation";
import { newToken, stripUndefined } from "@/lib/firestoreData";
import { buildRosterTeamsNamed, rosterTeamDoc } from "@/lib/roster";
import { rsvpListDoc } from "@/lib/rsvpListData";
import {
  buildTournamentToSave,
  saveScorerKeyAndMatches,
  saveTournamentAndMatches,
  tournamentDoc,
  type CreateTournamentOptions,
  type TeamToEnter,
  type TournamentToSave,
} from "@/lib/tournaments";
import { nameKey } from "@/lib/utils";
import type { PersistentTeam, Tournament } from "@/types/game";

/**
 * Saving what the creation page hands over, on Firestore. A setup with no
 * import is a tournament like any other. A setup with an import also adds
 * the teams the roster did not have and ties the tournament and its RSVP
 * list together: the tournament names the list, and the list names the
 * tournament (ADR-0005). The pure side is in src/lib/creation.ts and
 * src/lib/rsvpImport.ts.
 */

/** A new tournament ready to save, with the teams that join the roster alongside it. */
export interface NewTournamentToSave extends TournamentToSave {
  /** The entering teams the roster does not have yet, in the order they enter. */
  joiningRoster: PersistentTeam[];
}

/**
 * The tournament a setup input describes, ready to save: a draft, or with
 * `start` already live with its first matches. Each team entering under a
 * new name is built as a roster team first, with the palette color the
 * roster uses least, so its entry carries the id the roster will have. A
 * mixed team gets an id generated for this tournament, and its entry
 * carries its players (ADR-0006). `roster` is the account's roster as the
 * caller knows it. Nothing is written here, and the ids are known at once.
 */
export const buildTournamentFromSetup = (
  db: Firestore,
  uid: string,
  input: SetupInput,
  roster: PersistentTeam[],
  options: CreateTournamentOptions = {},
): NewTournamentToSave => {
  const newNames = input.teams.flatMap((team) => (isJoiningTeam(team) ? team.newName : []));
  const joiningRoster = buildRosterTeamsNamed(db, uid, newNames, roster);
  // A name the roster gained since the input was built enters that team.
  const byName = new Map<string, PersistentTeam>();
  for (const team of [...roster, ...joiningRoster]) {
    if (!byName.has(nameKey(team.name))) byName.set(nameKey(team.name), team);
  }
  const teams = input.teams.map((team): TeamToEnter => {
    // A mixed team gets an id of its own here and never reaches the roster.
    if (isEnteringMixedTeam(team)) {
      const { name, color, players } = team;
      return { id: newToken(), name, color, players };
    }
    if (!isJoiningTeam(team)) return team;
    const joined = byName.get(nameKey(team.newName));
    if (!joined) throw new Error("Give every imported team a name.");
    return joined;
  });
  return { ...buildTournamentToSave(db, uid, { ...input, teams }, options), joiningRoster };
};

/**
 * Save a new tournament. One that came from an RSVP list goes out as one
 * batch: the teams joining the roster, the tournament with the id of its
 * list, and the tournament's id added to the list. All of them land or
 * none does, so a refused save never leaves roster teams behind for a
 * tournament that does not exist, or a list naming one. The rules read the
 * list as it stood before the batch, and refuse the tournament when the
 * list is gone or belongs to another account. The scorer key and the
 * matches follow in a second batch, since their rules read the stored
 * tournament. Both batches are queued when offline and sent in order.
 * Resolves once the server has accepted them.
 */
export const saveNewTournament = async (
  db: Firestore,
  uid: string,
  toSave: NewTournamentToSave,
): Promise<void> => {
  const { tournament, joiningRoster } = toSave;
  if (tournament.rsvpListId === undefined && joiningRoster.length === 0) {
    await saveTournamentAndMatches(db, toSave);
    return;
  }

  const batch = writeBatch(db);
  for (const team of joiningRoster) batch.set(rosterTeamDoc(db, uid, team.id), team);
  batch.set(tournamentDoc(db, tournament.id), stripUndefined(tournament));
  if (tournament.rsvpListId !== undefined) {
    batch.update(rsvpListDoc(db, tournament.rsvpListId), {
      tournamentIds: arrayUnion(tournament.id),
      updatedAt: Date.now(),
    });
  }
  await Promise.all([batch.commit(), saveScorerKeyAndMatches(db, toSave)]);
};

/**
 * Build and save the tournament a setup input describes. Resolves with
 * the tournament once the server has accepted the write.
 */
export const createTournamentFromSetup = async (
  db: Firestore,
  uid: string,
  input: SetupInput,
  roster: PersistentTeam[],
  options: CreateTournamentOptions = {},
): Promise<Tournament> => {
  const built = buildTournamentFromSetup(db, uid, input, roster, options);
  await saveNewTournament(db, uid, built);
  return built.tournament;
};
