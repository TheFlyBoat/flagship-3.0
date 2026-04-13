import React from 'react';
import Logo from './Logo';

const SplashScreen: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background text-text-primary animate-fadeIn">
            <div className="animate-float flex flex-col items-center">
                 <Logo className="h-24 w-24 text-primary" />
                 <h1 className="text-4xl font-bold text-primary mt-4 font-logo tracking-wider">FlagShip</h1>
            </div>
        </div>
    );
};

export default SplashScreen;