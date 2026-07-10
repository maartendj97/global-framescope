import type { KeyDifference } from "@/types";

/**
 * Illustrative mock content for Phase 1.
 */
export const keyDifferences: KeyDifference[] = [
  // Russia–Ukraine Peace and Ceasefire Negotiations
  {
    eventId: "ru-ua-ceasefire-talks",
    title: "Attribution of responsibility",
    description:
      "Russian and Chinese coverage frame the talks as a negotiated settlement requiring mutual compromise, while Ukrainian, U.S., and Dutch coverage explicitly frame the conflict as Russian aggression requiring accountability.",
    countryCodes: ["RU", "CN", "UA", "US", "NL"],
  },
  {
    eventId: "ru-ua-ceasefire-talks",
    title: "Role of Western mediation",
    description:
      "U.S. and Dutch coverage present Western coordination as constructive and stabilizing, Russian and Iranian coverage frame Western involvement skeptically as prolonging the conflict, and Chinese and Indian coverage present themselves as neutral, non-aligned voices for dialogue.",
    countryCodes: ["US", "NL", "RU", "IR", "CN", "IN"],
  },

  // Global Climate Summit Reaches Emissions Agreement
  {
    eventId: "global-climate-emissions-agreement",
    title: "Responsibility for emissions reductions",
    description:
      "Dutch and U.S. coverage emphasize forward-looking ambition and technology-driven solutions, Indian and Chinese coverage emphasize historical responsibility and differentiated obligations for developing economies, and Russian and Iranian coverage frame the targets as externally imposed on energy-exporting nations.",
    countryCodes: ["NL", "US", "IN", "CN", "RU", "IR"],
  },
  {
    eventId: "global-climate-emissions-agreement",
    title: "Trust in enforcement mechanisms",
    description:
      "Dutch and U.S. coverage present the agreement's framework as credible and enforceable, Russian and Iranian coverage question whether compliance can be enforced at all, and Ukrainian coverage frames the agreement mainly through the lens of reconstruction opportunity rather than enforcement.",
    countryCodes: ["NL", "US", "RU", "IR", "UA"],
  },

  // Iran Nuclear Program Negotiations Resume
  {
    eventId: "iran-nuclear-negotiations",
    title: "Framing of sanctions",
    description:
      "Iranian, Russian, and Chinese coverage frame sanctions as unjust unilateral pressure, while U.S. and Dutch coverage frame them as necessary leverage to secure verification commitments.",
    countryCodes: ["IR", "RU", "CN", "US", "NL"],
  },
  {
    eventId: "iran-nuclear-negotiations",
    title: "Trust in Iran's nuclear intentions",
    description:
      "U.S. and Dutch coverage emphasize the need for verification, Iranian coverage asserts peaceful intent, Russian and Chinese coverage emphasize diplomatic resolution without assigning judgment, and Indian and Ukrainian coverage view the talks mainly through an indirect regional or economic lens.",
    countryCodes: ["US", "NL", "IR", "RU", "CN", "IN", "UA"],
  },
];
