---
name: ui-design
description: >-
  Build, restyle, polish or review web and app UI in any stack (HTML/CSS, React, Next.js, Vue, Svelte,
  Tailwind) so it does not look templated or AI-made. Covers both kinds of screen: app screens people
  work in (dashboards, admin, tables, forms, settings) and public pages people read (landing, product,
  portfolio, one-pager). Use whenever you design or change a screen, or when the user says it looks
  generic, templated, sloppy or "like AI made it". Ships a source linter and a real-browser inspector.
license: MIT
---

# UI design

A screen built by a model looks like the average of every screen it has seen: a centred headline under
a small label, a row of icon cards, a soft gradient, four KPI tiles with icons in tinted circles, a
zebra table. Nothing is wrong and nothing was decided. This skill replaces those defaults with
decisions, then measures the result instead of hoping.

## 1. Before anything: which screen, whose rules

**Read the repo's own rules first** (`AGENTS.md`, `CLAUDE.md`, a design or conventions doc). When the
repo fixes a style ("simple, no decoration", a KPI card convention, a brand palette, a print layout),
the repo wins over this skill, every time. Note each conflict and keep the repo's choice.

Then decide which kind of work this is:

- **An app screen** is worked in: a dashboard, admin or back office, a table to work through, a form,
  settings, an inbox, the detail page of one object. Follow §3 and read `references/app-screens.md`
  whole before you start.
- **A public page** is read and scrolled once: a landing page, a product or marketing site, a
  portfolio, an event, a restaurant. Follow §4 and read `references/public-page.md` whole before you
  start.

A product site that shows its app is a public page; the interface fragments on it follow the app
rules inside. A request with both builds each by its own rules with one shared palette and typeface.

A single component or section: skip the planning, match the surrounding design, apply §2, and still
measure (§5).

## 2. Ground rules for both

These hold on every screen unless the repo says otherwise. The linter and inspector check most of them.

- **No eyebrows.** No small label or pill badge above a heading. Put the information in the heading or
  the first sentence, or drop it.
- **No decorative numbering** (01 / 02 / 03, "Step 2"). Order by position, size or words; a real `<ol>`
  when order matters. A rank or an ID is data and is fine.
- **No decorative gradients**, on grounds, buttons, cards or text. Flat colour, or a real image. A
  neutral scrim under text on a photo is the exception.
- **No glass, no glow, no backdrop blur panels.** Opaque surfaces one tone step from the ground.
- **No icon in a tinted square or circle repeated down a list or across a card row.**
- **No tiny uppercase letter-spaced labels.** Sentence case at a readable size.
- **No styled accent word** in a headline (one word in italic, serif, colour or underline).
- **Two typefaces at most**, usually one. Monospace only for real code and IDs.
- **No assistant palette**: no cream ground with terracotta or rust, no violet or indigo accent.
- **Running text in the full ink** at 4.5:1 or better. A page set in soft grey reads unfinished.
- **No emoji in UI, no lorem ipsum, no Acme or John Doe, no invented proof** (customers, quotes,
  reviews, logos, vanity numbers). Sample content is allowed; list it in the report for replacement.
- **Every state is built**: hover, focus (visible), disabled, loading, empty, error. Empty must not
  look like error, and an error shows the server's message.
- **Motion answers an action** (press, open, confirm, a row arriving). Use transform and opacity only,
  honour `prefers-reduced-motion`, and never hide content behind an animation that may not run.

Removing ornament leaves space. Do not fill it with another ornament: fill it with scale, the full
content, the product's real data, or a picture made for this subject. `references/tells.md` is the
list of tells and what replaces each.

## 3. App screens (short form)

The full run, numbers and defaults are in `references/app-screens.md`. The eight things that separate
real product screens from generated ones:

1. **Colour goes on data, not chrome.** About 3% of pixels carry colour. Most screens have no filled
   brand button; the primary is near-black.
2. **KPIs are type, not tiles.** A label over a number, often one container split by 1px dividers. No
   icon circles, no sparklines.
3. **Surfaces are flat.** A 1px border or one tone step, not both, and no resting shadow.
4. **No hero header.** A noun title at about 24px; no greeting with an emoji.
5. **Charts carry little chrome.** One series, 3–5 faint gridlines, no legend for one series.
6. **Navigation recedes.** A sidebar on the page ground; the active item a neutral grey pill.
7. **Tables are rules and alignment.** Grey sentence-case headers, no zebra, numbers right-aligned in
   tabular figures.
8. **Data is honest.** Zeros print as zeros, missing values as a grey dash, totals add up from the rows.

Before building, write down the screen's **one question** ("Which deploy broke?") and its **one
finding** in today's data; the biggest block answers the question, the finding is shown inside that
block or on the action it drives, and the most frequent job is one click away. A line of text under
the title only when the repo allows explanatory text; the kit's shared rules ban subtitles by default.

## 4. Public pages (short form)

The full run is in `references/public-page.md`:

1. **Inventory the subject**: 8–12 things that belong to this client and no competitor (its name and
   what it means, its place, its numbers, its one constraint, its materials, its rituals).
2. **Write the argument**: one claim per section with its proof. Sections without a claim go.
3. **Find the idea**: "On this page, [something only this subject has] becomes [the device]". Run the
   competitor test: if the sentence still works with the nearest competitor's name in it, it is a
   category idea, not this client's.
4. **Write the words before markup.** Every headline fits in two lines at every width (about 32
   characters is safe). One primary action named for what it does. A supporting sentence under the
   headline only when the repo allows it and the headline alone cannot say what the thing is.
5. **Build still, then measure, then look**: tokens, hero, sections (each a different composition),
   imagery, states. Then §5, then the screenshots.

## 5. Measure

Scripts need Node (lint ≥ 18, inspect ≥ 22) and, for the inspector, an installed Chrome, Edge or
Chromium (or `CHROME_PATH`). Run them from the project root; output goes to `.tmp/ui-design/`.

```bash
node <skill>/scripts/lint.mjs <source files or folder> [--app] [--allow rule,rule]
node <skill>/scripts/inspect.mjs <url or path/to/index.html> [--app] [--allow rule,rule]
```

- `scripts/lint.mjs` scans source for banned patterns and stock copy. Exit 1 on any FAIL.
- `scripts/inspect.mjs` opens the page at 1440, 768 and 390 px, measures type, colour, frame,
  overflow and contrast, and saves screenshots plus `report.json` to `.tmp/ui-design/inspect`.
- `--app` switches both to the app-screen rules (quiet borders, small labels and repeated panels
  allowed).
- `--allow <id>` turns off one rule, for a pattern the repo deliberately keeps (for example
  `--allow shadow` for lint and `--allow shadow,heavy-shadow` for `inspect --app`, where the repo's KPI
  cards carry a shadow). Say which and why in the report. A
  single source line can carry the comment `ui-design-ignore` instead.

Fix every FAIL. Treat each WARN as wrong unless you can defend it in one sentence. Then **open every
screenshot** at every width and fix the three worst problems you can see; three rounds at most. A
problem visible in a screenshot is real, whatever the code says. Delete `.tmp/ui-design/` when done.

If the inspector cannot run (no browser, Node too old), run the linter, take screenshots with whatever
browser tool you have, and say plainly that the inspector did not run.

## 6. Report

Briefly: which kind of screen and which repo rules overrode the skill; for an app screen its question
and finding, for a page its idea sentence; lint and inspect results on the final version, with every
`--allow` and its reason; what still falls short; and every piece of sample content to replace.
Do not claim a check you did not run.

## Source

Rewritten and condensed from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
(tasteskill v2, MIT, see `LICENSE`); the scripts are a trimmed copy of its linter and inspector.
