import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutBtn } from "./_components/SignOutBtn";
import { ensureClientFlag } from "@/actions/client-quote-actions";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  await ensureClientFlag();

  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-orange-500">Ajánlatkérés</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{email}</span>
            <SignOutBtn />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
