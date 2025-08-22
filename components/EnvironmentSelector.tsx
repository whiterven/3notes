import React, { useState } from 'react';
import { PaletteIcon, CloseIcon } from './icons';

export type Environment = 'default' | 'gallery' | 'library' | 'scifi';

interface EnvironmentSelectorProps {
    currentEnv: Environment;
    onSelect: (env: Environment) => void;
}

const environments: { id: Environment; name: string; class: string; previewClass: string }[] = [
    { id: 'default', name: 'Amber Canvas', class: 'env-default', previewClass: 'bg-amber-100' },
    { id: 'gallery', name: 'Minimalist Gallery', class: 'env-gallery', previewClass: 'bg-gray-100' },
    { id: 'library', name: 'Serene Library', class: 'env-library', previewClass: 'bg-[#382e21]' },
    { id: 'scifi', name: 'Sci-Fi Deck', class: 'env-scifi', previewClass: 'bg-gray-900' },
];

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({ currentEnv, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (env: Environment) => {
        onSelect(env);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(true)}
                className="hidden sm:flex items-center gap-2 text-xl bg-amber-200 text-amber-800 py-2 px-5 rounded-full hover:bg-amber-300 transition-colors duration-300"
                title="Change Environment"
            >
                <PaletteIcon className="w-6 h-6" />
                <span className="hidden lg:inline">Environments</span>
            </button>

            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            {isOpen && (
                 <div
                    className="absolute right-0 top-full mt-2 w-72 bg-white/80 backdrop-blur-md rounded-xl shadow-2xl border border-amber-200 p-4 z-50 animate-fade-in-up"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="env-select-title"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 id="env-select-title" className="text-2xl text-amber-800 font-bold">Choose Environment</h3>
                        <button onClick={() => setIsOpen(false)} className="text-amber-600 hover:text-amber-800" aria-label="Close">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {environments.map(env => (
                            <button
                                key={env.id}
                                onClick={() => handleSelect(env.id)}
                                className={`group flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-colors duration-200 ${
                                    currentEnv === env.id ? 'border-amber-600 bg-amber-100' : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                                }`}
                            >
                                <div className={`w-full h-16 rounded-md ${env.previewClass} border border-black/10 group-hover:scale-105 transition-transform`}></div>
                                <span className="text-lg text-amber-800">{env.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
