import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // vagy a helyes elérési út, ahol a Prisma kliens van exportálva
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        console.log(user, 'user2')

        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json(
                { error: "Unauthorized or missing email address" },
                { status: 401 }
            );
        }

        const email = user.primaryEmailAddress.emailAddress;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(existingUser);
        }

        // Insert new user
        const newUser = await prisma.user.create({
            data: {
                name: user.fullName ?? "",
                email: email,
            },
        });

        return NextResponse.json(newUser);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
    }
}
