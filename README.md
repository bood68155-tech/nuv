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
| Email | hello@nuv.agency |
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
| 6 | Project journey | `#process` | STEP 01—03 with staggered copy reveals, rolling "see step" links and sticky side previews |
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
├── css/
│   ├── styles.css          Design tokens, nav, hero, footer, dialogs, reveals
│   └── sections.css        Section layouts, booking widget, responsive rules
├── js/
│   ├── app.js              Nav, reveals, marquees, services, dialogs, cursor, clock
│   ├── booking.js          Asia/Hebron calendar, slots, WhatsApp handoff
│   └── ambient.js          Generative ambient sound for the sound toggle
├── assets/
│   ├── hero-studio.svg     Wide hero artwork
│   ├── logo-mark.png       NUV hat mark (nav, favicon, modals)
│   ├── fonts/              Archivo, Inter Tight, JetBrains Mono
│   └── works/              Nine SVG project covers
└── README.md
```

## Run locally

```bash
python -m http.server 8080
```

Open <http://localhost:8080>. Opening `index.html` directly also works.

## Editing content

Copy, projects, services, testimonials and FAQ answers live directly in
`index.html`. Project modal details are carried by `data-project-*` attributes on
each `.work-media` button. Service testimonials and preview images live in the
`SERVICES` array at the top of `js/app.js`.

## Notes

- The projects, results, testimonials and brand names are **demo content**.
  Replace them with real work before treating the site as a portfolio.
- The booking widget is client-side only: no confirmation email is sent. The
  requested slot is deliberately routed to WhatsApp so Abood can confirm it.
- Ambient sound is generated in the browser on first click; it respects the
  browser's autoplay policy and `prefers-reduced-motion`.
