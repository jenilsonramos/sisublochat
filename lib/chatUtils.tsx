import React from 'react';

export const formatMessage = (text: string, isMe: boolean = false) => {
    if (!text) return text;

    // Split by URLs first to keep them clickable
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${isMe ? 'text-white' : 'text-sky-500 dark:text-sky-400'} underline hover:opacity-80 break-all`}
                >
                    {part}
                </a>
            );
        }

        // Process WhatsApp formatting: *bold*, _italic_, ~strikethrough~, ```code```
        let formatted: (string | React.ReactNode)[] = [part];

        // Bold
        formatted = formatted.flatMap(p => {
            if (typeof p !== 'string') return p;
            const parts = p.split(/\*([^*]+)\*/g);
            return parts.map((inner, i) => i % 2 === 1 ? <strong key={`b-${index}-${i}`}>{inner}</strong> : inner);
        });

        // Italic
        formatted = formatted.flatMap(p => {
            if (typeof p !== 'string') return p;
            const parts = p.split(/_([^_]+)_/g);
            return parts.map((inner, i) => i % 2 === 1 ? <em key={`i-${index}-${i}`}>{inner}</em> : inner);
        });

        // Strikethrough
        formatted = formatted.flatMap(p => {
            if (typeof p !== 'string') return p;
            const parts = p.split(/~([^~]+)~/g);
            return parts.map((inner, i) => i % 2 === 1 ? <del key={`s-${index}-${i}`}>{inner}</del> : inner);
        });

        // Code
        formatted = formatted.flatMap(p => {
            if (typeof p !== 'string') return p;
            const parts = p.split(/```([^`]+)```/g);
            return parts.map((inner, i) => i % 2 === 1 ? <code key={`c-${index}-${i}`} className={`${isMe ? 'bg-black/20' : 'bg-slate-100 dark:bg-slate-900'} px-1 rounded font-mono text-xs`}>{inner}</code> : inner);
        });

        return <React.Fragment key={index}>{formatted}</React.Fragment>;
    });
};
