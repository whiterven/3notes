import { GoogleGenAI, Type, Content } from "@google/genai";
import type { Note } from '../types';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  // This warning will be visible in the developer console.
  console.warn("API_KEY environment variable for Gemini is not set. AI features will be disabled.");
}

// Helper function to ensure the AI client is available before making a call.
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("AI features are disabled. API_KEY is not configured.");
    }
    return ai;
}


const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // The result includes the Base64 prefix "data:audio/wav;base64,", we remove it.
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export async function summarizeText(text: string): Promise<string> {
    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following note in one short, concise sentence: "${text}"`,
            config: {
                temperature: 0.3,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing text:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI for summarization.");
    }
}

export async function generateImage(prompt: string): Promise<string> {
    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3',
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI for image generation.");
    }
}

export async function generateImagePrompt(text: string): Promise<string> {
    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following note, create a short, creative, and visually descriptive prompt for an image generation AI. The prompt should be a single, concise sentence, suitable for a model like Imagen. Do not add quotes or labels. Note: "${text}"`,
            config: {
                temperature: 0.7,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating image prompt:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI for prompt suggestion.");
    }
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
    try {
        const aiClient = getAiClient();
        const audioBlob = await fetch(audioUrl).then(res => res.blob());
        if (audioBlob.size === 0) {
            throw new Error("Audio blob is empty.");
        }
        const base64Audio = await blobToBase64(audioBlob);

        const audioPart = {
            inlineData: {
                mimeType: 'audio/wav',
                data: base64Audio,
            },
        };

        const textPart = {
            text: 'Transcribe this audio recording into text.',
        };

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI for transcription.");
    }
}


export async function extractTasks(text: string): Promise<string[]> {
    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following note and extract any action items or tasks. If there are no tasks, return an empty array. Note: "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tasks: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["tasks"]
                }
            }
        });
        const result = JSON.parse(response.text);
        return result.tasks || [];
    } catch (error) {
        console.error("Error extracting tasks:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI for task extraction.");
    }
}

export async function findRelatedNotes(currentNote: Note, allNotes: Note[]): Promise<string[]> {
    const aiClient = getAiClient();
    const otherNotes = allNotes
        .filter(n => n.id !== currentNote.id)
        .map(n => ({ 
            id: n.id, 
            text: (n.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 200), // snippet of plain text
            tags: n.tags, 
            summary: n.summary 
        }));

    if (otherNotes.length === 0) return [];
    
    const context = `
        Current Note (ID: ${currentNote.id}):
        Text: ${(currentNote.text || "").replace(/<[^>]*>?/gm, ' ')}
        Tags: ${(currentNote.tags || []).join(', ')}
        Summary: ${currentNote.summary || 'N/A'}

        List of other notes:
        ${JSON.stringify(otherNotes)}

        Based on the content of the "Current Note", find up to 3 most relevant notes from the "List of other notes".
        Return only the IDs of the related notes.
    `;
    
    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: context,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        relatedNoteIds: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["relatedNoteIds"]
                }
            }
        });
        const result = JSON.parse(response.text);
        return result.relatedNoteIds || [];
    } catch (error) {
        console.error("Error finding related notes:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI to find related notes.");
    }
}

export async function expandNoteText(text: string): Promise<string> {
    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The following is a user's note. Expand on this idea, adding more details, potential features, target audiences, or related concepts. Format the output as clean HTML using <p>, <ul>, <li>, <strong>, and <em> tags. Do not include <html> or <body> tags. Note: "${text}"`,
            config: {
                temperature: 0.7,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error expanding note text:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI for note expansion.");
    }
}

export async function generateInsights(allNotes: Note[]): Promise<string> {
    const aiClient = getAiClient();
    const notesContext = allNotes.map(note => {
        const textContent = (note.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 500);
        return `
            Note (Tags: [${(note.tags || []).join(', ')}]):
            ${textContent}
            ${note.summary ? `Summary: ${note.summary}` : ''}
        `.trim();
    }).join('\n---\n');

    if (notesContext.trim().length === 0) {
        return "There are no notes to analyze yet. Start writing to discover insights!";
    }

    const prompt = `As an AI analyst, review the following collection of notes. Identify emerging themes, surprising connections between different notes, and potential action items that span across multiple ideas. Present your findings as a concise summary. Use markdown for formatting (e.g., headings, bold text, bullet points). \n\nNotes:\n${notesContext}`;

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
             config: {
                temperature: 0.5,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating insights:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to connect with the AI to generate insights.");
    }
}


export interface AiResponse {
    type: 'answer' | 'note' | 'update';
    content: string;
    noteData?: {
        id?: string;
        text?: string;
        tags?: string[];
        color?: string;
    };
    groundingMetadata?: any;
}

export async function queryNotes(query: string, allNotes: Note[], useWebSearch: boolean, chatHistory: Content[]): Promise<AiResponse> {
     const aiClient = getAiClient();
     if (useWebSearch) {
        try {
            const contents: Content[] = [
                ...chatHistory,
                {
                    role: 'user',
                    parts: [{ text: `First, review the following notes context and our conversation history to see if you can answer the user's query. If the answer is not in the notes, use your search tool to find a relevant, up-to-date answer. \n\nUSER QUERY: "${query}"\n\nNOTES CONTEXT:\n${allNotes.map(n => n.text.replace(/<[^>]*>?/gm, ' ')).join('\n---\n')}` }]
                }
            ];

            const response = await aiClient.models.generateContent({
               model: "gemini-2.5-flash",
               contents: contents,
               config: {
                 tools: [{googleSearch: {}}],
               },
            });

            return {
                type: 'answer',
                content: response.text,
                groundingMetadata: response.candidates?.[0]?.groundingMetadata?.groundingChunks || null,
            };

        } catch (error) {
            console.error("Error querying with web search:", error);
            if (error instanceof Error && error.message.includes("API_KEY")) throw error;
            throw new Error("Failed to get a response from the AI assistant with web search.");
        }
    }

    const notesContext = allNotes.map(note => {
        const textContent = (note.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 500);
        return `
            Note ID: ${note.id}
            Tags: [${(note.tags || []).join(', ')}]
            Content: ${textContent}
            ${note.summary ? `AI Summary: ${note.summary}` : ''}
        `.trim();
    }).join('\n---\n');

    const tools = {
        functionDeclarations: [
            {
                name: "create_note",
                description: "Creates a new note with the given text content and tags.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        text: {
                            type: Type.STRING,
                            description: "The full HTML content of the note to be created. Use <p> and <ul> tags for formatting."
                        },
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Up to 3 relevant tags for the note."
                        }
                    },
                    required: ["text", "tags"]
                }
            },
            {
                name: "update_note",
                description: "Updates an existing note with new text, tags, or color. The AI must infer the noteId from the user's query and the notes context.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        noteId: {
                            type: Type.STRING,
                            description: "The ID of the note to update."
                        },
                        text: {
                            type: Type.STRING,
                            description: "The new full HTML content for the note. If not provided, the text will not be changed."
                        },
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "An array of new tags. This will replace all existing tags. If not provided, tags will not be changed."
                        },
                        color: {
                            type: Type.STRING,
                            description: "The new background color class for the note. Available options: 'bg-amber-100', 'bg-sky-100', 'bg-lime-100', 'bg-rose-100', 'bg-violet-100', 'bg-white'."
                        }
                    },
                    required: ["noteId"]
                }
            }
        ]
    };

    const systemInstruction = `You are a helpful AI assistant in a notetaking app.
- Your primary job is to answer questions based *only* on the provided notes context and conversation history. Do not use external knowledge. If the answer isn't in the notes, say so. Format your answers using simple markdown.
- If the user explicitly asks you to create a note (e.g., "make a note about...", "jot down an idea for..."), you MUST use the 'create_note' tool. Do not answer in text.
- If the user asks to modify, change, add to, or update an existing note, you MUST use the 'update_note' tool. You must find the correct noteId from the context. Do not answer in text.`;
    
    const contents: Content[] = [
        ...chatHistory,
        {
            role: 'user',
            parts: [{ text: `User query: "${query}"\n\nNotes context:\n${notesContext}` }]
        }
    ];

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction,
                tools: [tools]
            },
        });

        // Check for function call
        const functionCall = response.candidates?.[0]?.content?.parts?.find(part => part.functionCall)?.functionCall;

        if (functionCall) {
            if (functionCall.name === 'create_note') {
                const { text, tags } = functionCall.args;
                return {
                    type: 'note',
                    content: "I've created that note for you.",
                    noteData: {
                        text: (text as string) || '',
                        tags: (tags as string[]) || [],
                    },
                };
            }
            if (functionCall.name === 'update_note') {
                const { noteId, text, tags, color } = functionCall.args;
                 if (!noteId) {
                    return { type: 'answer', content: "I'm sorry, I couldn't figure out which note to update. Can you be more specific?" };
                }
                return {
                    type: 'update',
                    content: "I've updated that note for you.",
                    noteData: {
                        id: noteId as string,
                        text: text as string | undefined,
                        tags: tags as string[] | undefined,
                        color: color as string | undefined,
                    },
                };
            }
        }
        
        // If no function call, return text response
        return {
            type: 'answer',
            content: response.text || "I'm sorry, I couldn't process that request.",
        };
    } catch (error) {
        console.error("Error querying notes:", error);
        if (error instanceof Error && error.message.includes("API_KEY")) throw error;
        throw new Error("Failed to get a response from the AI assistant.");
    }
}