import React from 'react';

interface SpinnerProps {
    message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message = 'Analyzing...' }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-secondary text-lg">{message}</p>
        </div>
    );
};

export default Spinner;
