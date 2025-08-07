"use server";
import { toolExistsInRegistry } from "@/actions/tools-registry-actions";

export async function checkToolExists(toolName: string): Promise<boolean> {
  return toolExistsInRegistry(toolName);
}
