import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { getAtsReport, generateOptimizedCv, getProjectIdeas, generatePitch } from '../../services/geminiService';
import type { ATSReport, SkillGap, ProjectIdea } from '../../types';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import ScoreChart from './ScoreChart';
import { ICONS } from '../../constants';

// Setup PDF.js worker to parse PDFs in a separate thread.
// The version must match the one specified in the index.html importmap.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

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
    const [error, setError] = useState<string | null>(null);

    const [optimizedCv, setOptimizedCv] = useState<string | null>(null);
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
    const [cvFileName, setCvFileName] = useState('');

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
            const lineHeight = 5; // Approximate line height for font size 11
            if (y + lineHeight > pageHeight - margin) {
                doc.addPage();
                y = margin; // Reset y position to top of new page
            }
            doc.text(line, margin, y);
            y += lineHeight;
        });

        doc.save(filename);
    };

    const handleDownloadTxt = (content: string, filename: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], {type: 'text/plain;charset=utf-8'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setCvFileName('');
            onCvChange('');
            return;
        }

        setCvFileName(file.name);
        setError(null);
        onCvChange('');

        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // .docx
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) {
                    setError('Failed to read file.');
                    setCvFileName('');
                    return;
                }
                try {
                    const arrayBuffer = e.target.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    onCvChange(result.value);
                } catch (docxError) {
                    console.error('Error parsing DOCX:', docxError);
                    setError('Failed to read the DOCX file. It might be corrupted.');
                    setCvFileName('');
                }
            };
            reader.onerror = () => {
                setError('Error reading file.');
                setCvFileName('');
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) {
                    setError('Failed to read file.');
                    setCvFileName('');
                    return;
                }
                try {
                    const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    onCvChange(fullText.trim());
                } catch (pdfError) {
                    console.error('Error parsing PDF:', pdfError);
                    setError('Failed to read the PDF file. It might be corrupted or in an unsupported format.');
                    setCvFileName('');
                }
            };
            reader.onerror = () => {
                setError('Error reading file.');
                setCvFileName('');
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                onCvChange(e.target?.result as string);
            };
            reader.onerror = () => {
                setError('Error reading file.');
                setCvFileName('');
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            setError(`Unsupported file type: '${file.name}'. Please upload a .txt, .pdf, or .docx file.`);
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
        setOptimizedCv(null);
        setProjectIdeas(null);
        setGeneratedContent(null);
        setAddedToTracker(false);
        try {
            const result = await getAtsReport(cvContent, jobDescription);
            setReport(result);
        } catch (err) {
            setError('An error occurred while generating the report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [cvContent, jobDescription, onJobDescriptionSubmit]);

    const handleRewriteCv = useCallback(async () => {
        if (!report || !cvContent || !jobDescription) return;
        setIsRewritingCv(true);
        setRewriteError(null);
        setOptimizedCv(null);
        try {
            const result = await generateOptimizedCv(cvContent, jobDescription, report);
            setOptimizedCv(result);
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
        // Replaces whitespace with underscore and removes characters that are unsafe in filenames
        return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    };

    const isNextStepLoading = isRewritingCv || isGeneratingProjects || !!isGeneratingContent;

    return (
        <div className="space-y-8">
            <Card>
                <h2 className="text-2xl font-bold text-text-primary mb-4">CV & Job Description</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center">
                            <label
                                htmlFor="cv-upload"
                                className="cursor-pointer text-sm font-semibold bg-primary text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
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
                            className="mt-2 w-full h-48 p-3 bg-background border border-border rounded-md text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div>
                         <label htmlFor="job-description" className="block text-sm font-medium text-text-secondary mb-2">Job Description</label>
                        <textarea
                            id="job-description"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the full job description here"
                            className="w-full h-60 p-3 bg-background border border-border rounded-md text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !cvContent || !jobDescription}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

                    <Card>
                        <h2 className="text-2xl font-bold text-text-primary mb-4">Next Steps: Improve Your Score</h2>
                        <div className="space-y-8">

                             <div className="p-4 border border-border rounded-lg">
                                <h3 className="text-xl font-semibold text-text-primary">Action: Track This Application</h3>
                                <p className="text-text-secondary text-sm my-2">Add this analysis to your Kanban board to track its progress through the hiring process.</p>
                                <button
                                    onClick={handleAddToTracker}
                                    disabled={addedToTracker}
                                    className="px-6 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {addedToTracker ? 'Added to Tracker!' : 'Add to Application Tracker'}
                                </button>
                             </div>
                            
                            <div className="p-4 border border-border rounded-lg">
                                <h3 className="text-xl font-semibold text-text-primary">1. Automated CV Rewrite</h3>
                                <p className="text-text-secondary text-sm my-2">Let AI rewrite your CV to incorporate missing keywords and improve its tone based on the analysis.</p>
                                <button
                                    onClick={handleRewriteCv}
                                    disabled={isNextStepLoading}
                                    className="px-6 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isRewritingCv ? 'Rewriting...' : 'Rewrite My CV'}
                                </button>
                                {isRewritingCv && <Spinner message="Optimizing your CV..." />}
                                {rewriteError && <p className="text-danger mt-2">{rewriteError}</p>}
                                {optimizedCv && (
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold text-text-primary">Your Optimized CV:</h4>
                                            <button
                                                onClick={() => {
                                                    const safeCandidateName = getFileNameSafeString(report.candidateName || 'Candidate');
                                                    const safeRole = getFileNameSafeString(report.roleTitle);
                                                    const safeCompany = getFileNameSafeString(report.companyName);
                                                    const filename = `${safeCandidateName}_${safeRole}_${safeCompany}_CV.pdf`;
                                                    handleDownloadPdf(optimizedCv, filename);
                                                }}
                                                className="px-4 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary text-sm"
                                            >
                                                Download
                                            </button>
                                        </div>
                                        <textarea
                                            readOnly
                                            value={optimizedCv}
                                            className="w-full h-96 p-3 bg-background border border-border rounded-md text-text-primary"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border border-border rounded-lg">
                                <h3 className="text-xl font-semibold text-text-primary">2. Cover Letter & Pitch Generator</h3>
                                <p className="text-text-secondary text-sm my-2">Create a compelling narrative for recruiters. Generate a full cover letter or a concise pitch for platforms like LinkedIn.</p>
                                <div className="flex flex-wrap gap-4">
                                    <button onClick={() => handleGenerateContent('coverLetter')} disabled={isNextStepLoading} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        {isGeneratingContent === 'coverLetter' ? 'Generating...' : 'Cover Letter'}
                                    </button>
                                    <button onClick={() => handleGenerateContent('linkedInPitch')} disabled={isNextStepLoading} className="px-6 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
                                                        const safeCandidateName = getFileNameSafeString(report.candidateName || 'Candidate');
                                                        const safeRole = getFileNameSafeString(report.roleTitle);
                                                        const safeCompany = getFileNameSafeString(report.companyName);
                                                        const filename = `${safeCandidateName}_${safeRole}_${safeCompany}_CoverLetter.pdf`;
                                                        handleDownloadPdf(generatedContent.content, filename);
                                                    }}
                                                    className="px-4 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 text-sm"
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
                                            className="w-full h-96 p-3 bg-background border border-border rounded-md text-text-primary"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border border-border rounded-lg">
                                <h3 className="text-xl font-semibold text-text-primary">3. Portfolio Project Ideas</h3>
                                <p className="text-text-secondary text-sm my-2">Bridge your skill gaps by building a small project. Here are some ideas based on the missing keywords.</p>
                                <button
                                    onClick={handleGenerateProjects}
                                    disabled={isNextStepLoading || report.missingKeywords.length === 0}
                                    className="px-6 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                                className="px-4 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 text-sm"
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
                </div>
            )}
        </div>
    );
};

export default ATSOptimiser;