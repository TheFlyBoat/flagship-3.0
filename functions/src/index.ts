import * as functions from "firebase-functions";
import * as cors from "cors";
import {
  getAtsReportHandler,
  getInterviewQuestionsHandler,
  getInterviewFeedbackHandler,
  generateOptimizedCvHandler,
  generatePitchHandler,
  getProjectIdeasHandler,
  getPortfolioReviewHandler,
  exploreCareersHandler,
  extractTextFromImageHandler
} from "./handlers";

const corsHandler = cors({ origin: true });

// Route map matches endpoint names to their respective handlers
const routes: Record<string, (req: any, res: any) => Promise<void>> = {
  getAtsReport: getAtsReportHandler,
  getInterviewQuestions: getInterviewQuestionsHandler,
  getInterviewFeedback: getInterviewFeedbackHandler,
  generateOptimizedCv: generateOptimizedCvHandler,
  generatePitch: generatePitchHandler,
  getProjectIdeas: getProjectIdeasHandler,
  getPortfolioReview: getPortfolioReviewHandler,
  exploreCareers: exploreCareersHandler,
  extractTextFromImage: extractTextFromImageHandler
};

export const geminiApiProxy = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    // Determine the endpoint from the URL path. e.g., /geminiApiProxy/getAtsReport
    const endpoint = request.path.split("/").pop();

    if (!endpoint || !routes[endpoint]) {
      response.status(404).send({
        error: "Not Found: The requested API endpoint does not exist or is unsupported.",
      });
      return;
    }

    try {
      // Execute the matched route handler
      await routes[endpoint](request, response);
    } catch (error) {
      console.error(`Error in geminiApiProxy [${endpoint}]:`, error);
      if (error instanceof functions.https.HttpsError) {
        response.status(error.httpErrorCode.status).send({ error: error.message });
      } else {
        response.status(500).send({ error: "An unexpected error occurred processing your request." });
      }
    }
  });
});
