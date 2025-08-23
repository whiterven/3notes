
import React from 'react';
import { ZoomInIcon, ZoomOutIcon, MousePointerIcon, Grid2x2Icon } from './icons';

interface CanvasControlsProps {
    onZoom: (direction: 'in' | 'out') => void;
    onResetView: () => void;
    onTidy: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ onZoom, onResetView, onTidy }) => {
    return (
        <div className="absolute bottom-4 right-4 z-10 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-full shadow-lg flex items-center p-1">
            <button onClick={onTidy} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-amber-800 dark:text-amber-200 transition" title="Tidy Canvas">
                <Grid2x2Icon className="w-6 h-6"/>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button onClick={() => onZoom('out')} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-amber-800 dark:text-amber-200 transition" title="Zoom Out">
                <ZoomOutIcon className="w-6 h-6"/>
            </button>
            <button onClick={onResetView} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-amber-800 dark:text-amber-200 transition" title="Reset View">
                <MousePointerIcon className="w-6 h-6"/>
            </button>
            <button onClick={() => onZoom('in')} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-amber-800 dark:text-amber-200 transition" title="Zoom In">
                <ZoomInIcon className="w-6 h-6"/>
            </button>
        </div>
    );
};
