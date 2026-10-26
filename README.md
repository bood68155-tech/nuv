# NUV® — Digital Studio

A single-page site for **NUV**, a digital studio offering web development, e-commerce stores, software solutions and graphic design.

The layout follows an editorial studio structure: oversized typography, a sticky filter rail and a tall portfolio grid — set on NUV's light off-white, grain-textured canvas with bold near-black type and custom vector cover art. The footer closes with a black halftone wave.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Public site — hero, selected work, services, booking, contact, founder panel |
| `/#/admin` | Admin control panel (full-screen overlay) |
| `/admin/` | Small redirect page that opens the control panel |

Everything is a single static page with hash routing, so it works on GitHub Pages, Netlify, Vercel or any static host.

## Interaction notes

- **Ambient sound** — the header speaker button starts a generative Web Audio pad (no audio files). The browser only allows it after a click, and the button state reflects play/pause.
- **Booking** — the Cal.com-style widget builds a Gaza-local (Asia/Gaza) calendar, 30-minute slots inside working hours, hides Fridays and Saturdays, and hands the chosen slot to Google Calendar. There is no backend: the held slot is confirmed in the page and saved on the device, so no email is sent — connect a real scheduling service when you want automatic confirmations.

## The admin panel

Open it from the **Admin** link in the footer, or go directly to `/#/admin`.

**Projects**
- Add, edit and delete portfolio items.
- Fields: title, category (Web / Stores / Designs), image URL, description and project link.
- Images can be uploaded from your computer — they're resized to 1400px and stored as a data URL in the browser.
- Changes appear in the public grid immediately.

**Site settings**
- Brand name and browser/meta copy.
- Homepage hero: eyebrow, two headline lines, introduction, button labels, availability and location.
- Contact: headline, introduction, email, phone, location and footer note.
- Founder & booking: the "About the founder" story and the intro-call widget copy.
- Social links: Instagram, LinkedIn, X/Twitter (empty fields are hidden on the site).
- Reset demo content restores the original project list and default copy.

Edits are saved to `localStorage` (`nuv.projects.v1` and `nuv.settings.v1`). There is no server, so content is per-browser: it won't follow you to another device or browser profile. The admin route is not password-protected — it only edits the local browser storage.

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
├── css/styles.css        Design system, layout, admin styles
├── js/
│   ├── data.js           Default settings and seed projects
│   ├── store.js          localStorage persistence + CRUD
│   ├── ambient.js        Generative ambient pad (Web Audio) for the header toggle
│   ├── booking.js        Gaza-local intro-call scheduler and confirmation
│   ├── app.js            Public rendering, filters, lightbox, footer clock, founder panel
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

- `js/data.js` — default settings and the nine demo projects.
- `index.html` — the static services copy, service cards and footer.

Changes made in the admin override `js/data.js` in that browser. To ship new defaults to everyone, edit `js/data.js` (and the static copy in `index.html` for text that isn't settings-driven), then bump the storage keys in `js/store.js` or use **Reset demo content** to pick them up locally.
