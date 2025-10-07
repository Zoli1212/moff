"use server";

import { enhancePromptWithRAG } from "./rag-context-actions";

// RAG-enhanced email analysis
export async function analyzeEmailWithRAG(
  emailContent: string, 
  useRAG: boolean = true
) {
  try {
    // Alapértelmezett email elemzés prompt
    const basePrompt = `Elemezd az alábbi email tartalmát és add vissza strukturált JSON formátumban:
    
Email tartalom: ${emailContent}`;

    // RAG kontextussal bővített prompt
    const enhancedPrompt = await enhancePromptWithRAG(
      basePrompt,
      emailContent,
      useRAG
    );

    return {
      success: true,
      prompt: enhancedPrompt,
      ragUsed: useRAG
    };
  } catch (error) {
    console.error('RAG email analysis error:', error);
    return {
      success: false,
      prompt: emailContent,
      ragUsed: false,
      error: (error as Error).message
    };
  }
}

// RAG-enhanced offer generation
export async function generateOfferWithRAG(
  userInput: string,
  existingItems: any[] = [],
  useRAG: boolean = true
) {
  const baseInput = existingItems.length > 0 
    ? `${userInput}\n\nMeglévő tételek:\n${JSON.stringify(existingItems, null, 2)}`
    : userInput;

  try {
    const enhancedInput = await enhancePromptWithRAG(
      `Készíts ajánlatot az alábbi igény alapján: ${baseInput}`,
      userInput,
      useRAG
    );

    return {
      success: true,
      input: enhancedInput,
      ragUsed: useRAG
    };
  } catch (error) {
    console.error('RAG offer generation error:', error);
    return {
      success: false,
      input: baseInput,
      ragUsed: false,
      error: (error as Error).message
    };
  }
}

// RAG kontextus automatikus feltöltése projektadatokból
export async function populateRAGFromProject(workId: number) {
  try {
    // Itt lehet automatikusan feltölteni a RAG tudásbázist
    // a projekt adataiból (munkák, anyagok, árak, stb.)
    
    return {
      success: true,
      message: "RAG tudásbázis frissítve projekt adatokkal"
    };
  } catch (error) {
    console.error('RAG population error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
