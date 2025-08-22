import React, { useState, useRef, useEffect } from 'react';
import type { Note, ToastMessage, ToastType } from '../types';
import { queryNotes } from '../services/geminiService';
import { CloseIcon, BrainCircuitIcon, LoaderIcon } from './icons';

interface AiChatAssistantProps {
    notes: Note[];
    onClose: () => void;
    showToast: (message: string, type?: ToastType) => void;
}

interface Message {
    role: 'user' | 'ai';
    content: string;
}

const markdownToHtml = (text: string) => {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
    // Italic (*text* or _text_)
    html = html.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');

    // Unordered lists (- item or * item)
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    // Wrap list items in <ul> tags
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Join adjacent lists
    html = html.replace(/<\/ul>\s*<ul>/g, ''); 

    // Convert newlines to <br> tags, but not inside list structures
    html = html.replace(/\n/g, '<br />');
    html = html.replace(/<br \/>\s*<ul>/g, '<ul>');
    html = html.replace(/<\/ul>\s*<br \/>/g, '</ul>');
    html = html.replace(/<\/li>\s*<br \/>\s*<li>/g, '</li><li>');
    
    return html;
};

export const AiChatAssistant: React.FC<AiChatAssistantProps> = ({ notes, onClose, showToast }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: "Hello! Ask me anything about your notes, and I'll do my best to find the answer for you." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await queryNotes(input, notes);
            const aiMessage: Message = { role: 'ai', content: aiResponse };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            showToast(`Query failed. ${errorMessage}`);
            // Restore user message to input if query fails
            setMessages(prev => prev.slice(0, -1));
            setInput(userMessage.content);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-modal="true">
            <div className="bg-amber-50/95 w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-amber-200">
                <header className="flex justify-between items-center p-4 border-b border-amber-200">
                    <div className="flex items-center gap-3">
                        <BrainCircuitIcon className="w-8 h-8 text-violet-700" />
                        <h2 className="text-3xl sm:text-4xl text-amber-800">Ask Your Notes</h2>
                    </div>
                    <button onClick={onClose} className="text-amber-600 hover:text-amber-900" aria-label="Close chat">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                </header>
                
                <div className="flex-grow p-4 overflow-y-auto space-y-6 thin-scrollbar">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 text-2xl ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' && <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-1"><BrainCircuitIcon className="w-6 h-6 text-violet-700" /></div>}
                            <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-amber-200 text-amber-900 rounded-br-none' : 'bg-white text-amber-800 rounded-bl-none'} [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1`}>
                                {msg.role === 'user' ? (
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                ) : (
                                    <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex gap-3 text-2xl justify-start">
                             <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-1"><LoaderIcon className="w-6 h-6 text-violet-700 animate-spin" /></div>
                             <div className="max-w-xl p-4 rounded-2xl bg-white text-amber-800 rounded-bl-none">
                                 <p className="italic">Thinking...</p>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={handleSend} className="p-4 border-t border-amber-200">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="What were the key takeaways from the Q3 planning meeting?"
                            className="w-full text-2xl p-4 pr-16 bg-white rounded-full border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-300 transition duration-300"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-600 text-white rounded-full p-3 hover:bg-amber-700 transition disabled:bg-amber-300 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};