import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { generateOptimizedCvStream, getProjectIdeas, generatePitch } from '../../services/geminiService';
import type { ATSReport, ProjectIdea } from '../../types';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import DiffViewer from './DiffViewer';

interface AtsNextStepsProps {
    report: ATSReport;
    cvContent: string;
    jobDescription: string;
    onAddApplication: (appData: { company: string; role: string; fitScore: number; cvUsed: string; }) => void;
}

const AtsNextSteps: React.FC<AtsNextStepsProps> = ({ report, cvContent, jobDescription, onAddApplication }) => {
    const [optimizedCv, setOptimizedCv] = useState<string | null>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[] | null>(null);
    const [isRewritingCv, setIsRewritingCv] = useState(false);
    const [isGeneratingProjects, setIsGeneratingProjects] = useState(false);
    const [rewriteError, setRewriteError] = useState<string | null>(null);
    const [projectsError, setProjectsError] = useState<string | null>(null);

    const [generatedContent, setGeneratedContent] = useState<{ type: 'coverLetter' | 'linkedInPitch', content: string } | null>(null);
    const [isGeneratingContent, setIsGeneratingContent] = useState<'coverLetter' | 'linkedInPitch' | false>(false);
    const [contentError, setContentError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [addedToTracker, setAddedToTracker] = useState(false);

    const handleDownloadPdf = (content: string, filename: string) => {
        const doc = new jsPDF();
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const textWidth = pageWidth - margin * 2;
        let y = margin;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        const lines = doc.splitTextToSize(content, textWidth);

        lines.forEach((line: string) => {
            const lineHeight = 5;
            if (y + lineHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += lineHeight;
        });

        doc.save(filename);
    };

    const handleDownloadTxt = (content: string, filename: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleRewriteCv = useCallback(async () => {
        if (!report || !cvContent || !jobDescription) return;
        setIsRewritingCv(true);
        setRewriteError(null);
        setOptimizedCv('');
        try {
            const stream = generateOptimizedCvStream(cvContent, jobDescription, report);
            for await (const chunk of stream) {
                setOptimizedCv(prev => (prev || '') + chunk);
            }
        } catch (err) {
            setRewriteError('An error occurred while rewriting your CV. Please try again.');
        } finally {
            setIsRewritingCv(false);
        }
    }, [cvContent, jobDescription, report]);

    const formatProjectIdeasForDownload = (ideas: ProjectIdea[]): string => {
        return ideas.map(idea => {
            return `Project: ${idea.title}\n\nDescription: ${idea.description}\n\nSkills Covered: ${idea.skillsCovered.join(', ')}\n\n---\n\n`;
        }).join('');
    };

    const handleGenerateProjects = useCallback(async () => {
        if (!report || report.missingKeywords.length === 0) return;
        setIsGeneratingProjects(true);
        setProjectsError(null);
        setProjectIdeas(null);
        try {
            const skillsToLearn = report.missingKeywords;
            const result = await getProjectIdeas(skillsToLearn);
            setProjectIdeas(result);
        } catch (err) {
            setProjectsError('An error occurred while generating project ideas. Please try again.');
        } finally {
            setIsGeneratingProjects(false);
        }
    }, [report]);

    const handleGenerateContent = useCallback(async (type: 'coverLetter' | 'linkedInPitch') => {
        if (!report || !cvContent || !jobDescription) return;
        setIsGeneratingContent(type);
        setContentError(null);
        setGeneratedContent(null);
        try {
            const result = await generatePitch(cvContent, jobDescription, report, type);
            setGeneratedContent({ type, content: result });
        } catch (err) {
            setContentError(`An error occurred while generating the ${type === 'coverLetter' ? 'cover letter' : 'LinkedIn pitch'}. Please try again.`);
        } finally {
            setIsGeneratingContent(false);
        }
    }, [cvContent, jobDescription, report]);

    const handleAddToTracker = useCallback(() => {
        if (report) {
            onAddApplication({
                company: report.companyName,
                role: report.roleTitle,
                fitScore: report.fitScore,
                cvUsed: cvContent,
            });
            setAddedToTracker(true);
        }
    }, [report, cvContent, onAddApplication]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const getFileNameSafeString = (name: string) => {
        if (!name) return '';
        return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    };

    const isNextStepLoading = isRewritingCv || isGeneratingProjects || !!isGeneratingContent;

    return (
        <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Next Steps: Improve Your Score</h2>
            <div className="space-y-8">
                <div className="p-4 border border-border rounded-2xl">
                    <h3 className="text-xl font-semibold text-text-primary">Action: Track This Application</h3>
                    <p className="text-text-secondary text-sm my-2">Add this analysis to your Kanban board to track its progress through the hiring process.</p>
                    <button
                        onClick={handleAddToTracker}
                        disabled={addedToTracker}
                        className="px-6 py-2 bg-secondary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {addedToTracker ? 'Added to Tracker!' : 'Add to Application Tracker'}
                    </button>
                </div>

                <div className="p-4 border border-border rounded-2xl">
                    <h3 className="text-xl font-semibold text-text-primary">1. Automated CV Rewrite</h3>
                    <p className="text-text-secondary text-sm my-2">Let AI rewrite your CV to incorporate missing keywords and improve its tone based on the analysis.</p>
                    <button
                        onClick={handleRewriteCv}
                        disabled={isNextStepLoading}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isRewritingCv ? 'Rewriting...' : 'Rewrite My CV'}
                    </button>
                    {isRewritingCv && <Spinner message="Optimizing your CV..." />}
                    {rewriteError && <p className="text-danger mt-2">{rewriteError}</p>}
                    {optimizedCv && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-4">
                                    <h4 className="font-semibold text-text-primary">Your Optimized CV:</h4>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowDiff(false)}
                                            className={`text-sm px-2 py-1 rounded ${!showDiff ? 'bg-primary-bg text-primary-text' : 'text-text-secondary hover:bg-surface'}`}
                                        >
                                            Raw Output
                                        </button>
                                        <button
                                            onClick={() => setShowDiff(true)}
                                            className={`text-sm px-2 py-1 rounded ${showDiff ? 'bg-primary-bg text-primary-text' : 'text-text-secondary hover:bg-surface'}`}
                                        >
                                            View Changes
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const safeCandidateName = getFileNameSafeString(report!.candidateName || 'Candidate');
                                        const safeRole = getFileNameSafeString(report!.roleTitle);
                                        const safeCompany = getFileNameSafeString(report!.companyName);
                                        const filename = `${safeCandidateName}_${safeRole}_${safeCompany}_CV.pdf`;
                                        handleDownloadPdf(optimizedCv, filename);
                                    }}
                                    className="px-4 py-2 bg-secondary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary text-sm"
                                >
                                    Download
                                </button>
                            </div>
                            {showDiff ? (
                                <DiffViewer oldText={cvContent} newText={optimizedCv} />
                            ) : (
                                <textarea
                                    readOnly
                                    value={optimizedCv}
                                    className="w-full h-96 p-3 bg-background border border-border rounded-xl text-text-primary"
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border border-border rounded-2xl">
                    <h3 className="text-xl font-semibold text-text-primary">2. Cover Letter & Pitch Generator</h3>
                    <p className="text-text-secondary text-sm my-2">Create a compelling narrative for recruiters. Generate a full cover letter or a concise pitch for platforms like LinkedIn.</p>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => handleGenerateContent('coverLetter')} disabled={isNextStepLoading} className="px-6 py-2 bg-primary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {isGeneratingContent === 'coverLetter' ? 'Generating...' : 'Cover Letter'}
                        </button>
                        <button onClick={() => handleGenerateContent('linkedInPitch')} disabled={isNextStepLoading} className="px-6 py-2 bg-secondary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {isGeneratingContent === 'linkedInPitch' ? 'Generating...' : 'LinkedIn'}
                        </button>
                    </div>
                    {isGeneratingContent && <Spinner message="Crafting your pitch..." />}
                    {contentError && <p className="text-danger mt-2">{contentError}</p>}
                    {generatedContent && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-text-primary">Your Generated {generatedContent.type === 'coverLetter' ? 'Cover Letter' : 'LinkedIn Pitch'}:</h4>
                                {generatedContent.type === 'coverLetter' ? (
                                    <button
                                        onClick={() => {
                                            const safeCandidateName = getFileNameSafeString(report!.candidateName || 'Candidate');
                                            const safeRole = getFileNameSafeString(report!.roleTitle);
                                            const safeCompany = getFileNameSafeString(report!.companyName);
                                            const filename = `${safeCandidateName}_${safeRole}_${safeCompany}_CoverLetter.pdf`;
                                            handleDownloadPdf(generatedContent.content, filename);
                                        }}
                                        className="px-4 py-2 bg-secondary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 text-sm"
                                    >
                                        Download
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => copyToClipboard(generatedContent.content)} className="px-3 py-1 bg-surface text-sm rounded hover:bg-background border border-border">
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={() => handleDownloadTxt(generatedContent.content, `${generatedContent.type}.txt`)}
                                            className="px-3 py-1 bg-surface text-sm rounded hover:bg-background border border-border"
                                        >
                                            Download .txt
                                        </button>
                                    </div>
                                )}
                            </div>
                            <textarea
                                readOnly
                                value={generatedContent.content}
                                className="w-full h-96 p-3 bg-background border border-border rounded-xl text-text-primary"
                            />
                        </div>
                    )}
                </div>

                <div className="p-4 border border-border rounded-2xl">
                    <h3 className="text-xl font-semibold text-text-primary">3. Portfolio Project Ideas</h3>
                    <p className="text-text-secondary text-sm my-2">Bridge your skill gaps by building a small project. Here are some ideas based on the missing keywords.</p>
                    <button
                        onClick={handleGenerateProjects}
                        disabled={isNextStepLoading || report.missingKeywords.length === 0}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGeneratingProjects ? 'Generating Ideas...' : 'Suggest Projects'}
                    </button>
                    {report.missingKeywords.length === 0 && <p className="text-sm text-text-secondary mt-2">No missing keywords found to generate project ideas from.</p>}

                    {isGeneratingProjects && <Spinner message="Brainstorming projects..." />}
                    {projectsError && <p className="text-danger mt-2">{projectsError}</p>}
                    {projectIdeas && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-text-primary">Generated Project Ideas:</h4>
                                <button
                                    onClick={() => handleDownloadPdf(formatProjectIdeasForDownload(projectIdeas), 'Project_Ideas_FlagShip.pdf')}
                                    className="px-4 py-2 bg-secondary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 text-sm"
                                >
                                    Download
                                </button>
                            </div>
                            <div className="space-y-4">
                                {projectIdeas.map((idea, index) => (
                                    <Card key={index} className="bg-background border border-border">
                                        <h4 className="font-bold text-primary">{idea.title}</h4>
                                        <p className="text-sm text-text-secondary my-2">{idea.description}</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-semibold text-text-secondary mr-2">Skills:</span>
                                            {idea.skillsCovered.map(skill => (
                                                <span key={skill} className="px-2 py-1 text-xs rounded-full bg-primary-bg text-primary-text font-medium">{skill}</span>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default AtsNextSteps;
