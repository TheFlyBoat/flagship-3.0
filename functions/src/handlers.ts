import * as functions from "firebase-functions";
import { Type } from "@google/genai";
import { callGemini } from "./geminiClient";
import {
    atsReportSchema,
    interviewFeedbackSchema,
    projectIdeaSchema,
    portfolioReviewSchema,
    careerExplorerSchema,
} from "./schemas";

export const getAtsReportHandler = async (req: any, res: any) => {
    const { cv, jobDescription } = req.body;
    const prompt = `
    Act as an expert ATS and career coach. Analyze the provided CV
    against the Job Description. Return a JSON object.

    CV: """${cv}"""
    Job Description: """${jobDescription}"""
  `;
    const result = await callGemini("gemini-2.5-flash", prompt, atsReportSchema);
    res.status(200).send(result);
};

export const getInterviewQuestionsHandler = async (req: any, res: any) => {
    const { role, isNonCodingAiMode } = req.body;
    const specialization = isNonCodingAiMode
        ? `This is for a NON-CODING AI role (e.g., AI Product Manager).
       Focus on conceptual, strategic, and ethical questions.`
        : `This is for a standard technical role.
       Focus on behavioral and technical questions.`;

    const prompt = `
    Generate exactly 5 interview questions for the role of "${role}".
    ${specialization} Return a JSON object with a single key "questions"
    which is an array of strings.`;

    const response = await callGemini("gemini-2.5-flash", prompt, {
        type: Type.OBJECT,
        properties: {
            questions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
    });
    res.status(200).send(response.questions);
};

export const getInterviewFeedbackHandler = async (req: any, res: any) => {
    const { question, answer, isNonCodingAiMode } = req.body;
    const specializationSchema = isNonCodingAiMode
        ? {
            nonCodingAiFeedbackCheck: {
                type: Type.OBJECT,
                properties: {
                    conceptualClarity: {
                        type: Type.STRING,
                        description: "Clarity on complex AI concepts.",
                    },
                    strategicThinking: {
                        type: Type.STRING,
                        description: "Connecting AI to business value.",
                    },
                    ethicalAwareness: {
                        type: Type.STRING,
                        description: "Understanding of AI ethics.",
                    },
                },
            },
        }
        : {
            starMethodCheck: {
                type: Type.OBJECT,
                properties: {
                    situation: { type: Type.BOOLEAN },
                    task: { type: Type.BOOLEAN },
                    action: { type: Type.BOOLEAN },
                    result: { type: Type.BOOLEAN },
                    feedback: {
                        type: Type.STRING,
                        description: "Feedback on STAR method usage.",
                    },
                },
            },
        };

    const prompt = `
    Act as an interview coach. Here is a question and the candidate's
    answer. Provide feedback as a JSON object.
    Question: "${question}"
    Answer: "${answer}"`;

    const result = await callGemini("gemini-2.5-flash", prompt, {
        type: Type.OBJECT,
        properties: {
            ...interviewFeedbackSchema.properties,
            ...specializationSchema,
        },
    });
    res.status(200).send(result);
};

export const generateOptimizedCvHandler = async (req: any, res: any) => {
    const { cv, jobDescription, report } = req.body;
    const prompt = `
    Act as a professional resume writer. Rewrite the following CV to be
    perfectly optimized for the given job description, using insights
    from the provided ATS report. Incorporate "missingKeywords" and
    address "toneAnalysis" suggestions. Ensure the output is only the
    full, rewritten CV text.

    Original CV: """${cv}"""
    Job Description: """${jobDescription}"""
    ATS Report Insights: """${JSON.stringify(report)}"""
  `;
    const response = await callGemini("gemini-2.5-flash", prompt);
    res.status(200).send({ optimizedCv: response.text });
};

export const generatePitchHandler = async (req: any, res: any) => {
    const { cv, jobDescription, report, pitchType } = req.body;
    const format =
        pitchType === "coverLetter"
            ? "a professional cover letter"
            : "a concise LinkedIn connection request message";
    const prompt = `
    Act as a career coach. Using the CV, Job Description, and ATS
    Report, write ${format}. The tone should be professional,
    confident, and tailored to the role.

    CV: """${cv}"""
    Job Description: """${jobDescription}"""
    ATS Report Insights: """${JSON.stringify(report)}"""
  `;
    const response = await callGemini("gemini-2.5-flash", prompt);
    res.status(200).send({ pitch: response.text });
};

export const getProjectIdeasHandler = async (req: any, res: any) => {
    const { missingSkills } = req.body;
    const prompt = `
    I'm a job seeker trying to fill skill gaps. My CV is missing these
    keywords: ${missingSkills.join(", ")}. Suggest 3 simple but
    impressive portfolio project ideas I could build to demonstrate
    these skills. Return a JSON array of objects.`;
    const result = await callGemini("gemini-2.5-flash", prompt, projectIdeaSchema);
    res.status(200).send(result);
};

export const getPortfolioReviewHandler = async (req: any, res: any) => {
    const { projectDescription, targetRole } = req.body;
    const prompt = `
    Act as a hiring manager for the role: "${targetRole}". Review this
    project case study and provide feedback as a JSON object.

    Project Description: """${projectDescription}"""`;
    const result = await callGemini("gemini-2.5-flash", prompt, portfolioReviewSchema);
    res.status(200).send(result);
};

export const exploreCareersHandler = async (req: any, res: any) => {
    const { skills, cvText } = req.body;
    if (!skills && !cvText) {
        return res.status(400).json({ error: 'Must provide either skills or cvText.' });
    }

    const inputData = skills ? `User explicitly listed these skills/tags: ${skills}` : `User provided their CV:\n${cvText}`;

    const prompt = `Based on the following input, act as an expert Career Discovery Coach.
Analyze the skills, background, and explicitly stated tags, and suggest 5 specific, slightly unexpected but highly aligned job titles that the user is qualified for but might not have considered. For example, instead of just 'Software Engineer', suggest things like 'Developer Advocate', 'Sales Engineer', or 'Technical Product Manager'.
Make sure these roles are viable for the user's skill set.

Input:
${inputData}
`;

    try {
        const result = await callGemini("gemini-2.5-flash", prompt, careerExplorerSchema);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error exploring careers:", error);
        return res.status(500).json({ error: 'Failed to explore careers' });
    }
};

export const extractTextFromImageHandler = async (req: any, res: any) => {
    const { base64Data, mimeType } = req.body;
    if (!base64Data || !mimeType) {
        return res.status(400).json({ error: 'Must provide base64Data and mimeType' });
    }

    const payload = [
        { text: "You are an OCR expert. Extract the text perfectly from this image as it appears. Ensure formatting is mostly preserved where possible. Only return the extracted text, absolutely NO conversational text." },
        { inlineData: { data: base64Data, mimeType: mimeType } }
    ];

    try {
        const result = await callGemini("gemini-2.5-pro", payload);
        return res.status(200).json({ text: result.text });
    } catch (error) {
        console.error("Error extracting text from image:", error);
        return res.status(500).json({ error: 'Failed to extract text' });
    }
};
