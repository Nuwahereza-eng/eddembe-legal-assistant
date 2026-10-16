# UI Redesign Prompt: Make Eddembe look clean and professional

The app is working and running at http://localhost:5180/, but the interface looks rough. Your job is to redesign the frontend only so it looks like a clean, modern product in the style of Google's Material Design 3.

Read the current files in `web/src/` first. Then show me a short plan before you change anything.

## Rules

1. Frontend only. Do not change any backend code, API routes, request shapes or response shapes. Every feature that works now must still work after the redesign.
2. Follow Material Design 3 as a design system (layout, spacing, components, motion). Do not use Google or Microsoft logos, product names, or brand colors, and do not make the app look like a copy of a specific Google product. It must look like its own product: Eddembe.
3. Use MUI (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`) as the component library. Check the installed versions and follow the docs for that version. Remove any old CSS that conflicts.
4. Mobile first. Most users will open this on a cheap Android phone. It must also look good on a laptop for the demo.
5. Keep it simple. No animations libraries, no extra UI kits.

## Theme

Create `web/src/theme.ts` with one MUI theme and use it everywhere through `ThemeProvider` and `CssBaseline`.

- Primary color: deep green `#1B5E20` (trust, growth)
- Secondary color: warm amber `#F9A825` (used only for highlights and warnings)
- Error: `#B3261E`
- Background: `#F8F9FA`, surfaces (cards): `#FFFFFF`
- Text: near black `#1F1F1F`, secondary text `#5F6368`
- Font: Roboto (load from Google Fonts or `@fontsource/roboto`), fallback system sans-serif
- Base font size 16px. Body text never smaller than 14px.
- Border radius: 12px for cards, 20px (fully rounded) for buttons and chips
- Spacing based on 8px steps
- Soft elevation only (elevation 0 or 1). Prefer thin borders `#E0E0E0` over heavy shadows.

Add a dark mode only if everything else is finished.

## Layout

### Top app bar
- Left: app name "Eddembe" in medium weight, with a small balance-scale icon (`Balance` from MUI icons)
- Below the name on wider screens, a short subtitle: "Know your rights under Ugandan law"
- Right: language toggle (English / Luganda) as a compact segmented button
- White background, thin bottom border, no heavy color block

### Navigation
- On phones (below 600px): bottom navigation bar with three items: Ask (`ChatOutlined`), Scan (`DocumentScannerOutlined`), Letter (`EditNoteOutlined`)
- On tablets and laptops: a navigation rail on the left with the same three items
- The active item uses a filled pill indicator, like Material 3

### Content area
- Centered column, max width 760px, 16px side padding on phones, 24px on larger screens
- Each page starts with a clear title and one line that explains what the page does

### Footer
- Small grey text on every page: "Eddembe gives legal information, not legal advice. For serious matters, talk to a lawyer or a legal aid clinic."

## Pages

### Ask
- Large rounded text field (outlined, multiline) with the placeholder "Ask about your rights, e.g. Can my landlord evict me without notice?"
- Below the field: a round microphone button and a filled "Ask" button
- While recording: the mic button turns red with a pulsing dot and shows "Listening..."
- Three suggestion chips under the field for quick demo questions (tenant, employment, land). Clicking one fills the field.
- Answer shown in a card:
  - The answer text with comfortable line height (1.6)
  - A "Listen" text button with a speaker icon if text-to-speech exists
  - A section titled "Where this comes from" with each citation as a small outlined card: law name in bold, section number as a chip, short excerpt in grey. Make citations clearly visible; they are the most important trust feature.
  - A "What you can do next" list from `next_steps`
  - A small confidence chip (green high, amber medium, grey low)
- Keep previous questions and answers in a simple list above the field, newest at the bottom, like a chat, so the demo flows naturally.

### Scan a document
- A large dashed drop zone card with a camera icon and the text "Take a photo or upload a document". On phones, tapping it opens the camera (`accept="image/*" capture="environment"`).
- After choosing an image: show a preview thumbnail with a "Change photo" text button, and an "Explain this document" filled button.
- Results in stacked cards:
  - "What this document is": document type as a chip plus the summary
  - "Red flags": each flag as a row with a red warning icon, on a light red background (`#FCE8E6`)
  - "What is missing": each item as a row with an amber info icon
  - "Related law": same citation card style as the Ask page
  - A collapsible "Text we read from the photo" section showing the transcription

### Write a letter
- A two-step layout:
  - Step 1 form card: letter type as selectable cards with icons (Reply to landlord, Complaint to employer, Access to Information request), then fields for your name, recipient, and "What happened" (multiline)
  - Step 2 result: the letter in a paper-like card (white, thin border, serif font such as Georgia for the letter body only, generous padding)
- Buttons under the letter: "Copy" (outlined), "Download" (filled). Show a snackbar "Copied" after copying.
- If the Stellar proof feature exists: an outlined "Record proof" button. After success, show a green success card with the transaction hash shortened (first 6 and last 6 characters) and a "View on explorer" link.

## States (do all of these on every page)

- Loading: MUI `Skeleton` blocks shaped like the result cards, plus a button spinner. Show friendly text such as "Reading the law..." or "Reading your document...".
- Error: an `Alert` with plain words, e.g. "We could not reach the server. Check your connection and try again." and a "Try again" button. Never show raw error objects or stack traces.
- Empty: a simple illustration icon in light grey with one helpful line of text.
- Disabled buttons while a request is running, so users cannot submit twice.

## Accessibility

- All buttons have visible labels or `aria-label`
- Color contrast at least 4.5:1 for text
- Tap targets at least 48px tall
- Visible focus outline when using a keyboard
- Images have alt text

## File structure

```
web/src/
  theme.ts
  App.tsx              # ThemeProvider, layout, navigation
  components/
    AppTopBar.tsx
    AppNavigation.tsx  # bottom nav on mobile, rail on desktop
    Footer.tsx
    CitationCard.tsx   # used by Ask, Scan and Letter
    LoadingCard.tsx
    ErrorAlert.tsx
  pages/
    AskPage.tsx
    ScanPage.tsx
    LetterPage.tsx
```

Reuse components. Do not copy the citation card code into three places.

## When you finish

1. Run the app and test each page at 375px wide (phone) and 1280px wide (laptop).
2. Run through the demo: ask a tenant question, scan a sample notice, draft a letter. Confirm nothing broke.
3. Tell me what changed, file by file, and anything that still looks off.
