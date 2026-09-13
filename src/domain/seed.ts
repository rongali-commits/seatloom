import type {
  DemoState,
  Instructor,
  Session,
  Workshop,
  WorkshopCategory,
} from "./types";

export const instructors: Instructor[] = [
  {
    id: "ins-1",
    name: "Mara Voss",
    bio: "Fictional demo instructor. Mara guides beginners through centering, shaping and finishing clay with a calm, practical approach.",
    photoUrl: "",
  },
  {
    id: "ins-2",
    name: "Idris Kalem",
    bio: "Fictional demo instructor. Idris explores light, patience, composition and considerate street photography.",
    photoUrl: "",
  },
  {
    id: "ins-3",
    name: "Jun Tanaka",
    bio: "Fictional demo instructor. Jun introduces accessible printmaking tools and the pleasure of making a small edition.",
    photoUrl: "",
  },
];

export const workshops: Workshop[] = [
  {
    id: "ws-1",
    slug: "pottery-wheel-basics",
    title: "Pottery Wheel Basics",
    category: "pottery",
    instructorId: "ins-1",
    shortDescription:
      "A hands-on introduction to throwing on the wheel. No experience needed.",
    longDescription:
      "Spend a full day learning to centre clay, pull walls, and trim your first bowls. We start with a short demonstration, then you work at your own wheel with individual guidance. You leave with two to four finished pieces, which we fire and ship to you within three weeks.",
    learningOutcomes: [
      "Centre clay on the wheel consistently",
      "Pull even walls to a controlled height",
      "Trim and finish a foot",
      "Understand basic firing and glazing options",
    ],
    materials: [
      "All clay, glazes, and firing included",
      "Apron provided (wear clothes that can get muddy)",
      "Bring a towel and a small notebook",
    ],
    prerequisites:
      "No prior experience needed. Suitable for complete beginners.",
    accessibility:
      "Ground-floor studio with step-free access. Wheel stools can be swapped for a standing frame on request. Please contact us at least 48 hours before the session to discuss any access needs.",
    cancellationPolicy:
      "This is a free demonstration. Cancel or reschedule before the session begins. No payment or refund is processed.",
    durationMinutes: 360,
    price: 0,
    coverImage: "/assets/pottery-hero.webp",
    gallery: [],
    formats: ["in-person"],
  },
  {
    id: "ws-2",
    slug: "street-photography-seeing",
    title: "Street Photography: The Art of Seeing",
    category: "photography",
    instructorId: "ins-2",
    shortDescription:
      "A two-day workshop on patience, composition, and the ethics of photographing strangers.",
    longDescription:
      "This workshop is about seeing before shooting. Over two sessions you will work through structured exercises on light, gesture, and timing, then review your work in a group critique. We cover the ethics of photographing people in public and how to approach strangers with respect.",
    learningOutcomes: [
      "Read light and shadow on the street in real time",
      "Compose quickly using frame edges and layering",
      "Approach strangers ethically and with consent",
      "Edit a small set of images for narrative coherence",
    ],
    materials: [
      "Bring any camera (phone is fine)",
      "Comfortable walking shoes ; we cover 3 to 5 km per session",
      "Notebook for field notes",
    ],
    prerequisites:
      "Familiarity with your camera controls. No portfolio required. Suitable for intermediate photographers.",
    accessibility:
      "Walking route is approximately 3 km on mostly flat pavement with one short incline. Online session option available with the same critique structure. Contact us to discuss mobility accommodations.",
    cancellationPolicy:
      "This is a free demonstration. Cancel or reschedule before the session begins. No payment or refund is processed.",
    durationMinutes: 480,
    price: 0,
    coverImage: "/assets/photography.webp",
    gallery: [],
    formats: ["in-person", "online"],
  },
  {
    id: "ws-3",
    slug: "relief-printmaking",
    title: "Relief Printmaking: Carve and Print",
    category: "printmaking",
    instructorId: "ins-3",
    shortDescription:
      "Carve your first relief block and pull an edition of three prints in a single session.",
    longDescription:
      "A focused introduction to single-block relief printing. You will design, transfer, and carve a block, then ink and pull an edition of three prints on a press. We cover registration, ink consistency, and paper choice. No drawing experience needed ; simple marks print beautifully.",
    learningOutcomes: [
      "Design and transfer a relief image",
      "Carve linocut blocks safely and efficiently",
      "Ink and pull a clean impression on a press",
      "Sign and number a small edition",
    ],
    materials: [
      "All blocks, ink, paper, and tools included",
      "Wear clothes that can get ink-stained",
      "Optional: bring reference sketches or photos (6 x 8 cm or smaller)",
    ],
    prerequisites: "No experience needed. Beginners welcome.",
    accessibility:
      "Second-floor studio accessed by one flight of stairs (18 steps). Hand press requires moderate hand strength. Online demonstration option available. Contact us to discuss adaptations.",
    cancellationPolicy:
      "This is a free demonstration. Cancel or reschedule before the session begins. No payment or refund is processed.",
    durationMinutes: 300,
    price: 0,
    coverImage: "/assets/printmaking.webp",
    gallery: [],
    formats: ["in-person"],
  },
];

function daysFromNow(days: number, hours = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setUTCHours(hours, 0, 0, 0);
  return d.toISOString();
}

function makeSessions(): Session[] {
  return [
    // Pottery ; two sessions, one full
    {
      id: "ses-1",
      workshopId: "ws-1",
      format: "in-person",
      startAt: daysFromNow(7, 10),
      endAt: daysFromNow(7, 16),
      capacity: 8,
      location: "Common Ground Studio, 12 Mill Lane, Bristol",
    },
    {
      id: "ses-2",
      workshopId: "ws-1",
      format: "in-person",
      startAt: daysFromNow(21, 10),
      endAt: daysFromNow(21, 16),
      capacity: 8,
      location: "Common Ground Studio, 12 Mill Lane, Bristol",
    },
    // Street photography ; in-person and online
    {
      id: "ses-3",
      workshopId: "ws-2",
      format: "in-person",
      startAt: daysFromNow(14, 9),
      endAt: daysFromNow(14, 17),
      capacity: 10,
      location: "Meet at Common Ground Studio, 12 Mill Lane, Bristol",
    },
    {
      id: "ses-4",
      workshopId: "ws-2",
      format: "online",
      startAt: daysFromNow(14, 14),
      endAt: daysFromNow(14, 18),
      capacity: 6,
      location: "Online via Zoom (link sent after booking)",
      timezone: "Europe/London",
    },
    // Printmaking ; final seat session
    {
      id: "ses-5",
      workshopId: "ws-3",
      format: "in-person",
      startAt: daysFromNow(10, 11),
      endAt: daysFromNow(10, 16),
      capacity: 6,
      location: "Common Ground Studio, 12 Mill Lane, Bristol",
    },
    {
      id: "ses-6",
      workshopId: "ws-3",
      format: "in-person",
      startAt: daysFromNow(28, 11),
      endAt: daysFromNow(28, 16),
      capacity: 6,
      location: "Common Ground Studio, 12 Mill Lane, Bristol",
    },
  ];
}

export function createSeedState(): DemoState {
  const sessions = makeSessions();
  return {
    sessions,
    bookings: [
      // Pottery ses-1: full (8 booked)
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `seed-bk-${i}`,
        sessionId: "ses-1",
        workshopId: "ws-1",
        attendeeName: `Participant ${i + 1}`,
        attendeeEmail: `participant${i + 1}@example.com`,
        status: "confirmed" as const,
        createdAt: daysFromNow(-3, 9),
        checkIn: "registered" as const,
      })),
      // Street photo ses-3: 7 of 10
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `seed-bk-s3-${i}`,
        sessionId: "ses-3",
        workshopId: "ws-2",
        attendeeName: `Photographer ${i + 1}`,
        attendeeEmail: `photo${i + 1}@example.com`,
        status: "confirmed" as const,
        createdAt: daysFromNow(-5, 9),
        checkIn: "registered" as const,
      })),
      // Printmaking ses-5: 5 of 6 (final seat available)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `seed-bk-s5-${i}`,
        sessionId: "ses-5",
        workshopId: "ws-3",
        attendeeName: `Printer ${i + 1}`,
        attendeeEmail: `printer${i + 1}@example.com`,
        status: "confirmed" as const,
        createdAt: daysFromNow(-2, 9),
        checkIn: "registered" as const,
      })),
    ],
    waitlist: [],
    activity: [
      {
        id: "seed-act-1",
        type: "booking",
        message: "Initial demo data loaded",
        timestamp: daysFromNow(-5, 9),
      },
    ],
  };
}

export const categoryLabels: Record<WorkshopCategory, string> = {
  pottery: "Pottery",
  photography: "Photography",
  printmaking: "Printmaking",
};

export const categoryColors: Record<WorkshopCategory, string> = {
  pottery: "text-plum-700 bg-plum-50",
  photography: "text-sage-600 bg-sage-50",
  printmaking: "text-gold-600 bg-gold-400/15",
};
