import { GoogleGenAI, Type } from '@google/genai';

const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

// Extracted from functions/src/index.ts
const atsReportSchema = {
    type: Type.OBJECT,
    properties: {
        companyName: { type: Type.STRING },
        roleTitle: { type: Type.STRING },
        candidateName: { type: Type.STRING },
        fitScore: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        matchingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        skillGapAnalysis: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    skill: { type: Type.STRING },
                    inCv: { type: Type.BOOLEAN },
                    inJd: { type: Type.BOOLEAN },
                },
            },
        },
        toneAnalysis: {
            type: Type.OBJECT,
            properties: {
                feedback: { type: Type.STRING },
                suggestion: { type: Type.STRING },
            },
        },
        radarChartData: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    fullMark: { type: Type.NUMBER, default: 100 },
                },
            },
        },
    },
};

const interviewFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
        overallScore: { type: Type.NUMBER, description: "Score from 1 to 10" },
    },
};

const projectIdeaSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            skillsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
    },
};

const portfolioReviewSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.NUMBER, description: "Score from 0 to 100" },
        firstImpression: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
        alignmentWithTargetRole: { type: Type.STRING },
        presentationClarityScore: {
            type: Type.NUMBER,
            description: "Score out of 10",
        },
        impactResultsScore: {
            type: Type.NUMBER,
            description: "Score out of 10",
        },
    },
};

const careerExplorerSchema = {
    type: Type.OBJECT,
    properties: {
        recommendations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    roleTitle: { type: Type.STRING, description: "The recommended job title" },
                    matchPercentage: { type: Type.NUMBER, description: "Estimated fit out of 100" },
                    whyItFits: { type: Type.STRING, description: "Short explanation of why these skills fit this role" },
                    potentialGaps: { type: Type.STRING, description: "What they might need to learn" },
                    salaryRangeEntry: { type: Type.STRING, description: "rough estimated salary range" },
                }
            }
        }
    }
};

const callGemini = async (model: string, prompt: unknown, schema?: unknown) => {
    const ai = getAiClient();
    if (!ai) throw new Error("Local Gemini client not available");

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
        return JSON.parse(response.text?.trim() || "{}");
    }
    return { text: response.text };
};

export const executeLocalGeminiCall = async (endpoint: string, data: any): Promise<any> => {
    switch (endpoint) {
        case "getAtsReport": {
            const { cv, jobDescription } = data;
            const prompt = `
        Act as an expert ATS and career coach. Analyze the provided CV
        against the Job Description. Return a JSON object.

        CV: """${cv}"""
        Job Description: """${jobDescription}"""
      `;
            return await callGemini("gemini-2.5-flash", prompt, atsReportSchema);
        }

        case "getInterviewQuestions": {
            const { role, isNonCodingAiMode } = data;
            const specialization = isNonCodingAiMode ?
                `This is for a NON-CODING AI role (e.g., AI Product Manager).
         Focus on conceptual, strategic, and ethical questions.` :
                `This is for a standard technical role.
         Focus on behavioral and technical questions.`;

            const prompt = `
        Generate exactly 5 interview questions for the role of "${role}".
        ${specialization} Return a JSON object with a single key "questions"
        which is an array of strings.`;
            const res = await callGemini(
                "gemini-2.5-flash",
                prompt,
                {
                    type: Type.OBJECT,
                    properties: {
                        questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                },
            );
            return res.questions;
        }

        case "getInterviewFeedback": {
            const { question, answer, isNonCodingAiMode } = data;
            const specializationSchema = isNonCodingAiMode ?
                {
                    nonCodingAiFeedbackCheck: {
                        type: Type.OBJECT, properties: {
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
                } :
                {
                    starMethodCheck: {
                        type: Type.OBJECT, properties: {
                            situation: { type: Type.BOOLEAN }, task: { type: Type.BOOLEAN },
                            action: { type: Type.BOOLEAN }, result: { type: Type.BOOLEAN },
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
            return await callGemini(
                "gemini-2.5-flash",
                prompt,
                {
                    type: Type.OBJECT,
                    properties: {
                        ...interviewFeedbackSchema.properties, ...specializationSchema,
                    },
                },
            );
        }

        case "generateOptimizedCv": {
            const { cv, jobDescription, report } = data;
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
            const res = await callGemini("gemini-2.5-pro", prompt);
            return { optimizedCv: res.text };
        }

        case "generatePitch": {
            const { cv, jobDescription, report, pitchType } = data;
            const format = pitchType === "coverLetter" ?
                "a professional cover letter" :
                "a concise LinkedIn connection request message";
            const prompt = `
        Act as a career coach. Using the CV, Job Description, and ATS
        Report, write ${format}. The tone should be professional,
        confident, and tailored to the role.

        CV: """${cv}"""
        Job Description: """${jobDescription}"""
        ATS Report Insights: """${JSON.stringify(report)}"""
      `;
            const res = await callGemini("gemini-2.5-pro", prompt);
            return { pitch: res.text };
        }

        case "getProjectIdeas": {
            const { missingSkills } = data;
            const prompt = `
        I'm a job seeker trying to fill skill gaps. My CV is missing these
        keywords: ${missingSkills.join(", ")}. Suggest 3 simple but
        impressive portfolio project ideas I could build to demonstrate
        these skills. Return a JSON array of objects.`;
            return await callGemini(
                "gemini-2.5-flash",
                prompt,
                projectIdeaSchema,
            );
        }

        case "getPortfolioReview": {
            const { projectDescription, targetRole } = data;
            const prompt = `
        Act as a hiring manager for the role: "${targetRole}". Review this
        project case study and provide feedback as a JSON object.

        Project Description: """${projectDescription}"""`;
            return await callGemini(
                "gemini-2.5-flash",
                prompt,
                portfolioReviewSchema,
            );
        }

        case "exploreCareers": {
            const { skills, cvText } = data;
            const inputData = skills ? `User explicitly listed these skills/tags: ${skills}` : `User provided their CV:\n${cvText}`;

            const prompt = `Based on the following input, act as an expert Career Discovery Coach.
        Analyze the skills, background, and explicitly stated tags, and suggest 5 specific, slightly unexpected but highly aligned job titles that the user is qualified for but might not have considered. For example, instead of just 'Software Engineer', suggest things like 'Developer Advocate', 'Sales Engineer', or 'Technical Product Manager'.
        Make sure these roles are viable for the user's skill set.

        Input:
        ${inputData}`;

            return await callGemini(
                "gemini-2.5-flash",
                prompt,
                careerExplorerSchema,
            );
        }

        case "extractTextFromImage": {
            const { base64Data, mimeType } = data;
            const prompt = [
                { text: "You are an OCR expert. Extract the text perfectly from this image as it appears. Ensure formatting is mostly preserved where possible. Only return the extracted text, absolutely NO conversational text." },
                { inlineData: { data: base64Data, mimeType: mimeType } }
            ];
            const res = await callGemini("gemini-2.5-pro", prompt);
            return { text: res.text };
        }

        default:
            throw new Error(`Endpoint ${endpoint} not supported locally.`);
    }
};

export const executeLocalGeminiStream = async function* (endpoint: string, data: any): AsyncGenerator<string, void, unknown> {
    const ai = getAiClient();
    if (!ai) throw new Error("Local Gemini client not available");

    if (endpoint === "generateOptimizedCvStream") {
        const { cv, jobDescription, report } = data;
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

        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        for await (const chunk of result) {
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } else {
        throw new Error(`Streaming endpoint ${endpoint} not supported locally.`);
    }
};
