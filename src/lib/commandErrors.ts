/**
 * The errors a queued command's promise can reject with that are the
 * queue's own, in a module with no Firestore in it, so that pure console
 * logic can name them without pulling in the queue.
 */

/**
 * A command that showed on the phone and was then taken back: another
 * phone's write got to the server first and, on the fresh copy, the
 * engine refused this one (or it ran out of attempts). `court` is the
 * court the command concerned, when it concerned one. `reversed` is the
 * discriminator for a caller that cannot use instanceof, such as one
 * matching on the shape of a rejection: a rejection with `reversed: true`
 * is a reversal.
 */
export class ReversedCommandError extends Error {
  readonly reversed = true as const;
  readonly court: number | undefined;
  readonly cause: unknown;

  constructor(cause: unknown, court: number | undefined) {
    super("That change was taken back: another scorer got there first.");
    this.name = "ReversedCommandError";
    this.cause = cause;
    this.court = court;
  }
}
