import React, { useRef } from 'react';
import type { Note } from '../types';
import { CloseIcon, LoaderIcon, SparklesIcon, EditIcon, TranscribeIcon, ClipboardListIcon, LinkIcon, LayersIcon, WandIcon } from './icons';

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
  onExpand: (id: string) => void;
  onNavigateToNote: (id: string) => void;
  onStartStack: (id: string) => void;
  onFinishStack: (id: string) => void;
  isSummarizing: boolean;
  isTranscribing: boolean;
  isExtractingTasks: boolean;
  isFindingLinks: boolean;
  isExpanding: boolean;
  stackingNoteId: string | null;
  stackCount: number;
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
    onExpand,
    onNavigateToNote,
    onStartStack,
    onFinishStack,
    isSummarizing, 
    isTranscribing,
    isExtractingTasks,
    isFindingLinks,
    isExpanding,
    stackingNoteId,
    stackCount,
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
  const isStacking = !!stackingNoteId;
  const isThisNoteStackingSource = stackingNoteId === note.id;
  const isThisNoteStackingTarget = isStacking && !isThisNoteStackingSource;

  return (
    <div 
      className={`
      w-full max-w-sm sm:w-80 h-96 p-5 rounded-lg shadow-xl border border-amber-300/50 
      flex flex-col gap-3 relative transition-all duration-300 ease-in-out
      ${note.color}
      `}
      aria-label={`Note with text: ${note.text.substring(0, 30)}...`}
    >
        {isThisNoteStackingTarget && (
            <button
                onClick={() => onFinishStack(note.id)}
                className="absolute inset-0 bg-amber-800/80 rounded-lg z-20 flex flex-col items-center justify-center text-white text-3xl font-bold animate-fade-in-up"
            >
                <LayersIcon className="w-12 h-12 mb-2"/>
                Stack Here
            </button>
        )}

        <div className={`absolute top-3 right-3 flex gap-1.5 z-10 ${isStacking ? 'opacity-20' : ''}`}>
            <button onClick={() => onEdit(note.id)} disabled={isStacking} className="bg-amber-500/60 text-white rounded-full p-1.5 hover:bg-amber-500 transition-colors" aria-label="Edit note">
                <EditIcon className="w-5 h-5"/>
            </button>
            <button onClick={() => onDelete(note.id)} disabled={isStacking} className="bg-red-500/60 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors" aria-label="Delete note">
                <CloseIcon className="w-5 h-5"/>
            </button>
        </div>
        
        {stackCount > 0 && !isStacking && (
            <div className="absolute top-3 left-3 bg-amber-600 text-white text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full z-10 shadow-md" title={`${stackCount} more notes in this stack`}>
                +{stackCount}
            </div>
        )}

        <div className={`flex-grow overflow-y-auto pr-2 thin-scrollbar space-y-3 ${isStacking ? 'opacity-20' : ''}`}>
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
                            disabled={isStacking}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {note.summary && (
                <div className="text-base sm:text-lg p-3 bg-amber-600/20 rounded-md border border-amber-600/30">
                    <p className="text-amber-800 font-bold">✨ AI Summary:</p>
                    <p className="text-amber-900">{note.summary}</p>
                </div>
            )}
            
            {note.tasks && note.tasks.length > 0 && (
                <div className="text-base sm:text-lg p-3 bg-sky-600/20 rounded-md border border-sky-600/30">
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
                 <div className="text-base sm:text-lg p-3 bg-violet-600/20 rounded-md border border-violet-600/30">
                    <p className="text-violet-800 font-bold">🔗 Related Notes:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                    {relatedNotes.map(related => (
                       <button 
                            key={related.id}
                            onClick={() => onNavigateToNote(related.id)}
                            className="bg-violet-200/80 text-violet-800 text-sm sm:text-base px-2.5 py-0.5 rounded-full hover:bg-violet-300 transition-colors"
                            aria-label={`Go to note: ${related.text.substring(0, 20)}`}
                            disabled={isStacking}
                        >
                           {(related.text || "Untitled Note").replace(/<[^>]*>?/gm, '').substring(0, 20)}...
                        </button>
                    ))}
                    </div>
                </div>
            )}
        </div>

        <div className={`mt-auto flex flex-col gap-2 pt-2 ${isStacking ? 'opacity-20' : ''}`}>
            {note.audioUrl && (
                <button
                    onClick={() => onTranscribe(note.id)}
                    disabled={isTranscribing || isStacking}
                    className="bg-sky-400/50 text-sky-800 w-full py-1.5 sm:py-2 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-sky-400 transition duration-200 disabled:bg-sky-200"
                    aria-label="Transcribe audio to text with AI"
                >
                    {isTranscribing ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> Transcribing...</> ) 
                    : ( <><TranscribeIcon className="w-5 h-5" /> Transcribe</> )}
                </button>
            )}
            <div className="flex flex-wrap gap-2">
                {noteHasText && !note.summary && (
                    <button
                        onClick={() => onSummarize(note.id)}
                        disabled={isSummarizing || isStacking}
                        className="flex-1 min-w-[120px] bg-amber-400/50 text-amber-800 py-1.5 sm:py-2 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition duration-200 disabled:bg-amber-200"
                        aria-label="Summarize note with AI"
                    >
                        {isSummarizing ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> ...</> ) 
                        : ( <><SparklesIcon className="w-5 h-5" /> Sum'ize</> )}
                    </button>
                )}
                 {noteHasText && (
                    <button
                        onClick={() => onExpand(note.id)}
                        disabled={isExpanding || isStacking}
                        className="flex-1 min-w-[120px] bg-rose-400/50 text-rose-800 py-1.5 sm:py-2 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-rose-400 transition duration-200 disabled:bg-rose-200"
                        aria-label="Expand note with AI"
                    >
                        {isExpanding ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> ...</> ) 
                        : ( <><WandIcon className="w-5 h-5" /> Expand</> )}
                    </button>
                )}
                 {noteHasText && (
                    <button
                        onClick={() => onFindTasks(note.id)}
                        disabled={isExtractingTasks || isStacking}
                        className="flex-1 min-w-[120px] bg-sky-400/50 text-sky-800 py-1.5 sm:py-2 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-sky-400 transition duration-200 disabled:bg-sky-200"
                        aria-label="Find tasks in note with AI"
                    >
                        {isExtractingTasks ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> ...</> ) 
                        : ( <><ClipboardListIcon className="w-5 h-5" /> Tasks</> )}
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                 <button
                    onClick={() => onFindRelatedNotes(note.id)}
                    disabled={isFindingLinks || isStacking}
                    className="flex-1 min-w-[120px] bg-violet-400/50 text-violet-800 py-1.5 sm:py-2 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-violet-400 transition duration-200 disabled:bg-violet-200"
                    aria-label="Find related notes with AI"
                >
                    {isFindingLinks ? ( <><LoaderIcon className="w-5 h-5 animate-spin" /> ...</> ) 
                    : ( <><LinkIcon className="w-5 h-5" /> Related</> )}
                </button>
                <button
                    onClick={() => onStartStack(note.id)}
                    disabled={isStacking}
                    className={`flex-1 min-w-[120px] py-1.5 sm:py-2 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2 transition duration-200 ${
                        isThisNoteStackingSource
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-gray-400/50 text-gray-800 hover:bg-gray-400 disabled:bg-gray-200'
                      }`}
                    aria-label="Stack this note on another"
                >
                   <LayersIcon className="w-5 h-5" />
                   {isThisNoteStackingSource ? 'Select Target' : 'Stack'}
                </button>
            </div>
        </div>
    </div>
  );
};