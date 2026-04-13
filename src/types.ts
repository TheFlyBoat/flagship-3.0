export enum AppView {
  ATS = 'ATS Optimiser',
  Portfolio = 'Portfolio Reviewer',
  Tracker = 'Application Tracker',
  Interview = 'AI Interview Coach',
  Explore = 'Role Discovery'
}

export interface RadarChartData {
  subject: string;
  score: number;
  fullMark: number;
}

export interface ToneAnalysis {
  feedback: string;
  suggestion: string;
}

export interface SkillGap {
  skill: string;
  inCv: boolean;
  inJd: boolean;
}

export interface ATSReport {
  fitScore: number;
  summary: string;
  matchingKeywords: string[];
  missingKeywords: string[];
  skillGapAnalysis: SkillGap[];
  toneAnalysis: ToneAnalysis;
  radarChartData: RadarChartData[];
  companyName: string;
  roleTitle: string;
  candidateName: string;
}

export interface InterviewQuestion {
  question: string;
  answer: string;
  feedback: InterviewFeedback | null;
}

export interface StarMethodCheck {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  feedback: string;
}

export interface NonCodingAiFeedbackCheck {
  conceptualClarity: string;
  strategicThinking: string;
  ethicalAwareness: string;
}

export interface InterviewFeedback {
  positivePoints: string[];
  areasForImprovement: string[];
  starMethodCheck?: StarMethodCheck;
  nonCodingAiFeedbackCheck?: NonCodingAiFeedbackCheck;
  overallScore: number;
  followUpQuestion?: string;
}

export enum ApplicationStatus {
  Applied = 'Applied',
  Interview = 'Interview',
  Offer = 'Offer',
  Rejected = 'Rejected',
}

export interface RoleRecommendation {
  roleTitle: string;
  matchPercentage: number;
  whyItFits: string;
  potentialGaps: string;
  salaryRangeEntry: string;
}

export interface CareerExplorerResponse {
  recommendations: RoleRecommendation[];
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  fitScore?: number;
  cvUsed?: string;
}

export interface ProjectIdea {
  title: string;
  description: string;
  skillsCovered: string[];
}

export interface PortfolioReviewReport {
  overallScore: number;
  firstImpression: string;
  strengths: string[];
  areasForImprovement: string[];
  alignmentWithTargetRole: string;
  presentationClarityScore: number; // Score out of 10
  impactResultsScore: number; // Score out of 10
}