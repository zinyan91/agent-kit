# Public pages

Landing pages, product and marketing sites, portfolios, events, restaurants, one-pagers: pages that are
read and scrolled. App screens follow `app-screens.md` instead.

A page that loses its labels, rules and cards and gains nothing in their place reads as thin, and
people rightly prefer a richer page with a few tells over an empty page without them. The other half
of the job is substance: type set larger, whole fields of colour, real pictures of this subject's
world, and every section carrying its full content.

## The run

Do these in order. Steps 1–4 decide whether the page is any good.

### 1. Read the brief and the project

Find out what is real: the subject, the audience, the one thing the page must get someone to do, the
stack, any existing brand (colours, fonts, logo), and what imagery truly exists (the project's own
photographs, a real interface that can be shown, an image tool you can call, or nothing). Do not plan
around pictures you do not have.

If the request is vague, decide and state your reading in one line instead of asking. Ask only when a
missing fact blocks the work (no product name).

**Inventory the subject** in your notes: eight to twelve things that belong to this client and no
competitor. Its name and what the name means; its address, street and neighbourhood and what that
place looks like; the numbers in the brief (seats, rooms, minutes, the price, the year); the
constraint it lives with (one batch a month, closed in winter, by appointment); its materials and
colours; its rituals and hours; the printed things of its world (a timetable, a label, a ticket).
This list is where the idea comes from.

### 2. Write the argument

List the page as claims with their proof, one line per section. The claims decide which sections exist
and in what order. Delete any section with no claim. This is how you avoid the stock sequence of hero,
logos, three features, testimonial, pricing, call to action.

### 3. Choose a direction

Write a compact design plan before code:

- **Colour**: one ground, one ink, one accent, as 4–6 named hex values, taken from the subject's own
  materials and place where it has unmistakable colours.
- **Type**: one family, or two clearly different ones, with roles. Not the face you would reach for on
  any project.
- **Layout**: a one-sentence concept per section, with ASCII wireframes to compare options; alignment
  (left by default, one centred moment at most).
- **Principles**: what makes this page belong to this subject.

Then review the plan against the brief: if any part reads like the default you would produce for any
similar page, revise it and say what changed. Where the repo or brand fixes colours or faces, keep them
and take only composition from your plan.

### 4. Find the idea

Write this sentence and do not build until both blanks are filled from the subject:

> On this page, **[something that belongs to the subject]** becomes **[the device the layout uses]**.

Places to look for the first blank: its output (put the real output on the page), its object or shape
(enlarge it, crop it, make it the frame), its name (letters that hold a picture or split to two
corners), its place (the one view that makes someone want to be there), its ritual (a sequence the
page performs as it scrolls), its artefact (a ticket, menu, label, receipt that already exists in its
world).

**The competitor test:** put the nearest real competitor in the sentence. If it still works, the idea
belongs to the category. "Clean and modern" is not an idea.

**One live thing.** Give the page one thing the visitor can do, made from the idea: pick a wood and see
the chair in it; set the loan and read the real monthly figure; choose a size and see it against the
room. It uses real content, works with a thumb on a phone, has a plain fallback without script, never
blocks reading, and is one thing, not a playground.

### 5. Write the words

Write the whole page as plain text before markup.

- **Every headline fits in two lines or fewer at every width.** About 32 characters is safe at a
  confident size; the strongest gallery heroes have a median of five words. Cut words first, widen the
  measure second, shrink the size last.
- **One supporting sentence** directly under the headline (32–48px below it), when the repo allows it,
  shown with it, never held back by an animation. When the headline is a name or a figure of speech, this sentence says plainly
  what the thing is.
- **One primary action**, named for what it does ("Book a table", not "Get started"), as a real button
  on the first screen.
- **The first screen answers the visitor's first question in large type**: for an event, what, when and
  where; for a product, what it is and what it costs or does; for a person, who and what they do.
- **Write the full content.** The whole menu with prices, each room with its details, every speaker,
  the price with what it includes, an answer for each real question. Thin sections are the commonest
  reason a clean page loses.
- **Statements are paragraphs.** A large intro sentence or quotation stays at 36px or less on desktop
  (24px on a phone) and about 25 words; larger than that it is a headline and the two-line rule
  applies.
- Sample details are fine where the brief leaves gaps; list them for the client. Proof is never
  invented: no customers, quotes, reviews, press, logos or business statistics.
- Run the copy through the `writing` skill.

### 6. Build it, still

Build with motion switched off in your head; a page that needs animation to look finished is not
finished.

1. **Tokens.** Colour and type roles as CSS custom properties; everything references tokens.
2. **The hero**, at desktop and phone width. The big thing big and the small things small before
   anything else exists. When the project has footage or a real picture of its product or process, the
   first screen shows it large (about 40% of the screen or more).
3. **Each section** from its line in the argument. Neighbouring sections never share a layout. Carry
   the idea into every section, pricing, FAQ and footer included: the commonest failure is a
   distinctive first screen followed by stock blocks.
4. **Imagery**, in this order: the project's own; generated, if you have an image tool; drawn in code
   from the subject itself (its objects, tiles, windows, its product's interface) in one consistent
   flat language in the palette's colours; type and colour alone. A found picture shows the world
   around the client and is never presented as the client's own product, room or team. Never a
   placeholder box, an icon or an abstract shape where a picture belongs.
5. **The live thing**, in the section where it proves the claim.
6. **Fullness.** Look at each desktop screen as a poster: one dominant thing and the content it
   carries. One deliberate rest per page at most. Running text in full ink at 16px or more.
7. **The frame.** One pair of equal outer margins at every width. When a section's text sits in the
   left half, the right half holds its picture, a second column, a list or a figure, never nothing.
   No stretch taller than about half a screen holds nothing. The first screen carries the title in an
   `h1`; every section opens with a heading that names it.
8. **States and semantics.** Real links and buttons, visible focus, alt text, a phone layout that is
   its own composition.

### 7. Measure and look

Run the linter and inspector (SKILL.md §5), fix every FAIL, then open every screenshot at every width.
Ask: can a stranger reading the first screen for five seconds say what this is and what to do? Is
there one dominant thing per screen? Do the margins match on both sides? Is any section thin, empty or
stock? Fix the three worst problems, measure again, look again. Three rounds at most.

### 8. Motion, last and small

Motion is optional on a public page and never a quota. When the page has it:

- One signature move, done well, tied to the idea (a picture that opens to the full screen, the
  ritual performed on scroll). Not a fade-up on every block.
- Entrances, if any, trigger once, rise 16–32px with opacity, stagger 60–90ms, and never leave content
  hidden if the script fails.
- Feedback on every control: press, hover, focus.
- Transform and opacity only. Every move has a `prefers-reduced-motion` fallback that keeps the
  content and drops the travel.

## Laws of the craft

**Type**
- Two or three sizes do the visible work: one very large, one small, little in between. Five sizes is
  the ceiling.
- Display type: tracking -0.02 to -0.05em, leading 0.85–1.05. Text: 16–20px, leading 1.45–1.6, 45–75
  characters per line (serif text may run a little longer with a little more leading).
- One family is normal; two is the limit.
- Left-aligned by default. Centre one moment at most.

**Space**
- One grid, one pair of tight margins (16–32px), used everywhere; large things may run to the edges.
  Text blocks share two or three left edges on the whole page.
- Asymmetry inside the grid, never in the frame.
- The gap between sections (120–240px on desktop) is clearly larger than any gap inside one.

**Colour**
- One ground, one ink, one accent. The accent is on the action and perhaps one other thing.
- Surfaces are separated by a small step in tone, not by a line or a shadow.
- A section may change the whole field colour. Nothing fades into anything.

**Imagery**
- One dominant image beats six small ones.
- Same crop ratios and treatment throughout; square corners unless the direction says otherwise.
- Nothing ever lies on top of a headline or a statement.

**Components**
- Buttons: flat, one fill colour, square-cornered or fully round, decided once. The 9–16px "soft"
  radius is the weak default.
- Navigation: wordmark, three to five plain links, one action. No bar chrome, no floating pill.
- The footer is a designed close, not a sitemap.

## Special cases

**Existing brand or design system.** Keep its colours, faces and assets; take only composition from
your plan. If the brand requires a banned device (its logo sits in a gradient, its accent is violet),
keep it, say so in the report, and `--allow` that rule.

**Redesign or review of an existing page.**
1. Inspect the page as it is into its own folder (`--out .tmp/ui-design/before`) and lint its source.
   Read the code: framework, styling method, components, and what must survive (routes, forms, data,
   behaviour, brand assets).
2. A review stops here: list findings with the inspector's measurements and the three changes that
   would move the page most.
3. Keep the stack, the content and what works. No framework or styling migration.
4. Order of work, biggest effect for least risk: type, colour, the frame, states, then stock components.
5. Inspect again into `.tmp/ui-design/after`, compare every width, click through everything that
   worked before, and report before and after side by side.

**No checkout or form backend.** The primary button goes to the real destination when there is one;
otherwise a `mailto:` with a written subject and body. Never fake a payment form.
