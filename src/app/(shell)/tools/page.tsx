"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getUserFormations } from "@/lib/volleyball/userFormations";
import type { UserFormation } from "@/lib/volleyball/types";
import { signInHref } from "@/lib/shell";
import { CARD_ROW, Card, CardEmpty, Chip, Icon } from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { CourtReference } from "@/components/volleyball/CourtReference";

const TOOLS = [
  {
    icon: "court",
    title: "Rotation Designer",
    description: "Design 5-1 volleyball rotations and check overlap rules.",
    href: "/tools/volleyball-rotations",
  },
  {
    icon: "save",
    title: "My Formations",
    description: "Open, share, and manage your saved rotation formations.",
    href: "/tools/volleyball-rotations/my-formations",
  },
  {
    icon: "quick",
    title: "Quick Match",
    description: "Score a one-off match between any two teams.",
    href: "/quick-match",
  },
  {
    icon: "bracket",
    title: "New Competition",
    description: "Set up a bracket, round robin, or rotation league.",
    href: "/competitions/new",
  },
];

/* A row that opens something: its words on the left and one thing on the right. */
const ROW = `flex items-center gap-3 ${CARD_ROW}`;
const ROW_TEXT = "flex min-w-0 flex-1 flex-col gap-0.5";
/* A long name wraps, mid-word if it must, so it never pushes the right side out of the row. */
const ROW_NAME = "text-title font-semibold leading-snug wrap-anywhere";
const ROW_FACTS = "text-caption text-ink-soft";

export default function ToolsPage() {
  const { user, isGuest } = useAuth();
  const [formations, setFormations] = useState<UserFormation[]>([]);
  const [formationsState, setFormationsState] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserFormations(user.uid)
      .then((result) => {
        if (!cancelled) {
          setFormations(result);
          setFormationsState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setFormationsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <>
      <PageHeader
        title="Tournament Toolkit"
        status={<Chip>{TOOLS.length} Tools</Chip>}
        action={
          <Link href="/tools/volleyball-rotations" className="btn btn-action">
            <Icon id="court" size={18} />
            Open Designer
          </Link>
        }
      />

      {/* Start-aligned so each card is as tall as its rows, not its column. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          {/* Tool launcher */}
          <Card title="Toolkit" icon="tools">
            <ul className="divide-y divide-line">
              {TOOLS.map((tool) => (
                <li key={tool.title}>
                  <Link href={tool.href} className={ROW}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-fill">
                      <Icon id={tool.icon} size={20} />
                    </span>
                    <span className={ROW_TEXT}>
                      <span className={ROW_NAME}>{tool.title}</span>
                      <span className={ROW_FACTS}>{tool.description}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-ink-soft">
                      Open Tool
                      <Icon id="chevron-right" size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Saved formations */}
          <Card
            title="Saved Formations"
            icon="save"
            action="Manage All"
            href="/tools/volleyball-rotations/my-formations"
          >
            {isGuest ? (
              <CardEmpty
                message="No formations exist yet — sign in to save and share your rotation layouts."
                actionLabel="Sign in"
                href={signInHref("/tools")}
              />
            ) : formationsState === "loading" ? (
              <p className="px-4 py-8 text-center text-label text-ink-soft">
                Loading saved formations…
              </p>
            ) : formationsState === "error" ? (
              <CardEmpty message="Saved formations could not be loaded right now — try again from My Formations." />
            ) : formations.length === 0 ? (
              <CardEmpty
                message="No formations exist yet — save a layout from the rotation designer to see it here."
                actionLabel="Open designer"
                href="/tools/volleyball-rotations"
              />
            ) : (
              <ul className="divide-y divide-line">
                {formations.slice(0, 6).map((formation) => (
                  <li key={formation.id}>
                    <Link href="/tools/volleyball-rotations/my-formations" className={ROW}>
                      <Icon id="clipboard" size={16} className="shrink-0 text-ink-soft" />
                      <span className={ROW_TEXT}>
                        <span className={ROW_NAME}>{formation.name}</span>
                        {formation.description && (
                          <span className={`line-clamp-1 ${ROW_FACTS}`}>
                            {formation.description}
                          </span>
                        )}
                      </span>
                      {formation.shareId && <Chip tone="action">Shared</Chip>}
                      <span className="shrink-0 text-caption text-ink-soft tabular-nums">
                        {formatDate(formation.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Court reference */}
        <div className="min-w-0 lg:col-span-5">
          <Card title="Court Reference" icon="court">
            <div className="flex flex-col items-center gap-3 p-4">
              <CourtReference className="h-auto w-full max-w-100" />
              <p className="text-center text-label text-ink-soft">
                Standard indoor court with rotation zones 1–6. Open the rotation
                designer to place players and validate overlap rules against it.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
