import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Application } from '../../types';
import { ApplicationStatus } from '../../types';
import Card from '../common/Card';

const KANBAN_COLUMNS = [
    ApplicationStatus.Applied,
    ApplicationStatus.Interview,
    ApplicationStatus.Offer,
    ApplicationStatus.Rejected,
];

interface ApplicationCardProps {
    app: Application;
    onMove: (id: string, newStatus: ApplicationStatus) => void;
    onPractice: (role: string) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ app, onMove, onPractice }) => {
    return (
        <div className="bg-background p-4 rounded-2xl shadow-md mb-3 text-sm">
            <h4 className="font-bold text-primary">{app.role}</h4>
            <p className="text-text-secondary">{app.company}</p>
            <p className="text-xs text-text-secondary mt-1">Applied: {app.dateApplied}</p>
            {app.fitScore && <p className="text-xs text-primary mt-1">Fit Score: {app.fitScore}%</p>}
            <div className="mt-3 border-t border-border pt-2 flex items-center justify-end space-x-2">
                <button onClick={() => onPractice(app.role)} title="Practice Interview" className="p-1 text-text-secondary hover:text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 017 8a1 1 0 10-2 0 7.001 7.001 0 006 6.93V17H9a1 1 0 100 2h2a1 1 0 100-2h-1v-2.07z" clipRule="evenodd" />
                    </svg>
                </button>
                {KANBAN_COLUMNS.filter(status => status !== app.status).map(status => (
                    <button key={status} onClick={() => onMove(app.id, status)} className="px-2 py-1 text-xs bg-border hover:bg-opacity-50 rounded text-text-primary">
                        Move to {status}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface ApplicationTrackerProps {
    theme: string;
    applications: Application[];
    setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
    onPracticeInterview: (role: string) => void;
}

interface ChartColors {
    grid: string;
    tick: string;
    primary: string;
    tooltipBg: string;
    tooltipBorder: string;
}

const getChartColors = (): ChartColors => {
    const rootStyles = getComputedStyle(document.documentElement);
    return {
        grid: rootStyles.getPropertyValue('--color-border').trim(),
        tick: rootStyles.getPropertyValue('--color-text-secondary').trim(),
        primary: rootStyles.getPropertyValue('--color-primary').trim(),
        tooltipBg: rootStyles.getPropertyValue('--color-tooltip-bg').trim(),
        tooltipBorder: rootStyles.getPropertyValue('--color-tooltip-border').trim(),
    };
};

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ theme, applications, setApplications, onPracticeInterview }) => {
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [newApp, setNewApp] = useState({ company: '', role: '' });

    const [chartColors, setChartColors] = useState<ChartColors | null>(null);

    useEffect(() => {
        setChartColors(getChartColors());
    }, [theme]);

    const handleAddApplication = (e: React.FormEvent) => {
        e.preventDefault();
        if (newApp.company && newApp.role) {
            const appToAdd: Application = {
                id: new Date().toISOString(),
                ...newApp,
                status: ApplicationStatus.Applied,
                dateApplied: new Date().toLocaleDateString(),
            };
            setApplications(prev => [...prev, appToAdd]);
            setNewApp({ company: '', role: '' });
            setIsFormVisible(false);
        }
    };

    const handleMoveApplication = (id: string, newStatus: ApplicationStatus) => {
        setApplications(apps => apps.map(app => app.id === id ? { ...app, status: newStatus } : app));
    };

    const analyticsData = KANBAN_COLUMNS.map(status => ({
        name: status,
        count: applications.filter(app => app.status === status).length,
    }));

    const appsWithScore = applications.filter(a => typeof a.fitScore === 'number');
    const totalFitScore = appsWithScore.reduce((acc, a) => acc + (a.fitScore ?? 0), 0);
    const averageFitScore = appsWithScore.length > 0 ? Math.round(totalFitScore / appsWithScore.length) : 0;

    const exportCsv = () => {
        const headers = ["id", "company", "role", "status", "dateApplied", "fitScore", "cvUsed"];
        const rows = applications.map(app => [
            app.id,
            `"${app.company.replace(/"/g, '""')}"`,
            `"${app.role.replace(/"/g, '""')}"`,
            app.status,
            app.dateApplied,
            app.fitScore || '',
            app.cvUsed ? `"${app.cvUsed.replace(/"/g, '""')}"` : ''
        ].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `flagship_applications_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return; // No data rows

            const headers = lines[0].split(',').map(h => h.trim());
            const newApps: Application[] = lines.slice(1).map(line => {
                // A very primitive CSV parsing that handles basic quotes
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const app: any = {};
                headers.forEach((header, index) => {
                    let val = values[index] ? values[index].trim() : '';
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.slice(1, -1).replace(/""/g, '"');
                    }
                    if (header === 'fitScore') {
                        app[header] = val ? parseInt(val, 10) : undefined;
                    } else {
                        app[header] = val;
                    }
                });
                return app as Application;
            });

            // Merge with existing avoiding duplicates
            setApplications(prev => {
                const uniqueApps = [...prev];
                newApps.forEach(newApp => {
                    if (newApp.id && !uniqueApps.find(a => a.id === newApp.id)) {
                        uniqueApps.push(newApp);
                    }
                });
                return uniqueApps;
            });
        };
        reader.readAsText(file);

        // Reset the file input
        if (e.target) {
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <h2 className="text-2xl font-bold text-text-primary mb-4">Analytics Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface p-4 rounded-2xl text-center border border-border">
                        <h3 className="text-text-secondary">Total Applications</h3>
                        <p className="text-4xl font-bold text-primary">{applications.length}</p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl text-center border border-border">
                        <h3 className="text-text-secondary">Interview Rate</h3>
                        <p className="text-4xl font-bold text-secondary">
                            {applications.length > 0 ? `${Math.round((applications.filter(a => a.status === 'Interview' || a.status === 'Offer').length / applications.length) * 100)}%` : '0%'}
                        </p>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl text-center border border-border">
                        <h3 className="text-text-secondary">Avg. Fit Score</h3>
                        <p className="text-4xl font-bold text-primary">{appsWithScore.length > 0 ? `${averageFitScore}%` : 'N/A'}</p>
                    </div>
                </div>
                <div className="h-72 mt-6">
                    {chartColors ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                <XAxis dataKey="name" tick={{ fill: chartColors.tick }} />
                                <YAxis tick={{ fill: chartColors.tick }} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                                <Legend />
                                <Bar dataKey="count" fill={chartColors.primary} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-text-secondary">Loading chart...</p>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-4">
                    <h2 className="text-2xl font-bold text-text-primary">Application Kanban Board</h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept=".csv"
                            id="csv-upload"
                            className="hidden"
                            onChange={handleImportCsv}
                        />
                        <label
                            htmlFor="csv-upload"
                            className="cursor-pointer px-4 py-2 bg-surface text-text-primary border border-border font-semibold rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-sm"
                        >
                            Import CSV
                        </label>
                        <button
                            onClick={exportCsv}
                            className="px-4 py-2 bg-surface text-text-primary border border-border font-semibold rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-sm"
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={() => setIsFormVisible(!isFormVisible)}
                            className="px-4 py-2 bg-secondary text-white font-semibold rounded-2xl shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary text-sm"
                        >
                            {isFormVisible ? 'Cancel' : 'Add Application'}
                        </button>
                    </div>
                </div>
                <p className="text-xs text-text-secondary mb-4 bg-surface p-2 rounded-xl inline-block border border-border">
                    <strong className="text-primary">Tip:</strong> To update via CSV, ensure your file contains the headers: <code className="bg-background px-1 rounded">id, company, role, status, dateApplied, fitScore, cvUsed</code>. The easiest method is to Export first, edit, and then Import.
                </p>
                {isFormVisible && (
                    <form onSubmit={handleAddApplication} className="mb-6 p-4 bg-background rounded-2xl flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-text-secondary">Company</label>
                            <input value={newApp.company} onChange={e => setNewApp({ ...newApp, company: e.target.value })} className="w-full mt-1 p-2 bg-surface border border-border rounded-xl" required />
                        </div>
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-text-secondary">Role</label>
                            <input value={newApp.role} onChange={e => setNewApp({ ...newApp, role: e.target.value })} className="w-full mt-1 p-2 bg-surface border border-border rounded-xl" required />
                        </div>
                        <button type="submit" className="px-4 py-2 bg-primary text-white font-semibold rounded-2xl self-start sm:self-auto">Add</button>
                    </form>
                )}
                <div className="w-full overflow-x-auto pb-4">
                    <div className="flex space-x-6">
                        {KANBAN_COLUMNS.map(status => (
                            <div key={status} className="bg-surface p-4 rounded-2xl border border-border w-72 min-w-[18rem] flex-shrink-0">
                                <h3 className="font-bold text-lg text-text-primary mb-4 border-b-2 border-primary pb-2 capitalize">{status}</h3>
                                <div className="space-y-3 h-full">
                                    {applications.filter(app => app.status === status).map(app => (
                                        <ApplicationCard key={app.id} app={app} onMove={handleMoveApplication} onPractice={onPracticeInterview} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ApplicationTracker;