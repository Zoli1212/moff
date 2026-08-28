import { Instrument_Serif } from "next/font/google";

/**
 * The display face, used for landing headlines only.
 *
 * Declared here rather than in the root layout so it stays scoped to this page: nothing
 * else in the app changes, and the font is only fetched by visitors who see the landing.
 * Body copy stays on Geist, which the rest of the product already uses.
 */
export const displaySerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});
