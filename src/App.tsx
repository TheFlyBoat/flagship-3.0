import React, { useState, useEffect } from 'react';
import { AppView, Application, ApplicationStatus } from './types';
import { ICONS } from './constants';
import ATSOptimiser from './components/ats/ATSOptimiser';
import InterviewCoach from './components/interview/InterviewCoach';
import ApplicationTracker from './components/tracker/ApplicationTracker';
import PortfolioReviewer from './components/portfolio/PortfolioReviewer';
import CareerExplorer from './components/explorer/CareerExplorer';
import SplashScreen from './components/common/SplashScreen';
import Logo from './components/common/Logo';
import ThemeToggle from './components/common/ThemeToggle';
import OnboardingTour from './components/common/OnboardingTour';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<AppView>(AppView.ATS);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [applications, setApplications] = useState<Application[]>([]);
    const [practiceRole, setPracticeRole] = useState<string>('');
    const [jobDescriptionForPortfolio, setJobDescriptionForPortfolio] = useState<string>('');
    const [showOnboarding, setShowOnboarding] = useState(false);

    const [userCv, setUserCv] = useState<string>(() => {
        try {
            return sessionStorage.getItem('userCv') || '';
            // FIX: Added curly braces to the catch block to fix a syntax error that caused cascading 'Cannot find name' errors.
        } catch (error) {
            return '';
        }
    });

    // FIX: A `catch` block requires curly braces `{}`. This was causing a syntax error which prevented the compiler from finding any variables declared in the component.
    useEffect(() => {
        try {
            sessionStorage.setItem('userCv', userCv);
        } catch (error) {
            console.error("Failed to save CV to sessionStorage", error);
        }
    }, [userCv]);

    useEffect(() => {
        try {
            const savedApps = localStorage.getItem('applications');
            if (savedApps) {
                setApplications(JSON.parse(savedApps));
            }
        } catch (error) {
            console.error("Failed to load applications from localStorage", error);
            setApplications([]);
        }
    }, []);

    useEffect(() => {
        try {
            const hasCompletedOnboarding = localStorage.getItem('onboardingComplete');
            // Show tour if it's the first visit. Add a delay to let the main app render behind it.
            if (!hasCompletedOnboarding) {
                const timer = setTimeout(() => setShowOnboarding(true), 500);
                return () => clearTimeout(timer);
            }
        } catch (error) {
            console.error("Could not access localStorage. Onboarding tour will be skipped.", error);
            setShowOnboarding(false);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('applications', JSON.stringify(applications));
        } catch (error) {
            console.error("Failed to save applications to localStorage", error);
        }
    }, [applications]);

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark';
        root.classList.remove(isDark ? 'light' : 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2500); // Splash screen duration
        return () => clearTimeout(timer);
    }, []);

    const handleOnboardingComplete = () => {
        try {
            localStorage.setItem('onboardingComplete', 'true');
        } catch (error) {
            console.error("Could not save onboarding status to localStorage.", error);
        }
        setShowOnboarding(false);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    const handleAddApplicationFromATS = (appData: { company: string; role: string; fitScore: number; cvUsed: string; }) => {
        const newApp: Application = {
            id: new Date().toISOString(),
            ...appData,
            status: ApplicationStatus.Applied,
            dateApplied: new Date().toLocaleDateString(),
        };
        setApplications(prev => [...prev, newApp]);
    };

    const handlePracticeInterview = (role: string) => {
        setPracticeRole(role);
        setActiveView(AppView.Interview);
    };

    const handleNavClick = (view: AppView) => {
        // If user explicitly clicks the 'Interview' nav item, clear any pre-filled role
        if (view === AppView.Interview) {
            setPracticeRole('');
        }
        setActiveView(view);
    };


    if (loading) {
        return <SplashScreen />;
    }

    const renderView = () => {
        switch (activeView) {
            case AppView.ATS:
                return <ATSOptimiser theme={theme} onAddApplication={handleAddApplicationFromATS} onJobDescriptionSubmit={setJobDescriptionForPortfolio} cvContent={userCv} onCvChange={setUserCv} />;
            case AppView.Interview:
                return <InterviewCoach initialRole={practiceRole} />;
            case AppView.Tracker:
                return <ApplicationTracker theme={theme} applications={applications} setApplications={setApplications} onPracticeInterview={handlePracticeInterview} />;
            case AppView.Portfolio:
                return <PortfolioReviewer initialJobDescription={jobDescriptionForPortfolio} />;
            case AppView.Explore:
                return <CareerExplorer initialCv={userCv} onPracticeRole={handlePracticeInterview} />;
            default:
                return <ATSOptimiser theme={theme} onAddApplication={handleAddApplicationFromATS} onJobDescriptionSubmit={setJobDescriptionForPortfolio} cvContent={userCv} onCvChange={setUserCv} />;
        }
    };

    const NavItem: React.FC<{ view: AppView; icon: React.ReactNode }> = ({ view, icon }) => (
        <button
            onClick={() => handleNavClick(view)}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors duration-200 w-full text-center md:text-left ${activeView === view
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
        >
            {icon}
            <span className="font-semibold text-xs md:text-base mt-1 md:mt-0">{view}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-background text-text-primary flex flex-col animate-fadeIn">
            <OnboardingTour isOpen={showOnboarding} onClose={handleOnboardingComplete} />
            <div className="flex flex-col md:flex-row flex-1">
                {/* Sidebar */}
                <aside className="w-full md:w-64 bg-surface p-2 md:p-4 md:h-screen border-b md:border-b-0 md:border-r border-border flex flex-col md:fixed">
                    <div className="hidden md:flex items-center space-x-2 mb-8 p-2">
                        <Logo className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl font-bold text-text-primary font-logo tracking-wide">FlagShip</h1>
                    </div>
                    <nav className="flex flex-row md:flex-col justify-around md:justify-start md:space-y-2 flex-grow">
                        <NavItem view={AppView.ATS} icon={ICONS.ATS} />
                        <NavItem view={AppView.Explore} icon={ICONS.Discovery} />
                        <NavItem view={AppView.Portfolio} icon={ICONS.Portfolio} />
                        <NavItem view={AppView.Tracker} icon={ICONS.Tracker} />
                        <NavItem view={AppView.Interview} icon={ICONS.Interview} />
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 md:ml-64">
                    <header className="mb-8 flex justify-between items-center">
                        <div className="md:hidden flex items-center space-x-2">
                            <Logo className="h-8 w-8 text-primary" />
                            <h1 className="text-2xl font-bold text-text-primary font-logo tracking-wide">FlagShip</h1>
                        </div>
                    </header>
                    {renderView()}
                </main>
            </div>
            <footer className="text-center p-4 text-text-secondary text-sm border-t border-border bg-surface md:ml-64">
                © 2025 FlyBoat | FlagShip 2.0
            </footer>
            <div className="fixed bottom-6 right-6 z-50">
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
        </div>
    );
};

export default App;