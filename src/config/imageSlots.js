/**
 * imageSlots.js — Centralized Image Slot Registry
 *
 * Every website section that displays a managed image is listed here.
 * sectionKey and slotKey are stable identifiers — once deployed do NOT rename them
 * or existing MongoDB assignments will become orphaned.
 *
 * Shape per slot:
 *   label        — Human-readable name shown in Admin Panel
 *   aspectRatio  — Recommended ratio (informational only)
 *   description  — Short hint for the admin
 */

export const IMAGE_SLOTS = {
  // ── Homepage ──────────────────────────────────────────────────────────────
  welcomeSection: {
    label: 'Welcome Section',
    slots: {
      mainImage: {
        label:       'Welcome Section — Main Image',
        aspectRatio: '4:3',
        description: 'Classroom / school building image shown beside the Welcome text',
      },
    },
  },

  directorMessage: {
    label: "Chairman's Message",
    slots: {
      portrait: {
        label:       "Chairman's Portrait",
        aspectRatio: '4:5',
        description: 'Portrait photo of the Chairman / Director',
      },
    },
  },

  // ── Academic Stages (Homepage + Academics pages) ─────────────────────────
  academicStages: {
    label: 'Academic Stages',
    slots: {
      kindergarten: {
        label:       'Pre-Primary (Nursery–KG)',
        aspectRatio: '3:4',
        description: 'Image for the Pre-Primary / Kindergarten stage card',
      },
      primary: {
        label:       'Primary School (Class I–V)',
        aspectRatio: '3:4',
        description: 'Image for the Primary School stage card',
      },
      middle: {
        label:       'Middle School (Class VI–VIII)',
        aspectRatio: '3:4',
        description: 'Image for the Middle School stage card',
      },
      senior: {
        label:       'Senior School (Class IX–XII)',
        aspectRatio: '3:4',
        description: 'Image for the Senior School stage card',
      },
    },
  },

  // ── Teaching Methodology ─────────────────────────────────────────────────
  teachingMethodology: {
    label: 'Teaching Methodology',
    slots: {
      conceptLed: {
        label:       'Concept-led Learning',
        aspectRatio: '16:9',
        description: 'Image for the Concept-led Learning card',
      },
      activityBased: {
        label:       'Activity-based Learning',
        aspectRatio: '16:9',
        description: 'Image for the Activity-based Learning card',
      },
      careerGuidance: {
        label:       'Career Guidance',
        aspectRatio: '16:9',
        description: 'Image for the Career Guidance card',
      },
    },
  },

  // ── School Facilities ────────────────────────────────────────────────────
  schoolFacilities: {
    label: 'School Facilities',
    slots: {
      laboratory: {
        label:       'Laboratory',
        aspectRatio: '4:3',
        description: 'Science / computer laboratory image',
      },
      smartClassrooms: {
        label:       'Computer Lab / Smart Classrooms',
        aspectRatio: '4:3',
        description: 'Smart classroom / computer lab image',
      },
      library: {
        label:       'Library',
        aspectRatio: '4:3',
        description: 'School library image',
      },
      sports: {
        label:       'Playground / Sports',
        aspectRatio: '4:3',
        description: 'Playground or sports ground image',
      },
      multipurposeHall: {
        label:       'Multi Purpose Hall',
        aspectRatio: '4:3',
        description: 'Auditorium or multi-purpose hall image',
      },
      musicDance: {
        label:       'Music and Dance',
        aspectRatio: '4:3',
        description: 'Music room or dance performance image',
      },
      transport: {
        label:       'Transport',
        aspectRatio: '4:3',
        description: 'School bus / transport image',
      },
      artRoom: {
        label:       'Art Room',
        aspectRatio: '4:3',
        description: 'Art room / craft activities image',
      },
    },
  },

  // ── Why Choose Us ────────────────────────────────────────────────────────
  whyChooseUs: {
    label: 'Why Choose Us',
    slots: {
      curriculum: {
        label:       'NCERT / CBSE Curriculum',
        aspectRatio: '4:3',
        description: 'Image for the CBSE Curriculum card',
      },
      environment: {
        label:       'Stress-Free Environment',
        aspectRatio: '4:3',
        description: 'Image for the Stress-Free Environment card',
      },
      legacy: {
        label:       'Tilak Group Legacy',
        aspectRatio: '4:3',
        description: 'Image for the Tilak Group Legacy card',
      },
      achievements: {
        label:       'Achievements & Results',
        aspectRatio: '4:3',
        description: 'Image for the Achievements card',
      },
    },
  },

  // ── About / Our School ───────────────────────────────────────────────────
  whoWeAre: {
    label: 'Who We Are (About)',
    slots: {
      mainImage: {
        label:       'Who We Are — Main Photo',
        aspectRatio: '16:10',
        description: 'Wide school / classroom image shown in the Who We Are section',
      },
    },
  },

  ourJourney: {
    label: 'Our Journey (About)',
    slots: {
      mainImage: {
        label:       'Our Journey — Main Photo',
        aspectRatio: '4:5',
        description: 'School building / campus photo shown in the Our Journey section',
      },
    },
  },

  // ── Vision, Mission & Core Values ────────────────────────────────────────
  visionMission: {
    label: 'Vision, Mission & Core Values',
    slots: {
      vision: {
        label:       'Vision Card',
        aspectRatio: '4:3',
        description: 'Background image for the Vision card',
      },
      mission: {
        label:       'Mission Card',
        aspectRatio: '4:3',
        description: 'Background image for the Mission card',
      },
      coreValues: {
        label:       'Core Values Card',
        aspectRatio: '4:3',
        description: 'Background image for the Core Values card',
      },
    },
  },

  // ── Our Campus ───────────────────────────────────────────────────────────
  ourCampus: {
    label: 'Our Campus',
    slots: {
      campus: {
        label:       'Campus — Main Building',
        aspectRatio: '4:3',
        description: 'Large featured campus/building photo (left tile)',
      },
      classroom: {
        label:       'Campus — Classroom',
        aspectRatio: '16:9',
        description: 'Classroom photo (top-right tile)',
      },
      playground: {
        label:       'Campus — Playground',
        aspectRatio: '16:9',
        description: 'Playground photo (bottom-right tile)',
      },
    },
  },

  // ── News & Events — Upcoming Events ──────────────────────────────────────
  // Slot keys match item.id values in data/newsEvents.js upcomingEvents.items
  upcomingEvents: {
    label: 'News & Events — Upcoming Events',
    slots: {
      'upcoming-new-session': {
        label:       'New Academic Session',
        aspectRatio: '16:10',
        description: 'Image for the New Academic Session upcoming event card',
      },
      'upcoming-exams': {
        label:       'School Examination Schedule',
        aspectRatio: '16:10',
        description: 'Image for the School Examination Schedule event card',
      },
      'upcoming-sports-day': {
        label:       'Sports Day',
        aspectRatio: '16:10',
        description: 'Image for the Sports Day upcoming event card',
      },
    },
  },

  // ── News & Events — Previous Events ──────────────────────────────────────
  // Slot keys match item.id values in data/newsEvents.js previousEvents.items
  previousEvents: {
    label: 'News & Events — Previous Events',
    slots: {
      'prev-annual-day': {
        label:       'Annual Day Celebration',
        aspectRatio: '16:10',
        description: 'Image for the Annual Day Celebration previous event card',
      },
      'prev-sports': {
        label:       'Sports Activities',
        aspectRatio: '16:10',
        description: 'Image for the Sports Activities previous event card',
      },
      'prev-science': {
        label:       'Science Exhibition',
        aspectRatio: '16:10',
        description: 'Image for the Science Exhibition previous event card',
      },
    },
  },
};

/**
 * Flat list of all valid { sectionKey, slotKey } pairs.
 * Used for fast validation on save.
 */
export function isValidSlot(sectionKey, slotKey) {
  return !!(IMAGE_SLOTS[sectionKey]?.slots?.[slotKey]);
}

/**
 * Returns the registry formatted for the Admin UI dropdown.
 * Shape: [{ sectionKey, label, slots: [{ slotKey, label, aspectRatio, description }] }]
 */
export function getRegistryForAdmin() {
  return Object.entries(IMAGE_SLOTS).map(([sectionKey, section]) => ({
    sectionKey,
    label: section.label,
    slots: Object.entries(section.slots).map(([slotKey, slot]) => ({
      slotKey,
      label:       slot.label,
      aspectRatio: slot.aspectRatio,
      description: slot.description,
    })),
  }));
}
