import { Type } from "@google/genai";

export const atsReportSchema = {
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

export const interviewFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
        overallScore: { type: Type.NUMBER, description: "Score from 1 to 10" },
        followUpQuestion: {
            type: Type.STRING,
            description: "A probing follow-up question directly related to the user's answer to dive deeper. If the answer was perfect, leave empty."
        },
    },
};

export const projectIdeaSchema = {
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

export const careerExplorerSchema = {
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

export const portfolioReviewSchema = {
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
