# Rummage — Design System

**Rummage** is a maps-first iOS app for finding **estate sales, yard sales, thrift stores, moving sales, and auctions** near you. Search by ZIP code, then extend the radius to pull in sales beyond your immediate neighborhood. The brand voice is that of a friendly, knowledgeable neighbor who loves a good find — warm, plainspoken, a little bit treasure-hunt.

> **Tagline:** _Find the good stuff nearby._

This project is the design system itself: tokens, components, foundation cards, and a full iOS UI kit. Consuming projects link `styles.css` and load the generated `_ds_bundle.js` to use the React components.

---

## Sources

This is a **net-new brand** designed from a product brief — there was **no attached codebase, Figma file, or prior brand**. Everything here (name "Rummage", palette, type pairing, logo, components) was authored as an original system. If you have existing brand assets, real sale photography, or a production codebase, share them and we'll reconcile.

- **Fonts** are loaded from **Google Fonts CDN** (not bundled as local `@font-face` binaries) — see _Caveats_ in this file. Newsreader (display serif), Hanken Grotesk (body sans), Spline Sans Mono (data).
- **Icons** use **Lucide** via CDN — see the ICONOGRAPHY section.

---

## CONTENT FUNDAMENTALS

How Rummage writes.

- **Voice:** a sharp-eyed neighbor who knows where the deals are. Helpful, warm, never salesy or breathless.
- **Person:** address the user as **"you"**; the app refers to itself rarely and never as "we" in UI copy. Imperative for actions ("Search this area", "Save sale", "Get directions").
- **Casing:** **Sentence case** everywhere — buttons, headers, list rows. Never Title Case Buttons. Proper nouns and sale names keep their own casing.
- **Tone examples:**
  - Empty state: _"No sales here yet. Try widening your radius."_
  - Location ask: _"Rummage works best when it knows where you are."_
  - Save confirmation: _"Saved. We'll remind you before it starts."_
  - Distance: always **"2.4 mi"**, lowercase "mi", mono numerals.
- **Numbers & data** (distance, ZIP, dates, prices, hours) are set in the **mono** face with tabular figures. Dates read "Sat, Jun 14 · 8am–3pm".
- **Sale titles** are treated editorially — set in the **serif**, allowed to be descriptive and characterful ("Mid-century estate, everything must go").
- **Emoji:** **not used** in UI chrome. Personality comes from the serif voice, the warmth of the palette, and (where available) hand-drawn spot illustration — not emoji.
- **Length:** terse. Labels are 1–3 words; helper text one short sentence. Respect the small screen.

---

## VISUAL FOUNDATIONS

The look: **warm paper, editorial serif, utility-clean sans, terracotta accents.** Maps-first but never cold.

- **Color vibe.** The app sits on a **warm cream "paper"** (`--paper #FAF6EE`), not white. Surfaces (cards, sheets) are white-to-warm-white and lift off the paper with soft, **warm-tinted** shadows. The hero accent is **terracotta/rust** (`--brand-600 #C2410C`) — used for primary actions, map pins, and the active tab. **Teal** (`--teal-600 #0F766E`) is the secondary, used for "saved", links, and thrift accents. Ink is a warm near-black (`--ink-900 #1C1917`) over a warm stone gray ramp.
- **Sale-type color coding.** Five categories each own a soft-tint/dark-fg pair: estate (violet), yard (green), thrift (teal), moving (amber), auction (rose). These drive tags, map pins, and legends — consistent everywhere.
- **Type.** Headlines and sale titles are **Newsreader** (a characterful editorial serif, optical sizing, real italics) — this is the brand's signature. Body, labels, and UI are **Hanken Grotesk** (clean, friendly grotesque). Data is **Spline Sans Mono**. Display is set tight (`-0.02em`); body is normal.
- **Spacing & layout.** 4px grid. Mobile design width **430px**. Generous gutters (`20px`), comfortable card padding (`16px`). Bottom tab bar + safe areas respected. Content scrolls under frosted, translucent headers and tab bars.
- **Backgrounds.** Flat warm paper — **no busy gradients**. The only gradients are the subtle warm wash on photo **placeholders**. Real sale photography is the imagery; where we lack photos we show a warm placeholder with a faint pin glyph. Imagery skews **warm** to match the paper.
- **Corner radii.** Soft but not bubbly: controls `14px`, cards `20px`, sheets/hero `28px`, pills/chips/avatars fully round.
- **Cards.** White surface, **1px warm border** (`--line`), **soft warm shadow** (`--shadow-sm`/`md`). 20px radius. Photo cards are full-bleed at the top with the type tag and save heart floated over the image. No colored left-border accents.
- **Shadows.** Two systems: **warm ambient** elevation (`--shadow-xs → lg`, tinted with ink at low alpha) for surfaces, and a **brand-tinted pin shadow** (`--shadow-pin`) for map markers. Focus uses a 3px terracotta ring (`--shadow-focus`).
- **Elevation & blur.** Headers, tab bars, and floating map controls use **translucent fills + backdrop-blur** ("frosted") so content shows through. Sheets cast an upward shadow (`--shadow-sheet`).
- **Borders.** Hairline `1px` warm borders everywhere; `1.5px` for stronger separation. Dividers are the same `--line`.
- **Motion.** Quick and confident. `--dur-fast 140ms` for taps, `--dur-base 220ms` for transitions. Easing is `--ease-out` (settle) for most things; a gentle **spring** (`--ease-spring`) on toggles, save-heart pop, and slider thumb. **No** bouncy page transitions, no infinite decorative loops.
- **Hover/press.** Touch-first, so **press** matters most: buttons and cards **scale down** slightly (`0.97`/`0.92`) on press; the save heart pops with a spring. Filter chips flip to **ink-filled** when selected. Hover (where present) deepens the accent (`--accent-hover`).
- **Transparency.** Used purposefully: frosted chrome over scrolling content and over the map; photo-overlay capsules (type tag, photo count) use translucent dark/light fills with blur for legibility on any photo.

---

## ICONOGRAPHY

- **Icon set: [Lucide](https://lucide.dev)** — clean, modern, consistent **1.8–2px stroke**, rounded caps/joins. It matches the maps-first utility feel. Loaded from CDN in cards and the UI kit (`https://unpkg.com/lucide`). **This is a substitution flag:** Lucide is an excellent stand-in, but if you have a bespoke icon set, swap it in.
- **Stroke, not fill.** Icons are stroked outlines by default. The **save heart** is the one icon that fills (terracotta) when active.
- **Sizes.** 24px in the tab bar, 18–22px in headers/controls, 14–16px inline with text.
- **Sale-type glyphs.** Each category maps to a Lucide glyph: estate → `armchair`, yard → `tent`, thrift → `store`, moving → `truck`, auction → `gavel`. Used on pins and tags.
- **Emoji / unicode:** not used as iconography. The middot "·" is used as a textual separator in metadata rows.
- **Illustration:** the brand calls for a **hand-drawn spot-illustration** style for empty states and onboarding. These are **not yet produced** (see Caveats) — currently represented by warm placeholders. Do not hand-draw or AI-generate them ad hoc; commission a consistent set.
- A simple **logomark** (a map-pin/price-tag mashup) and **wordmark** live in `assets/`.

---

## Index / Manifest

**Root**
- `styles.css` — global entry point (imports only). Consumers link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill front-matter for use in Claude Code.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`

**`guidelines/`** — foundation specimen cards (Type, Colors, Spacing, Brand)

**`assets/`** — `wordmark.svg`, `logomark.svg`, `app-icon.svg`

**`components/`** (React primitives — `window.RummageDesignSystem_019deb`)
- `forms/` — **Button, IconButton, Input, Switch, SegmentedControl, FilterChip**
- `data/` — **Card, SaleCard, SaleTypeTag, Badge, Avatar, ListRow**
- `navigation/` — **TabBar, AppHeader, DistanceStepper**

**`ui_kits/ios_app/`** — full-screen click-through recreation: onboarding, search, map+list explore, sale detail, saved, filters, settings.

---

## Caveats

- **Fonts are CDN-loaded** (Google Fonts), not bundled binaries. If you need offline/self-hosted fonts, provide them and we'll add local `@font-face`.
- **Icons are Lucide** (CDN), a substitution for a bespoke set.
- **Hand-drawn illustrations are not produced** — empty states and onboarding use warm placeholders. Real sale **photography** is also needed for production cards.
- The **brand name and identity are proposed**, not pre-existing.
