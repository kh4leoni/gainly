// Static, in-code changelog ("Uutta Gainlyssä").
//
// Add new entries to the TOP of the array (newest first). Each entry is shown
// to the audiences listed in `audience`. Unread state is tracked per role in
// localStorage against the newest visible entry id, so bumping this list is the
// only thing needed to surface a fresh "what's new" dot to users.

export type ChangelogAudience = "coach" | "client" | "all";
export type ChangelogRole = "coach" | "client";

export type ChangelogEntry = {
  /** Stable unique id. Convention: `YYYY-MM-DD[-slug]`. Drives ordering + seen-state. */
  id: string;
  /** ISO date, shown to the user (formatted in fi-FI). */
  date: string;
  /** Who sees this entry. */
  audience: ChangelogAudience;
  title: string;
  /** Bullet points describing the change. */
  items: string[];
  /** Set for big features worth a one-time spotlight (reserved for future popup use). */
  highlight?: boolean;
};

// Newest first.
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "2026-06-08-notes-invites",
    date: "2026-06-08",
    audience: "all",
    title: "Muistiinpanot & kutsut",
    items: [
      "Valmentaja näkee nyt lähetetyt kutsut omana listanaan.",
      "Liikekohtaiset muistiinpanot säilyvät asiakkaalla treenistä toiseen.",
    ],
  },
  {
    id: "2026-06-01-program-editor",
    date: "2026-06-01",
    audience: "coach",
    title: "Ohjelmaeditorin parannukset",
    items: [
      "Liikehistoria näkyy suoraan editorissa.",
      "Painohaarukat ja näkymän skaalaus leveyteen.",
      "Toistot ja RPE voi nyt määrittää haarukkana.",
    ],
  },
];

/** Entries visible to a given role, newest first. */
export function changelogFor(role: ChangelogRole): ChangelogEntry[] {
  return CHANGELOG.filter((e) => e.audience === "all" || e.audience === role);
}

/** Id of the newest entry a role can see, or null if none. */
export function latestEntryId(role: ChangelogRole): string | null {
  return changelogFor(role)[0]?.id ?? null;
}
