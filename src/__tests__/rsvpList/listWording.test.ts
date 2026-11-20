import { describe, expect, it } from "vitest";
import { listWording } from "@/lib/rsvpList";

const people = listWording("people");
const teams = listWording("teams");

describe("listWording", () => {
  it("counts people on a by-person list and teams on a by-team list", () => {
    expect([people.count(0), people.count(1), people.count(12)]).toEqual([
      "0 people",
      "1 person",
      "12 people",
    ]);
    expect([teams.count(0), teams.count(1), teams.count(8)]).toEqual(["0 teams", "1 team", "8 teams"]);
  });

  it("heads the list and words it while empty", () => {
    expect(people.heading).toBe("Who's coming");
    expect(people.empty).toBe("Nobody has RSVP'd yet.");
    expect(teams.heading).toBe("Teams coming");
    expect(teams.empty).toBe("No team has RSVP'd yet.");
  });

  it("marks the viewer's own row", () => {
    expect(people.mine).toBe("You");
    expect(teams.mine).toBe("Your team");
  });

  it("says where a person stands, and where a team stands to the person who RSVP'd it", () => {
    expect(people.standing({ kind: "confirmed", position: 3 }, "Dan", 12, true)).toBe(
      "You're in as Dan, spot 3 of 12.",
    );
    expect(teams.standing({ kind: "confirmed", position: 3 }, "Spikers", 8, true)).toBe(
      "Your team is in as Spikers, spot 3 of 8.",
    );
    expect(people.standing({ kind: "waitlisted", position: 2 }, "Dan", 12, true)).toBe(
      "You're waiting as Dan, number 2 on the waitlist. You move up on your own when a spot frees.",
    );
    expect(teams.standing({ kind: "waitlisted", position: 2 }, "Spikers", 8, true)).toBe(
      "Your team is waiting as Spikers, number 2 on the waitlist. It moves up on its own when a spot frees.",
    );
  });

  it("promises nobody a move up once the list is over", () => {
    expect(people.standing({ kind: "waitlisted", position: 2 }, "Dan", 12, false)).toBe(
      "You're waiting as Dan, number 2 on the waitlist.",
    );
    expect(teams.standing({ kind: "waitlisted", position: 2 }, "Spikers", 8, false)).toBe(
      "Your team is waiting as Spikers, number 2 on the waitlist.",
    );
  });

  it("tells whoever is about to RSVP to a full list where they would wait", () => {
    expect(people.full(3)).toBe("Every spot is taken. RSVP now and you join the waitlist at number 3.");
    expect(teams.full(3)).toBe(
      "Every spot is taken. RSVP now and your team joins the waitlist at number 3.",
    );
    // The RSVPs have not arrived yet, so there is no number to give.
    expect(people.full(null)).toBe("Every spot is taken. RSVP now and you join the waitlist.");
    expect(teams.full(null)).toBe("Every spot is taken. RSVP now and your team joins the waitlist.");
  });

  it("words Home's row as the person, or as the team, being in or waiting", () => {
    expect(people.homeStanding({ kind: "confirmed", position: 3 })).toBe("You're in");
    expect(people.homeStanding({ kind: "waitlisted", position: 2 })).toBe("Waitlist #2");
    expect(teams.homeStanding({ kind: "confirmed", position: 3 })).toBe("Team is in");
    expect(teams.homeStanding({ kind: "waitlisted", position: 2 })).toBe("Team waitlist #2");
  });

  it("asks for a name in the RSVP dialog on a by-person list and a team name on a by-team list", () => {
    expect(people.dialog.nameLabel).toBe("Your name");
    expect(teams.dialog.nameLabel).toBe("Team name");
    expect(people.dialog.fresh("Friday pickup")).toBe(
      "You are telling the owner of Friday pickup that you will play. Everyone on the list sees your name.",
    );
    expect(teams.dialog.fresh("Friday teams")).toBe(
      "You are telling the owner of Friday teams that your team will play. One RSVP covers the whole team, and everyone on the list sees its name.",
    );
    expect(people.dialog.waitlist("Friday pickup")).toBe(
      "Every spot in Friday pickup is taken, so you join the waitlist and move up on your own when a spot frees. Everyone on the list sees your name.",
    );
    expect(teams.dialog.waitlist("Friday teams")).toBe(
      "Every spot in Friday teams is taken, so your team joins the waitlist and moves up on its own when a spot frees. Everyone on the list sees its name.",
    );
  });

  it("words changing and withdrawing an RSVP for a person and for a team", () => {
    expect(people.dialog.edit).toBe("Change your name or note. You keep your place on the list.");
    expect(teams.dialog.edit).toBe(
      "Change your team's name or note. Your team keeps its place on the list.",
    );
    expect(people.dialog.withdraw("Friday pickup")).toBe(
      "You come off the list for Friday pickup, and the first person waiting takes your place. If you RSVP again, you go to the back of the line.",
    );
    expect(teams.dialog.withdraw("Friday teams")).toBe(
      "Your team comes off the list for Friday teams, and the first team waiting takes its place. If you RSVP again, your team goes to the back of the line.",
    );
    expect(people.dialog.keep).toBe("Keep my place");
    expect(teams.dialog.keep).toBe("Keep our place");
  });

  it("asks the owner for a person's name for a held spot, or for a team name", () => {
    expect(people.heldSpot).toEqual({
      label: "Add held spot",
      placeholder: "Walk-in Sam",
      help: "For someone without an account. It takes the next place in line, so on a full list it joins the waitlist.",
    });
    expect(teams.heldSpot).toEqual({
      label: "Add held spot for a team",
      placeholder: "Team name",
      help: "For a team with nobody who has an account. It takes the next place in line, so on a full list it joins the waitlist.",
    });
  });

  it("words the owner's setup form and Close for what the list takes", () => {
    expect(people.capacityNote).toBe(
      "People past this number join the waitlist in the order they answered.",
    );
    expect(teams.capacityNote).toBe(
      "Teams past this number join the waitlist in the order they answered.",
    );
    expect(people.closeNote).toBe(
      "Stops new RSVPs. People on the list can still withdraw, and you can reopen it until the scheduled time.",
    );
    expect(teams.closeNote).toBe(
      "Stops new RSVPs. Teams on the list can still withdraw, and you can reopen it until the scheduled time.",
    );
    expect(people.closedNote).toBe(
      "The list is closed. Nobody new can RSVP, and people on it can still withdraw. Reopen it any time before the scheduled time.",
    );
    expect(teams.closedNote).toBe(
      "The list is closed. No new team can RSVP, and teams on it can still withdraw. Reopen it any time before the scheduled time.",
    );
  });

  it("says what closing an open list for an import does, for people or for teams", () => {
    expect(people.closeToImport("Friday pickup")).toBe(
      "Friday pickup is still open. Closing it stops new RSVPs, so nobody new arrives while you arrange teams. People on it can still withdraw, and you can reopen it until the scheduled time.",
    );
    expect(teams.closeToImport("Friday teams")).toBe(
      "Friday teams is still open. Closing it stops new RSVPs, so no new team arrives while you arrange them. Teams on it can still withdraw, and you can reopen it until the scheduled time.",
    );
  });
});
