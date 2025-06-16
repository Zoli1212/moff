import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { AiOfferAgent, AiDemandAgent, AiRoadmapAgent, EmailAnalyzer, ProcessBulkEmails } from "@/inngest/functions";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        /* your functions will be passed here later! */
        AiOfferAgent,
        AiDemandAgent,
        AiRoadmapAgent,
        EmailAnalyzer,
        ProcessBulkEmails
    ],
});
