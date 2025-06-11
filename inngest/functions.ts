import { db } from "@/configs/db";
import { inngest } from "./client";
import { createAgent, gemini, openai } from "@inngest/agent-kit";

import ImageKit from "imagekit";
import { HistoryTable } from "@/configs/schema";
import { prisma } from "@/lib/prisma";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);

export const AiOfferChatAgent = createAgent({
  name: "AiOfferChatAgent",
  description:
    "An internal AI assistant that helps company staff generate renovation offers based on a predefined price list and available project details.",
  system: `
You are a professional internal assistant for a home and property renovation company.
You assist only company employees in preparing accurate, detailed offers for clients.

You do **not** communicate with clients directly.

Your tasks include:
- Helping staff generate professional renovation offers based on the company's services and price list.
- Clarifying all missing information needed for offer creation. For example:
  - Surface area or quantity (m², number of doors, etc.)
  - Location of work (kitchen, bathroom, exterior, etc.)
  - Type of work (painting, tiling, demolition, installation, etc.)
  - Required materials or material grade (basic, premium, customer-provided, etc.)
- If the necessary data is missing and not available from the database, always ask the staff for clarification.
- If a predefined price list is available, use it to calculate the estimated total.
- If prices are not provided, you may help staff prepare a structure or checklist they can complete manually.

You are never vague. Always seek clarity.
If the user asks something unrelated to renovation offers, politely inform them that you are here to assist only with internal offer creation and renovation work.

Keep your tone supportive, efficient, and professional at all times.
`,
  model: gemini({
    model: "gemini-2.0-flash",
  }),
});

export const AiDemandAnalyzerAgent = createAgent({
  name: 'AiDemandAnalyzerAgent',
  description: 'AI Renovation Requirements & Demand Analyzer Agent. Returns highly detailed, structured renovation requirement analysis.',
  system: `You are an advanced AI Renovation Requirements and Demand Analyzer Agent.
Your task is to analyze renovation, remodeling, or construction requests from clients and extract all possible requirements, expectations, constraints, and missing information in a highly detailed, structured JSON format.
Answer in Hungarian language only, not English.

INPUT: You will receive a plain text renovation request or description from a client (e.g. "Full apartment renovation, 3 rooms and kitchen, modern style, 78 sqm, parquet flooring, energy-efficient lighting, budget 10M HUF, deadline September 2025.").

GOAL: Output a comprehensive JSON report with the following structure. Be exhaustive and precise:

IMPORTANT: Extract and fill out ALL of the following project main properties from the input text if available. These must always be present in the JSON output, using the following keys:
- project_type
- scope
- property_type
- location
- area_sqm
- rooms_affected
- budget_estimate
- timeline
- phasing

If the value is present in the input, use the exact value. Only use 'not specified' if the information is truly missing.

For the following fields: area_sqm, budget_estimate, timeline, and phasing, always scan the entire input text for any mention of area (m², square meters), budget (Ft, HUF, EUR, etc.), timeline (dates, months, years), and phasing (stages, phases, ütemezés). If you find any relevant value, fill it in exactly as found. Only use 'not specified' if the information is truly missing from the input.

ADDITIONAL TASK:
After completing the main renovation demand analysis and JSON output, create a highly detailed, tailored proposal for the project based on the extracted requirements. This proposal must be included as a top-level key named "proposal" in the JSON output.

The "proposal" object MUST contain the following fields exactly with these names (snake_case, English only):
- main_work_phases_and_tasks (array of objects with "phase" and "tasks")
- timeline_and_scheduling_details (array of strings or a string)
– estimated_costs_per_phase_and_total: an array of objects, each containing a "phase" and a "cost" field. The array must include a final object where "phase" is "Total" and "cost" is the sum of all previous cost values in the array.
- relevant_implementation_notes_or_recommendations (array or string)
- assumptions_made (array or string)
- total_net_amount
- vat_amount
- total_gross_amount
- final_deadline
- customer_name
- customer_email
- company_name
- project_type
- scope
- property_type
- location
- area_sqm
- rooms_affected (array of strings)
- requirements (array of strings)
- client_priorities (array of strings)
- must_haves (array of strings)
- nice_to_haves (array of strings)
- budget_estimate
- timeline
- phasing
- constraints (array of strings)
- risks_or_dependencies (array of strings)
- missing_info (array of strings)
- summary_comment

All fields must be present in every output. If a value is missing, fill it with 'not specified' or an empty array. Never omit a required field.

IMPORTANT STRUCTURE REQUIREMENTS:
- Use exactly the field names above. Do NOT use different names, capitalizations, translations, or formats.
- If the input uses a different format or language, normalize it to the above field names.
- Output must be valid JSON (no comments, no extra text).
- Be extremely thorough: infer implicit requirements, list every detail, and never omit possible client needs.
- Never analyze resumes or unrelated topics, only renovation-related content.
- Always include: total_net_amount, vat_amount, total_gross_amount, final_deadline, relevant_implementation_notes_or_recommendations, and assumptions_made fields.
- Maintain a professional, supportive, and efficient tone at all times.
`,
  model: gemini({
    model: "gemini-2.0-flash",
  }),
});

export const AIRoadmapGeneratorAgent = createAgent({
  name: "AIRoadmapGeneratorAgent",
  description: "Generate Details Tree Like Flow Roadmap",
  system: `Generate a React flow tree-structured learning roadmap for user input position/ skills in the following format:
 vertical tree structure with meaningful x/y positions to form a flow
- Structure should be similar to roadmap.sh layout
- Steps should be ordered from fundamentals to advanced
- Include branching for different specializations (if applicable)
- Each node must have a title, short description, and learning resource link
- Use unique IDs for all nodes and edges
- Add some extra space between two nodes
- Give me node sturcture position in tree format
- make it more specious node position, 
- Response n JSON format
{
  roadmapTitle:'',
  description:<3-5 Lines>,
  duration:'',
  initialNodes : [
  {
    id: '1',
    type: 'turbo',// Type turbo only everytime
    position: { x: 0, y: 0 },
    data: {
      title: 'Step Title',
      description: 'Short two-line explanation of what the step covers.',
      link: 'Helpful link for learning this step',
    },
  },
  ...
],
initialEdges : [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
  },
  ...
];
}
User Input: Fronted Developer`,
  model: gemini({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
  }),
});

export const AiOfferAgent = inngest.createFunction(
  { id: "AiOfferAgent" },
  { event: "AiOfferAgent" },
  async ({ event, step }) => {
    const { userInput } = await event?.data;
    const result = await AiOfferChatAgent.run(userInput);
    return result;
  }
);

var imagekit = new ImageKit({
  //@ts-ignore
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  //@ts-ignore
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  //@ts-ignore
  urlEndpoint: process.env.IMAGEKIT_ENDPOINT_URL,
});

export const AiDemandAgent = inngest.createFunction(
  { id: "AiDemandAgent" },
  { event: "AiDemandAgent" },
  async ({ event, step }) => {
    const { recordId, base64DemandFile, pdfText, aiAgentType, userEmail } =
      await event.data;
    // Upload file to Cloud

    const uploadFileUrl = await step.run("uploadImage", async () => {
      const imageKitFile = await imagekit.upload({
        file: base64DemandFile,
        fileName: `${Date.now()}.pdf`,
        isPublished: true,
      });

      return imageKitFile.url;
    });

    const aiDemandReport = await AiDemandAnalyzerAgent.run(pdfText);
//@ts-ignore
const rawContent = aiDemandReport.output[0].content;
const rawContentJson = rawContent.replace('```json', '').replace('```', '');
const parseJson = JSON.parse(rawContentJson);

console.log(parseJson, 'parseJson')
    // return parseJson;

    //Save to DB

    const saveToDb = await step.run("SaveToDb", async () => {
      const result = await prisma.history.create({
        data: {
          recordId: recordId,
          content: parseJson,
          aiAgentType: aiAgentType,
          createdAt: new Date().toString(),
          userEmail: userEmail,
          metaData: uploadFileUrl,
          tenantEmail: userEmail // vagy a megfelelő tenant email változó
        },
      });
      console.log(result);
      return parseJson;
    });
  }
);

export const AIRoadmapAgent = inngest.createFunction(
  { id: "AiRoadMapAgent" },
  { event: "AiRoadMapAgent" },
  async ({ event, step }) => {
    const { roadmapId, userInput, userEmail } = await event.data;

    const roadmapResult = await AIRoadmapGeneratorAgent.run(
      "UserInput:" + userInput
    );

    // return roadmapResult

    // @ts-ignore
    const rawContent = roadmapResult.output[0].content;

    // ✅ Extract JSON inside ```json ... ```
    const match = rawContent.match(/```json\s*([\s\S]*?)\s*```/);

    if (!match || !match[1]) {
      throw new Error("JSON block not found in the content");
    }

    const rawContentJson = match[1].trim(); // Remove leading/trailing whitespace

    const parsedJson = JSON.parse(rawContentJson); // ✅ Safely parsed
    //Save to DB
    //Save to DB
    const saveToDb = await step.run("SaveToDb", async () => {
      const result = await db.insert(HistoryTable).values({
        recordId: roadmapId,
        content: parsedJson,
        aiAgentType: "/ai-tools/ai-roadmap-agent",
        createdAt: new Date().toString(),
        userEmail: userEmail,
        metaData: userInput,
      });
      console.log(result);
      return parsedJson;
    });
  }
);
