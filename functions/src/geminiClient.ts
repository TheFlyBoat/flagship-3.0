import * as functions from "firebase-functions";
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI Client with the API key from environment config
const ai = new GoogleGenAI({ apiKey: functions.config().gemini?.key || 'fallback-key' });

/**
 * A helper function to call the Gemini API and handle structured responses.
 * @param {string} model The Gemini model to use.
 * @param {unknown} prompt The prompt to send to the model.
 * @param {unknown} [schema] Optional schema for JSON output.
 * @return {Promise<any>} The response from the model.
 */
export const callGemini = async (
    model: string,
    prompt: unknown,
    schema?: unknown,
) => {
    try {
        const config: { responseMimeType?: string, responseSchema?: unknown } = {};
        if (schema) {
            config.responseMimeType = "application/json";
            config.responseSchema = schema;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt as any,
            config: config,
        });

        if (schema) {
            // For JSON responses, parse the text.
            return JSON.parse(response.text?.trim() || "{}");
        }
        // For text responses, return the text directly.
        return { text: response.text };
    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to call Gemini API",
        );
    }
};
