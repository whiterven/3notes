import React from 'react';
import type { Note } from '../types';
import { CloseIcon, LayersIcon, EditIcon } from './icons';

interface StackViewModalProps {
    parentNote: Note;
    stackedNotes: Note[];
    onClose: () => void;
    onUnstack: (id: string) => void;
    onEdit: (id: string) => void;
}

const StackedNoteItem: React.FC<{note: Note, onUnstack: (id: string) => void, onEdit: (id: string) => void}> = ({ note, onUnstack, onEdit }) => {
    const plainText = (note.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 100);
    
    return (
        <div className={`relative p-4 rounded-lg border flex flex-col gap-2 ${note.color} border-amber-300/50`}>
            {note.image_url && <img src={note.image_url} alt="Note" className="rounded-md h-32 w-full object-cover"/>}
            {note.drawing_url && <img src={note.drawing_url} alt="Drawing" className="rounded-md h-32 w-full object-contain bg-white"/>}
            <p className="text-amber-900 text-lg flex-grow">{plainText}{plainText.length === 100 ? '...' : ''}</p>
            <div className="flex items-center justify-end gap-2 mt-2">
                <button 
                    onClick={() => onEdit(note.id)}
                    className="flex items-center gap-1.5 text-sm bg-amber-400/50 text-amber-800 py-1 px-3 rounded-full hover:bg-amber-400 transition"
                >
                    <EditIcon className="w-4 h-4" /> Edit
                </button>
                <button 
                    onClick={() => onUnstack(note.id)}
                    className="flex items-center gap-1.5 text-sm bg-rose-400/50 text-rose-800 py-1 px-3 rounded-full hover:bg-rose-400 transition"
                >
                    <LayersIcon className="w-4 h-4" /> Unstack
                </button>
            </div>
        </div>
    );
};


export const StackViewModal: React.FC<StackViewModalProps> = ({ parentNote, stackedNotes, onClose, onUnstack, onEdit }) => {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
            <div className="bg-amber-50/95 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-amber-200 themed-modal-bg">
                <header className="flex justify-between items-center p-4 border-b border-amber-200 themed-modal-header">
                    <div className="flex items-center gap-3">
                        <LayersIcon className="w-8 h-8 text-amber-700 themed-modal-text" />
                        <h2 className="text-2xl sm:text-3xl text-amber-800 themed-modal-text">Notes in this Stack</h2>
                    </div>
                    <button onClick={onClose} className="text-amber-600 hover:text-amber-900 themed-modal-text" aria-label="Close stack view">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                </header>
                
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto thin-scrollbar">
                    {stackedNotes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stackedNotes.map(note => (
                                <StackedNoteItem key={note.id} note={note} onUnstack={onUnstack} onEdit={onEdit} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-2xl text-amber-700 themed-modal-text-alt">This stack is empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};