import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { AiOfferAgent, AiResumeAgent, AIRoadmapAgent } from "@/inngest/functions";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        /* your functions will be passed here later! */
        AiOfferAgent,
        AiResumeAgent,
        AIRoadmapAgent
    ],
});
