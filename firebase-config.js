// =========================================================
// SHARED FIREBASE CONNECTION & STUDIO DEFAULTS
// Used by login.html, index.html, and admin.html
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCCVRWqJWFhoEKCuDWX3c8M1EkS9soO3HM",
  authDomain: "ep-s-glam-and-fashion-f24e5.firebaseapp.com",
  projectId: "ep-s-glam-and-fashion-f24e5",
  storageBucket: "ep-s-glam-and-fashion-f24e5.firebasestorage.app",
  messagingSenderId: "534454471922",
  appId: "1:534454471922:web:94616ec235554ef5b6946b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const GALLERY_SERVICES = [
  "Gel Nails",
  "Acrylic Nails",
  "Polygel",
  "Builder Gel",
  "Manicure",
  "Pedicure",
  "Soak Off",
  "Makeup Services",
  "Lash Services",
  "Waxing Services"
];

export const DEFAULT_SITE_CONFIG = {
  brandMain: "EP's",
  brandAccent: "Glam & Fashion",
  slogan: "Celebrating real beauty, building lasting confidence.",
  location: "Koforidua – Akwadum, Eastern Region",
  shortLocation: "Koforidua – Akwadum",
  phoneDisplay: "053 554 5267",
  whatsappNumber: "233535545267",
  tiktok1: "@_princessreigns77_",
  tiktok2: "@akwadumbeatician",
  heroTitle: "Elevate Your Look, Own Your Glow.",
  heroDescription:
    "Welcome to EP's Glam & Fashion in Koforidua – Akwadum—your destination for flawless nail artistry, glowing makeup, custom lash extensions, and gentle body & facial waxing care.",
  waxingNotice: "Notice: We do not offer eyebrow waxing.",
  aboutText:
    "At EP's Glam & Fashion, beauty isn't about covering up—it's about highlighting who you already are. Every appointment in our Koforidua – Akwadum studio is delivered with patience, attention to detail, and top-tier hygiene."
};

export const DEFAULT_SCHEDULE_CONFIG = {
  defaultSlots: ["09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM", "06:00 PM"],
  openSundaysByDefault: false,
  overrides: {}
};

export const DEFAULT_SERVICES = [
  {
    id: "gel-nails",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Gel Nails",
    description: "Glossy, chip-resistant gel nails finished under UV/LED light for lasting shine.",
    groups: [
      {
        heading: "Length",
        note: "",
        items: [
          { name: "Short", price: "GH₵ 50.00", note: "", type: "book" },
          { name: "Medium", price: "GH₵ 70.00", note: "", type: "book" },
          { name: "Long", price: "GH₵ 90.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "acrylic-nails",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Acrylic Nails",
    description: "Durable, sculpted acrylic nail extensions shaped cleanly to your preferred style.",
    groups: [
      {
        heading: "Length",
        note: "",
        items: [
          { name: "Short", price: "GH₵ 70.00", note: "", type: "book" },
          { name: "Medium", price: "GH₵ 90.00", note: "", type: "book" },
          { name: "Long", price: "GH₵ 120.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "polygel",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Polygel",
    description: "Lightweight, flexible hybrid enhancements combining strength with a natural feel.",
    groups: [
      {
        heading: "Length",
        note: "",
        items: [
          { name: "Short (Small)", price: "GH₵ 60.00", note: "", type: "book" },
          { name: "Medium", price: "GH₵ 80.00", note: "", type: "book" },
          { name: "Long", price: "GH₵ 100.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "builder-gel",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Builder Gel (BIAB)",
    description: "Strengthening builder gel overlay & extensions that protect and nurture natural nails.",
    groups: [
      {
        heading: "Length",
        note: "",
        items: [
          { name: "Short (Small)", price: "GH₵ 60.00", note: "", type: "book" },
          { name: "Medium", price: "GH₵ 80.00", note: "", type: "book" },
          { name: "Long", price: "GH₵ 100.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "soak-off",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Soak Off",
    description: "Safe, gentle removal of gel, acrylic, or polygel nails followed by nail nourishment.",
    groups: [
      {
        heading: "Length",
        note: "",
        items: [
          { name: "Short", price: "GH₵ 15.00", note: "", type: "book" },
          { name: "Medium", price: "GH₵ 20.00", note: "", type: "book" },
          { name: "Long", price: "GH₵ 25.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "manicure",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Manicure",
    description: "Precision cuticle care, shaping, and soothing treatments for neat, healthy hands.",
    groups: [
      {
        heading: "Tiers",
        note: "",
        items: [
          { name: "Basic Manicure", price: "GH₵ 50.00", note: "", type: "book" },
          { name: "Premium Manicure", price: "GH₵ 120.00", note: "Includes complimentary hand massage", type: "book" }
        ]
      }
    ]
  },
  {
    id: "pedicure",
    category: "nails",
    categoryLabel: "Nail Studio",
    title: "Pedicure",
    description: "Warm soak, gentle exfoliation, cuticle tidy, and neat toe care for men and women.",
    groups: [
      {
        heading: "Basic Pedicure",
        note: "",
        items: [
          { name: "Basic — Female", price: "GH₵ 70.00", note: "", type: "book" },
          { name: "Basic — Male", price: "GH₵ 100.00", note: "", type: "book" }
        ]
      },
      {
        heading: "Premium Pedicure",
        note: "Includes complimentary foot massage",
        items: [
          { name: "Premium — Female", price: "GH₵ 150.00", note: "Complimentary foot massage", type: "book" },
          { name: "Premium — Male", price: "GH₵ 200.00", note: "Complimentary foot massage", type: "book" }
        ]
      }
    ]
  },
  {
    id: "makeup",
    category: "makeup",
    categoryLabel: "Makeup Artistry",
    title: "Makeup Services",
    description: "Skin-true, long-lasting glam tailored for birthdays, photoshoots, events, and weddings.",
    groups: [
      {
        heading: "Packages",
        note: "",
        items: [
          { name: "Soft Glam", price: "GH₵ 200.00", note: "", type: "book" },
          { name: "Full Glam", price: "GH₵ 350.00", note: "", type: "book" },
          { name: "Bridal Makeup", price: "WhatsApp", note: "Custom bridal package", type: "whatsapp" }
        ]
      }
    ]
  },
  {
    id: "lashes",
    category: "lashes",
    categoryLabel: "Lash Studio",
    title: "Lash Services",
    description: "Lightweight lash sets customized to highlight your natural eye shape cleanly.",
    groups: [
      {
        heading: "Options",
        note: "",
        items: [
          { name: "Classic", price: "GH₵ 50.00", note: "", type: "book" },
          { name: "Hybrid", price: "GH₵ 60.00", note: "", type: "book" },
          { name: "Volume", price: "GH₵ 80.00", note: "", type: "book" },
          { name: "Removal", price: "GH₵ 15.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "waxing-body",
    category: "waxing",
    categoryLabel: "Waxing Services • Body",
    title: "Body Waxing",
    description: "Clean, hygienic, and gentle waxing care for smooth skin.",
    groups: [
      {
        heading: "Body Parts",
        note: "",
        items: [
          { name: "Arm — Full", price: "GH₵ 110.00", note: "", type: "book" },
          { name: "Arm — Half", price: "GH₵ 60.00", note: "", type: "book" },
          { name: "Leg (Male) — Full", price: "GH₵ 220.00", note: "", type: "book" },
          { name: "Leg (Male) — Half", price: "GH₵ 120.00", note: "", type: "book" },
          { name: "Leg (Female) — Full", price: "GH₵ 150.00", note: "", type: "book" },
          { name: "Leg (Female) — Half", price: "GH₵ 80.00", note: "", type: "book" },
          { name: "Chest — Male", price: "GH₵ 150.00", note: "", type: "book" },
          { name: "Chest — Female", price: "GH₵ 80.00", note: "", type: "book" },
          { name: "Underarm", price: "GH₵ 60.00", note: "", type: "book" },
          { name: "Bikini Line", price: "GH₵ 100.00", note: "", type: "book" },
          { name: "Brazilian", price: "GH₵ 150.00 – 200.00", note: "", type: "book" }
        ]
      }
    ]
  },
  {
    id: "waxing-facial",
    category: "waxing",
    categoryLabel: "Waxing Services • Facial",
    title: "Facial Waxing",
    description: "Gentle facial hair removal. Notice: We do not offer eyebrow waxing.",
    groups: [
      {
        heading: "Facial Parts",
        note: "",
        items: [
          { name: "Upper Lip", price: "GH₵ 30.00", note: "", type: "book" },
          { name: "Chin — Male", price: "GH₵ 100.00 – 130.00", note: "", type: "book" },
          { name: "Chin — Female", price: "GH₵ 50.00 – 80.00", note: "", type: "book" }
        ]
      }
    ]
  }
];
  