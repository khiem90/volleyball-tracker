"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { getUserFormations } from "@/lib/volleyball/userFormations";
import type { UserFormation } from "@/lib/volleyball/types";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";

const TOOLS = [
  {
    icon: "court",
    title: "Rotation Designer",
    description: "Design 5-1 and 6-2 volleyball rotations and check overlap rules.",
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
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/tools"
            cta={{ href: "/tools/volleyball-rotations", label: "Designer" }}
          />

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <h1 className="matchbook-display whitespace-nowrap text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                  Tournament <span className="text-mb-coral">Toolkit</span>
                </h1>
                <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
                  <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                    {TOOLS.length}
                  </span>
                  <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.22em]">
                    Tools
                  </span>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <Link href="/tools/volleyball-rotations" className="mb-btn mb-btn-coral">
                  <MbIcon id="court" size={14} />
                  Open Designer
                </Link>
                <Link
                  href="/login"
                  className="hidden items-center gap-2.5 md:flex"
                  title={isGuest ? "Sign in" : user?.email ?? "Account"}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
                    <Image src="/assets/matchbook/brand/crest.svg" alt="" width={24} height={28} />
                  </span>
                  <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">
                    {isGuest ? (
                      <>
                        Sign In
                        <br />
                        <span className="text-mb-ink-muted">Account</span>
                      </>
                    ) : (
                      <>
                        My
                        <br />
                        Account
                      </>
                    )}
                  </span>
                  <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
                </Link>
              </div>
            </header>

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* Tool launcher */}
              <div className="xl:col-span-12">
                <Panel title="Toolkit">
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    {TOOLS.map((tool) => (
                      <Link
                        key={tool.title}
                        href={tool.href}
                        className="group flex flex-col gap-2 border-[1.5px] border-mb-navy bg-mb-paper-bright p-4 transition-colors hover:bg-[rgba(7,50,77,0.04)]"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-mb-navy text-mb-navy">
                          <MbIcon id={tool.icon} size={20} />
                        </span>
                        <span className="matchbook-display text-[0.95rem] font-bold tracking-[0.06em]">
                          {tool.title}
                        </span>
                        <span className="text-[0.76rem] leading-snug text-mb-ink-muted">
                          {tool.description}
                        </span>
                        <span className="mb-panel-link mt-auto pt-1 group-hover:text-mb-coral">
                          Open Tool
                          <MbIcon id="chevron-right" size={11} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </Panel>
              </div>

              {/* Saved formations */}
              <div className="xl:col-span-7">
                <Panel
                  title="Saved Formations"
                  action="Manage All"
                  href="/tools/volleyball-rotations/my-formations"
                >
                  {isGuest ? (
                    <PanelEmpty
                      message="No formations exist yet — sign in to save and share your rotation layouts."
                      actionLabel="Sign in"
                      href="/login?redirect=/tools"
                    />
                  ) : formationsState === "loading" ? (
                    <p className="p-4 text-center text-[0.8rem] text-mb-ink-muted">
                      Loading saved formations…
                    </p>
                  ) : formationsState === "error" ? (
                    <PanelEmpty message="Saved formations could not be loaded right now — try again from My Formations." />
                  ) : formations.length === 0 ? (
                    <PanelEmpty
                      message="No formations exist yet — save a layout from the rotation designer to see it here."
                      actionLabel="Open designer"
                      href="/tools/volleyball-rotations"
                    />
                  ) : (
                    <div className="flex flex-col divide-y divide-mb-rule">
                      {formations.slice(0, 6).map((formation) => (
                        <Link
                          key={formation.id}
                          href="/tools/volleyball-rotations/my-formations"
                          className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[rgba(7,50,77,0.04)]"
                        >
                          <MbIcon id="clipboard" size={15} className="text-mb-navy" />
                          <span className="min-w-0">
                            <span className="matchbook-display block truncate text-[0.78rem] font-bold">
                              {formation.name}
                            </span>
                            {formation.description && (
                              <span className="block truncate text-[0.66rem] text-mb-ink-muted">
                                {formation.description}
                              </span>
                            )}
                          </span>
                          {formation.shareId && (
                            <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.1em] text-mb-teal">
                              Shared
                            </span>
                          )}
                          <span className="mb-kicker">{formatDate(formation.updatedAt)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              {/* Court reference */}
              <div className="xl:col-span-5">
                <Panel title="Court Reference" tone="navy" icon="court">
                  <div className="flex flex-1 flex-col items-center gap-3 p-5">
                    <Image
                      src="/assets/matchbook/diagrams/volleyball-court.svg"
                      alt="Top-down volleyball court diagram with position zones"
                      width={340}
                      height={220}
                      className="h-auto w-full max-w-[360px]"
                    />
                    <p className="text-center text-[0.74rem] leading-snug text-mb-ink-muted">
                      Standard indoor court with rotation zones 1–6. Open the rotation
                      designer to place players and validate overlap rules against it.
                    </p>
                  </div>
                </Panel>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
