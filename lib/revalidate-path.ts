"use server";

import { revalidatePath as revalidate } from "next/cache";

async function revalidatePath(name: string) {
    revalidate(name);
}

export default revalidatePath;