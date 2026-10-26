/*
 * NUV — default content.
 * Everything in this file can be edited from the admin panel (/admin).
 * The admin writes to localStorage; this file is only the starting point.
 *
 * The projects, their results and the three testimonials are demo content:
 * replace them with real work and real client words before publishing.
 */
window.NUV_DEFAULTS = {
  settings: {
    brandName: "NUV",
    siteTitle: "NUV® — Digital Design & Development Studio",
    metaDescription:
      "NUV is an independent digital studio building websites, e-commerce stores, custom software and brand identities for ambitious teams.",

    heroKicker: "Digital partner for ambitious brands",
    heroLine1: "Your ideas have",
    heroLine2: "outgrown your site.",
    heroIntro:
      "NUV is a design and development studio building sharp websites, high-converting stores, custom software and identities for brands that want to be remembered.",
    heroPrimaryLabel: "Schedule an intro call",
    heroSecondaryLabel: "See the work",
    navCtaLabel: "Start a project",
    availability: "Available for new projects",
    location: "Gaza · working worldwide",

    gapText:
      "Your website is where ideal customers decide whether you are worth their time. We take what makes you irreplaceable, shape the whole experience around it, and make sure people feel it before they read another word.",

    contactHeading: "Ready to build",
    contactHeadingAccent: "an experience that moves people?",
    contactText:
      "Tell us what you are building. We reply within two working days with next steps, a rough timeline and an honest take on how we can help.",
    email: "hello@nuv.agency",
    phone: "",

    ctaQuote: "A passionate team who listens deeply, collaborates openly, and always delivers with care.",
    ctaQuoteAuthor: "Meridian Arquitectos",

    quote1:
      "A passionate team who listens deeply, collaborates openly, and always delivers with care. They treated our practice like it was their own.",
    quote1Name: "Hana Radwan",
    quote1Role: "Director, Meridian Arquitectos",
    quote1Note: "Working with us since 2024",
    quote2:
      "They found the sharpest version of our story and built a site that finally matches it. The quality of enquiries changed within weeks, not months.",
    quote2Name: "Tomas Meyer",
    quote2Role: "Founder, Northwind Supply",
    quote2Note: "Outdoor goods, est. 2019",
    quote3:
      "Genuinely the calmest project we have run. Decisions were quick because the thinking had already been done properly.",
    quote3Name: "Layla Farouk",
    quote3Role: "Creative Director, Forme Studio",
    quote3Note: "Furniture and objects",

    instagram: "https://www.instagram.com/nuv.562/",
    linkedin: "",
    x: "",

    footerNote: "NUV is an independent digital studio building digital things that matter.",

    aboutText:
      "Hey, I'm Abood. I'm a 20-year-old founder based in Gaza, studying Accounting at Al-Azhar University. I founded NUV to bridge the gap between ambitious ideas and world-class digital experiences. At NUV, we build sharp websites, high-converting e-commerce stores, custom software, and memorable brand identities.",

    bookingTitle: "Intro call w/ Abood @ NUV",
    bookingDuration: "30m",
    bookingLocation: "Google Meet",
    bookingText:
      "A relaxed, honest half hour: what you are building, where it is stuck, and whether NUV is the right studio for it. No sales script — you will leave with a clear next step either way."
  },

  projects: [
    {
      id: "meridian",
      title: "Meridian Arquitectos",
      category: "web",
      description:
        "A digital home for a Lisbon architecture practice — restrained typography, immersive project galleries and a CMS the studio actually enjoys using.",
      image: "assets/works/meridian.svg",
      link: "",
      year: 2026,
      result: "+21%",
      resultNote: "More enquiries converted into signed projects",
      tags: ["Website Strategy", "Website Design", "Website Development"],
      createdAt: "2026-02-12T10:00:00.000Z"
    },
    {
      id: "northwind",
      title: "Northwind Supply",
      category: "stores",
      description:
        "An outdoor goods storefront built for speed and storytelling, with a mobile checkout that converts and a field-notes journal that keeps people coming back.",
      image: "assets/works/northwind.svg",
      link: "",
      year: 2025,
      result: "3.1×",
      resultNote: "Return on ad spend in the first quarter",
      tags: ["E-commerce", "Website Design", "Website Development"],
      createdAt: "2025-11-03T10:00:00.000Z"
    },
    {
      id: "forma",
      title: "Forme Studio",
      category: "designs",
      description:
        "A complete identity for a furniture studio — wordmark, art direction, print system and a brand manual that holds the whole language together.",
      image: "assets/works/forma.svg",
      link: "",
      year: 2024,
      result: "$180K",
      resultNote: "In new work within 30 days of launch",
      tags: ["Brand Strategy", "Visual Identity", "Art Direction"],
      createdAt: "2024-09-18T10:00:00.000Z"
    },
    {
      id: "atlas",
      title: "Atlas Pay",
      category: "web",
      description:
        "Product design and front-end for a payments dashboard that turns complex transactions into a calm, legible experience for finance teams.",
      image: "assets/works/atlas.svg",
      link: "",
      year: 2026,
      result: "−42%",
      resultNote: "Time spent reconciling transactions each month",
      tags: ["Product Design", "Website Development", "Design System"],
      createdAt: "2026-01-24T10:00:00.000Z"
    },
    {
      id: "vera",
      title: "Véra Skin",
      category: "stores",
      description:
        "A botanical skincare brand's first online store — editorial product pages, subscriptions and a warm, tactile identity that feels as considered as the formulas.",
      image: "assets/works/vera.svg",
      link: "",
      year: 2024,
      result: "+64%",
      resultNote: "Repeat purchase rate after the redesign",
      tags: ["E-commerce", "Visual Identity", "Subscriptions"],
      createdAt: "2024-06-07T10:00:00.000Z"
    },
    {
      id: "alma",
      title: "Alma Journal",
      category: "designs",
      description:
        "Editorial identity and art direction for an independent design journal, printed quarterly — a quiet system built to let photography and long-form writing breathe.",
      image: "assets/works/alma.svg",
      link: "",
      year: 2026,
      result: "12K",
      resultNote: "Paying subscribers in the first six months",
      tags: ["Visual Identity", "Art Direction", "Editorial"],
      createdAt: "2026-03-02T10:00:00.000Z"
    },
    {
      id: "cobalt",
      title: "Cobalt Labs",
      category: "web",
      description:
        "Marketing site and design system for a developer-tools startup shipping infrastructure at the edge — bold type, fast pages and docs that feel like part of the brand.",
      image: "assets/works/cobalt.svg",
      link: "",
      year: 2025,
      result: "+90%",
      resultNote: "Engagement on product case studies",
      tags: ["Website Strategy", "Website Design", "Website Development"],
      createdAt: "2025-08-21T10:00:00.000Z"
    },
    {
      id: "kova",
      title: "Kova Coffee",
      category: "stores",
      description:
        "A subscription coffee store with a bold packaging system, a one-screen checkout and a roast calendar that made the monthly drop feel like an event.",
      image: "assets/works/kova.svg",
      link: "",
      year: 2025,
      result: "+38%",
      resultNote: "Subscription retention after the rebrand",
      tags: ["E-commerce", "Packaging", "Brand Strategy"],
      createdAt: "2025-05-14T10:00:00.000Z"
    },
    {
      id: "helios",
      title: "Helios Energy",
      category: "designs",
      description:
        "Brand identity for a solar startup — a luminous mark, a motion language and an investor deck designed to make clean energy feel inevitable.",
      image: "assets/works/helios.svg",
      link: "",
      year: 2025,
      result: "$2M+",
      resultNote: "Seed round closed on the new narrative",
      tags: ["Brand Strategy", "Visual Identity", "Motion"],
      createdAt: "2025-02-09T10:00:00.000Z"
    }
  ]
};
