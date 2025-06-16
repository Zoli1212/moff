import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    const userEmail = user.primaryEmailAddress?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "Nincs email cím" }, { status: 400 });
    }

    // Trigger the bulk email processing
    await inngest.send({
      name: "ProcessBulkEmails",
      data: {
        userEmail,
      },
    });

    return NextResponse.json({ status: "started" });
  } catch (error) {
    console.error("Error processing emails:", error);
    return NextResponse.json(
      { error: "Hiba történt a feldolgozás során" },
      { status: 500 }
    );
  }
}
