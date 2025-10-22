import React from "react";
import { getCurrentUserData } from "@/actions/user-actions";
import WorksLayoutClient from "./_components/WorksLayoutClient";

export default async function WorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role detection - no layout shift!
  const userData = await getCurrentUserData();
  const isTenant = userData.isTenant ?? true;

  return <WorksLayoutClient isTenant={isTenant}>{children}</WorksLayoutClient>;
}
