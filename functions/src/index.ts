
import * as functions from "firebase-functions";
import * as cors from "cors";
import {GoogleGenAI, Type} from "@google/genai";

// Initialize CORS middleware to allow requests from your web app
const corsHandler = cors({origin: true});

// Initialize the Gemini AI Client with the API key from environment config
const ai = new GoogleGenAI({apiKey: functions.config().gemini.key});

/**
 * A helper function to call the Gemini API and handle structured responses.
 * @param {string} model The Gemini model to use.
 * @param {unknown} prompt The prompt to send to the model.
 * @param {unknown} [schema] Optional schema for JSON output.
 * @return {Promise<any>} The response from the model.
 */
const callGemini = async (
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
      contents: prompt,
      config: config,
    });

    if (schema) {
      // For JSON responses, parse the text.
      return JSON.parse(response.text.trim());
    }
    // For text responses, return the text directly.
    return {text: response.text};
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to call Gemini API",
    );
  }
};

export const geminiApiProxy = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    // The last part of the URL path determines which function to run
    // e.g., /geminiApiProxy/getAtsReport -> endpoint = "getAtsReport"
    const endpoint = request.path.split("/").pop();
    const data = request.body;

    try {
      let result: any;

      switch (endpoint) {
        case "getAtsReport": {
          const {cv, jobDescription} = data;
          const prompt = `
            Act as an expert ATS and career coach. Analyze the provided CV
            against the Job Description. Return a JSON object.

            CV: """${cv}"""
            Job Description: """${jobDescription}"""
          `;
          result = await callGemini("gemini-2.5-flash", prompt, atsReportSchema);
          break;
        }

        case "getInterviewQuestions": {
          const {role, isNonCodingAiMode} = data;
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
                questions: {type: Type.ARRAY, items: {type: Type.STRING}},
              },
            },
          );
          result = res.questions;
          break;
        }

        case "getInterviewFeedback": {
          const {question, answer, isNonCodingAiMode} = data;
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
                  situation: {type: Type.BOOLEAN}, task: {type: Type.BOOLEAN},
                  action: {type: Type.BOOLEAN}, result: {type: Type.BOOLEAN},
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
          result = await callGemini(
            "gemini-2.5-flash",
            prompt,
            {
              type: Type.OBJECT,
              properties: {
                ...interviewFeedbackSchema.properties, ...specializationSchema,
              },
            },
          );
          break;
        }

        case "generateOptimizedCv": {
          const {cv, jobDescription, report} = data;
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
          const res = await callGemini("gemini-2.5-flash", prompt);
          result = {optimizedCv: res.text};
          break;
        }

        case "generatePitch": {
          const {cv, jobDescription, report, pitchType} = data;
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
          const res = await callGemini("gemini-2.5-flash", prompt);
          result = {pitch: res.text};
          break;
        }

        case "getProjectIdeas": {
          const {missingSkills} = data;
          const prompt = `
            I'm a job seeker trying to fill skill gaps. My CV is missing these
            keywords: ${missingSkills.join(", ")}. Suggest 3 simple but
            impressive portfolio project ideas I could build to demonstrate
            these skills. Return a JSON array of objects.`;
          result = await callGemini(
            "gemini-2.5-flash",
            prompt,
            projectIdeaSchema,
          );
          break;
        }

        case "getPortfolioReview": {
          const {projectDescription, targetRole} = data;
          const prompt = `
            Act as a hiring manager for the role: "${targetRole}". Review this
            project case study and provide feedback as a JSON object.

            Project Description: """${projectDescription}"""`;
          result = await callGemini(
            "gemini-2.5-flash",
            prompt,
            portfolioReviewSchema,
          );
          break;
        }

        default:
          throw new functions.https.HttpsError(
            "not-found",
            "The requested API endpoint does not exist.",
          );
      }

      response.status(200).send(result);
    } catch (error) {
      console.error("Error in geminiApiProxy:", error);
      if (error instanceof functions.https.HttpsError) {
        response.status(error.httpErrorCode.status)
          .send({error: error.message});
      } else {
        response.status(500).send({error: "An unexpected error occurred."});
      }
    }
  });
});

// Schemas for structured JSON responses from Gemini

const atsReportSchema = {
  type: Type.OBJECT,
  properties: {
    companyName: {type: Type.STRING},
    roleTitle: {type: Type.STRING},
    candidateName: {type: Type.STRING},
    fitScore: {type: Type.NUMBER},
    summary: {type: Type.STRING},
    matchingKeywords: {type: Type.ARRAY, items: {type: Type.STRING}},
    missingKeywords: {type: Type.ARRAY, items: {type: Type.STRING}},
    skillGapAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: {type: Type.STRING},
          inCv: {type: Type.BOOLEAN},
          inJd: {type: Type.BOOLEAN},
        },
      },
    },
    toneAnalysis: {
      type: Type.OBJECT,
      properties: {
        feedback: {type: Type.STRING},
        suggestion: {type: Type.STRING},
      },
    },
    radarChartData: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          subject: {type: Type.STRING},
          score: {type: Type.NUMBER},
          fullMark: {type: Type.NUMBER, default: 100},
        },
      },
    },
  },
};

const interviewFeedbackSchema = {
  type: Type.OBJECT,
  properties: {
    positivePoints: {type: Type.ARRAY, items: {type: Type.STRING}},
    areasForImprovement: {type: Type.ARRAY, items: {type: Type.STRING}},
    overallScore: {type: Type.NUMBER, description: "Score from 1 to 10"},
  },
};

const projectIdeaSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {type: Type.STRING},
      description: {type: Type.STRING},
      skillsCovered: {type: Type.ARRAY, items: {type: Type.STRING}},
    },
  },
};

const portfolioReviewSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {type: Type.NUMBER, description: "Score from 0 to 100"},
    firstImpression: {type: Type.STRING},
    strengths: {type: Type.ARRAY, items: {type: Type.STRING}},
    areasForImprovement: {type: Type.ARRAY, items: {type: Type.STRING}},
    alignmentWithTargetRole: {type: Type.STRING},
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
