import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getClientQuoteSession } from "@/actions/client-quote-actions";
import { QuoteChatClient } from "./QuoteChatClient";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function QuoteChatPage({ params }: Props) {
  const { sessionId } = await params;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const session = await getClientQuoteSession(sessionId);
  if (!session) redirect("/quote-request");

  const initialMessages = (
    (session.content as { role: string; content: string }[]) ?? []
  ).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return (
    <QuoteChatClient sessionId={sessionId} initialMessages={initialMessages} />
  );
}
