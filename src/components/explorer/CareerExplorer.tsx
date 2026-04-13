import React, { useState } from 'react';
import type { CareerExplorerResponse } from '../../types';
import { exploreCareers } from '../../services/geminiService';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

interface CareerExplorerProps {
    initialCv?: string;
    onPracticeRole: (role: string) => void;
}

const CareerExplorer: React.FC<CareerExplorerProps> = ({ initialCv, onPracticeRole }) => {
    const [cvText, setCvText] = useState(initialCv || '');
    const [skills, setSkills] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<CareerExplorerResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDiscover = async () => {
        if (!cvText && !skills) {
            setError("Please provide either your CV content or a list of your skills.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const data = await exploreCareers(skills, cvText);
            setResponse(data);
        } catch (err) {
            console.error(err);
            setError("Failed to generate recommendations. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <Card>
                <div className="text-center max-w-2xl mx-auto mb-8">
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Discover Your Next Role</h2>
                    <p className="text-text-secondary text-lg mb-6">
                        Not sure what job title fits you best? Paste your CV or list your core skills, and our AI will uncover high-alignment roles you might not have considered.
                    </p>
                    <a
                        href="https://flagshipchart.web.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-surface border border-border rounded-2xl hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Want a much deeper, visual career map? Try FlagShip Chart
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Option 1: Paste Your Full CV
                        </label>
                        <textarea
                            value={cvText}
                            onChange={(e) => setCvText(e.target.value)}
                            placeholder="Paste your full CV text here..."
                            className="w-full h-64 flex-grow p-3 bg-background border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Option 2: List Specific Skills or Tags
                        </label>
                        <textarea
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            placeholder="e.g. React, Product Strategy, Public Speaking, Python..."
                            className="w-full h-64 flex-grow p-3 bg-background border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                        />
                    </div>
                </div>

                {error && <p className="text-danger mt-4 font-medium text-center">{error}</p>}

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleDiscover}
                        disabled={isLoading || (!cvText && !skills)}
                        className="px-8 py-3 bg-primary text-white font-bold text-lg rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                        {isLoading ? 'Scanning Career Alignments...' : 'Discover Roles'}
                    </button>
                </div>
            </Card>

            {isLoading && (
                <Card>
                    <Spinner message="Brainstorming unexpected career paths based on your profile..." />
                </Card>
            )}

            {response && response.recommendations && (
                <div>
                    <h3 className="text-2xl font-bold text-text-primary mb-6">Top AI Recommendations</h3>
                    <div className="grid grid-cols-1 gap-6">
                        {response.recommendations.map((rec, idx) => (
                            <Card key={idx} className="border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h4 className="text-xl font-bold text-primary">{rec.roleTitle}</h4>
                                        <span className="bg-success-bg text-success-text px-3 py-1 rounded-full text-sm font-bold">
                                            {rec.matchPercentage}% Match
                                        </span>
                                    </div>
                                    <p className="text-text-primary font-medium mb-1">Why it fits:</p>
                                    <p className="text-text-secondary mb-3">{rec.whyItFits}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-background p-3 rounded-xl border border-border">
                                        <div>
                                            <span className="font-semibold text-text-primary block mb-1">Potential Gaps:</span>
                                            <span className="text-text-secondary">{rec.potentialGaps}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-text-primary block mb-1">Market Salary Range:</span>
                                            <span className="text-success font-medium">{rec.salaryRangeEntry}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 self-stretch sm:self-auto flex sm:items-center">
                                    <button
                                        onClick={() => onPracticeRole(rec.roleTitle)}
                                        className="w-full sm:w-auto px-6 py-3 bg-secondary text-white font-bold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                                    >
                                        Practice this Role
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CareerExplorer;
