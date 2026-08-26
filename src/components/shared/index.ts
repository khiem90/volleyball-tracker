/**
 * Shared primitives that survived the redesign.
 *
 * `PageLoadingSpinner`, `EmptyState`, `DecorativeBackground` and `PageHeader`
 * were the pre-Matchbook page furniture; all four are deleted, along with the
 * `Navigation` / `nav-parts` / `ui/*` tree they pulled in. Their replacements
 * are `MbPageLoading` (`matchbook/Loading.tsx`), `MbEmptyState` /
 * `PanelEmpty` and `MatchbookMasthead`.
 *
 * `DeleteConfirmDialog` survives because it is not legacy: it was rewired in
 * P1 to render `MbConfirm` internally, its props never changed, and its five
 * call sites are all converted screens.
 */
export { DeleteConfirmDialog } from "./DeleteConfirmDialog";
