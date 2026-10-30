# NUV® — Brand, Web & 3D Studio

A single-page studio site for **NUV**, built as a light-theme, section-for-section
interpretation of the Monolog studio layout: oversized grotesk typography, mono
metadata, warm paper surfaces, a floating client-wins hero, a service list with
live testimonial and image previews, a sticky project journey, an FAQ accordion,
and a Cal.com-style intro-call scheduler that hands the booking to WhatsApp.

## Brand details

| | |
| --- | --- |
| Studio | NUV Agency |
| Founder | Abood, 20, Gaza, Al-Azhar University |
| WhatsApp | [+970 599 608 181](https://wa.me/970599608181) |
| TikTok | [@nuv059](https://tiktok.com/@nuv059) |
| Instagram | [@nuv.562](https://www.instagram.com/nuv.562/) |
| Email | bood68155@gmail.com |
| Time zone | Asia/Hebron |

All "Start a project" calls to action open WhatsApp directly. The booking modal
uses the same handoff: pick a date and time, add your details, and the confirmed
slot opens in WhatsApp pre-filled for Abood to hold.

## Page sections

| # | Section | Anchor | Notes |
| --- | --- | --- | --- |
| 1 | Hero | `#top` | Display headline, intro, booking CTA, floating result cards |
| 2 | Brands | — | Infinite name marquee |
| 3 | The gap | `#gap` | Sticky testimonial, statement, oversized "WE CLOSE THAT GAP" |
| 4 | Success stories | `#work` | Six project rows with cover, result and case-study dialog |
| 5 | Services | `#services` | Six services cascade in; hover swaps testimonial and preview image |
| 6 | Project journey | `#process` | STEP 01—03 with staggered copy reveals, rolling "see step" links and looping 16:9 work previews |
| 7 | FAQs | `#faqs` | One-at-a-time accordion + founder card |
| 8 | Closing CTA | `#contact` | "Tell us your story" + WhatsApp button |
| 9 | Footer | — | Navigation, socials, live Hebron clock, oversized wordmark |

The About modal (nav → About, footer, or founder card) carries the founder bio.
Work rows open a case-study dialog with a "Start a similar project" link.

## Technology

No build step and no dependencies. Plain HTML, CSS and ES5-era JavaScript,
self-hosted fonts, SVG artwork and a generated Web Audio ambient pad behind the
sound toggle.

```
nuv/
├── index.html              Page markup and all section content
├── admin.html              Passcode-locked portfolio manager
├── data/
│   └── projects.json       Published project list, served to the site
├── css/
│   ├── styles.css          Design tokens, nav, hero, footer, dialogs, reveals
│   ├── sections.css        Section layouts, booking widget, responsive rules
│   └── admin.css           Admin panel styling (responsive)
├── js/
│   ├── app.js              Nav, reveals, marquees, services, dialogs, cursor, clock
│   ├── firebase-config.js  Firebase web app config (empty = local-only mode)
│   ├── projects.js         Shared data layer: Firestore, localStorage, JSON
│   ├── admin.js            Passcode gate, project CRUD, Firestore writes
│   ├── booking.js          Asia/Hebron calendar, slots, WhatsApp handoff
│   └── ambient.js          Generative ambient sound for the sound toggle
├── assets/
│   ├── hero-studio.svg     Wide hero artwork
│   ├── logo-mark.png       NUV hat mark (nav, favicon, modals)
│   ├── fonts/              Archivo, Inter Tight, JetBrains Mono
│   ├── process/            Three looping 720p step previews (.mp4) + posters
│   └── works/              Nine SVG project covers
└── README.md
```

## Run locally

```bash
python -m http.server 8080
```

Open <http://localhost:8080>. Opening `index.html` directly also works.

## Editing content

### Admin panel (projects, case studies, showcases)

Open **`admin.html`**. On first visit you choose a passcode (stored as a hash in
that browser), then you can add, edit, reorder and delete work rows without
touching HTML: title, tag line, cover image, card summary, case-study text and
the result figure.

With **Firebase Firestore** configured (below), every save writes straight to
the `projects` collection and the site picks it up in real time — visitors see
changes within a second, with no export or commit.

Without Firebase, resolution order for the success-stories list is:

1. `localStorage` override — edits made in `admin.html` on this browser
2. `data/projects.json` — the committed, published list
3. The defaults inside `js/projects.js`

In that fallback mode, publish by pressing **Download data/projects.json**,
replacing `data/projects.json` and committing it, then **Discard local edits**
so the published file takes over. **Import JSON** does the reverse.

### Firebase (live sync, free Spark plan)

1. [Firebase console](https://console.firebase.google.com) → Add project →
   **Register a Web app** → copy the generated config object.
2. Paste it into **`js/firebase-config.js`** and commit. The SDK (v12.4.0 from
   `gstatic.com`) is loaded on demand from the CDN — no build step, no npm.
3. In Firestore, publish rules that let anyone read and this panel write:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /projects/{projectId} {
         allow read: if true;
         allow write: if true;  // demo lock — add Firebase Auth to restrict
       }
     }
   }
   ```

Leaving the config empty keeps everything exactly as before: no network calls,
and the site falls back to local data / `data/projects.json` whenever Firebase
is unconfigured, offline or unreachable.

### Everything else

Copy, services, testimonials and FAQ answers live directly in `index.html`.
Service testimonials and preview images live in the `SERVICES` array at the top
of `js/app.js`.

## Notes

- The projects, results, testimonials and brand names are **demo content**.
  Replace them with real work before treating the site as a portfolio.
- The admin panel is locked with a browser-local passcode: it keeps the panel
  out of casual reach, but it is not server-side authentication. Real access
  control would need a backend — and the open Firestore `write` rule above is
  the same trade-off: add Firebase Auth before treating it as a hard gate.
- The booking widget is client-side only: no confirmation email is sent. The
  requested slot is deliberately routed to WhatsApp so Abood can confirm it.
- Ambient sound is generated in the browser on first click; it respects the
  browser's autoplay policy and `prefers-reduced-motion`.
