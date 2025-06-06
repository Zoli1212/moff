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
Answer in Hungarian lanquage only, not English.
INPUT: You will receive a plain text renovation request or description from a client (e.g. "Full apartment renovation, 3 rooms and kitchen, modern style, 78 sqm, parquet flooring, energy-efficient lighting, budget 10M HUF, deadline September 2025.").

GOAL: Output a comprehensive JSON report with the following structure. Be exhaustive and precise:

IMPORTANT: Extract and fill out ALL of the following project main properties from the PDF or input text if available. These must always be present in the JSON output, using the following keys:
- project_type
- scope
- property_type
- location
- area_sqm
- rooms_affected
- budget_estimate
- timeline
- phasing
If the value is present in the PDF or input, use the exact value. Only use 'not specified' if the information is truly missing.

For the following fields: area_sqm, budget_estimate, timeline, and phasing, always scan the entire PDF or input text for any mention of area (m², square meters), budget (Ft, HUF, EUR, etc.), timeline (dates, months, years), and phasing (stages, phases, ütemezés). If you find any relevant value, fill it in exactly as found. Only use 'not specified' if the information is truly missing from the input.

{

---

ADDITIONAL TASK:
After completing the main renovation demand analysis and JSON output, create a highly detailed, tailored proposal for the project based on the extracted requirements. This proposal should include:
- Main work phases and tasks
- Estimated costs per phase and total
- Timeline and scheduling details
- Any relevant implementation notes or recommendations
- Any assumptions made

Return the proposal as an additional top-level key in the JSON output, named "proposal". The proposal should be well-structured, easy to read, and as specific as possible based on the input data.

The proposal must also include the following fields as separate keys (in English):
- total_net_amount: the total net price for the project
- vat_amount: the calculated VAT amount (27% if not specified otherwise)
- total_gross_amount: the total gross price (net + VAT)
- final_deadline: the final deadline for project completion (date or date range)
- customer_name: the name of the customer, must have!

  "project_type": "string, e.g. apartment renovation, bathroom remodel, roof repair, etc.",
  "scope": "string, e.g. full, partial, modernization, extension, etc.",
  "property_type": "string, e.g. apartment, house, office, etc.",
  "location": "string, e.g. Budapest, 5th district, or 'not specified'",
  "area_sqm": "number or string, e.g. 78, 12, or 'not specified'",
  "rooms_affected": ["list of rooms or spaces, e.g. kitchen, bathroom, living room, hallway, etc."],
  "requirements": [
    "List all explicit and implicit requirements: materials, brands, styles, energy efficiency, sustainability, accessibility, smart home, insulation, plumbing, electrical, HVAC, windows, doors, lighting, flooring, painting, tiling, cabinetry, fixtures, appliances, etc."
  ],
  "client_priorities": ["List what seems most important to the client (e.g. speed, budget, quality, eco-friendliness, design, warranty, etc.)"],
  "must_haves": ["List any absolute must-haves or non-negotiables."],
  "nice_to_haves": ["List any optional or preferred features if mentioned."],
  "budget_estimate": "string, e.g. '10M HUF', 'not specified'",
  "timeline": "string, e.g. 'September 2025', 'within 2 months', 'not specified'",
  "phasing": "string, e.g. 'all at once', 'in stages', 'not specified'",
  "constraints": ["List any constraints: access, working hours, noise, building rules, delivery, storage, etc."],
  "risks_or_dependencies": ["List any risks, dependencies, permits, 3rd parties, or external factors."],
  "missing_info": [
    "List every missing, unclear, or ambiguous point that should be clarified with the client (e.g. exact materials, colors, brands, technical specifications, access details, permit status, etc.)"
  ],
  "summary_comment": "A detailed summary (3-5 sentences) of the main requirements, client expectations, and what needs clarification."
}

- Fill in as many fields as possible from the input. If a field is not specified, mark as 'not specified' or leave empty, but always include all fields.
- Be extremely thorough: infer implicit requirements, list every detail, and never omit possible client needs.
- Output must be valid JSON (no comments, no extra text, only the JSON object).
- Do NOT analyze resumes or unrelated topics, only renovation, remodeling, or construction requests.
- Keep your tone supportive, efficient, and professional at all times.
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
