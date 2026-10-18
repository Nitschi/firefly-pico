# Femto Variant — Minimal-Diff Implementation Plan

Approach: **UI-hide only, smallest diff** (owner decision). Home page = Add Expense form.
Branch `femto` off `main`. Planning doc — NOT committed to the femto branch.

## Edits (all in `front/`)

1. **Home → Add Expense** — `pages/index.vue:13-24`: make `startingPage` computed return
   `markRaw(TransactionCreate)` unconditionally.
2. **Remove Dashboard + Extras from nav**:
   - `components/ui-kit/theme/app-bottom-toolbar/app-bottom-toolbar.vue:3` (Dashboard) and `:15` (Extras) — remove lines.
   - `components/ui-kit/theme/app-left-sidebar/app-left-sidebar.vue:17` (Dashboard) — remove line.
   - Desktop sidebar has NO single "Extras" entry; it exposes the Extras destinations directly as nav sections (Accounts/Templates/Budgets at ~21-26, Tags/Categories at ~28-32). To honor req 4 intent on desktop (foolproof), remove those two sections too. DECISION/tradeoff — documented in report.
3. **Expense-only** — `pages/transactions/[[id]].vue:13`: add `v-if="false"` to `<transaction-type-tabs>`, keep `v-model="type"`. DO NOT force type in onMounted (review C4: `transformToApi` recomputes the firefly type from the source/destination accounts, so the `type` ref is cosmetic; forcing it would trigger `attemptAccountsFix` and could null the destination). Precondition: default source = asset, default destination = expense account → saved type is always withdrawal/expense.
4. **Hide Assistant** — `pages/transactions/[[id]].vue:11`: `v-if="false"` on `<transaction-assistant>`.
5. **Hide Destination field, keep value** — `pages/transactions/[[id]].vue:50`: `v-if="false"` on destination `<account-select>`; value still flows from `getEmpty()` -> `profileStore.defaultAccountDestination`.
6. **Hide PAT** — `pages/settings/setup.vue:10`: `v-if="false"` on `<settings-token-field>`; token still loaded/saved unchanged.
7. **List filtered to default source account** — `pages/transactions/list.vue` onMounted: add `const profileStore = useProfileStore()` (auto-imported), then LAST (after `getPredefinedFilters` logic, overwriting any account already set) if `profileStore.defaultAccountSource`, set `filters.value = { ...filters.value, account: [profileStore.defaultAccountSource] }`. Array required because the `account` filter maps over its value.

## Key risks
- Req 2: existing `transactionListDefaultFilterAccount` path is buggy (single object vs `.map`); avoid it, feed an array.
- Req 3 edge: if defaults resolve to non-expense type, getEmpty seeds wrong type — force expense in onMounted.
- UI-hide only: filter drawer / direct URLs still bypass. Accepted by owner.
- Watch lint: unused imports/refs left behind (assistantText, Dashboard/TransactionList imports). Verify lint doesn't fail build.

## Commits: one per requirement (3-5 may squash). Riskiest (#7 list filter) last.
