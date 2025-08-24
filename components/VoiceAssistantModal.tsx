import React, { useState, useEffect, useRef } from 'react';
import { extractTagsFromTranscript } from '../services/geminiService';
import type { ToastType } from '../types';
import { CloseIcon, MicIcon, LoaderIcon, PlusIcon } from './icons';

interface VoiceAssistantModalProps {
    onClose: () => void;
    onNoteCreate: (noteData: { text: string; tags: string[] }) => void;
    showToast: (message: string, type?: ToastType) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ onClose, onNoteCreate, showToast }) => {
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const stopListeningRef = useRef<boolean>(false);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast("Voice recognition is not supported by your browser.");
            onClose();
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
            setIsListening(true);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
            // Auto-restart listening unless explicitly stopped or a critical error occurred.
            if (!stopListeningRef.current) {
                recognitionRef.current.start();
            }
        };
        
        recognitionRef.current.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (final.trim()) {
                setFinalTranscript(prev => (prev ? prev + ' ' : '') + final.trim());
            }
            setInterimTranscript(interim);
        };
        
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            // Ignore 'no-speech' (user paused) and 'aborted' (we stopped it intentionally).
            // The `onend` event will handle restarting for 'no-speech'.
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }
            
            // For any other error, show a toast and prevent restarting.
            showToast(`Speech recognition error: ${event.error}`);
            stopListeningRef.current = true; // Prevent onend from restarting a broken service
        };

        // Start listening
        stopListeningRef.current = false;
        recognitionRef.current.start();

        return () => {
            stopListeningRef.current = true;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleSave = async () => {
        const fullTranscript = (finalTranscript + ' ' + interimTranscript).trim();
        if (!fullTranscript) {
            showToast("Please say something to create a note.");
            return;
        }
        
        setIsLoading(true);
        stopListeningRef.current = true;
        recognitionRef.current?.stop();

        try {
            const tags = await extractTagsFromTranscript(fullTranscript);
            // Format transcript with paragraphs for better readability in notes
            const formattedText = `<p>${fullTranscript.replace(/\n/g, '</p><p>')}</p>`;
            onNoteCreate({ text: formattedText, tags });
            onClose(); // This will happen after note creation is initiated
        } catch(e) {
            showToast("Failed to process the note.");
            setIsLoading(false);
        }
    };

    const transcriptForDisplay = finalTranscript + (interimTranscript ? ` <span class="text-gray-400">${interimTranscript}</span>` : '');

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
            <div className="bg-white/90 shadow-2xl rounded-2xl p-3 sm:p-6 w-full max-w-2xl border border-amber-200 animate-fade-in-up max-h-[90vh] overflow-y-auto thin-scrollbar themed-modal-bg flex flex-col">
                <header className="flex justify-between items-center pb-2 mb-3 sm:pb-3 sm:mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${isListening ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                            {isListening && <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>}
                            <MicIcon className={`w-6 h-6 z-10 ${isListening ? 'text-red-500' : 'text-gray-500'}`} />
                        </div>
                        <h2 className="text-xl sm:text-2xl text-amber-800 themed-modal-text">Voice Note</h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-amber-600 hover:text-amber-900 themed-modal-text z-10" aria-label="Close form">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                </header>

                <div
                    className="w-full bg-transparent text-lg sm:text-xl leading-relaxed p-2 min-h-[40vh] flex-grow resize-none overflow-y-auto transition duration-300 focus:outline-none themed-modal-text-alt thin-scrollbar"
                    dangerouslySetInnerHTML={{ __html: transcriptForDisplay || '<span class="text-gray-400">Start speaking to dictate your note...</span>' }}
                />

                <footer className="flex flex-col sm:flex-row justify-between items-center pt-3 mt-3 sm:pt-4 sm:mt-4 border-t border-amber-300/50 gap-3 sm:gap-4 flex-shrink-0">
                    <p className="text-base text-amber-700 themed-modal-text-alt text-center sm:text-left">Say "tag it urgent" to add a tag.</p>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto text-amber-700 text-base sm:text-lg font-bold py-2.5 px-4 sm:py-2 sm:px-5 rounded-full hover:bg-amber-100 transition duration-300 themed-modal-button">Cancel</button>
                        <button 
                            type="button" 
                            onClick={handleSave}
                            disabled={isLoading || (!finalTranscript && !interimTranscript)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-700 text-white text-base sm:text-lg font-bold py-2.5 px-4 sm:py-2 sm:px-5 rounded-full hover:bg-amber-800 transition duration-300 transform hover:scale-105 shadow-lg disabled:bg-amber-400 disabled:scale-100"
                        >
                            {isLoading ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <PlusIcon className="w-6 h-6" />}
                            {isLoading ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};