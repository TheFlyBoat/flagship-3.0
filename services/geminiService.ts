import type { ATSReport, InterviewFeedback, ProjectIdea, PortfolioReviewReport } from '../types';

// IMPORTANT: DEPLOYMENT INSTRUCTIONS
// To securely hide your API key for Firebase deployment, you must proxy your Gemini API calls
// through a backend service like Firebase Cloud Functions.
// 1. Create a Firebase Cloud Function that receives requests from this frontend.
// 2. In your function, use the @google/genai SDK to call the Gemini API.
//    Store your API key securely in Firebase's environment variables.
// 3. Replace the placeholder URL below with your actual Cloud Function URL.
const GEMINI_PROXY_URL = 'https://us-central1-your-project-id.cloudfunctions.net/geminiApiProxy'; // <-- REPLACE THIS

/**
 * A helper function to call the backend proxy.
 * @param endpoint - The specific API endpoint to hit on the proxy (e.g., 'getAtsReport').
 * @param body - The data to send in the request body.
 * @returns The JSON response from the proxy.
 */
const callGeminiProxy = async (endpoint: string, body: object): Promise<any> => {
    if (GEMINI_PROXY_URL.includes('your-project-id')) {
        throw new Error("Please update the `GEMINI_PROXY_URL` in `services/geminiService.ts` with your actual Firebase Function URL.");
    }

    try {
        const response = await fetch(`${GEMINI_PROXY_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Error from proxy endpoint ${endpoint}:`, errorBody);
            throw new Error(`API call to ${endpoint} failed with status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Network or fetch error when calling ${endpoint}:`, error);
        throw new Error(`Failed to communicate with the backend proxy service.`);
    }
};

export const getAtsReport = async (cv: string, jobDescription: string): Promise<ATSReport> => {
    return callGeminiProxy('getAtsReport', { cv, jobDescription });
};

export const getInterviewQuestions = async (role: string, isNonCodingAiMode: boolean): Promise<string[]> => {
    return callGeminiProxy('getInterviewQuestions', { role, isNonCodingAiMode });
};

export const getInterviewFeedback = async (question: string, answer: string, isNonCodingAiMode: boolean): Promise<InterviewFeedback> => {
    return callGeminiProxy('getInterviewFeedback', { question, answer, isNonCodingAiMode });
};

export const generateOptimizedCv = async (cv: string, jobDescription: string, report: ATSReport): Promise<string> => {
    const response = await callGeminiProxy('generateOptimizedCv', { cv, jobDescription, report });
    if (typeof response.optimizedCv !== 'string') {
        throw new Error("Invalid response format for optimized CV from proxy.");
    }
    return response.optimizedCv;
};

export const getProjectIdeas = async (missingSkills: string[]): Promise<ProjectIdea[]> => {
    return callGeminiProxy('getProjectIdeas', { missingSkills });
};

export const generatePitch = async (cv: string, jobDescription: string, report: ATSReport, pitchType: 'coverLetter' | 'linkedInPitch'): Promise<string> => {
    const response = await callGeminiProxy('generatePitch', { cv, jobDescription, report, pitchType });
    if (typeof response.pitch !== 'string') {
        throw new Error("Invalid response format for pitch from proxy.");
    }
    return response.pitch;
};

export const getPortfolioReview = async (projectDescription: string, targetRole: string): Promise<PortfolioReviewReport> => {
    return callGeminiProxy('getPortfolioReview', { projectDescription, targetRole });
};
