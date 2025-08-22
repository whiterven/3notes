import { GoogleGenAI, Type } from "@google/genai";
import type { Note } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following note in one short, concise sentence: "${text}"`,
            config: {
                temperature: 0.3,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw new Error("Failed to connect with the AI for summarization.");
    }
}

export async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
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
        throw new Error("Failed to connect with the AI for image generation.");
    }
}

export async function generateImagePrompt(text: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following note, create a short, creative, and visually descriptive prompt for an image generation AI. The prompt should be a single, concise sentence, suitable for a model like Imagen. Do not add quotes or labels. Note: "${text}"`,
            config: {
                temperature: 0.7,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating image prompt:", error);
        throw new Error("Failed to connect with the AI for prompt suggestion.");
    }
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
    try {
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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to connect with the AI for transcription.");
    }
}


export async function extractTasks(text: string): Promise<string[]> {
    try {
        const response = await ai.models.generateContent({
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
        throw new Error("Failed to connect with the AI for task extraction.");
    }
}

export async function findRelatedNotes(currentNote: Note, allNotes: Note[]): Promise<string[]> {
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
        const response = await ai.models.generateContent({
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
        throw new Error("Failed to connect with the AI to find related notes.");
    }
}

export async function queryNotes(query: string, allNotes: Note[]): Promise<string> {
    const notesContext = allNotes.map(note => {
        const textContent = (note.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 500);
        return `
            Note ID: ${note.id}
            Tags: [${(note.tags || []).join(', ')}]
            Content: ${textContent}
            ${note.summary ? `AI Summary: ${note.summary}` : ''}
        `.trim();
    }).join('\n---\n');

    const systemInstruction = `You are a helpful AI assistant integrated into a notetaking app. Your task is to answer the user's questions based *only* on the provided notes context. Do not use any external knowledge. If the answer cannot be found in the notes, state that clearly. Format your response using simple markdown (bold, italics, and unordered lists) for better readability. Here is the context of all the user's notes:\n\n${notesContext}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: query,
            config: { systemInstruction }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error querying notes:", error);
        throw new Error("Failed to get a response from the AI assistant.");
    }
}