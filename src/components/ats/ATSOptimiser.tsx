import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { getAtsReport, extractTextFromImage } from '../../services/geminiService';
import type { ATSReport, SkillGap } from '../../types';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import ScoreChart from './ScoreChart';
import AtsNextSteps from './AtsNextSteps';
import { ICONS } from '../../constants';
import { parseFile } from '../../utils/fileParsing';

const KeywordPill: React.FC<{ keyword: string; type: 'matching' | 'missing' }> = ({ keyword, type }) => {
    const typeClasses = type === 'matching'
        ? "bg-success-bg text-success-text"
        : "bg-danger-bg text-danger-text";
    return <span className={`px-3 py-1 text-sm rounded-full font-medium ${typeClasses}`}>{keyword}</span>;
};

const SkillGapTable: React.FC<{ skills: SkillGap[] }> = ({ skills }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Skill</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">In Your CV</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">In Job Description</th>
                </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
                {skills.map((skill, index) => (
                    <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{skill.skill}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{skill.inCv ? ICONS.Check : ICONS.Cross}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{skill.inJd ? ICONS.Check : ICONS.Cross}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

interface ATSOptimiserProps {
    theme: string;
    onAddApplication: (appData: { company: string; role: string; fitScore: number; cvUsed: string; }) => void;
    onJobDescriptionSubmit: (jd: string) => void;
    cvContent: string;
    onCvChange: (cv: string) => void;
}

const ATSOptimiser: React.FC<ATSOptimiserProps> = ({ theme, onAddApplication, onJobDescriptionSubmit, cvContent, onCvChange }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [report, setReport] = useState<ATSReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cvFileName, setCvFileName] = useState('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setCvFileName('');
            onCvChange('');
            return;
        }

        setCvFileName(file.name);
        setError(null);
        onCvChange('');

        try {
            const parsedText = await parseFile(file);
            onCvChange(parsedText);
        } catch (errorMessage: any) {
            setError(errorMessage.toString());
            setCvFileName('');
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!cvContent || !jobDescription) {
            setError('Please provide both your CV and the Job Description.');
            return;
        }
        onJobDescriptionSubmit(jobDescription);
        setIsLoading(true);
        setError(null);
        setReport(null);
        try {
            const result = await getAtsReport(cvContent, jobDescription);
            setReport(result);
        } catch (err) {
            setError('An error occurred while generating the report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [cvContent, jobDescription, onJobDescriptionSubmit]);

    const handleFetchUrl = async () => {
        const url = prompt("Enter the Job Description URL (e.g. from LinkedIn, Greenhouse):");
        if (!url || !url.startsWith("http")) return;

        setIsScraping(true);
        setError(null);

        let rawHtml = '';
        try {
            // Attempt 1: CodeTabs Proxy
            const res1 = await fetch(`https://api.codetabs.com/v1/proxy?quest=${url}`);
            if (res1.ok) {
                rawHtml = await res1.text();
            } else {
                throw new Error("CodeTabs failed");
            }
        } catch (e1) {
            try {
                // Attempt 2: allOrigins raw
                const res2 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
                if (res2.ok) {
                    rawHtml = await res2.text();
                } else {
                    throw new Error("allOrigins failed");
                }
            } catch (e2) {
                setError("Anti-bot protected URL (CORS blocked). Please manually paste the text.");
                setIsScraping(false);
                return;
            }
        }

        try {
            if (rawHtml) {
                // Strip scripts, styles, and tags
                const textContent = rawHtml
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();

                // Usually JDs are in the middle of standard nav bars. Set constraint.
                setJobDescription(textContent.substring(0, 15000));
            } else {
                setError("Could not extract any content from this URL.");
            }
        } catch (e) {
            setError("Failed to process the fetched URL content.");
        } finally {
            setIsScraping(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScraping(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result as string;
            if (!result) return;

            const matches = result.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                setError("Invalid image file.");
                setIsScraping(false);
                return;
            }

            const mimeType = matches[1];
            const base64Data = matches[2];

            try {
                const extractedText = await extractTextFromImage(base64Data, mimeType);
                setJobDescription(extractedText.trim().substring(0, 15000));
            } catch (err) {
                console.error(err);
                setError("Failed to extract text from the image.");
            } finally {
                setIsScraping(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.onerror = () => {
            setError("Failed to read the image file.");
            setIsScraping(false);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-8">
            <Card>
                <h2 className="text-2xl font-bold text-text-primary mb-4">CV & Job Description</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                        <div className="flex items-center h-10 mb-2">
                            <label
                                htmlFor="cv-upload"
                                className="cursor-pointer text-sm font-semibold bg-primary text-white px-4 py-2 rounded-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 transition-opacity"
                            >
                                Choose File
                            </label>
                            <input id="cv-upload" type="file" onChange={handleFileChange} className="hidden" accept=".txt,.pdf,.docx" />
                            {cvFileName && (
                                <span className="ml-4 text-sm text-text-secondary truncate">
                                    {cvFileName}
                                </span>
                            )}
                        </div>
                        <textarea
                            value={cvContent}
                            onChange={(e) => onCvChange(e.target.value)}
                            placeholder="...or paste your CV content here"
                            className="w-full h-64 flex-grow p-3 bg-background border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center h-10 mb-2">
                            <label htmlFor="job-description" className="block text-sm font-medium text-text-secondary">Job Description</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="jd-image-upload"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <label
                                    htmlFor="jd-image-upload"
                                    className={`cursor-pointer text-xs font-semibold px-3 py-1.5 bg-surface border border-border text-text-primary rounded-xl transition-all duration-200 ${isScraping ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-sm'}`}
                                >
                                    Upload Image
                                </label>
                                <button
                                    onClick={handleFetchUrl}
                                    disabled={isScraping}
                                    className="text-xs font-semibold px-3 py-1.5 bg-surface border border-border text-text-primary rounded-xl hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isScraping ? 'Processing...' : 'Extract from URL'}
                                </button>
                            </div>
                        </div>
                        <textarea
                            id="job-description"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the full job description or valid URL here..."
                            className="w-full h-64 flex-grow p-3 bg-background border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !cvContent || !jobDescription}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Analyzing...' : 'Analyse'}
                    </button>
                </div>
            </Card>

            {error && <Card className="border-l-4 border-danger"><p className="text-danger">{error}</p></Card>}
            {isLoading && <Card><Spinner message="Generating your detailed ATS report..." /></Card>}

            {report && (
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">Analysis for {report.roleTitle} at {report.companyName}</h2>
                        <ScoreChart score={report.fitScore} data={report.radarChartData} theme={theme} />
                        <p className="mt-6 text-text-secondary">{report.summary}</p>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold text-text-primary mb-4">Keyword Analysis</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-success mb-2">Matching Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {report.matchingKeywords.map(k => <KeywordPill key={k} keyword={k} type="matching" />)}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-danger mb-2">Missing Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {report.missingKeywords.map(k => <KeywordPill key={k} keyword={k} type="missing" />)}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold text-text-primary mb-4">Skill Gap Analysis</h3>
                        <SkillGapTable skills={report.skillGapAnalysis} />
                    </Card>

                    <Card>
                        <h3 className="text-xl font-semibold text-text-primary mb-4">Tone & Professionalism</h3>
                        <p className="text-text-secondary mb-2">{report.toneAnalysis.feedback}</p>
                        <p className="text-sm text-primary"><span className="font-semibold">Suggestion:</span> {report.toneAnalysis.suggestion}</p>
                    </Card>

                    <AtsNextSteps
                        report={report}
                        cvContent={cvContent}
                        jobDescription={jobDescription}
                        onAddApplication={onAddApplication}
                    />
                </div>
            )}
        </div>
    );
};

export default ATSOptimiser;