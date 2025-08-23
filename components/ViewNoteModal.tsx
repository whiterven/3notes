import React from 'react';
import type { Note } from '../types';
import { CloseIcon, EditIcon, ImageIcon, MicIcon, PencilIcon, TagIcon } from './icons';

interface ViewNoteModalProps {
    note: Note;
    onClose: () => void;
    onEdit: (id: string) => void;
}

export const ViewNoteModal: React.FC<ViewNoteModalProps> = ({ note, onClose, onEdit }) => {
    const noteHasIcons = note.imageUrl || note.drawingUrl || note.audioUrl;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
            <div className={`relative bg-white/95 shadow-2xl rounded-2xl p-4 sm:p-6 w-full max-w-2xl border border-amber-200 animate-fade-in-up max-h-[90vh] flex flex-col themed-modal-bg`}>
                <header className="flex justify-between items-center pb-3 border-b border-amber-300/50 mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {noteHasIcons ? (
                            <>
                                {note.imageUrl && <ImageIcon className="w-8 h-8 text-amber-700 themed-modal-text" />}
                                {note.drawingUrl && <PencilIcon className="w-8 h-8 text-amber-700 themed-modal-text" />}
                                {note.audioUrl && <MicIcon className="w-8 h-8 text-amber-700 themed-modal-text" />}
                            </>
                        ) : <div className={`w-8 h-8 rounded-md ${note.color} border border-black/10`}></div>}
                        <h2 className="text-2xl sm:text-3xl text-amber-800 themed-modal-text">View Note</h2>
                    </div>
                     <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(note.id)}
                            className="flex items-center bg-amber-600 text-white text-base sm:text-lg font-bold p-2 sm:py-2 sm:px-4 rounded-full hover:bg-amber-700 transition"
                        >
                            <EditIcon className="w-5 h-5"/>
                            <span className="hidden sm:inline sm:ml-2">Edit</span>
                        </button>
                        <button type="button" onClick={onClose} className="text-amber-600 hover:text-amber-900 themed-modal-text z-10" aria-label="Close form">
                            <CloseIcon className="w-7 h-7" />
                        </button>
                    </div>
                </header>

                <div className="space-y-4 overflow-y-auto thin-scrollbar pr-2 -mr-2">
                    {note.drawingUrl && (
                        <div className="w-full rounded-md overflow-hidden shadow-inner border border-amber-200 bg-white">
                            <img src={note.drawingUrl} alt="User drawing" className="w-full h-auto max-h-64 sm:max-h-96 object-contain" />
                        </div>
                    )}
                    
                    {note.imageUrl && (
                        <div className="w-full rounded-md overflow-hidden shadow-inner border border-amber-200">
                            <img src={note.imageUrl} alt="Note illustration" className="w-full h-auto max-h-64 sm:max-h-96 object-cover" />
                        </div>
                    )}

                    <div 
                      className="text-amber-900 text-lg sm:text-xl leading-relaxed [&_ul]:list-disc [&_ul]:pl-8 [&_.checklist-item]:flex [&_.checklist-item]:items-center [&_.checklist-item]:gap-2 [&_.checklist-item_input]:w-5 [&_.checklist-item_input]:h-5 [&_.checklist-item_input]:accent-amber-600 themed-modal-text-alt"
                      dangerouslySetInnerHTML={{ __html: note.text }}
                    />

                    {note.audioUrl && (
                        <div className="pt-2">
                            <h3 className="text-xl font-bold text-amber-800 mb-2 themed-modal-text">Audio Recording</h3>
                            <audio controls src={note.audioUrl} className="w-full h-12 custom-audio-player" aria-label="Audio player for note"></audio>
                        </div>
                    )}

                    {note.summary && (
                        <div className="text-base sm:text-lg p-3 bg-amber-600/20 rounded-md border border-amber-600/30">
                            <p className="text-amber-800 font-bold themed-modal-text">✨ AI Summary:</p>
                            <p className="text-amber-900 themed-modal-text-alt">{note.summary}</p>
                        </div>
                    )}

                    {note.tags && note.tags.length > 0 && (
                        <div className="flex items-center flex-wrap gap-2 pt-2">
                            <TagIcon className="w-6 h-6 text-amber-700 themed-modal-text"/>
                            {note.tags.map(tag => (
                                <span 
                                    key={tag}
                                    className="bg-amber-200/80 text-amber-800 text-base font-semibold px-3 py-1 rounded-full"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};