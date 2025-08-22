

import { GoogleGenAI } from "@google/genai";

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