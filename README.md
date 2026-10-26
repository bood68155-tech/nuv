# NUV® — Digital Studio

A single-page site for **NUV**, a digital studio offering web development, e-commerce stores, software solutions and graphic design.

The layout follows the studio/editorial structure of the reference site: a fixed header with a dark badge call to action, an oversized hero statement, a client-wins rotator, a scrolling ambition marquee, a brand marquee, a "we close that gap" statement, a horizontal success-story rail, a testimonial slider, a service list, a three-step process, an FAQ accordion, a filterable work list, a Cal.com-style booking widget and a footer that ends in a halftone wave.

## Page sections

| # | Section | Anchor | Notes |
| --- | --- | --- | --- |
| 1 | Hero | `#top` | Availability, headline, introduction, CTAs, scroll cue |
| 2 | Client wins | `#wins` | Rotates one statement per project that has a result |
| 3 | Ambition marquee | — | Infinite scrolling statement |
| 4 | Brands we've helped | `#brands` | Marquee built from project titles |
| 5 | The gap | `#gap` | Statement and supporting copy |
| 6 | Success stories | `#stories` | Horizontal rail of project cards with results |
| 7 | Testimonials | `#quotes` | Three-quote slider with counter |
| 8 | Services | `#services` | Six-row interactive service list |
| 9 | Process | `#process` | Three numbered steps |
| 10 | FAQs | `#faqs` | Accordion, one answer open at a time |
| 11 | Work | `#work` | Filterable list with a cursor image preview |
| 12 | Booking | `#book` | Intro-call scheduler |
| 13 | Closing CTA | `#contact` | Headline, email, links, closing quote |
| 14 | Footer | — | Socials, Gaza clock, icon dock, halftone wave |

## Pages

| Route | What it is |
| --- | --- |
| `/` | Public site |
| `/#/admin` | Admin control panel (full-screen overlay) |
| `/admin/` | Small redirect page that opens the control panel |

Everything is a single static page with hash routing, so it works on GitHub Pages, Netlify, Vercel or any static host.

## The admin panel

Open it from the **Admin** link in the footer, or go directly to `/#/admin`.

**Projects**
- Add, edit and delete portfolio items.
- Fields: title, category (Web / Stores / Designs), year, image, description, project link, **result** (for example `+21%`), result note and service tags (comma separated).
- The result feeds the client-wins rotator, the success-story rail, the work list and the project lightbox.
- Images can be uploaded from your computer — they're resized to 1400px and stored as a data URL in the browser.
- Changes appear across every section immediately.

**Site settings**
- Brand name, browser title and meta description.
- Homepage hero: eyebrow, availability, two headline lines, introduction, primary, secondary and header button labels.
- The gap statement.
- Contact: closing headline, introduction, email, phone, location, footer note and the closing quote.
- Testimonials: three quotes with a name, role and optional note.
- Founder story and the booking widget (meeting name, duration, location, description).
- Social links: Instagram, LinkedIn, X/Twitter (empty fields are hidden on the site).
- Reset demo content restores the original project list and default copy.

Edits are saved to `localStorage` (`nuv.projects.v1` and `nuv.settings.v1`). There is no server, so content is per-browser: it won't follow you to another device or browser profile. The admin route is not password-protected — it only edits the local browser storage.

## Before you publish

The shipped content is **demo content**. Replace it before going live:

- The nine projects, their descriptions, results (`+21%`, `3.1×`…) and result notes are invented.
- The three testimonials and their attributions are invented.
- The FAQ answers, including the price range, and the process copy are placeholders.

The services, process and FAQ copy lives in `index.html`; the projects and testimonials live in `js/data.js` and can also be edited in the admin panel.

## Run locally

No build step or dependencies.

```bash
# from this folder
python -m http.server 8080
```

Then open <http://localhost:8080>. Opening `index.html` directly also works in most browsers, but a local server is recommended so `localStorage` has a stable origin.

## Deploy

### GitHub Pages
1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. Save. The site publishes at `https://<user>.github.io/nuv/`.

The admin lives at `https://<user>.github.io/nuv/#/admin`.

## Project structure

```
nuv/
├── index.html            Public site + admin overlay markup
├── admin/index.html      /admin redirect
├── css/
│   ├── styles.css        Design system, layout, admin, modals
│   └── sections.css      The section set (drawer, marquees, rails, sliders, FAQ, work list)
├── js/
│   ├── data.js           Default settings and seed projects
│   ├── store.js          localStorage persistence + CRUD
│   ├── ambient.js        Generated ambient pad for the sound toggle
│   ├── sections.js       Drawer, marquees, rotator, sliders, FAQ accordion
│   ├── booking.js        Cal.com-style intro-call scheduler
│   ├── app.js            Public rendering, work list, filters, lightbox
│   └── admin.js          Admin routing, CRUD forms, settings
├── assets/
│   ├── logo.jpg          Original brand artwork
│   ├── logo-mark.png     Cropped logo tile used in the UI/favicon
│   ├── fonts/            Self-hosted Archivo, Inter Tight, JetBrains Mono
│   └── works/            Nine custom SVG portfolio covers
└── README.md
```

## Editing the starting content

Two places define the site's initial content:

- `js/data.js` — default settings, testimonials and the nine demo projects.
- `index.html` — the services, process, FAQ and footer copy.

Changes made in the admin override `js/data.js` in that browser. To ship new defaults to everyone, edit `js/data.js` (and the static copy in `index.html` for text that isn't settings-driven), then bump the storage keys in `js/store.js` or use **Reset demo content** to pick them up locally.

## Notes on the ambient sound

The sound toggle plays a generative ambient pad built with the Web Audio API — four slowly detuning voices through a warm low-pass filter, with a quiet bed of filtered noise. There is no audio file and no network request, and the context is created on the first click so it never fights the browser's autoplay policy. To use a licensed track instead, replace `js/ambient.js` with an `<audio>` element behind the same `#soundToggle` button.

## Notes on the booking widget

The widget is entirely client-side. It computes real Gaza instants (DST-correct) for every slot, blocks Fridays and Saturdays, keeps a one-hour lead time, and hands the confirmed slot to Google Calendar. No confirmation email is sent, because there is no server — the held slot only lives in the page.
