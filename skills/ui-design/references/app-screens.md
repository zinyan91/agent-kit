# App screens

Dashboards, admin and back office, analytics, settings, inboxes, list screens, wallets, builders, and
the detail page of one object: the screens people work in. Read this whole before you start one.

A generated dashboard is the average of every template: a tinted sidebar with a coloured active pill,
"Welcome back" and a waving hand, four KPI cards each with an icon in a tinted circle, a green
"+12.5%" and a sparkline, a gradient area chart, a zebra table under uppercase headers.

The numbers below come from measuring 23 real product screens (17 light, 6 dark, desktop width).
Lines marked *house rule* go past that study and come from testing.

Quiet is the starting point, not the goal. In blind tests, screens that were clean but thin lost to
richer screens. The judges' reasons, each now a rule: half the blocks started below the fold; the
product had no name or face; restraint hid meaning (a rise in errors in the same grey as a rise in
visits); there was no control for the screen's job; rows ended ragged.

## 1. The run

### 1.1 Inventory the data and the jobs

Write in 8–12 lines: **the objects** the screen shows and their fields with units; **realistic
magnitudes** (how many, typical amounts, how small they are for a new account); **the people** (who
opens it, how often, on what device); **the jobs** (what they do next, which job is most frequent);
**the product's own things** (its name and mark, the workspace or account it is scoped to, the people
in it, objects recognised by sight such as product photos or cover art).

Then write the data as a small dataset the screen renders from: believable names, amounts that add up,
dates in order, a unit on every figure. Totals are computed from the rows, never typed separately.
Small numbers stay small.

**Data that tells the truth** (house rules):
- A fact shown twice is one variable; both places render from it.
- Totals and deltas come from the parts as shown: sum the rounded values the screen displays.
- Every relative figure names its baseline ("+5 on the usual Monday", "45 m earlier than last Sunday").
- One name per moment: the header and the card use the same words for the same time or state.
- If a caption has to say which bars are which, encode it in the chart instead.

### 1.2 Name the screen's one question and one finding

Every screen answers one question first ("Which deploy broke?", "Who is waiting for a reply?"). It
decides what is biggest (the largest block and the largest figure answer it), what comes first, and
what is left out (a few numbers can replace a chart).

Then name the **one finding**: the fact in today's data that most needs attention ("the 23:28 deploy
doubled the error rate"). Put it where it is read first, under the title or the headline figure, next
to the action it drives.

List the blocks as answers to the next questions, one line each. A block with no question goes.

- **Everything the brief names is on the first screen.** At 1440×900 every requested block shows its
  header and first rows. Size the headline block to the question (about 200–360px tall), cap lists at
  4–6 rows with "View all", put time-sensitive blocks before long tables.
- **The most frequent job is one click away**: a primary in the title row, an action on the row that
  needs it.
- **Show the evidence beside the answer**: annotate the spike ("peaked at 3.9% after the 23:28 deploy,
  reverted") instead of adding a second chart.

### 1.3 Give the product a face

The style's tokens make a screen correct; these make it this product's:
- the product's mark and name at the top of the shell, and its scope (workspace, project, account) as
  a switcher or breadcrumb;
- one chart hue on the main data element (today's line, the current period), not only on a delta;
- one element only this product has, built from its own things (a bakery's sell-out strip, a leave
  planner's cover against the minimum);
- its people as themselves (stable initials, a pale tint each) and its objects as themselves
  (thumbnails, covers);
- words of the trade in labels and empty states ("Waiting on the customer", "Due on the 28th"), never
  "Items", "Records", "Status".

### 1.4 Build

Shell first, empty (§2, §3), checked at 1440 and 390. Write the grid arithmetic in a comment: column
count, gutter, and the sum that proves the cards land on the canvas edges. Then render every block
from the dataset, formatting figures by §6.4. Then build every state (§9).

### 1.5 Check

Run `lint.mjs --app` and `inspect.mjs --app` (SKILL.md §5). Then look at the screenshots and answer:
1. Is the question answered by the biggest thing, read first?
2. Does every block share the screen's edges? Any dead strip, card stopping short, orphan cell, or
   stretched card with a blank band?
3. Is colour only on data, status and the one primary action?
4. Do the numbers add up and line up digit for digit? Do facts shown twice agree?
5. Does every zero look like a zero and every missing value like a dash?
6. Does every legend swatch match its mark? Does any label collide with a line or another label?
7. On the phone, is navigation folded and does each block still answer its question?

Fix the worst three, inspect again, look again. Three rounds at most.

App screens have no motion quota. Motion is feedback: press, hover, focus, a menu opening, a row
arriving. Nothing performs an entrance.

## 2. The shell

| Shell | What it is |
| --- | --- |
| Open plane | A labelled sidebar on the page ground, divided by nothing or one 1px rule; no top bar; fluid canvas with a 24–64px gutter |
| Tinted frame, white sheet | Sidebar and top bar share one tinted ground (#f6f6f6–#f9fbfc); the page sits on a white sheet inset 8px, radius 10–16, 1px #eaeaea edge, no shadow |
| Ruled T-frame | A 210–240px sidebar and a 64px top bar on one ground, divided by 1px rules |
| Icon rail | An unlabelled 50–60px rail; only when there are five destinations or fewer and width matters |
| No sidebar | A 46–48px top bar over a centred 1088–1208px column; for reports and few destinations |

Never a dark or saturated sidebar against a light canvas. Dark screens use one ground everywhere.

**Sidebar.** 224–240px wide. Rows: 32px hit area on a 34px pitch. Icons 14–20px outline at about
1.5px, grey; labels 14px regular. Active item: a neutral grey pill (#e9e9e9–#ededed, radius about 8,
inset 8–14px) on light; brightness alone on dark. Group labels in sentence case, 12–13px grey, never
uppercase. Settings and help at the bottom. Counts only on a queue that needs action, with its noun
clear ("Requests 5"). Nav items are other screens, never anchors into one long page.

**Top bar.** None by default. When present: 44–51px (or 64px with a rule), holding something real
(search, the workspace switcher, the object's name). Never mostly empty.

**Right rail.** Only for a stable secondary stream (details of the selected object, recent items):
a fixed 320–384px column, starting level with the first card. No floating button unless it is the one
primary action and covers nothing.

## 3. Canvas and title

- **Width.** Fluid with 24–40px side padding (content about 1120–1312px), or centred at 1100–1250px.
  Not narrower for data screens.
- **Top offset** from canvas top to title: 20–36px for tools.
- **One gutter**, the same value horizontally and vertically.
- **One left edge and one right edge** from the header to the last row. The grid's arithmetic closes
  (3 × 372 + 2 × 17 = 1152). Write the sum down.
- **Choose the column count from the item count.** Four KPIs get four columns, not a three-column grid
  with an orphan. A lone card spans.
- **Cards that share a row share a bottom edge.** Balance by content first (same row counts, similar
  blocks side by side); otherwise stack, or let the shorter card top-align its content with only its
  footer action pinned to the bottom. A legend or note stays directly under its chart.
- **Narrow blocks do not span the canvas.** A table of five columns or fewer runs to about 760px at
  1440 and pairs with the next block.
- **The title.** One `h1` per screen, a noun ("Analytics", the object's name) at 18–32px, 600–700. A
  greeting only on a personal home, never with an emoji. An optional 14–16px grey second line about the
  data (the finding, the period, the scope), never about the interface.
- **Right of the title**: real actions only, or a freshness stamp ("Updated 4:09 PM" with refresh).
  One filled primary per screen, usually near-black.
- **Tabs and filters.** The date range at page level or on each card, never both. Underline tabs sit
  on a full-width 1px rule with a 2px indicator. A segmented control is as wide as its options.
  Controls in a row share one height (32–36px). Scope on the left (date, then filters), utilities on
  the right.

## 4. KPIs

- **No tile of its own by default**: one container split by 1px dividers into equal columns, or the
  number placed in the card that explains it.
- **1–6 per row**, matching the grid.
- **Values 16–40px** (median 24), labels 12–16px grey above, sentence case. Nothing at 48px or over.
  Large number at regular weight under a semibold label is common; bold for money only.
- **Nothing else**: no icon in a coloured circle, no sparkline, no tinted tile. Units are a smaller grey
  suffix ("5 mins").
- **The answer figure leads**: when one figure is the screen's answer, it is 30–36px and at least 1.3×
  its siblings, and no other figure is larger.
- **One figure, one place.** Do not repeat a strip figure in a legend, and drop a KPI strip whose cells
  only name the panels below.
- **Deltas** are optional, 10–15px, with the window in words ("vs prior 30 days"). Colour only the
  number, and colour says good or bad, not up or down: rising errors, cost or latency take the negative
  colour. Zero or undefined change is grey; from zero write "+4 (new)".

## 5. Charts

| Question | Form |
| --- | --- |
| Moving over time? | One line; an area only with a fill of 15% or less |
| How much per period? | Columns with square corners |
| Who ranks? | A sorted horizontal bar list |
| What share? | A thin ring or a 100% stacked bar, five parts at most |
| How far to the target? | A progress bar, both ends labelled, fill at the true ratio |
| How much of the plan is used? | A track as long as the plan, spent filled, committed lighter, overrun past the end in the negative colour |
| Which way did it flow? | Columns above and below one zero line, axis signed and captioned on each side |
| Who is away when? | People down the left, days across, each kind of booking its own mark |

- **When there are only a few numbers, draw no chart.**
- **One series per chart**; switch metrics with a control rather than overlaying lines. Plots run
  about 112–264px tall.
- **A series flat except for one event** gets two-thirds of the width at most, or a capped range with
  the off-scale peak labelled.
- **A forecast is dashed** after today, with the end value labelled.
- **Gridlines** horizontal only, 3–5, 1px about #e5e5e5 (#2b2b2b on dark). Dashed lines only in chart
  grids. No y-axis line; the baseline is the one heavier line.
- **Y ticks** 4–7, round even steps, the top tick above the maximum, zero as the baseline for bars and
  counts. Never without a scale. Axis text no larger than the data.
- **X labels** 4–8, flat, never rotated, on one step all the way. Time goes on a time scale.
- **Lines** about 2px, straight segments, no point markers. **Bars** square, or at most a 4px top
  radius. Stacked segments split by a 1–2px seam.
- **Colour.** One hue per chart, on the main data element. One subject keeps one hue across the
  screen. Four hues at most on a screen. Status colours only for status.
- **Legends.** None for one series. Otherwise five items at most, as small dots with grey labels in
  the card header, or a small table that carries the values. Every swatch is the mark it explains.
- **Rings** thin (3–8px stroke), no labels on slices, only when the parts are not already listed beside.
- **Progress bars** 4–24px, both ends labelled, fill the true ratio, no stub at zero.
- **Annotate the event that matters** with a 1px marker and a 12px label naming its cause. Reference
  lines (a budget, an SLO) are 1px dashed with the label at the end. Labels never collide.
- **Short and empty histories are drawn honestly**: a flat zero line, missing bars, no padded range,
  no "No data" picture.

## 6. Tables and lists

### 6.1 Rows and header
- Single-line rows 36–53px (about 45); two-line rows with media 56–92px; a subline one size smaller in
  grey about 21px below line 1, on a pitch of 40–44px at least.
- Overview lists show 2–5 rows.
- Header 11–14px (about 12), regular, grey, sentence case, no fill band, at most one rule (the
  strongest line in the table). Numeric headers right-aligned and flush with their values. A sort
  glyph on the active column only.

### 6.2 Dividers
No zebra. Rules, when present, are 1px and 3–7% darker than the surface (#ededed–#f4f4f4 on white).
Choose one extent per screen.

### 6.3 Ink
Only the identity and the key number in primary ink; the rest grey. Missing is a grey dash; a real zero
is printed. The sign lives in the text ("+"), not as red on every negative. Link colour on the name cell
only.

### 6.4 Figures
- **Numbers right-aligned in tabular figures.** Fixed decimals per metric (money 2, percentages 1–2,
  counts none), thousands separators, a sign on every change.
- **The identity column gets the most width**, and is never the one truncated; shorten names
  editorially first.
- **One right edge per row or card.** Two measures stack in one cell rather than two columns.
- Dates in a fixed form where rows are compared; in words for recency ("Today", "6 days").
- IDs in monospace, truncated with an ellipsis and a copy icon.
- An edited cell shows that it changed and the baseline is named.

### 6.5 Status pills
16–24px tall, text at least 11px at 500, a pale tint with dark text of the same hue (#dcfae5 with
#04250e; #ffedea with #831c1e). One status mark per row. A saturated fill with white text only for the
one rare call to action. Chips never squeeze: `flex: none; white-space: nowrap`.

### 6.6 Actions and paging
- No pagination on an overview: cap rows, link "View all", state the total.
- Row actions: none, or one kebab at the far right. A row that needs doing shows a visible ghost button
  or ink text action in one fixed trailing column, at the same pitch on every row.
- Checkboxes only where bulk actions exist.
- A full list screen states the total, keeps the header in view, and pages with the range shown
  ("1–50 of 1,284").
- In a ranking list the row fill may be the bar; inline bars elsewhere are 2–3px and grey.

## 7. Forms and settings

- **Label above the field**, 14px at 500, 8–10px gap. No floating labels, no placeholder as label.
- Inputs 38–40px in forms (radius 8–10); filter controls 28–40px. One control height per context.
  Inputs stay white with a 1px #e5e7eb border.
- 24px from a description to the first label, 16px between fields, 16px to Save.
- Toggles 28×16 to 33×20, on colour a semantic green or near-black.
- **Disabled** controls stay legible and say why.
- **Settings**: each section a row, a label column (title and grey description) beside a panel; on the
  phone the label stacks above. Sections split by a 1px rule with 32px around. One view per area, each
  with its own `h1`. One save model per view (autosave with a quiet "Saved", or one Save per panel).
  Destructive actions last, in their own section, outlined in the negative colour, with the consequence
  in words and a confirmation naming the object.
- **Show what the setting produces**: a small preview of the result beside the control.
- **Buttons** 32–36px; one filled primary, a secondary white with a 1px border, a tertiary as text.

## 8. Type, colour, surfaces

### 8.1 Type
- One grotesk; a second face only with one job (monospace for IDs or figures, a serif for one greeting).
- App type is not display type: the `h1` stays at 18–32px and no figure reaches 48px.

| Role | Range | Default |
| --- | --- | --- |
| Page title | 18–32 | 24 |
| KPI value | 16–40 | 24 |
| Card title (500–600) | 14–24 | 16 |
| Body, nav, cells | 13–16 | 14 |
| Labels, meta, axis | 11–14 | 12 |
| Pills | 11–14 | 12 |

- A clean scale: 12/14/16/24. About three weights; 700 does one job.
- Tabular figures on every number in tables, KPIs and anything that updates; check the face really has
  them.
- Sentence case; tracking 0, slightly negative only on large type.

### 8.2 Colour on light
- Ground models: white cards on an off-white ground (#f9fafb), grey panels on white, or a framed sheet.
- Lines in three steps: card edges about #eaeaea, row rules #efefef–#f4f4f4, control borders #d1d5db.
- Text in three tiers, each at 4.5:1 or better: about #111, #5f6368, #6b6b6b (the lightest grey that
  holds on white).
- Accent on data only, or on actions only, or none. More than one accent family is a fault.
- Status: text green #247b50, negative #c4242a; pills as pale pairs.

### 8.3 Colour on dark
- Ground #000 or #111, never navy or slate. Surfaces one lightness step up, or the ground with a 1px
  line (#2e2e2e on #111).
- Text #fff; secondary about #b4b4b4; meta about #949494. Two greys at most.
- Accent on data or one selected state; active nav by brightness.
- When the accent is green, positive status uses the accent, not a second green.

### 8.4 Surfaces and spacing
- A border or a shadow, never both; resting shadows faint (alpha .06 or less) if any. Real shadows on
  what floats.
- Radius is tight (4–8px) or soft (16–24px), chosen once; nested radii step down.
- Group, don't box: KPIs in one divided card.
- Icons outline, 14–20px, grey, never in a saturated circle.
- 4px base: card gap about 16, card padding about 20, section gap 24–64, control height about 32–36.

### 8.5 Default tokens

```css
:root {
  --ground: #f9fafb;  --surface: #ffffff;  --raised: #f9f9f9;  --active: #eeeeee;
  --border: #e8e8e8;  --rule: #f2f2f2;     --control: #d1d5db;
  --text: #111111;    --muted: #5f6368;    --faint: #6b6b6b;
  --primary: #1d1f20;
  --accent: /* one hue, about 3% of pixels: the data, plus at most one control */;
  --positive: #247b50;  --pill-positive-bg: #dcfae5;  --pill-positive-ink: #04250e;
  --negative: #c4242a;  --pill-negative-bg: #ffedea;  --pill-negative-ink: #831c1e;
  --pill-warning-bg: #fffbeb;  --pill-warning-ink: #92400e;
  --grid: #e5e5e5;
  --radius-card: 8px;  --radius-control: 6px;  --radius-chip: 4px;
  --gap: 16px;  --card-pad: 20px;  --pad: 24px;
  --nav-row: 34px;  --control-height: 32px;  --row-height: 48px;
  --font: system-ui, sans-serif; /* replace with the product's face */
  --fs-title: 24px;  --fs-section: 16px;  --fs-kpi: 24px;  --fs-body: 14px;  --fs-small: 12px;
}
:root[data-theme="dark"] {
  --ground: #000000;  --surface: #111111;  --raised: #222222;  --active: #222222;
  --border: #1a1a1a;  --rule: #161616;     --control: #444444;
  --text: #ffffff;    --muted: #b4b4b4;    --faint: #949494;
  --primary: #ffffff;
  --positive: #3fc07a;  --pill-positive-bg: #172a1d;  --pill-positive-ink: #3fc07a;
  --negative: #e5566f;  --pill-negative-bg: #2c1a20;  --pill-negative-ink: #e5566f;
  --grid: #2b2b2b;
}
.num { font-variant-numeric: tabular-nums; }
td.num, th.num { text-align: right; }
```

### 8.6 Density
Three settings move together: row pitch, padding, type size. Sparse (homes, settings): padding
20–24px, rows 56–92px, body 14–16px. Medium (overviews, lists): rows 44–56px. Dense (monitoring, long
sessions): 13px body, 28–42px rows, generous gutters. Placed space reads as calm; leftover space from a
grid that does not fit the data reads as unfinished. Size each block to its question, not to the data
the product hopes for.

## 9. Empty, zero, loading, error

- **A real zero** is printed normally ("0", "$0", "0%").
- **Missing** is a grey dash at text size, never "--" at value size.
- **Counts follow the view**: tabs and badges recompute on every filter; a filtered block shrinks to
  its rows or keeps fixed rows with one sentence.
- **An empty section keeps its frame and header** and adds one sentence spanning the block, or a box
  with an add link. An empty side card can show reference data instead.
- **An empty chart is drawn**: zero line, missing bars, no picture.
- **First run**: keep frame and title; put the first action where the data will appear, with setup
  progress at its true percentage.
- **Loading**: the final layout with each value replaced by a flat grey bar at its real size, labels
  shown at once, no shimmer gradient, no layout shift when data lands.
- **Error**: inside the block that failed, never a full-screen banner. One sentence with what failed
  and when the data was last good, the server's message, and a Retry action. **Error never looks like
  empty.**
- **Stale data**: a freshness stamp with refresh. Red is a signal, one mark per object at most.

## 10. The phone (house rules)

- Navigation folds into a 48px top bar with a menu sheet, or a bottom bar of four or five destinations.
  The sidebar never takes more than 30% of the phone width.
- Margins 16–20px; touch targets 44px; text at least 12px.
- The title stays at 20–24px; header actions move into a kebab except the one primary.
- Filters collapse into one chip row or a Filters sheet; the first list row starts in the top 60%.
- KPIs become a two-column grid (even count) or a label-value list; never four squeezed columns.
- At most one row of controls above a chart. Charts full width, 160–200px tall, 3–4 x labels.
- Tables become two-line rows below about 640px: identity and key number on line 1, other fields in
  grey on line 2, the action on the right. Fields move, never vanish. A table that must stay a table
  scrolls inside its own frame with the first column fixed.
- Tablet (641–1100px) is its own band: sidebar folds, tables keep four or five columns.
- Blocks that carry an action move up, not down.
- Several panes: one at a time; back returns to the list at its scroll position.
- Check 390px in every inspection round.

## 11. Rules the inspector relaxes and keeps for app screens

| Allowed on app screens | Limit |
| --- | --- |
| 1px borders on cards, panels, tables, controls | About #e5e7eb–#ededed on white; a border or a shadow, never both |
| Row rules | 1px, 3–7% darker than the surface; no zebra, no header band |
| Small labels above values | 12–14px, sentence case, grey at 4.5:1; nothing under 11px; one tracked uppercase label per screen at most |
| Rows of identical cards | Peer items only, 3–6 across, equal widths, edges aligned, no icon on top |
| Monospace | IDs, keys, code, or every figure as one decision |
| Pills | Inside rows and beside a value only |
| Index numbers | Only as data (a rank) |
| Icons | 14–20px outline, one set, grey |
| Shadows | On what floats; a resting card at most a small blur under 8% black |
| A gradient | Only as an area fade under one line chart |

Still banned and checked: gradients on grounds, buttons, cards and text; glows, glass, backdrop blur;
icon circles on KPIs or cards; rainbow charts; sparklines on KPIs; emoji; placeholder data and vanity
figures; status colour on a zero change; a dark or saturated sidebar on a light screen; the accent on
chrome; uppercase tracked table headers; left-aligned numbers; a hero header; pagination under a short
overview list; violet and indigo accents; cream with terracotta; a title over 32px or a figure at 48px
or more; a screen that names no product and offers no action.
