import { validateInviteToken } from "@/actions/invite-actions";
import InviteClient from "./InviteClient";
import Link from "next/link";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  // Token validálása
  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            Érvénytelen meghívó
          </h1>
          <p className="text-gray-300 mb-6">{validation.error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Vissza a főoldalra
          </Link>
        </div>
      </div>
    );
  }

  return <InviteClient token={token} createdBy={validation.createdBy || ""} />;
}
