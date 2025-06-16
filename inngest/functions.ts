import { db } from "@/configs/db";
import { inngest } from "./client";
import { createAgent, gemini, openai } from "@inngest/agent-kit";
import { PrismaClient } from "@prisma/client";
import ImageKit from "imagekit";
import { HistoryTable } from "@/configs/schema";

const prisma = new PrismaClient();

export const EmailAnalyzerAgent = createAgent({
  name: "EmailAnalyzerAgent",
  description:
    "Analyzes email content and extracts structured information including intent, requirements, and action items.",
  system: `Egy fejlett e-mail tartalomelemző vagy. A feladatod, hogy az e-mailek tartalmát elemezd, és kulcsfontosságú információkat nyerj ki belőlük egy strukturált JSON formátumban.

Bemenet: E-mail tárgya és szövege.

Kimenet: Egy részletes JSON riport a következő szerkezetben:
{
  "analysis": {
    "sender_intent": "string | null",
    "main_topic": "string | null",
    "key_points": "string[] | null",
    "action_required": "boolean",
    "priority": "high | medium | low | null",
    "deadline": "string | null",
    "related_to": "renovation | offer | inquiry | other | null",
    "sentiment": "positive | neutral | negative | null",
    "contact_info": {
      "name": "string | null",
      "email": "string | null",
      "phone": "string | null"
    },
    "requirements": {
      "type": "string[] | null",
      "description": "string | null",
      "preferences": "string[] | null"
    },
    "attachments": {
      "present": "boolean",
      "types": "string[] | null",
      "purpose": "string | null"
    },
    "follow_up": {
      "needed": "boolean",
      "when": "string | null",
      "action_items": "string[] | null"
    }
  },
  "summary": {
    "overview": "string",
    "next_steps": "string[]"
  },
  "metadata": {
    "language": "string | null",
    "length": "number",
    "analysis_timestamp": "string"
  }
}

Irányelvek:
1. Minden elérhető információt nyerj ki, de ne találj ki adatokat, ha hiányoznak.
2. A dátumokat ISO 8601 formátumban add meg (ÉÉÉÉ-HH-NN).
3. Az elemzés során tartsd meg az e-mail eredeti nyelvét.
4. A logikai (boolean) értékek legyenek pontosak.
5. Ha egy mező nem határozható meg, legyen nem definiált.
6. Az összefoglaló legyen tömör és cselekvésorientált.
7. Ha az e-mail magyar nyelvű, az elemzés is teljes egészében magyar legyen, **de a JSON mezőnevek maradjanak angolul**.`,
  model: gemini({
    model: "gemini-2.0-flash",
  }),
});

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
  name: "AiDemandAnalyzerAgent",
  description:
    "AI Renovation Requirements & Demand Analyzer Agent. Returns highly detailed, structured renovation requirement analysis.",
  system: `You are an advanced AI Renovation Requirements and Demand Analyzer Agent.
Your task is to analyze renovation, remodeling, or construction requests from clients and extract all possible requirements, expectations, constraints, and missing information in a highly detailed, structured JSON format.
Answer in Hungarian language only, not English.

INPUT: You will receive a renovation request or description from a client. This could be in various formats:
1. Plain text description (e.g., "Full apartment renovation, 3 rooms and kitchen, modern style, 78 sqm, parquet flooring, energy-efficient lighting, budget 10M HUF, deadline September 2025.")
2. Text extracted from documents (PDF, DOCX, XLSX, CSV) containing renovation requirements

DOCUMENT PROCESSING INSTRUCTIONS:
- For Excel/CSV files: The data has been converted to text format. Look for structured data like tables, measurements, quantities, and specifications.
- For Word documents: The text has been extracted. Look for sections, bullet points, and formatted text that might indicate different requirements.
- For PDFs: The text has been extracted. Pay attention to layout and formatting that might indicate different sections of the requirements.

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

If the value is present in the input, use the exact value. Do not use 'not specified' if the information is truly missing.

For the following fields: area_sqm, budget_estimate, timeline, and phasing, always scan the entire input text for any mention of area (m², square meters), budget (Ft, HUF, EUR, etc.), timeline (dates, months, years), and phasing (stages, phases, ütemezés). If you find any relevant value, fill it in exactly as found. Only use 'not specified' if the information is truly missing from the input.

ADDITIONAL TASK:
After completing the main renovation demand analysis and JSON output, create a highly detailed, tailored proposal for the project based on the extracted requirements. This proposal must be included as a top-level key named "proposal" in the JSON output.

The "proposal" object MUST contain the following fields exactly with these names (snake_case, English only):
- main_work_phases_and_tasks (array of objects with "phase" and "tasks")
- timeline_and_scheduling_details (array of strings or a string)
- estimated_costs_per_phase_and_total: an array of objects, each containing a "phase" and a "cost" field. The array must include a final object where "phase" is "Total" and "cost" is the sum of all previous cost values in the array.
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

Include a field in the JSON output **only if** its value is not equal to 'not specified' and not equal to 'value is missing'.
If a field's value would be 'not specified' or 'value is missing', do not include the field at all.


IMPORTANT STRUCTURE REQUIREMENTS:
- Use exactly the field names above. Do NOT use different names, capitalizations, translations, or formats.
- If the input uses a different format or language, normalize it to the above field names.
- Output must be valid JSON (no comments, no extra text).
- Be extremely thorough: infer implicit requirements, list every detail, and never omit possible client needs.
- Only analyze renovation-related content.
- Always include: total_net_amount, vat_amount, total_gross_amount, final_deadline, relevant_implementation_notes_or_recommendations, and assumptions_made fields.
- Maintain a professional, supportive, and efficient tone at all times.
- Always attempt to provide values, but if a field ends up with 'not specified' or 'value is missing', do not include it in the output.
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
    const {
      recordId,
      base64DemandFile,
      fileText,
      fileType,
      fileName,
      aiAgentType,
      userEmail,
    } = await event.data;

    // Determine file extension from fileType or fileName
    const getFileExtension = () => {
      if (fileType) {
        if (fileType.includes("pdf")) return "pdf";
        if (fileType.includes("wordprocessingml")) return "docx";
        if (fileType.includes("spreadsheetml") || fileType.includes("excel"))
          return "xlsx";
        if (fileType === "text/csv") return "csv";
      }
      // Fallback to file extension if fileType is not specific enough
      if (fileName) {
        const parts = fileName.split(".");
        if (parts.length > 1) return parts.pop()?.toLowerCase();
      }
      return "bin"; // Default extension
    };

    const fileExtension = getFileExtension();

    // Upload file to Cloud
    const uploadFileUrl = await step.run("uploadFile", async () => {
      const imageKitFile = await imagekit.upload({
        file: base64DemandFile,
        fileName: `${Date.now()}.${fileExtension}`,
        isPublished: true,
      });
      return imageKitFile.url;
    });

    // Process the file text with the AI agent
    const aiDemandReport = await AiDemandAnalyzerAgent.run(fileText);

    // Process the AI response
    // @ts-ignore
    const rawContent = aiDemandReport.output[0].content;
    let parseJson;

    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : rawContent;
      parseJson = JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON from AI response:", error);
      // If parsing fails, wrap the content in a generic response
      parseJson = {
        error: "Failed to parse AI response",
        raw_content: rawContent,
        file_type: fileType,
        file_name: fileName,
      };
    }

    // Save to DB
    const saveToDb = await step.run("SaveToDb", async () => {
      const result = await prisma.history.create({
        data: {
          recordId: recordId,
          content: parseJson,
          aiAgentType: aiAgentType,
          createdAt: new Date().toISOString(),
          userEmail: userEmail,
          metaData: JSON.stringify({
            fileUrl: uploadFileUrl,
            fileType: fileType,
            fileName: fileName,
          }),
          tenantEmail: userEmail,
        },
      });
      console.log("Saved to DB:", result);
      return parseJson;
    });
  }
);

export const AiRoadmapAgent = inngest.createFunction(
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

interface EmailAnalysis {
  analysis?: {
    sender_intent?: string | null;
    main_topic?: string | null;
    key_points?: string[] | null;
    action_required?: boolean;
    priority?: 'high' | 'medium' | 'low' | null;
    deadline?: string | null;
    related_to?: 'renovation' | 'offer' | 'inquiry' | 'other' | null;
    sentiment?: 'positive' | 'neutral' | 'negative' | null;
    contact_info?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
    requirements?: {
      type?: string[] | null;
      description?: string | null;
      preferences?: string[] | null;
    };
    attachments?: {
      present?: boolean;
      types?: string[] | null;
      purpose?: string | null;
    };
    follow_up?: {
      needed?: boolean;
      when?: string | null;
      action_items?: string[] | null;
    };
  };
  summary?: {
    overview?: string;
    next_steps?: string[];
  };
  metadata?: {
    language?: string | null;
    length?: number;
    analysis_timestamp?: string;
  };
}

export const ProcessBulkEmails = inngest.createFunction(
  { id: "process-bulk-emails" },
  { event: "ProcessBulkEmails" },
  async ({ event, step }) => {
    console.log('ProcessBulkEmails function started');
    const { userEmail } = event.data;

    try {
      // Find all emails without a myWorkId and with content
      const emails = await step.run("GetEmailsWithoutWork", async () => {
        return await prisma.$queryRaw<Array<{
          id: number;
          subject: string;
          content: string;
          from: string;
          // Add other fields from your Email model as needed
        }>>`
          SELECT * FROM "Email"
          WHERE "myWorkId" IS NULL
          AND "tenantEmail" = ${userEmail}
          AND "content" IS NOT NULL
          AND "content" != ''
          ORDER BY "createdAt" DESC
        `;
      });

      console.log(`Found ${emails.length} emails to process`);

      // Process each email
      for (const email of emails) {
        if (!email.content) {
          console.log(`Skipping email ${email.id} - no content`);
          continue;
        }

        
        try {
          console.log(`Processing email: ${email.id} - ${email.subject || 'No subject'}`);
          
          // Run the EmailAnalyzerAgent outside of step.run
          const emailContent = email.content as string;
          console.log(`Analyzing email ${email.id} (${email.subject || 'No subject'})`);
          
          let analysisResult: EmailAnalysis = { analysis: {}, summary: { overview: '', next_steps: [] } };
          
          try {
            const result = await EmailAnalyzerAgent.run(emailContent);
            const firstMessage = result.output?.[0];
            let rawContent: string | undefined;

            if (firstMessage && 'content' in firstMessage) {
              // Handle regular message with content
              rawContent = firstMessage.content as string;
            } else if (firstMessage && 'tool_call_id' in firstMessage) {
              // Handle tool call message
              console.error('Received tool call message, but expected text content');
              analysisResult = { analysis: {}, summary: { overview: 'Error: Tool call not supported here', next_steps: [] } };
            }
            
            if (rawContent) {
              // Try to extract JSON from markdown code blocks
              try {
                let jsonString = rawContent;
                
                // Try to find JSON in markdown code blocks
                const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                  jsonString = jsonMatch[1];
                }
                
                // Clean up the string before parsing
                jsonString = jsonString.trim();
                
                // If the response starts with a non-JSON text, try to find the actual JSON part
                if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
                  const jsonStart = jsonString.indexOf('{');
                  if (jsonStart > 0) {
                    jsonString = jsonString.substring(jsonStart);
                  }
                }
                
                // Try to parse the JSON
                analysisResult = JSON.parse(jsonString) as EmailAnalysis;
                console.log('Successfully parsed analysis result');
              } catch (error) {
                console.error(`Error parsing analysis for email ${email.id}:`, error);
                console.log('Raw content that failed to parse:', rawContent.substring(0, 500));
                analysisResult = { 
                  analysis: {}, 
                  summary: { 
                    overview: 'Hiba az elemzés feldolgozásakor. Kérjük, ellenőrizd az e-mail tartalmát.', 
                    next_steps: [] 
                  } 
                };
              }
            }
          } catch (error) {
            console.error(`Error running EmailAnalyzerAgent for email ${email.id}:`, error);
            analysisResult = { analysis: {}, summary: { overview: 'Error analyzing email', next_steps: [] } };
          }

          // Extract location from email content or subject
          const location = (email.subject?.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]?.trim() ||
                         (typeof email.content === 'string' ? email.content.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]?.trim() : '') ||
                         analysisResult.analysis?.requirements?.description?.match(/(?:helyszín|location):?\s*([^\n,]+)/i)?.[1]?.trim() ||
                         'Ismeretlen helyszín');

          // Create or find MyWork item
          await step.run(`CreateOrUpdateMyWork-${email.id}`, async () => {
            const emailSubject = email.subject || 'Névtelen munka';
            const fromText = email.from || 'Ismeretlen feladó';
            const emailContent = email.content || '';
            
            // Extract customer name and email from the from field
            const customerName = fromText.split('<')[0]?.trim() || 'Ismeretlen ügyfél';
            const customerEmailMatch = fromText.match(/<([^>]+)>/);
            const customerEmail = customerEmailMatch ? customerEmailMatch[1] : '';
            
            // Create a description with the first 200 chars of the email
            const emailPreview = emailContent.length > 200 
              ? `${emailContent.substring(0, 200)}...` 
              : emailContent;
            const description = `E-mail kapcsolat: ${fromText}\n\n${emailPreview}`;
            
            // Build the where clause for finding existing work
            const whereClause: any = {
              tenantEmail: userEmail,
              OR: [] as any[]
            };
            
            // Only add title condition if email has a subject
            if (email.subject) {
              whereClause.OR.push({ title: email.subject });
            }
            
            // Always include location in the OR condition
            whereClause.OR.push({ location: { equals: location, mode: 'insensitive' } });
            
            // Find existing work that matches either title or location
            const existingWork = await prisma.myWork.findFirst({
              where: whereClause,
              orderBy: { createdAt: 'desc' } // Get the most recent one
            });

            if (existingWork) {
              // Update existing MyWork
              await prisma.myWork.update({
                where: { id: existingWork.id },
                data: {
                  description: description,
                  // Only update customer info if it's not set
                  customerName: existingWork.customerName || customerName,
                  customerEmail: existingWork.customerEmail || customerEmail,
                  // Update location if it was empty
                  location: existingWork.location || location
                }
              });
              
              // Link email to existing MyWork
              await prisma.email.update({
                where: { id: email.id },
                data: { myWorkId: existingWork.id }
              });
              
              console.log(`Linked email ${email.id} to existing MyWork ${existingWork.id}`);
              return { action: 'linked', workId: existingWork.id };
            } else {
              // Create new MyWork with data from email and analysis
              const newWorkData: any = {
                title: emailSubject,
                customerName: customerName,
                customerEmail: customerEmail,
                date: new Date(),
                location: location,
                time: '00:00',
                totalPrice: 0,
                description: description,
                tenantEmail: userEmail,
                workflowId: null,
                // Add additional fields from analysis if available
                customerPhone: analysisResult.analysis?.contact_info?.phone || null
              };
              
              const newWork = await prisma.myWork.create({
                data: newWorkData
              });
              
              // Link email to the new MyWork
              await prisma.email.update({
                where: { id: email.id },
                data: { myWorkId: newWork.id }
              });
              
              console.log(`Created new MyWork ${newWork.id} for email ${email.id}`);
              return { action: 'created', workId: newWork.id };
            }
          });
          
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          // Continue with next email even if one fails
          continue;
        }
      }

      return { success: true, processedCount: emails.length };
    } catch (error) {
      console.error('Error in ProcessBulkEmails:', error);
      throw error;
    }
  }
);

export const EmailAnalyzer = inngest.createFunction(
  { id: "EmailAnalyzer" },
  { event: "EmailAnalyzer" },
  async ({ event, step }) => {
    console.log('EmailAnalyzer function started', { eventId: event.id });
    const { recordId, emailContent, userEmail, metadata = {} } = event.data;
    console.log('Processing analysis for recordId:', recordId);

    try {
      // Analyze the email content using the EmailAnalyzerAgent
      console.log('Running EmailAnalyzerAgent...');
      const analysisResult = await EmailAnalyzerAgent.run(emailContent);
      console.log('EmailAnalyzerAgent completed');

      // @ts-ignore
      const rawContent = analysisResult.output[0].content;
      console.log('Raw analysis content length:', rawContent.length);
      console.log('Raw analysis content (first 500 chars):', rawContent.substring(0, 500));

      // Try to extract JSON from markdown code blocks
      let parsedAnalysis;
      try {
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : rawContent;
        console.log('Extracted JSON string (first 500 chars):', jsonString.substring(0, 500));
        
        parsedAnalysis = JSON.parse(jsonString);
        console.log('Successfully parsed JSON analysis:', JSON.stringify(parsedAnalysis, null, 2));
      } catch (error) {
        console.error("Error parsing JSON from email analysis:", error);
        // If parsing fails, include the raw content for debugging
        parsedAnalysis = {
          error: "Failed to parse email analysis",
          raw_content: rawContent?.substring(0, 500) + (rawContent?.length > 500 ? '...' : ''),
          ...metadata,
        };
        console.log('Fallback analysis content:', parsedAnalysis);
      }

      // Save the analysis to the database using Prisma
      const saveToDb = await step.run("SaveEmailAnalysis", async () => {
        try {
          console.log('Attempting to save to database with recordId:', recordId);
          console.log('Analysis content to save:', JSON.stringify(parsedAnalysis, null, 2));
          
          const data = {
            recordId: recordId,
            content: parsedAnalysis,
            aiAgentType: "/ai-tools/email-analyzer",
            userEmail: userEmail,
            metaData: JSON.stringify({
              ...metadata,
              analysis_timestamp: new Date().toISOString()
            }),
            tenantEmail: userEmail, // Make sure tenantEmail is set
            createdAt: new Date().toISOString()
          };
          
          console.log('Database insert data:', JSON.stringify(data, null, 2));
          
          const result = await prisma.history.create({
            data: data
          });
          
          console.log('Email analysis saved to DB:', {
            recordId: recordId,
            dbId: result.id,
            savedAt: new Date().toISOString()
          });
          
          // Verify the record was saved
          const savedRecord = await prisma.history.findUnique({
            where: { id: result.id }
          });
          console.log('Verified saved record:', {
            id: savedRecord?.id,
            recordId: savedRecord?.recordId,
            aiAgentType: savedRecord?.aiAgentType,
            hasContent: !!savedRecord?.content
          });
          
          return parsedAnalysis;
        } catch (error) {
          console.error('Error saving to database:', error);
          throw error;
        }
      });

      return { success: true, analysis: parsedAnalysis };
    } catch (error) {
      console.error("Error in EmailAnalyzer:", error);
      throw error;
    }
  }
);
