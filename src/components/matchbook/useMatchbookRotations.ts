"use client";

import { useCallback, useMemo, useState } from "react";
import { useUserFormations } from "@/hooks/useUserFormations";
import { useVolleyballRotation } from "@/hooks/useVolleyballRotation";
import { getFormations } from "@/lib/volleyball/formations";
import { getTemplateById, getTemplateFormations } from "@/lib/volleyball/templateFormations";
import {
  getFrontRowAttackerCount,
  isSetterFrontRow,
} from "@/lib/volleyball/rotations";
import type {
  FormationData,
  FormationType,
  UserFormation,
} from "@/lib/volleyball/types";

/* ===========================================================================
   DESIGNER + ARCHIVE SHAPING

   Invariant 23: data shaping lives in a `useMatchbook*` hook and the route file
   contains layout only. Both routes in this group used to compute their own
   view models inline, and the shared route computed a THIRD copy of
   `buildPlayerPositionsFromCustom` in its own `useMemo` — three implementations
   of one derivation, which is how the libero fallback ended up written three
   times and fixed nowhere.

   It also fixes the group's worst functional defect. `page.tsx` resolved any
   non-builtin id through `getById`, which only searches the signed-in user's
   Firestore documents. Template ids resolved to `undefined`, `customFormationData`
   stayed `null`, and the court kept rendering the previously selected BUILT-IN
   while the Templates tab reported `aria-pressed="true"`. The tab asserted a
   state the render did not honour. `resolveChoice` below routes template ids
   through `getTemplateById`, which is the one lookup that was missing.
   =========================================================================== */

const BUILTIN_IDS: readonly FormationType[] = [
  "traditional",
  "stack",
  "spread",
  "rightSlant",
  "leftSlant",
];

export const isBuiltinFormation = (id: string): id is FormationType =>
  (BUILTIN_IDS as readonly string[]).includes(id);

export type MbFormationCategory = "builtin" | "starter" | "custom";

export interface MbFormationChoice {
  category: MbFormationCategory;
  id: string;
  name: string;
  description: string;
  /** Only built-ins carry trade-off copy. */
  tradeoffs?: string;
  /** `null` for built-ins, which are computed rather than stored. */
  data: FormationData | null;
}

/* ------------------------------------------------------------------ designer */

export const useMatchbookDesigner = () => {
  const formations = useUserFormations();
  const [selectedId, setSelectedId] = useState<string>("traditional");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showArrows, setShowArrows] = useState(true);

  const builtins = useMemo<MbFormationChoice[]>(
    () =>
      getFormations().map((formation) => ({
        category: "builtin" as const,
        id: formation.id,
        name: formation.name,
        description: formation.description,
        tradeoffs: formation.tradeoffs,
        data: null,
      })),
    []
  );

  const starters = useMemo<MbFormationChoice[]>(
    () =>
      getTemplateFormations().map((template) => ({
        category: "starter" as const,
        id: template.id,
        name: template.name,
        description: template.description,
        data: template.data,
      })),
    []
  );

  const custom = useMemo<MbFormationChoice[]>(
    () =>
      formations.formations.map((formation) => ({
        category: "custom" as const,
        id: formation.id,
        name: formation.name,
        description: formation.description ?? "",
        data: formation.data,
      })),
    [formations.formations]
  );

  const { getById } = formations;

  /**
   * One resolver for all three categories. THE fix: a template id is looked up
   * in the template table, not in the user's documents.
   */
  const selected = useMemo<MbFormationChoice>(() => {
    if (isBuiltinFormation(selectedId)) {
      return builtins.find((b) => b.id === selectedId) ?? builtins[0];
    }
    const template = getTemplateById(selectedId);
    if (template) {
      return {
        category: "starter",
        id: template.id,
        name: template.name,
        description: template.description,
        data: template.data,
      };
    }
    const saved = getById(selectedId);
    if (saved) {
      return {
        category: "custom",
        id: saved.id,
        name: saved.name,
        description: saved.description ?? "",
        data: saved.data,
      };
    }
    // The selected document was deleted (possibly in another tab). Fall back
    // rather than render an empty court with a name that no longer resolves.
    return builtins[0];
  }, [selectedId, builtins, getById]);

  const rotation = useVolleyballRotation({
    customFormationData: selected.data,
    initialFormation: isBuiltinFormation(selectedId) ? selectedId : "traditional",
  });

  const { setFormation } = rotation;
  const selectFormation = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (isBuiltinFormation(id)) setFormation(id);
    },
    [setFormation]
  );

  const setterFront = isSetterFrontRow(rotation.rotation);

  return {
    ...rotation,
    formations,
    builtins,
    starters,
    custom,
    selected,
    selectedId,
    selectFormation,
    selectedPlayer,
    setSelectedPlayer,
    showOverlaps,
    setShowOverlaps,
    showArrows,
    setShowArrows,
    /** Read-only facts about the rotation, for the status strip. */
    setterRow: setterFront ? ("Front" as const) : ("Back" as const),
    frontRowAttackers: getFrontRowAttackerCount(rotation.rotation),
  };
};

export type MbDesigner = ReturnType<typeof useMatchbookDesigner>;

/* ------------------------------------------------------------------- archive */

export type MbFormationSort = "updated" | "name" | "shared";

/** Above this many rows the archive pages rather than rendering everything. */
export const ARCHIVE_PAGE_SIZE = 25;

export interface MbArchiveFilters {
  query: string;
  tag: string;
  sort: MbFormationSort;
}

const matches = (formation: UserFormation, needle: string) => {
  if (!needle) return true;
  const haystack = [
    formation.name,
    formation.description ?? "",
    ...(formation.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

/**
 * Search + tag + sort + paging over the saved list.
 *
 * None of this existed: the archive rendered every document, unsorted beyond
 * Firestore's `updatedAt desc`, with no way to find anything. A coach with two
 * hundred formations had two hundred cards.
 */
export const useMatchbookArchive = (filters: MbArchiveFilters) => {
  const formations = useUserFormations();
  const [showAll, setShowAll] = useState(false);

  const tags = useMemo(() => {
    const seen = new Map<string, number>();
    formations.formations.forEach((formation) =>
      (formation.tags ?? []).forEach((tag) =>
        seen.set(tag, (seen.get(tag) ?? 0) + 1)
      )
    );
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));
  }, [formations.formations]);

  const filtered = useMemo(() => {
    const needle = filters.query.trim().toLowerCase();
    const rows = formations.formations.filter(
      (formation) =>
        matches(formation, needle) &&
        (!filters.tag || (formation.tags ?? []).includes(filters.tag))
    );
    const sorted = [...rows];
    if (filters.sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === "shared") {
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.shareId)) - Number(Boolean(a.shareId)) ||
          b.updatedAt - a.updatedAt
      );
    } else {
      sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return sorted;
  }, [formations.formations, filters.query, filters.tag, filters.sort]);

  const shared = useMemo(
    () => formations.formations.filter((formation) => Boolean(formation.shareId)),
    [formations.formations]
  );

  const paged = showAll ? filtered : filtered.slice(0, ARCHIVE_PAGE_SIZE);

  return {
    ...formations,
    tags,
    filtered,
    rows: paged,
    shared,
    total: formations.formations.length,
    filteredCount: filtered.length,
    hiddenCount: Math.max(0, filtered.length - paged.length),
    showAll,
    setShowAll,
    isFiltered: Boolean(filters.query.trim() || filters.tag),
  };
};

export type MbArchive = ReturnType<typeof useMatchbookArchive>;
