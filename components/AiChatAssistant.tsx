import React, { useState, useRef, useEffect } from 'react';
import type { Note, ToastMessage, ToastType } from '../types';
import type { Content } from '@google/genai';
import { queryNotes } from '../services/geminiService';
import { CloseIcon, BrainCircuitIcon, LoaderIcon, MicIcon, GlobeIcon } from './icons';

interface AiChatAssistantProps {
    notes: Note[];
    onClose: () => void;
    onNoteCreate: (noteData: { text: string; tags: string[] }) => void;
    onNoteUpdate: (noteData: { id: string; text?: string; tags?: string[]; color?: string }) => void;
    showToast: (message: string, type?: ToastType) => void;
}

interface Message {
    role: 'user' | 'ai';
    content: string;
    sources?: Array<{uri: string, title: string}>;
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

export const AiChatAssistant: React.FC<AiChatAssistantProps> = ({ notes, onClose, onNoteCreate, onNoteUpdate, showToast }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: "Hello! Ask me anything about your notes. You can also ask me to create a new note for you or update an existing one." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
            
            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                showToast(`Speech recognition error: ${event.error}`);
                setIsListening(false);
            };
        }
    }, []);

    const handleVoiceInput = () => {
        if (!recognitionRef.current) {
            showToast("Voice recognition is not supported by your browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };


    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const chatHistory: Content[] = newMessages.slice(0, -1) // All but the new user message
            .slice(-10) // Get last 10 messages for history
            .map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        try {
            const aiResponse = await queryNotes(input, notes, useWebSearch, chatHistory);
            const sources = (aiResponse.groundingMetadata || [])
                .map((chunk: any) => ({
                    uri: chunk.web?.uri,
                    title: chunk.web?.title,
                }))
                .filter((s: any): s is {uri: string, title: string} => s.uri && s.title);

            const aiMessage: Message = { role: 'ai', content: aiResponse.content, sources };
            setMessages(prev => [...prev, aiMessage]);

            if (aiResponse.type === 'note' && aiResponse.noteData) {
                onNoteCreate(aiResponse.noteData as { text: string; tags: string[] });
            } else if (aiResponse.type === 'update' && aiResponse.noteData?.id) {
                onNoteUpdate(aiResponse.noteData as { id: string; text?: string; tags?: string[]; color?: string });
            }
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
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as any);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
            <div className="bg-amber-50/95 w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-amber-200 themed-modal-bg">
                <header className="flex justify-between items-center p-4 border-b border-amber-200 themed-modal-header">
                    <div className="flex items-center gap-3">
                        <BrainCircuitIcon className="w-8 h-8 text-violet-700" />
                        <h2 className="text-2xl sm:text-3xl text-amber-800 themed-modal-text">Ask Your Notes</h2>
                    </div>
                    <button onClick={onClose} className="text-amber-600 hover:text-amber-900 themed-modal-text" aria-label="Close chat">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                </header>
                
                <div className="flex-grow p-4 overflow-y-auto space-y-6 thin-scrollbar">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 text-base sm:text-lg ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' && <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-1"><BrainCircuitIcon className="w-6 h-6 text-violet-700" /></div>}
                            <div className={`max-w-xl px-3 sm:px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-amber-200 text-amber-900 rounded-br-none' : 'bg-white text-amber-800 rounded-bl-none dark:bg-gray-700 dark:text-gray-200'}`}>
                                {msg.role === 'user' ? (
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                ) : (
                                    <div className="[&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1" dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
                                )}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-amber-300/50 dark:border-gray-500/50">
                                        <h4 className="text-base font-bold mb-2">Sources:</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-base">
                                            {msg.sources.map((source, i) => (
                                                <li key={i}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline dark:text-violet-400">
                                                        {source.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex gap-3 text-base sm:text-lg justify-start">
                             <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-1"><LoaderIcon className="w-6 h-6 text-violet-700 animate-spin" /></div>
                             <div className="max-w-xl px-3 sm:px-4 py-2 rounded-xl bg-white text-amber-800 rounded-bl-none dark:bg-gray-700 dark:text-gray-200">
                                 <p className="italic">Thinking...</p>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={handleSend} className="p-4 border-t border-amber-200 themed-modal-header space-y-2">
                     <div className="flex items-center justify-end gap-3 px-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-base themed-modal-text-alt">
                            <GlobeIcon className="w-4 h-4" />
                            <span>Web Search</span>
                            <input type="checkbox" checked={useWebSearch} onChange={e => setUseWebSearch(e.target.checked)} className="sr-only peer" />
                            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
                        </label>
                     </div>
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your notes... or ask me to create one."
                            className="flex-grow resize-none text-base sm:text-lg p-3 bg-white rounded-xl border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-300 transition duration-300 themed-modal-input-bg themed-modal-text max-h-36 overflow-y-auto thin-scrollbar"
                            disabled={isLoading}
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button type="button" onClick={handleVoiceInput} disabled={isLoading} className={`p-2 sm:p-3 rounded-full transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 themed-modal-button'}`} aria-label={isListening ? 'Stop listening' : 'Start listening'}>
                                <MicIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                            </button>
                            <button type="submit" disabled={isLoading || !input.trim()} className="bg-amber-600 text-white rounded-full p-2 sm:p-3 hover:bg-amber-700 transition disabled:bg-amber-300 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};