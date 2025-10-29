"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function createSubscription(formData: FormData) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const userEmail =
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    clerkUser.primaryEmailAddress?.emailAddress;

  if (!userEmail) {
    throw new Error("No email found");
  }

  const priceId = formData.get("priceId") as string;

  if (!priceId) {
    throw new Error("Price ID is required");
  }

  // Get user from database by email
  let user = await prisma.user.findUnique({
    where: {
      email: userEmail,
    },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Create Stripe customer if doesn't exist
  if (!user.stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: {
        userEmail: user.email,
      },
    });

    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        stripeCustomerId: stripeCustomer.id,
      },
    });
  }

  // Check if this is Pro monthly plan for free trial
  const isProMonthly = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO;

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: user.stripeCustomerId as string,
    mode: "subscription",
    billing_address_collection: "auto",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_update: {
      address: "auto",
      name: "auto",
    },
    // Add 14-day free trial for Pro monthly plan
    ...(isProMonthly && {
      subscription_data: {
        trial_period_days: 14,
      },
    }),
    success_url:
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`
        : "http://localhost:3000/dashboard?success=true",
    cancel_url:
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`
        : "http://localhost:3000/billing?canceled=true",
  });

  return redirect(session.url as string);
}

export async function createCustomerPortal() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Unauthorized");
  }

  const userEmail =
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    clerkUser.primaryEmailAddress?.emailAddress;

  if (!userEmail) {
    throw new Error("No email found");
  }

  // Get user from database by email
  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
    },
    select: {
      stripeCustomerId: true,
    },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url:
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : "http://localhost:3000/dashboard",
  });

  return redirect(session.url);
}
