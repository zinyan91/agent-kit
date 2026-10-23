# Tells

A tell is a device that makes a screen read as generated. Most began as good ideas. They became tells
by appearing by default, everywhere, without a reason. Any of them is fine when the brief or the repo
asks for it; none is fine as a default.

`scripts/lint.mjs` and `scripts/inspect.mjs` detect most entries.

## Colour and surface

| Tell | Instead |
| --- | --- |
| Violet or indigo gradients on hero, buttons, glows | Flat colour chosen for the subject |
| Gradient headline text | Solid ink |
| Glass: backdrop blur, translucent cards, floating pill nav | Opaque surfaces one tone step from the ground; a plain bar |
| Soft grey shadow (rgba(0,0,0,.1)) under every card | A tone step, or no box; shadows only on what floats |
| Near-black ground with one neon accent (acid green, vermilion) and a glow | A real dark palette: true neutral greys, colour on data only |
| Cream ground (near #F4F1EA) with a terracotta or clay accent (near #D97757) | A palette taken from the subject's own materials |
| Tinted near-black (#0B0B0B, #111) standing in for black everywhere | Decide the ground on purpose |
| One medium radius (12–16px) on everything | Square or fully round, chosen once; nested radii step down |

## Type and labels

| Tell | Instead |
| --- | --- |
| Eyebrow: tiny tracked uppercase label above every heading | Fold it into the heading, or delete |
| Pill badge above the headline ("New", "Beta", "Introducing") | Say it in the supporting sentence |
| One word of the headline in italic serif, colour or underline | One face, one colour; the words carry the emphasis |
| Monospace micro-labels as a "technical" voice | The text face; tabular figures for numbers |
| Index numbering 01 / 02 / 03, "Step 02" | Order by position, size or words |
| Meta strings joined by middle dots ("A · B · C"), "WORD — fragment" labels | Plain sentence-case labels |
| A "→" appended to every link and button | The action's name alone |
| Headline as a full sentence over three or four lines | About five words; the rest goes below |
| The same default face on every page (Inter, Poppins, Space Grotesk…) | A face chosen for this product, or the brand's |

## Structure

| Tell | Instead |
| --- | --- |
| Hero, logos, three icon feature cards, testimonial, pricing, CTA | The order of the page's argument |
| Three identical cards, each topped with an icon in a rounded square | A composed section; cards only for real peer items |
| Bento grid of rounded tiles as the feature section | A composition that carries this subject |
| Every section the same layout | Neighbouring sections differ |
| Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns | Structure from space and tone steps |
| Design-tool chrome as ornament: crosshairs, crop marks, dashed guides | Remove |
| Everything centred | Left-anchored, one centred moment at most |
| Fake dashboard hero of grey bars and donuts | A real interface fragment with real-looking data, or nothing |
| Invented proof: logos, quotes, star rows, "10,000+ teams" | Real proof, or none |

## Dashboards

| Tell | Instead |
| --- | --- |
| Dark navy or tinted sidebar with a coloured active pill and a left bar | Sidebar on the page ground; a neutral grey active pill |
| "Welcome back, Alex 👋" | A noun title at about 24px |
| Four KPI cards, each with an icon in a tinted circle, a green "+12.5%" pill and a sparkline | One container split by dividers, label over value, a delta only with its window in words |
| KPI values at 36–48px, bold, in the brand colour | 24–30px in ink; nothing at 48 |
| Gradient area chart, smoothed spline, a dot on every point | A 2px straight line, little or no fill, no markers |
| Rainbow palette, a hue per bar or per chart | One hue per chart, on the main data; four hues at most per screen |
| Fat donut with slice labels | A thin ring, the legend as a table with values |
| Zebra table under uppercase tracked headers, checkbox, avatar, chip and kebab on every row | 12px grey sentence-case headers, rules or space, one status mark, one action where needed |
| Left-aligned numbers in proportional digits | Right-aligned tabular figures, fixed decimals, units in grey |
| Saturated status chips with white text | Pale tint with dark text of the same hue |
| The accent on every button, tab and link | A near-black primary; the accent on data and at most one control |
| Pagination under a five-row list | Capped rows, "View all", the total |
| Equal four-up grid with orphan cells and stretched cards | Column count chosen by item count; rows that end level |
| An illustration and "No data yet" in an empty chart | The zero line drawn, one sentence in the frame |

## Copy

Stock verbs and adjectives (unlock, supercharge, seamless, elevate, effortless, cutting-edge,
all-in-one, next-gen), "not just X, it's Y", tricolon headlines, "Get started" and "Learn more" as
labels, many em dashes, lorem ipsum. Name the specific thing the product does. For prose on the page,
use the `writing` skill.

## Motion

The same fade-up on every block, a dozen staggered entrances, hover lift on every card, bounce easing,
looping pulses that mean nothing, reveals that fail and leave a blank band.

## Why removal is not enough

A screen with every tell removed and nothing in their place is an empty screen with good manners, and
that reads as generated too. The tells were filling a gap where a decision should have been: the
product's own data, an idea taken from the subject, real pictures or committed type.
