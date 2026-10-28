# 09: Oswald and Outfit never apply

**Status:** needs-triage

**Type:** task

Found while implementing the design-consistency spec (story 42: file, don't fix).

The matchbook design names Oswald as the display face and Outfit as the body
face, and `src/app/layout.tsx` loads both through `next/font/google` with the
variables `--font-oswald` and `--font-outfit`. `next/font` puts those
variables on the element that carries the font class (the `<body>`), but
`src/app/globals.css` reads them on `:root`: `--font-sans: var(--font-outfit)`
at line 7 and `--mb-display-font: var(--font-oswald), ...` at line 82. On
`:root` the variables are undefined, so `--mb-display-font` resolves to the
fallback stack and `--font-sans` to nothing. In a production build the
condensed headings render in `ui-sans-serif`, not Oswald, and body text is
not Outfit.

Likely fix: put the two font classes on `<html>` instead of `<body>`, or move
the two reads from `:root` to `body`. Either is a one-line change, but it
changes how every screen renders and should be checked at phone width before
it lands.

Not fixed in the design-consistency branch so that the restyle stays a
restyle.
