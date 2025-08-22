import React, { useRef } from 'react';
import type { Note } from '../types';
import { CloseIcon, LoaderIcon, SparklesIcon, EditIcon, TranscribeIcon, ClipboardListIcon, LinkIcon } from './icons';

interface NoteCardProps {
  note: Note;
  relatedNotes: Note[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onSummarize: (id: string) => void;
  onTranscribe: (id: string) => void;
  onTagClick: (tag: string) => void;
  onTextUpdate: (id: string, newText: string) => void;
  onFindTasks: (id: string) => void;
  onFindRelatedNotes: (id: string) => void;
  onNavigateToNote: (id: string) => void;
  isSummarizing: boolean;
  isTranscribing: boolean;
  isExtractingTasks: boolean;
  isFindingLinks: boolean;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
    note, 
    relatedNotes,
    onDelete, 
    onEdit, 
    onSummarize, 
    onTranscribe, 
    onTagClick, 
    onTextUpdate, 
    onFindTasks,
    onFindRelatedNotes,
    onNavigateToNote,
    isSummarizing, 
    isTranscribing,
    isExtractingTasks,
    isFindingLinks
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      // Allow the DOM to update the checkbox's checked state, then save the new HTML
      setTimeout(() => {
        if (contentRef.current) {
          onTextUpdate(note.id, contentRef.current.innerHTML);
        }
      }, 0);
    }
  };
  
  const noteHasText = note.text && note.text.replace(/<[^>]*>?/gm, '').trim().length > 0;

  return (
    <div 
      className={`
      w-full max-w-sm sm:w-80 h-96 p-5 rounded-lg shadow-xl border border-amber-300/50 
      flex flex-col gap-3 relative transition-shadow duration-300 ease-in-out
      ${note.color}
      `}
      aria-label={`Note with text: ${note.text.substring(0, 30)}...`}
    >
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            <button onClick={() => onEdit(note.id)} className="bg-amber-500/60 text-white rounded-full p-1.5 hover:bg-amber-500 transition-colors" aria-label="Edit note">
                <EditIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => onDelete(note.id)} className="bg-red-500/60 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors" aria-label="Delete note">
                <CloseIcon className="w-5 h-5"/>
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin space-y-3">
            {note.drawingUrl && (
                <div className="w-full h-40 rounded-md overflow-hidden shadow-inner border border-amber-200 bg-white">
                    <img src={note.drawingUrl} alt="User drawing" className="w-full h-full object-contain" />
                </div>
            )}
            
            {note.imageUrl && (
                <div className="w-full h-40 rounded-md overflow-hidden shadow-inner border border-amber-200">
                    <img src={note.imageUrl} alt="Note illustration" className="w-full h-full object-cover" />
                </div>
            )}

            <div 
              ref={contentRef}
              onClick={handleContentClick}
              className="text-amber-900 text-xl sm:text-2xl leading-tight [&_ul]:list-disc [&_ul]:pl-8 [&_.checklist-item]:flex [&_.checklist-item]:items-center [&_.checklist-item]:gap-2 [&_.checklist-item_input]:w-5 [&_.checklist-item_input]:h-5 [&_.checklist-item_input]:accent-amber-600"
              dangerouslySetInnerHTML={{ __html: note.text }}
            />

            {note.audioUrl && (
                <audio controls src={note.audioUrl} className="w-full h-10 custom-audio-player" aria-label="Audio player for note"></audio>
            )}
            
            {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {note.tags.map(tag => (
                        <button 
                            key={tag}
                            onClick={() => onTagClick(tag)}
                            className="bg-amber-200/80 text-amber-800 text-base px-2.5 py-0.5 rounded-full hover:bg-amber-300 transition-colors"
                            aria-label={`Filter by tag: ${tag}`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {note.summary && (
                <div className="text-lg sm:text-xl p-3 bg-amber-600/20 rounded-md border border-amber-600/30">
                    <p className="text-amber-800 font-bold">✨ AI Summary:</p>
                    <p className="text-amber-900">{note.summary}</p>
                </div>
            )}
            
            {note.tasks && note.tasks.length > 0 && (
                <div className="text-lg sm:text-xl p-3 bg-sky-600/20 rounded-md border border-sky-600/30">
                    <p className="text-sky-800 font-bold">📋 Action Items:</p>
                    <ul className="space-y-1 mt-1">
                    {note.tasks.map((task, index) => (
                        <li key={index} className="text-sky-900 flex items-start gap-2">
                           <span className="mt-1.5">&#x25A2;</span> <span>{task}</span>
                        </li>
                    ))}
                    </ul>
                </div>
            )}
            
            {relatedNotes && relatedNotes.length > 0 && (
                 <div className="text-lg sm:text-xl p-3 bg-violet-600/20 rounded-md border border-violet-600/30">
                    <p className="text-violet-800 font-bold">🔗 Related Notes:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                    {relatedNotes.map(related => (
                       <button 
                            key={related.id}
                            onClick={() => onNavigateToNote(related.id)}
                            className="bg-violet-200/80 text-violet-800 text-base px-2.5 py-0.5 rounded-full hover:bg-violet-300 transition-colors"
                            aria-label={`Go to note: ${related.text.substring(0, 20)}`}
                        >
                           {(related.text || "Untitled Note").replace(/<[^>]*>?/gm, '').substring(0, 20)}...
                        </button>
                    ))}
                    </div>
                </div>
            )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
                {note.audioUrl && (
                    <button
                        onClick={() => onTranscribe(note.id)}
                        disabled={isTranscribing}
                        className="bg-sky-400/50 text-sky-800 w-full py-2 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-sky-400 transition duration-200 disabled:bg-sky-200 col-span-2"
                        aria-label="Transcribe audio to text with AI"
                    >
                        {isTranscribing ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> Transcribing...</> ) 
                        : ( <><TranscribeIcon className="w-5 h-5" /> Transcribe Audio</> )}
                    </button>
                )}
                {noteHasText && !note.summary && (
                    <button
                        onClick={() => onSummarize(note.id)}
                        disabled={isSummarizing}
                        className="bg-amber-400/50 text-amber-800 w-full py-2 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition duration-200 disabled:bg-amber-200"
                        aria-label="Summarize note with AI"
                    >
                        {isSummarizing ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> Summarizing...</> ) 
                        : ( <><SparklesIcon className="w-5 h-5" /> Summarize</> )}
                    </button>
                )}
                 {noteHasText && (
                    <button
                        onClick={() => onFindTasks(note.id)}
                        disabled={isExtractingTasks}
                        className="bg-sky-400/50 text-sky-800 w-full py-2 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-sky-400 transition duration-200 disabled:bg-sky-200"
                        aria-label="Find tasks in note with AI"
                    >
                        {isExtractingTasks ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> Finding Tasks...</> ) 
                        : ( <><ClipboardListIcon className="w-5 h-5" /> Find Tasks</> )}
                    </button>
                )}
            </div>
             <button
                onClick={() => onFindRelatedNotes(note.id)}
                disabled={isFindingLinks}
                className="bg-violet-400/50 text-violet-800 w-full py-2 rounded-lg text-lg flex items-center justify-center gap-2 hover:bg-violet-400 transition duration-200 disabled:bg-violet-200"
                aria-label="Find related notes with AI"
            >
                {isFindingLinks ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> Finding Links...</> ) 
                : ( <><LinkIcon className="w-5 h-5" /> Find Related</> )}
            </button>
        </div>
    </div>
  );
};
