import React, { useState, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { getInterviewQuestions, getInterviewFeedback } from '../../services/geminiService';
import type { InterviewQuestion, InterviewFeedback } from '../../types';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import { ICONS } from '../../constants';

interface FeedbackDisplayProps {
    feedback: InterviewFeedback;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback }) => {
    const StarCheck: React.FC<{ label: string, checked: boolean }> = ({ label, checked }) => (
        <div className={`flex items-center space-x-2 p-2 rounded-lg ${checked ? 'bg-success-bg' : 'bg-danger-bg'}`}>
            {checked ? ICONS.Check : ICONS.Cross}
            <span className={`text-sm font-medium ${checked ? 'text-success-text' : 'text-danger-text'}`}>{label}</span>
        </div>
    );

    return (
        <div className="mt-4 space-y-4 p-4 border-t-2 border-border">
            <h4 className="text-lg font-semibold text-primary">Feedback</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h5 className="font-semibold text-success mb-2">Positive Points</h5>
                    <ul className="list-disc list-inside space-y-1 text-text-secondary">
                        {feedback.positivePoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>
                <div>
                    <h5 className="font-semibold text-danger mb-2">Areas for Improvement</h5>
                    <ul className="list-disc list-inside space-y-1 text-text-secondary">
                        {feedback.areasForImprovement.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </div>
            </div>

            {feedback.starMethodCheck && (
                <div>
                    <h5 className="font-semibold text-primary mb-2">STAR Method Analysis</h5>
                    <div className="flex flex-wrap gap-2">
                        <StarCheck label="Situation" checked={feedback.starMethodCheck.situation} />
                        <StarCheck label="Task" checked={feedback.starMethodCheck.task} />
                        <StarCheck label="Action" checked={feedback.starMethodCheck.action} />
                        <StarCheck label="Result" checked={feedback.starMethodCheck.result} />
                    </div>
                    <p className="text-sm mt-2 text-text-secondary">{feedback.starMethodCheck.feedback}</p>
                </div>
            )}
            
            {feedback.nonCodingAiFeedbackCheck && (
                 <div>
                    <h5 className="font-semibold text-primary mb-2">Non-Coding AI Role Analysis</h5>
                    <div className="space-y-2 text-sm">
                        <p><strong className="text-text-primary">Conceptual Clarity:</strong> {feedback.nonCodingAiFeedbackCheck.conceptualClarity}</p>
                        <p><strong className="text-text-primary">Strategic Thinking:</strong> {feedback.nonCodingAiFeedbackCheck.strategicThinking}</p>
                        <p><strong className="text-text-primary">Ethical Awareness:</strong> {feedback.nonCodingAiFeedbackCheck.ethicalAwareness}</p>
                    </div>
                </div>
            )}

             <div>
                <h5 className="font-semibold text-text-secondary">Overall Score: <span className="text-xl text-secondary">{feedback.overallScore}/10</span></h5>
            </div>
        </div>
    );
};

interface InterviewCoachProps {
    initialRole?: string;
}

const InterviewCoach: React.FC<InterviewCoachProps> = ({ initialRole }) => {
    const [role, setRole] = useState('');
    const [isNonCodingAiMode, setIsNonCodingAiMode] = useState(false);
    const [interviewState, setInterviewState] = useState<'setup' | 'in_progress' | 'finished'>('setup');
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSavedSession, setHasSavedSession] = useState(false);

    useEffect(() => {
        try {
            const savedData = localStorage.getItem('interviewSession');
            if (savedData) {
                setHasSavedSession(true);
            } else if (initialRole) {
                setRole(initialRole);
            }
        } catch (error) {
            console.error("Failed to check for saved interview session:", error);
        }
    }, [initialRole]);

    useEffect(() => {
        if (interviewState === 'in_progress' || interviewState === 'finished') {
            try {
                const sessionData = {
                    role,
                    isNonCodingAiMode,
                    questions,
                    currentQuestionIndex,
                    interviewState,
                };
                localStorage.setItem('interviewSession', JSON.stringify(sessionData));
            } catch (error) {
                console.error("Failed to save interview session:", error);
            }
        }
    }, [interviewState, role, isNonCodingAiMode, questions, currentQuestionIndex]);

    const startInterview = useCallback(async () => {
        if (!role) {
            setError('Please enter a role to start the interview.');
            return;
        }
        try {
            localStorage.removeItem('interviewSession');
            setHasSavedSession(false);
        } catch (error) {
            console.error("Failed to clear previous session:", error);
        }
        setIsLoading(true);
        setError(null);
        try {
            const fetchedQuestions = await getInterviewQuestions(role, isNonCodingAiMode);
            setQuestions(fetchedQuestions.map(q => ({ question: q, answer: '', feedback: null })));
            setCurrentQuestionIndex(0);
            setCurrentAnswer('');
            setInterviewState('in_progress');
        } catch (err) {
            setError('Failed to fetch interview questions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [role, isNonCodingAiMode]);

    const resumeInterview = useCallback(() => {
        try {
            const savedData = localStorage.getItem('interviewSession');
            if (savedData) {
                const session = JSON.parse(savedData);
                setRole(session.role);
                setIsNonCodingAiMode(session.isNonCodingAiMode);
                setQuestions(session.questions);
                setCurrentQuestionIndex(session.currentQuestionIndex);
                setInterviewState(session.interviewState);
                const currentQ = session.questions[session.currentQuestionIndex];
                setCurrentAnswer(currentQ ? currentQ.answer : '');
                setError(null);
            }
        } catch (error) {
            setError("Failed to resume the interview. Please start a new one.");
            console.error("Failed to load interview session from localStorage:", error);
            localStorage.removeItem('interviewSession');
            setHasSavedSession(false);
        }
    }, []);

    const submitAnswer = useCallback(async () => {
        if (!currentAnswer) return;
        setIsLoading(true);

        const updatedQuestions = questions.map((q, index) => 
            index === currentQuestionIndex ? { ...q, answer: currentAnswer } : q
        );
        setQuestions(updatedQuestions);

        try {
            const feedback = await getInterviewFeedback(questions[currentQuestionIndex].question, currentAnswer, isNonCodingAiMode);
            const questionsWithFeedback = updatedQuestions.map((q, index) => 
                index === currentQuestionIndex ? { ...q, feedback } : q
            );
            setQuestions(questionsWithFeedback);

            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setCurrentAnswer('');
            } else {
                setInterviewState('finished');
            }
        } catch (err) {
            setError("Failed to get feedback. Please try submitting again.");
        } finally {
            setIsLoading(false);
        }
    }, [currentAnswer, currentQuestionIndex, questions, isNonCodingAiMode]);
    
    const resetInterview = () => {
        setRole('');
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setCurrentAnswer('');
        setInterviewState('setup');
        setError(null);
        setIsNonCodingAiMode(false);
        try {
            localStorage.removeItem('interviewSession');
            setHasSavedSession(false);
        } catch (error) {
            console.error("Failed to clear interview session:", error);
        }
    };

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
    
    const formatInterviewFeedbackForPdf = (): string => {
        let content = `Interview Feedback for: ${role}\n\n`;
        content += "========================================\n\n";

        questions.forEach((q, index) => {
            content += `Question ${index + 1}: ${q.question}\n\n`;
            content += `Your Answer:\n${q.answer}\n\n`;
            
            if (q.feedback) {
                content += `--- Feedback ---\n`;
                content += `Overall Score: ${q.feedback.overallScore}/10\n\n`;

                content += `Positive Points:\n`;
                q.feedback.positivePoints.forEach(p => content += `  • ${p}\n`);
                content += `\n`;

                content += `Areas for Improvement:\n`;
                q.feedback.areasForImprovement.forEach(a => content += `  • ${a}\n`);
                content += `\n`;

                if (q.feedback.starMethodCheck) {
                    content += `STAR Method Analysis:\n`;
                    content += `  Situation: ${q.feedback.starMethodCheck.situation ? 'Clearly described' : 'Not clearly described'}\n`;
                    content += `  Task: ${q.feedback.starMethodCheck.task ? 'Clearly described' : 'Not clearly described'}\n`;
                    content += `  Action: ${q.feedback.starMethodCheck.action ? 'Clearly described' : 'Not clearly described'}\n`;
                    content += `  Result: ${q.feedback.starMethodCheck.result ? 'Clearly described' : 'Not clearly described'}\n`;
                    content += `  Feedback: ${q.feedback.starMethodCheck.feedback}\n\n`;
                }
                
                if (q.feedback.nonCodingAiFeedbackCheck) {
                    content += `Non-Coding AI Role Analysis:\n`;
                    content += `  Conceptual Clarity: ${q.feedback.nonCodingAiFeedbackCheck.conceptualClarity}\n`;
                    content += `  Strategic Thinking: ${q.feedback.nonCodingAiFeedbackCheck.strategicThinking}\n`;
                    content += `  Ethical Awareness: ${q.feedback.nonCodingAiFeedbackCheck.ethicalAwareness}\n\n`;
                }
            } else {
                content += `No feedback available.\n\n`;
            }
            content += "========================================\n\n";
        });

        return content;
    };

    if (isLoading && interviewState === 'setup') {
        return <Card><Spinner message="Preparing your interview..." /></Card>;
    }
    
    if (interviewState === 'setup') {
        return (
            <Card className="max-w-xl mx-auto">
                <h2 className="text-2xl font-bold text-text-primary mb-4">AI Interview Coach</h2>
                <p className="text-text-secondary mb-6">Enter a job role to start a mock interview. You'll answer 5 common questions and receive instant feedback.</p>
                <div className="space-y-4">
                     {hasSavedSession && (
                        <button
                            onClick={resumeInterview}
                            className="w-full px-6 py-3 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
                        >
                            Resume Interview
                        </button>
                    )}
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., Senior React Developer"
                        className="w-full p-3 bg-background border border-border rounded-md text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="non-coding-ai"
                            checked={isNonCodingAiMode}
                            onChange={(e) => setIsNonCodingAiMode(e.target.checked)}
                            className="h-4 w-4 rounded bg-surface border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="non-coding-ai" className="text-sm font-medium text-text-secondary">
                            Specialise for non-coding AI roles (e.g. Product Manager, Ethicist)
                        </label>
                    </div>

                     {error && <p className="text-danger text-sm">{error}</p>}
                    <button
                        onClick={startInterview}
                        disabled={!role}
                        className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {hasSavedSession ? 'Start New' : 'Start'}
                    </button>
                </div>
            </Card>
        );
    }
    
    if (interviewState === 'in_progress') {
        return (
            <Card>
                <h2 className="text-xl font-bold text-text-primary mb-2">Interview for: <span className="text-primary">{role}</span></h2>
                <p className="text-text-secondary mb-6">Question {currentQuestionIndex + 1} of {questions.length}</p>

                <div className="bg-background p-4 rounded-lg mb-4">
                    <p className="text-lg text-text-primary">{questions[currentQuestionIndex].question}</p>
                </div>
                
                <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-40 p-3 bg-background border border-border rounded-md text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={isLoading}
                />

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={submitAnswer}
                        disabled={isLoading || !currentAnswer}
                        className="px-6 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
                    >
                        {isLoading ? 'Getting Feedback...' : 'Submit Answer'}
                    </button>
                </div>
                 {error && <p className="text-danger text-sm mt-2">{error}</p>}
            </Card>
        );
    }
    
    if (interviewState === 'finished') {
        return (
            <Card>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Interview Complete!</h2>
                <p className="text-text-secondary mb-6">Here is the feedback for your answers.</p>
                <div className="space-y-6">
                    {questions.map((q, index) => (
                        <div key={index} className="bg-surface p-4 rounded-lg border border-border">
                             <p className="font-semibold text-text-secondary">Q: {q.question}</p>
                             <p className="italic text-text-primary my-2 p-2 bg-background rounded">A: {q.answer}</p>
                             {q.feedback && <FeedbackDisplay feedback={q.feedback} />}
                        </div>
                    ))}
                </div>
                 <div className="mt-8 flex justify-center space-x-4">
                    <button
                        onClick={resetInterview}
                        className="px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90"
                    >
                        Start New
                    </button>
                    <button
                        onClick={() => {
                            const filename = `Interview_Feedback_${role.replace(/\s+/g, '_')}.pdf`;
                            const content = formatInterviewFeedbackForPdf();
                            handleDownloadPdf(content, filename);
                        }}
                        className="px-6 py-3 bg-secondary text-white font-semibold rounded-lg shadow-md hover:opacity-90"
                    >
                        Download Feedback PDF
                    </button>
                </div>
            </Card>
        );
    }

    return null;
};

export default InterviewCoach;