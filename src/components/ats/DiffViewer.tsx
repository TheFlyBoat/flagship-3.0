import React from 'react';
import * as diff from 'diff';

interface DiffViewerProps {
    oldText: string;
    newText: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText }) => {
    // We only use word-level diffing.
    const diffResult = diff.diffWords(oldText, newText);

    return (
        <div className="w-full h-96 p-4 bg-background border border-border rounded-xl text-text-primary overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {diffResult.map((part, index) => {
                const isAdded = part.added;
                const isRemoved = part.removed;

                let className = '';
                if (isAdded) className = 'bg-success-bg text-success-text font-bold px-1 rounded mx-0.5';
                if (isRemoved) className = 'bg-danger-bg text-danger-text line-through px-1 rounded mx-0.5 opacity-60';

                return (
                    <span key={index} className={className}>
                        {part.value}
                    </span>
                );
            })}
        </div>
    );
};

export default DiffViewer;
