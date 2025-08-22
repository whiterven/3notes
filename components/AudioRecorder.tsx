import React, { useState, useRef } from 'react';
import { MicIcon, StopIcon } from './icons';
import { ToastType } from '../types';

interface AudioRecorderProps {
    onRecordingComplete: (audioUrl: string) => void;
    showToast: (message: string, type?: ToastType) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, showToast }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    onRecordingComplete(audioUrl);
                    audioChunksRef.current = [];
                     // Stop all tracks to release the microphone
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                showToast("Microphone access was denied. Please allow access in your browser settings.");
            }
        } else {
             showToast("Audio recording is not supported by your browser.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200 flex flex-col items-center gap-3">
            {!isRecording ? (
                <button type="button" onClick={startRecording} className="flex items-center gap-2 text-lg sm:text-xl bg-amber-200 text-amber-800 py-2 px-4 rounded-lg hover:bg-amber-300 transition">
                    <MicIcon className="w-6 h-6"/> Start Recording
                </button>
            ) : (
                <button type="button" onClick={stopRecording} className="flex items-center gap-2 text-lg sm:text-xl bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition animate-pulse">
                    <StopIcon className="w-6 h-6" /> Stop Recording
                </button>
            )}
        </div>
    );
};