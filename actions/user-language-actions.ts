"use server";

/**
 * Reads and writes the UI language on the user's own record.
 *
 * Stored in the database rather than in a cookie or local storage: the choice belongs to
 * the account, so it follows the person to any machine, and nothing about the language
 * lives in the browser.
 */

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

async function currentEmail(): Promise<string | null> {
  const user = await currentUser();
  return (
    user?.emailAddresses?.[0]?.emailAddress ||
    user?.primaryEmailAddress?.emailAddress ||
    null
  );
}

export async function getUserLanguage(): Promise<{ locale: Locale }> {
  try {
    const email = await currentEmail();
    if (!email) return { locale: DEFAULT_LOCALE };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { language: true },
    });

    return {
      locale: isLocale(user?.language) ? user.language : DEFAULT_LOCALE,
    };
  } catch (error) {
    // A failure to read a preference should never keep someone out of the app.
    console.error("[user-language] read failed:", error);
    return { locale: DEFAULT_LOCALE };
  }
}

export async function setUserLanguage(
  locale: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isLocale(locale)) {
      return { success: false, error: "Unknown language." };
    }

    const email = await currentEmail();
    if (!email) return { success: false, error: "Not authenticated." };

    // updateMany rather than update: a signed-in Clerk user without a row yet is a real
    // state, and it should not throw on what is only a preference change.
    await prisma.user.updateMany({
      where: { email },
      data: { language: locale },
    });

    return { success: true };
  } catch (error) {
    console.error("[user-language] write failed:", error);
    return { success: false, error: "Saving the language failed." };
  }
}
