# Aubingo @Kambafarm — website mockup

Static HTML / CSS / JS website rebuilt from the Stitch export
`stitch_stitch_prompt_workflow (3).zip` (`code.html`). Layouts, text, images,
colours and buttons are the same as the Stitch design. Only the structure changed:
the single page with hidden "views" is now 14 real pages that scroll normally.

## Open it

Double-click `index.html`, or serve the folder (recommended, so the basket is
shared across pages the same way it will be online):

```powershell
python -m http.server 5511 --directory "C:\Users\Asus\Desktop\Kamba Farm\website"
```

then open http://localhost:5511

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home (hero, this week's harvest, two ways to visit, discover, news) |
| `shop.html` | Aubingo Shop — `?cat=harvest`, `?cat=kitchen`, `?cat=seeds` open a filtered view |
| `product-turmeric.html` | Product detail (pack size, quantity, gallery, A4 sheet modal) |
| `basket.html` | Basket with totals, ₹500 minimum, delivery fee, WhatsApp order |
| `saturday-farm-tour.html` | Saturday tour with ticket calculator and booking form |
| `kambafarm-weekend.html` | Two-night stay with room choice and request form |
| `special-enquiries.html` | Goat milk / ducks / bulk seed enquiry form |
| `practical-information.html` | Directions, delivery, safety, FAQ, policies tabs (`#tab-policies` etc. open a tab) |
| `our-story.html`, `the-farm.html`, `our-team.html`, `our-animals.html`, `how-we-farm.html` | Discover pages |
| `product-knowledge-sheets.html` | Product knowledge sheets (A4 sheet modal) |
| `farm-stories.html`, `story-*.html` | Farm stories blog (topic filter) and 6 story pages |
| `login.html` | Demo log in / sign up (`#signup` opens the sign-up tab, `?next=basket.html` returns there after login) |
| `profile.html` | Visitor profile: contact, delivery address, preferences, log out (needs login) |

**Demo login:** accounts, the login session and the profile are stored in the browser
(`localStorage`), passwords are hashed — fine for the mockup, but the live site needs a real
login (e.g. the shop platform's customer accounts). "Pay Online" asks for login; "Send Order on
WhatsApp" does not, and opens a chat with the full order summary. The WhatsApp number is set to
the **test number 917990039450** (`WHATSAPP_NUMBER` in `assets/js/main.js` and the `wa.me` links in the
pages) — replace it with the farm's number before launch.

## Files

```
website/
├── *.html                      14 pages (header + footer repeated in each)
├── assets/css/tailwind.css     compiled Tailwind (no CDN script needed)
├── assets/css/style.css        small site-wide additions (focus ring, skip link, details markers)
├── assets/css/src/tailwind.input.css
├── assets/js/main.js           all interactions (basket, filters, forms, tabs, mobile menu)
└── tailwind.config.js          design tokens copied 1:1 from the Stitch export
```

## What was fixed compared to the Stitch `code.html`

- All sections were stacked in one file and switched with JavaScript, so the browser
  could not scroll between "pages", go back, or open a link in a new tab. Every
  section is now its own page with real links.
- The scrollbar was hidden (`::-webkit-scrollbar { display: none }`) and scrolling
  was locked by forced `overflow` / `overscroll-behavior` rules — removed.
- A 96px empty band under the sticky header (`main` had `pt-24`) — removed.
- `<meta charset>` sat inside `<body>`, so "·" and "₹" could show as `Â·` — now first in `<head>`.
- Stitch saved some pages mid-click: shop filtered to "Kambafarm" with products hidden,
  product page at quantity 4 / ₹960, practical-info tab button and panel out of sync.
  All now open in their normal starting state.
- No menu existed below 1280px — added a mobile / tablet menu (same colours and type).
- Basket is kept in `localStorage`, so it survives page changes and starts empty
  (the export had 11 turmeric jars pre-filled).

## Responsive and motion

- Tested on every page at 320, 375, 414, 768, 1024, 1280 and 1440px with no sideways scrolling.
- Phones use the design system's mobile type sizes (h1 32px, hero 34px, h2 24px).
- Full desktop menu from 1280px, hamburger menu below. Footer runs 1 → 2 → 3 → 6 columns.
- The WhatsApp button shows only its icon on small phones so it doesn't cover content.
- Small text links get a larger invisible tap area on touch screens.
- Motion (all in `assets/css/style.css` + section 13 of `main.js`):
  - smooth anchor scrolling that stops below the sticky header
  - soft fade between pages (Chrome, Edge, Safari 18+)
  - header shadow once you scroll
  - dropdowns, mobile menu, accordions, modal and toast open smoothly
  - sections and cards fade up as they scroll in, cards lift slightly on hover
- Visitors who turn on "reduce motion" in their system settings get no animation.

## Header

- The header is the same in all 14 pages. Right after `</header>` each page has a small inline
  script (source: `assets/js/header-boot.js`) that runs before the first paint and shows the saved
  language, the basket count and the active menu item, so nothing jumps on load.
- Language switcher (EN / हिं / मरा) remembers the choice (`localStorage`, key `kambafarm.lang`)
  and sets `<html lang>`. The page text is still English until Hindi / Marathi copy is added.
- Icons are fixed 1em squares and the logo has width/height set, so the menu doesn't shift while
  fonts and the logo image load. Transitions are switched off until the page has painted (`kf-preload`).

## Editing

- Text / images: edit the page's `.html` file. The header and footer are repeated in every
  page, so a change there has to be made in all 14 files (search and replace works).
- If you add new Tailwind classes, rebuild the CSS:

```powershell
npx tailwindcss@3.4.17 -c tailwind.config.js -i assets/css/src/tailwind.input.css -o assets/css/tailwind.css --minify
```

- Images are still loaded from Stitch's Google CDN links (`lh3.googleusercontent.com`).
  Download them into `assets/img/` before going live, as those links can expire.
- WhatsApp links use the placeholder `https://wa.me/` and `+91 98230 00000` from the
  design — replace with the real number (`WHATSAPP_NUMBER` in `assets/js/main.js` too).
