import { Inter } from "next/font/google";

/**
 * The display face, used for landing headlines only.
 *
 * A heavy geometric grotesque rather than a serif: large x-height, round bowls, tight
 * fitting. Set it at 800 with negative tracking — at display sizes the default spacing
 * reads loose and the weight is what carries the headline.
 *
 * Declared here rather than in the root layout so it stays scoped to this page: nothing
 * else in the app changes, and the font is only fetched by visitors who see the landing.
 * Body copy stays on Geist, which the rest of the product already uses.
 *
 * latin-ext is not optional. Without it the headline loses ő and ű, which is the same
 * failure the PDF export hit; the build fails if the subset is unavailable.
 */
export const displayFont = Inter({
  weight: ["700", "800"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});
