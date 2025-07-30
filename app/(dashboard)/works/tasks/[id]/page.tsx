import React from "react";

import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import TasksSecondBar from "../_components/TasksSecondBar";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const workItems = await getWorkItemsWithWorkers(Number((await params).id));
  // Itt props-ból, vagy fixen, vagy parenttől kapod a workItems-t

  return <TasksSecondBar />;
}
