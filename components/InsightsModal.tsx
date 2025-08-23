import React, { useState, useEffect } from 'react';
import type { Note, ToastType } from '../types';
import { generateInsights } from '../services/geminiService';
import { CloseIcon, TrendingUpIcon, LoaderIcon } from './icons';

interface InsightsModalProps {
    notes: Note[];
    onClose: () => void;
    showToast: (message: string, type?: ToastType) => void;
}

const markdownToHtml = (text: string) => {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headings (e.g., #, ##, ###, ####) - process most specific first
    html = html.replace(/^####\s+(.*)$/gm, '<h4 class="text-xl font-bold mt-3 mb-1">$1</h4>');
    html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-2xl font-bold mt-4 mb-2">$1</h3>');
    html = html.replace(/^##\s+(.*)$/gm, '<h2 class="text-3xl font-bold mt-5 mb-2">$1</h2>');
    html = html.replace(/^#\s+(.*)$/gm, '<h1 class="text-4xl font-bold mt-6 mb-3">$1</h1>');

    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
    // Italic (*text* or _text_)
    html = html.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
    // Unordered lists (- item or * item)
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); 

    html = html.replace(/\n/g, '<br />');
    html = html.replace(/<br \/>\s*<ul>/g, '<ul>');
    html = html.replace(/<\/ul>\s*<br \/>/g, '</ul>');
    html = html.replace(/<\/li>\s*<br \/>\s*<li>/g, '</li><li>');
    
    return html;
};


export const InsightsModal: React.FC<InsightsModalProps> = ({ notes, onClose, showToast }) => {
    const [insights, setInsights] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoading(true);
            try {
                const result = await generateInsights(notes);
                setInsights(result);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                showToast(`Could not generate insights. ${errorMessage}`);
                onClose();
            } finally {
                setIsLoading(false);
            }
        };
        fetchInsights();
    }, [notes]);


    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
            <div className="bg-amber-50/95 w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-amber-200 themed-modal-bg">
                <header className="flex justify-between items-center p-4 border-b border-amber-200 themed-modal-header">
                    <div className="flex items-center gap-3">
                        <TrendingUpIcon className="w-8 h-8 text-violet-700" />
                        <h2 className="text-2xl sm:text-3xl text-amber-800 themed-modal-text">AI Insights</h2>
                    </div>
                    <button onClick={onClose} className="text-amber-600 hover:text-amber-900 themed-modal-text" aria-label="Close insights">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                </header>
                
                <div className="flex-grow p-6 overflow-y-auto thin-scrollbar">
                    {isLoading ? (
                         <div className="flex flex-col items-center justify-center h-full text-amber-700 themed-modal-text-alt">
                            <LoaderIcon className="w-12 h-12 animate-spin mb-4" />
                            <p className="text-2xl">Analyzing your notes...</p>
                         </div>
                    ) : (
                        <div 
                            className="prose prose-xl prose-headings:text-amber-800 dark:prose-headings:text-amber-200 prose-strong:text-amber-900 dark:prose-strong:text-amber-100 text-amber-900 themed-modal-text-alt [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1"
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(insights) }} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};