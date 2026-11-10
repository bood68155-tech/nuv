# NUV Dental — General & Cosmetic Dentistry, Edmonton

A single-page clinic site for **NUV Dental**, built as a light-theme,
section-for-section interpretation of the General Dental layout: oversized
grotesk typography, mono metadata, warm paper surfaces, a floating hero with
patient proof, a treatment grid with detail dialogs, a patient-voice carousel,
a visit walkthrough, an FAQ accordion, a full contact section with a working
inline form, and a Cal.com-style appointment scheduler.

## Brand details

| | |
| --- | --- |
| Clinic | NUV Dental |
| Address | 8137 97th Street NW, Edmonton, AB T6C 0Z9 |
| Phone | [(780) 213-9618](tel:+17802139618) |
| Email | info@nuvdental.ca |
| Instagram | [@nuvdental](https://www.instagram.com/nuvdental) |
| Hours | Mon 10am–6pm · Tue–Thu 8am–4pm · Fri–Sun closed |
| Time zone | America/Edmonton |

Every "Book online" button — nav, hero, contact strip, FAQ card, about dialog
and treatment dialog — opens the appointment scheduler. The scheduler shows a
month calendar limited to clinic days and 60-minute new-patient slots, then a
details step and a confirmation screen.

The contact form validates client-side and shows the reference site's
"Thank you! Your submission has been received!" state. This is a static
deployment with no form endpoint, so submissions are confirmed in the browser
only; wire `js/contact.js` to an endpoint to deliver them.

## Page sections

| # | Section | Anchor | Notes |
| --- | --- | --- | --- |
| 1 | Hero | `#top` | Display headline, intro, book-online CTA, floating proof cards |
| 2 | Treatments | — | Infinite treatment marquee |
| 3 | Why NUV | `#why` | Sticky patient quote, statement, oversized "WE TAKE OUR TIME" |
| 4 | Treatments | `#treatments` | Featured new-patient exam, six treatment rows with cover, duration and detail dialog |
| 5 | Patient voices | `#voices` | Three patient testimonials with prev/next controls |
| 6 | Your visit | `#process` | STEP 01—03 with staggered copy reveals, rolling "see what to expect" links and 16:9 stills |
| 7 | FAQs | `#faqs` | One-at-a-time accordion + clinic card |
| 8 | Contact | `#contact` | Inline form with success state, clinic details card, hours, parking, book-online strip |
| 9 | Footer | — | Navigation, phone, email, live Edmonton clock, oversized wordmark |

The About modal (nav → About, footer, or clinic card) carries the clinic story.
Treatment rows open a detail dialog with a "Book this visit" button.

## Technology

No build step and no dependencies. Plain HTML, CSS and ES5-era JavaScript,
self-hosted fonts, SVG artwork and a generated Web Audio ambient pad behind the
sound toggle.

```
nuv/
├── index.html              Page markup and all section content
├── admin.html              Passcode-locked portfolio manager
├── data/
│   └── projects.json       Treatment list used by the admin panel
├── css/
│   ├── styles.css          Design tokens, nav, hero, footer, dialogs, reveals
│   ├── sections.css        Section layouts, booking widget, responsive rules
│   └── admin.css           Admin panel styling (responsive)
├── js/
│   ├── app.js              Nav, reveals, marquees, dialogs, cursor, clock
│   ├── contact.js          Contact form validation and success state
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
