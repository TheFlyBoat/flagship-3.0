import React, { useState, useCallback, useEffect } from 'react';
import type { PortfolioReviewReport } from '../../types';
import { getPortfolioReview } from '../../services/geminiService';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

const ScoreCircle: React.FC<{ score: number; label: string; max: number }> = ({ score, label, max }) => {
    const percentage = (score / max) * 100;
    const getScoreColor = (p: number) => {
        if (p < 50) return 'text-danger border-danger';
        if (p < 75) return 'text-warning border-warning';
        return 'text-success border-success';
    };
    const colorClass = getScoreColor(percentage);

    return (
        <div className="flex flex-col items-center">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${colorClass}`}>
                <span className={`text-4xl font-bold`}>
                    {score}<span className="text-2xl">/{max}</span>
                </span>
            </div>
            <h4 className="mt-2 text-lg font-semibold text-text-secondary">{label}</h4>
        </div>
    );
};

interface PortfolioReviewerProps {
    initialJobDescription?: string;
}

const PortfolioReviewer: React.FC<PortfolioReviewerProps> = ({ initialJobDescription = '' }) => {
    const [projectDescription, setProjectDescription] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [report, setReport] = useState<PortfolioReviewReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialJobDescription) {
            setTargetRole(initialJobDescription);
        }
    }, [initialJobDescription]);

    const handleSubmit = useCallback(async () => {
        if (!projectDescription || !targetRole) {
            setError('Please provide both a project description and a target role.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setReport(null);
        try {
            const result = await getPortfolioReview(projectDescription, targetRole);
            setReport(result);
        } catch (err) {
            setError('An error occurred while generating the portfolio review. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [projectDescription, targetRole]);

    return (
        <div className="space-y-8">
            <Card>
                <h2 className="text-2xl font-bold text-text-primary mb-4">Project Case Study Analysis</h2>
                <p className="text-text-secondary mb-6">Paste your project's description or case study below, along with a target role or job description. The AI will act as a hiring manager and give you feedback.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="project-description" className="block text-sm font-medium text-text-secondary mb-2">Project Description / Case Study</label>
                        <textarea
                            id="project-description"
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            placeholder="Describe the problem, your process, the technologies used, and the outcome..."
                            className="w-full h-72 p-3 bg-background border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                         <label htmlFor="target-role" className="block text-sm font-medium text-text-secondary mb-2">Target Role or Job Description</label>
                        <textarea
                            id="target-role"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            placeholder="e.g., Senior Product Designer, or paste a full job description"
                            className="w-full h-72 p-3 bg-background border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !projectDescription || !targetRole}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Analyzing Project...' : 'Feedback'}
                    </button>
                </div>
            </Card>

            {error && <Card className="border-l-4 border-danger"><p className="text-danger">{error}</p></Card>}
            {isLoading && <Card><Spinner message="Reviewing your project..." /></Card>}

            {report && (
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-2xl font-bold text-text-primary mb-4">Portfolio Review Report</h2>
                         <div className="flex flex-col md:flex-row justify-around items-center gap-8 py-4">
                            <ScoreCircle score={report.overallScore} label="Overall Score" max={100} />
                            <ScoreCircle score={report.presentationClarityScore} label="Presentation & Clarity" max={10} />
                            <ScoreCircle score={report.impactResultsScore} label="Impact & Results" max={10} />
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold text-text-primary mb-3">First Impression</h3>
                        <p className="text-text-secondary italic">"{report.firstImpression}"</p>
                    </Card>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="text-xl font-semibold text-success mb-3">Strengths</h3>
                            <ul className="list-disc list-inside space-y-2 text-text-secondary">
                                {report.strengths.map((point, i) => <li key={i}>{point}</li>)}
                            </ul>
                        </Card>
                         <Card>
                            <h3 className="text-xl font-semibold text-danger mb-3">Areas for Improvement</h3>
                             <ul className="list-disc list-inside space-y-2 text-text-secondary">
                                {report.areasForImprovement.map((point, i) => <li key={i}>{point}</li>)}
                            </ul>
                        </Card>
                    </div>

                    <Card>
                        <h3 className="text-xl font-semibold text-primary mb-3">Alignment with Target Role</h3>
                        <p className="text-text-secondary">{report.alignmentWithTargetRole}</p>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PortfolioReviewer;