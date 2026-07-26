# Matchbook asset pack

Implementation assets for the Tournament Tracker Matchbook screens.

The product hierarchy is league → competition/event. Time filters use explicit
date ranges or all-time records.

## Contents

- `brand/`: crest and horizontal lockup
- `auth/`: authentication-provider marks
- `teams/`: eight original volleyball team crests
- `diagrams/`: reusable top-down volleyball court
- `icons/sprite.svg`: team- and tournament-level current-color UI symbols
- `textures/`: seamless paper grain
- `tokens.css`: palette, typography stacks, rules, shadow, and surface helpers
- `manifest.json`: machine-readable asset index
- `preview.html`: visual catalog of the complete pack

## Use an image

```tsx
<img src="/assets/matchbook/teams/surge.svg" alt="Surge" />
```

## Use the icon sprite

```tsx
<svg width="24" height="24" aria-hidden="true">
  <use href="/assets/matchbook/icons/sprite.svg#teams" />
</svg>
```

All sprite icons inherit `currentColor`, so active navigation can use coral and
default navigation can use navy without separate files.

## Load the design tokens

```css
@import url("/assets/matchbook/tokens.css");
```

Use `.matchbook-surface` on the app shell and `.matchbook-display` for mastheads,
section titles, issue badges, and large scores.

## Screen-to-asset map

| Screen | Primary assets |
| --- | --- |
| All screens | `brand/lockup.svg`, `icons/sprite.svg`, `textures/paper-grain.svg`, `tokens.css` |
| Login | `brand/lockup.svg`, `auth/google-g.svg`, `teams/*.svg`, icons `mail`, `lock`, `login`, `quick`, `cloud`, `teams` |
| Home | `teams/*.svg`, icons `overview`, `star`, `live`, `bracket`, `chart` |
| Teams | `teams/*.svg`, icons `teams`, `compete`, `chart`, `share`, `export` |
| Quick | `teams/*.svg`, icons `swap`, `court`, `clock`, `share`, `live` |
| Compete | `teams/*.svg`, icons `bracket`, `compete`, `live`, `calendar`, `location` |
| History | `teams/*.svg`, icons `history`, `search`, `filter`, `export`, `share` |
| Tools | `teams/*.svg`, icons `clipboard`, `court`, `print`, `save`, `check`, `bracket` |

The generated mockups remain in `design-directions/matchbook-screens/` and are
visual references, not runtime assets.

This pack intentionally contains no player, coach, captain, official, avatar,
portrait, roster, jersey, position, or other person-level assets. Team crests
are the identity primitive throughout the product.
