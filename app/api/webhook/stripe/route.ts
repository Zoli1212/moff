import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response("Webhook error", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    try {
      console.log("🎉 checkout.session.completed event received");
      
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const customerId = session.customer as string;
      console.log("🔍 Looking for user with stripeCustomerId:", customerId);

      const user = await prisma.user.findUnique({
        where: {
          stripeCustomerId: customerId,
        },
      });

      if (!user) {
        console.error("❌ User not found for customer:", customerId);
        console.log("💡 Trying to find user by email from session...");
        
        // Try to find user by email from session
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          console.log("📧 Customer email from session:", customerEmail);
          const userByEmail = await prisma.user.findUnique({
            where: { email: customerEmail },
          });
          
          if (userByEmail) {
            console.log("✅ Found user by email, updating stripeCustomerId");
            // Update user with stripeCustomerId
            await prisma.user.update({
              where: { id: userByEmail.id },
              data: { stripeCustomerId: customerId },
            });
            
            // Use the found user
            const updatedUser = userByEmail;
            const periodEndTimestamp = (subscription as any).trial_end 
              || (subscription as any).items?.data?.[0]?.current_period_end
              || (subscription as any).current_period_end;
            
            const periodEnd = periodEndTimestamp 
              ? new Date(periodEndTimestamp * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            await prisma.subscription.upsert({
              where: {
                stripeSubscriptionId: subscription.id,
              },
              update: {
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: periodEnd,
                status: subscription.status,
              },
              create: {
                userId: updatedUser.id,
                stripeSubscriptionId: subscription.id,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: periodEnd,
                status: subscription.status,
              },
            });
            console.log("✅ Subscription created/updated successfully");
            return new Response(null, { status: 200 });
          }
        }
        
        console.error("❌ User not found by stripeCustomerId or email");
        return new Response("User not found", { status: 404 });
      }
      
      console.log("✅ User found:", user.email);

      // Use upsert to avoid duplicate key errors
      // Get period end from trial_end or items[0].current_period_end
      const periodEndTimestamp = (subscription as any).trial_end 
        || (subscription as any).items?.data?.[0]?.current_period_end
        || (subscription as any).current_period_end;
      
      const periodEnd = periodEndTimestamp 
        ? new Date(periodEndTimestamp * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      console.log("📅 Period end timestamp:", periodEndTimestamp);
      console.log("📅 Period end date:", periodEnd);
      
      await prisma.subscription.upsert({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        update: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: periodEnd,
          status: subscription.status,
        },
        create: {
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: periodEnd,
          status: subscription.status,
        },
      });
      console.log("✅ Subscription created/updated successfully for user:", user.email);
    } catch (error) {
      console.error("❌ Error in checkout.session.completed:", error);
      return new Response("Webhook handler failed", { status: 500 });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    try {
      const invoice = event.data.object as any;
      
      if (!invoice.subscription) {
        console.log("⚠️ No subscription in invoice, skipping");
        return new Response(null, { status: 200 });
      }
      
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      
      const periodEndTimestamp = (subscription as any).trial_end 
        || (subscription as any).items?.data?.[0]?.current_period_end
        || (subscription as any).current_period_end;
      
      const periodEnd = periodEndTimestamp 
        ? new Date(periodEndTimestamp * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.updateMany({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: periodEnd,
          status: subscription.status,
        },
      });
    } catch (error) {
      console.error("Error in invoice.payment_succeeded:", error);
      // Don't return error, just log it
    }
  }

  if (event.type === "customer.subscription.updated") {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      
      const periodEndTimestamp = (subscription as any).trial_end 
        || (subscription as any).items?.data?.[0]?.current_period_end
        || (subscription as any).current_period_end;
      
      const periodEnd = periodEndTimestamp 
        ? new Date(periodEndTimestamp * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.updateMany({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: periodEnd,
          status: subscription.status,
        },
      });
    } catch (error) {
      console.error("Error in customer.subscription.updated:", error);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    try {
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.subscription.deleteMany({
        where: {
          stripeSubscriptionId: subscription.id,
        },
      });
    } catch (error) {
      console.error("Error in customer.subscription.deleted:", error);
    }
  }

  return new Response(null, { status: 200 });
}
