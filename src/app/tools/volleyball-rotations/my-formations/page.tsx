"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbConfirm } from "@/components/matchbook/Confirm";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbSkeleton } from "@/components/matchbook/Skeleton";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { MbSelect, MbTextInput } from "@/components/matchbook/form";
import {
  ARCHIVE_PAGE_SIZE,
  useMatchbookArchive,
  type MbFormationSort,
} from "@/components/matchbook/useMatchbookRotations";
import { FormationRow, ShareFormationDialog } from "@/components/volleyball";
import { getTemplateFormations } from "@/lib/volleyball/templateFormations";
import type { UserFormation } from "@/lib/volleyball/types";

/* ===========================================================================
   FORMATION ARCHIVE

   Modelled on `/summaries`, the shipped archive. Four things this screen did
   not have and now does:

     IT KNOWS WHEN IT IS OFFLINE. With Firestore unreachable the old page
     rendered "Your Formations (0)" and offered to create another — a coach with
     forty saved formations was told they had none, and the primary action on
     offer was to make a forty-first. `useUserFormations` now reports
     `snapshot.metadata.fromCache`, and a stale list says so in the masthead and
     in the panel.

     IT CAN BE SEARCHED. There was no search, no filter, no sort and no paging.
     Every document rendered as a card, for ever.

     ITS DELETE IS A DIALOG. It was click-to-arm with a three-second silent
     `setTimeout` that disarmed it again — so the second press either deleted
     the formation or re-armed the control, depending on how long the reader
     took to decide — drawn under a `backdrop-blur` overlay, with Delete sitting
     against Share.

     ITS SHARE LINKS ARE VISIBLE. Which formations are shared was buried one
     dialog deep, per formation. The Sharing panel lists them.
   =========================================================================== */

const SORT_OPTIONS: { value: MbFormationSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name A–Z" },
  { value: "shared", label: "Shared first" },
];

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Skeleton at the row's real geometry, so the swap costs no layout shift. */
const RowSkeleton = () => (
  <div className="flex flex-col justify-center gap-1.5 border-b border-mb-rule px-4 py-3" style={{ height: 76 }}>
    <MbSkeleton w="45%" h={13} />
    <MbSkeleton w="70%" h={9} />
  </div>
);

export default function MyFormationsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<MbFormationSort>("updated");
  const archive = useMatchbookArchive({ query, tag, sort });

  const [sharing, setSharing] = useState<UserFormation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserFormation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const templates = useMemo(() => getTemplateFormations(), []);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeletingId(target.id);
    setActionError(null);
    // Closed first, so the row's own "Deleting…" state is what the reader
    // watches rather than a dialog that sits over the row it is deleting.
    setPendingDelete(null);
    try {
      await archive.remove(target.id);
    } catch {
      setActionError(
        `“${target.name}” could not be deleted. Check your connection and try again.`
      );
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, archive]);

  const handleDuplicate = useCallback(
    async (formation: UserFormation) => {
      setActionError(null);
      try {
        await archive.duplicate(formation);
      } catch {
        setActionError("The formation could not be duplicated. Check your connection and try again.");
      }
    },
    [archive]
  );

  if (authLoading || !isAuthenticated) {
    return <MbPageLoading active="/tools" />;
  }

  const { status, isStale } = archive;

  return (
    <MatchbookShell
      active="/tools"
      /* Not coral: the masthead's New Formation is this screen's one coral, and
         it is the one that exists on a phone too (invariant 15). */
      cta={{
        href: "/tools/volleyball-rotations",
        label: "Open Designer",
        icon: "court",
        tone: "outline-navy",
      }}
      back={{ href: "/tools/volleyball-rotations", label: "Rotation Designer" }}
      masthead={{
        title: (
          <>
            Formation <span className="text-mb-coral">Archive</span>
          </>
        ),
        shortTitle: "Formations",
        badge: { value: archive.total, label: "Saved" },
        dateLine: "Saved Rotations",
        subLine: isStale ? "Offline · showing last known" : "Private to your account",
        actions: [
          {
            label: "New Formation",
            icon: "plus",
            tone: "coral",
            href: "/tools/volleyball-rotations/editor",
          },
          {
            label: "Open Designer",
            icon: "court",
            tone: "navy",
            href: "/tools/volleyball-rotations",
          },
        ],
      }}
    >
      {actionError && (
        <div className="mb-4">
          <MbNotice tone="danger" title="Action failed">
            {actionError}
          </MbNotice>
        </div>
      )}

      {isStale && (
        <div className="mb-4">
          <MbNotice tone="warn" icon="wifi-off" title="Showing the last known list">
            The formation store cannot be reached, so anything saved on another
            device may be missing.{" "}
            {/* `.mb-panel-link` alone renders 52.8x17.3 — under the 44px floor
                and a hard fail. `.mb-btn-touch` supplies the floor without
                changing the link's ink; it is unlayered, so it neither beats
                nor loses to `.mb-panel-link`. Same fix `AppShell` applies to
                the skip link. */}
            <button
              type="button"
              onClick={() => void archive.refresh()}
              className="mb-panel-link mb-btn-touch inline-flex items-center underline"
            >
              Try again
            </button>
          </MbNotice>
        </div>
      )}

      {/* Filters. Each control takes a full line below `sm` rather than
          shrinking a select to the width of its own chevron — the same rule
          `/summaries` settled on after its filter values clipped mid-word. */}
      <div className="mb-4 flex flex-wrap items-end gap-3 border-y border-mb-navy py-3">
        <div className="min-w-[200px] flex-[2] basis-full sm:basis-auto">
          <p className="mb-kicker mb-1">Search</p>
          <MbTextInput
            type="search"
            aria-label="Search formations by name, description or tag"
            placeholder="Search formations, tags…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            trailing={<MbIcon id="search" size={15} className="shrink-0 text-mb-navy" />}
          />
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-[12rem]">
          <p className="mb-kicker mb-1">Tag</p>
          <MbSelect
            aria-label="Filter by tag"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="All tags"
            options={archive.tags.map((entry) => ({
              value: entry.value,
              label: `${entry.value} (${entry.count})`,
            }))}
          />
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-[13rem]">
          <p className="mb-kicker mb-1">Sort</p>
          <MbSelect
            aria-label="Sort formations"
            value={sort}
            onChange={(event) => setSort(event.target.value as MbFormationSort)}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title="Saved Formations"
            meta={
              <span className="mb-kicker tabular-nums">
                {archive.filteredCount} Shown
              </span>
            }
          >
            {status === "loading" ? (
              <div>
                {[0, 1, 2, 3, 4].map((index) => (
                  <RowSkeleton key={index} />
                ))}
              </div>
            ) : status === "denied" ? (
              <PanelEmpty
                tone="denied"
                message="No access to this archive — these formations belong to another account."
                actionLabel="Open the designer"
                href="/tools/volleyball-rotations"
              />
            ) : status === "error" ? (
              <PanelEmpty
                tone="error"
                message="Saved formations could not be loaded — the connection to the formation store failed."
                actionLabel="Try again"
                onAction={() => void archive.refresh()}
              />
            ) : archive.rows.length === 0 ? (
              <PanelEmpty
                tone={isStale ? "offline" : "empty"}
                message={
                  isStale
                    ? "No formations could be read — the archive is offline, so saved work is not shown."
                    : archive.isFiltered
                    ? "No formations match this search — clear the filters to see the whole archive."
                    : "No formations exist yet — build one in the editor and it is kept here."
                }
                actionLabel={
                  isStale ? "Try again" : archive.isFiltered ? "Clear filters" : "New formation"
                }
                onAction={
                  isStale
                    ? () => void archive.refresh()
                    : archive.isFiltered
                    ? () => {
                        setQuery("");
                        setTag("");
                      }
                    : undefined
                }
                href={
                  !isStale && !archive.isFiltered
                    ? "/tools/volleyball-rotations/editor"
                    : undefined
                }
              />
            ) : (
              <div className="flex flex-col">
                {archive.rows.map((formation) => (
                  <FormationRow
                    key={formation.id}
                    formation={formation}
                    href={`/tools/volleyball-rotations/editor?id=${encodeURIComponent(formation.id)}`}
                    formatDate={formatDate}
                    pending={deletingId === formation.id ? "deleting" : null}
                    onEdit={() =>
                      router.push(
                        `/tools/volleyball-rotations/editor?id=${encodeURIComponent(formation.id)}`
                      )
                    }
                    onDuplicate={() => void handleDuplicate(formation)}
                    onShare={() => setSharing(formation)}
                    onDelete={() => setPendingDelete(formation)}
                  />
                ))}
                {archive.hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => archive.setShowAll(true)}
                    className="mb-btn-touch mb-row-hover flex items-center justify-center gap-1.5 px-4 py-2"
                  >
                    <span className="mb-kicker tabular-nums">
                      Showing {ARCHIVE_PAGE_SIZE} of {archive.filteredCount} — show all
                    </span>
                    <MbIcon id="expand" size={12} />
                  </button>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <Panel title="Start From">
            <div className="flex flex-col">
              <Link
                href="/tools/volleyball-rotations/editor"
                className="mb-btn-touch mb-row-hover flex items-center gap-3 border-b border-mb-rule px-4 py-2.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mb-navy text-mb-navy">
                  <MbIcon id="court" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="matchbook-display block truncate text-[0.82rem] font-bold tracking-[0.03em]">
                    Neutral court
                  </span>
                  <span className="block truncate text-[0.7rem] text-mb-ink-muted">
                    Every player on their base zone position.
                  </span>
                </span>
              </Link>
              {templates.map((template) => (
                <Link
                  key={template.id}
                  href={`/tools/volleyball-rotations/editor?template=${encodeURIComponent(template.id)}`}
                  className="mb-btn-touch mb-row-hover flex items-center gap-3 border-b border-mb-rule px-4 py-2.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mb-navy text-mb-navy">
                    <MbIcon id="clipboard" size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="matchbook-display block truncate text-[0.82rem] font-bold tracking-[0.03em]">
                      {template.name}
                    </span>
                    <span className="block truncate text-[0.7rem] text-mb-ink-muted">
                      {template.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel
            title="Sharing"
            meta={<span className="mb-kicker tabular-nums">{archive.shared.length} Links</span>}
          >
            {status === "loading" ? (
              <div className="p-4">
                <MbSkeleton lines={2} h={12} />
              </div>
            ) : archive.shared.length === 0 ? (
              <PanelEmpty message="No share links exist yet — open a formation's menu and choose Share to create one." />
            ) : (
              <ul className="flex flex-col">
                {archive.shared.map((formation) => (
                  <li key={formation.id}>
                    <button
                      type="button"
                      onClick={() => setSharing(formation)}
                      className="mb-btn-touch mb-row-hover flex w-full items-center gap-2.5 border-b border-mb-rule px-4 py-2 text-left"
                    >
                      <MbIcon id="link" size={15} className="shrink-0 text-mb-teal" />
                      <span className="matchbook-display min-w-0 flex-1 truncate text-[0.78rem] font-bold">
                        {formation.name}
                      </span>
                      <span className="mb-kicker shrink-0">Manage</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <ShareFormationDialog
        open={Boolean(sharing)}
        onOpenChange={(open) => !open && setSharing(null)}
        formation={sharing}
        onEnableSharing={archive.share}
        onDisableSharing={archive.unshare}
      />

      <MbConfirm
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete formation"
        verb="Delete"
        subject={pendingDelete?.name}
        body="The formation and any share link it has are removed. This cannot be undone."
        onConfirm={() => void handleDelete()}
      />
    </MatchbookShell>
  );
}
