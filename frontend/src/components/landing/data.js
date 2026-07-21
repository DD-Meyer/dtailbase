import { Calendar, FileText, ShieldCheck, Smartphone } from "lucide-react";

export const FEATURES = [
  {
    title: "Real-time Booking Engine",
    description:
      "Allow clients to reserve paint correction packages, interior details, and add-ons with automated slot scheduling.",
    icon: Calendar,
    wide: true,
    code: 'booking.create({ slot: "09:00", service: "Stage 2 Polish" })',
  },
  {
    title: "Digital Indemnity Waivers",
    description:
      "Capture digital signatures and store pre-inspection vehicle damage photos directly to client profiles before starting work.",
    icon: ShieldCheck,
    wide: false,
  },
  {
    title: "Automated Job Cards",
    description:
      "Assign bay tasks, track ceramic coating curing times, and issue digital receipts in seconds.",
    icon: FileText,
    wide: false,
  },
  {
    title: "Mobile-First Detailer Workflow",
    description:
      "Built for both fixed bay shops and mobile detailing rigs. Access client histories and update vehicle statuses right from your phone.",
    icon: Smartphone,
    wide: true,
  },
];

export const FEATURE_SETS = [
  {
    title: "Operations Core",
    description: "The daily workflow engine that keeps your bays full and your admin lean.",
    items: [
      "Real-time booking slots",
      "Automated job cards",
      "Customer and vehicle records",
      "Instant invoicing workflow",
    ],
  },
  {
    title: "Legal Protection",
    description: "Built-in safeguards for high-trust detailing businesses that need proof, not guesswork.",
    items: [
      "Digital indemnity waivers",
      "Photo evidence storage",
      "Signed record history",
      "Geo-aware verification support",
    ],
  },
  {
    title: "Mobile Workflow",
    description: "Designed for fixed studios, mobile detailers, and teams that update work from the field.",
    items: [
      "Phone-first interface",
      "Live booking updates",
      "Client history on the move",
      "Fast condition capture",
    ],
  },
];