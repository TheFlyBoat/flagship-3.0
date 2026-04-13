import React from 'react';

interface LogoProps {
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8 w-8 text-primary" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 0010 16.57l5.416.002a1 1 0 00.894-1.447l-5-10a1 1 0 00-1.416-.572zM10 14.57l-3.249.928 4.25-8.5-1.001 7.572z" />
    </svg>
);

export default Logo;