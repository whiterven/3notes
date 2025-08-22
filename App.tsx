import React, { useState, useEffect, useMemo } from 'react';
import type { Note, ToastMessage, ToastType } from './types';
import { AddNoteForm } from './components/AddNoteForm';
import { NoteCard } from './components/NoteCard';
import { Toast } from './components/Toast';
import { AiChatAssistant } from './components/AiChatAssistant';
import { EnvironmentSelector } from './components/EnvironmentSelector';
import type { Environment } from './components/EnvironmentSelector';
import { summarizeText, transcribeAudio, extractTasks, findRelatedNotes } from './services/geminiService';
import { PlusIcon, ExportIcon, SearchIcon, TagIcon, ChevronLeftIcon, ChevronRightIcon, BrainCircuitIcon, CloseIcon } from './components/icons';

const LOCAL_STORAGE_KEY = 'ai-3d-notes';
const ENV_STORAGE_KEY = 'ai-3d-notes-env';
const NOTE_COLORS = ['bg-amber-100', 'bg-sky-100', 'bg-lime-100', 'bg-rose-100', 'bg-violet-100', 'bg-white'];


const getInitialNotes = (): Note[] => {
    try {
        const savedNotes = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes);
            if (Array.isArray(parsedNotes)) {
                // Add default fields to old notes for backwards compatibility
                return parsedNotes.map(note => ({ 
                    ...note, 
                    tags: note.tags || [], 
                    drawingUrl: note.drawingUrl || null,
                    tasks: note.tasks || null,
                    relatedNoteIds: note.relatedNoteIds || null,
                    stackId: note.stackId || null,
                }));
            }
        }
    } catch (error) {
        console.error("Could not load notes from local storage", error);
    }
    return []; 
};

const getInitialEnv = (): Environment => {
    try {
        const savedEnv = window.localStorage.getItem(ENV_STORAGE_KEY);
        if (savedEnv && ['default', 'gallery', 'library', 'scifi'].includes(savedEnv)) {
            return savedEnv as Environment;
        }
    } catch (error) {
        console.error("Could not load environment from local storage", error);
    }
    return 'default';
};

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(getInitialNotes);
  const [isLoadingSummary, setIsLoadingSummary] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
  const [isExtractingTasks, setIsExtractingTasks] = useState<string | null>(null);
  const [isFindingLinks, setIsFindingLinks] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [environment, setEnvironment] = useState<Environment>(getInitialEnv);
  const [stackingNoteId, setStackingNoteId] = useState<string | null>(null);

  useEffect(() => {
    try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error("Could not save notes to local storage", error);
        showToast("Error: Could not save notes.");
    }
  }, [notes]);
  
  useEffect(() => {
    try {
        window.localStorage.setItem(ENV_STORAGE_KEY, environment);
    } catch (error) {
        console.error("Could not save environment to local storage", error);
    }
  }, [environment]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
        if (note.tags) {
            note.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
        const searchMatch = searchTerm.toLowerCase()
            ? note.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (note.summary && note.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
            : true;
        
        const tagsMatch = activeTags.length > 0
            ? activeTags.every(activeTag => note.tags && note.tags.includes(activeTag))
            : true;

        return searchMatch && tagsMatch;
    });
  }, [notes, searchTerm, activeTags]);
  
  const carouselNotes = useMemo(() => {
    return filteredNotes.filter(note => !note.stackId);
  }, [filteredNotes]);

  useEffect(() => {
    setActiveIndex(0);
  }, [carouselNotes.length]);


  const showToast = (message: string, type: ToastType = 'error') => {
    setToast({ message, type });
  };

  const handleSaveNote = (noteData: Omit<Note, 'id' | 'summary' | 'tasks' | 'relatedNoteIds'>, id?: string) => {
    if (id) {
        setNotes(prevNotes => 
            prevNotes.map(n => (n.id === id ? { ...n, ...noteData, tags: noteData.tags || [] } : n))
        );
    } else {
        const newNote: Note = {
            ...noteData,
            id: `note-${Date.now()}`,
            summary: null,
            tags: noteData.tags || [],
            tasks: null,
            relatedNoteIds: null,
        };
        setNotes(prevNotes => [...prevNotes, newNote]);
    }
    setIsFormVisible(false);
    setEditingNote(null);
  };
  
  const handleAiCreateNote = (noteData: { text: string; tags: string[] }) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      text: noteData.text,
      tags: noteData.tags || [],
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      imageUrl: null,
      drawingUrl: null,
      audioUrl: null,
      summary: null,
      tasks: null,
      relatedNoteIds: null,
      stackId: null,
    };
    setNotes(prevNotes => [...prevNotes, newNote]);
    showToast("AI created a new note for you!", "success");
  };

  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };

  const handleEditNote = (id: string) => {
    const noteToEdit = notes.find(n => n.id === id);
    if (noteToEdit) {
      setEditingNote(noteToEdit);
      setIsFormVisible(true);
    }
  };

  const handleAddNewNote = () => {
    setEditingNote(null);
    setIsFormVisible(true);
  };

  const handleSummarize = async (id: string) => {
    const noteToSummarize = notes.find(n => n.id === id);
    if (!noteToSummarize || !noteToSummarize.text) {
        showToast("Note has no text to summarize.");
        return;
    }

    setIsLoadingSummary(id);
    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = noteToSummarize.text;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        
        const summary = await summarizeText(plainText);
        setNotes(prevNotes =>
            prevNotes.map(n => (n.id === id ? { ...n, summary } : n))
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        showToast(`Could not summarize. ${errorMessage}`);
    } finally {
        setIsLoadingSummary(null);
    }
  };

  const handleTranscribe = async (id: string) => {
    const noteToTranscribe = notes.find(n => n.id === id);
    if (!noteToTranscribe || !noteToTranscribe.audioUrl) {
        showToast("Note has no audio to transcribe.");
        return;
    }

    setIsTranscribing(id);
    try {
        const transcribedText = await transcribeAudio(noteToTranscribe.audioUrl);
        setNotes(prevNotes =>
            prevNotes.map(n =>
                n.id === id
                    ? { ...n, text: n.text ? `${n.text}<p>${transcribedText}</p>` : `<p>${transcribedText}</p>` }
                    : n
            )
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        showToast(`Could not transcribe. ${errorMessage}`);
    } finally {
        setIsTranscribing(null);
    }
  };

  const handleFindTasks = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note || !note.text) {
        showToast("Note has no text to analyze for tasks.");
        return;
    }
    setIsExtractingTasks(id);
    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = note.text;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        const tasks = await extractTasks(plainText);
        setNotes(prev => prev.map(n => n.id === id ? { ...n, tasks } : n));
        if (tasks.length > 0) {
            showToast("Tasks found!", "success");
        } else {
            showToast("No tasks found in this note.", "success");
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        showToast(`Could not find tasks. ${errorMessage}`);
    } finally {
        setIsExtractingTasks(null);
    }
  };
  
  const handleFindRelatedNotes = async (id: string) => {
      const note = notes.find(n => n.id === id);
      if (!note) return;
      setIsFindingLinks(id);
      try {
          const relatedNoteIds = await findRelatedNotes(note, notes);
          setNotes(prev => prev.map(n => n.id === id ? { ...n, relatedNoteIds } : n));
          if (relatedNoteIds.length > 0) {
              showToast("Related notes found!", "success");
          } else {
              showToast("No related notes found.", "success");
          }
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          showToast(`Could not find related notes. ${errorMessage}`);
      } finally {
          setIsFindingLinks(null);
      }
  };
  
  const handleNavigateToNote = (id: string) => {
      const noteIndex = carouselNotes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
          setActiveIndex(noteIndex);
      } else {
          showToast("Could not find the selected note. It might be filtered out or stacked.");
      }
  };
  
  const handleExport = () => {
    try {
        const dataStr = JSON.stringify(notes, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const dataUrl = URL.createObjectURL(dataBlob);
        const linkElement = document.createElement('a');
        linkElement.href = dataUrl;
        linkElement.download = 'ai-notes-export.json';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(dataUrl);
        showToast("Notes exported successfully!", "success");
    } catch (error) {
        console.error("Failed to export notes:", error);
        showToast("An error occurred during export.");
    }
  };
  
  const handleStartStack = (id: string) => {
    setStackingNoteId(current => (current === id ? null : id));
  };
  
  const handleFinishStack = (targetId: string) => {
    if (!stackingNoteId || stackingNoteId === targetId) return;
    setNotes(prev => prev.map(n => (n.id === stackingNoteId ? { ...n, stackId: targetId } : n)));
    setStackingNoteId(null);
    showToast("Notes stacked successfully!", "success");
  };

  const toggleTagFilter = (tag: string) => {
    setActiveTags(prev => 
        prev.includes(tag) 
            ? prev.filter(t => t !== tag) 
            : [...prev, tag]
    );
  };

  const handleTagClick = (tag: string) => {
    if (!activeTags.includes(tag)) {
        setActiveTags(prev => [...prev, tag]);
    }
    setSearchTerm('');
  };

  const handleTextUpdate = (noteId: string, newText: string) => {
    setNotes(prevNotes =>
      prevNotes.map(n => (n.id === noteId ? { ...n, text: newText } : n))
    );
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % carouselNotes.length);
  };
  
  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + carouselNotes.length) % carouselNotes.length);
  };

  const envClass = `env-${environment}`;

  return (
    <div className={`min-h-screen w-full text-amber-900 font-handwritten selection:bg-amber-400/50 flex flex-col transition-colors duration-500 ${envClass}`}>
      <header className="p-4 sm:p-6 flex justify-between items-center sticky top-0 z-30 border-b themed-header transition-colors duration-500">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-amber-800">3D AI Notetaker</h1>
          <p className="text-lg sm:text-xl text-amber-600">Capture your ideas in a new dimension.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setIsChatVisible(true)} className="flex items-center text-base sm:text-xl p-2 sm:py-2 sm:px-4 rounded-full transition-colors duration-300 themed-button-violet" title="Ask Your Notes">
            <BrainCircuitIcon className="w-6 h-6" /> <span className="hidden sm:inline ml-2">Ask AI</span>
          </button>
          <EnvironmentSelector currentEnv={environment} onSelect={setEnvironment} />
          <button onClick={handleExport} className="flex items-center text-base sm:text-xl p-2 sm:py-2 sm:px-4 rounded-full transition-colors duration-300 themed-button" title="Export Notes as JSON">
            <ExportIcon className="w-6 h-6" /> <span className="hidden sm:inline ml-2">Export</span>
          </button>
          <button onClick={handleAddNewNote} className="flex items-center gap-2 text-base sm:text-xl bg-amber-700 text-white p-3 sm:py-3 sm:px-5 rounded-full hover:bg-amber-800 transition-transform duration-300 transform hover:scale-105 shadow-lg" aria-label="Create new note">
            <PlusIcon className="w-6 h-6" /> <span className="hidden sm:inline">New Note</span>
          </button>
        </div>
      </header>

      <section className="p-4 sm:p-6 sm:px-8 space-y-4 z-20 themed-header transition-colors duration-500">
          <div className="relative max-w-2xl mx-auto">
              <SearchIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none" />
              <input 
                  type="search"
                  placeholder="Search notes by text, summary, or tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-base sm:text-xl p-2 sm:p-3 pl-10 sm:pl-12 rounded-full border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-300 transition duration-300 themed-search-input"
              />
          </div>
          {allTags.length > 0 && (
              <div className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto">
                  <TagIcon className="w-5 h-5 themed-filters-text" />
                  {allTags.map(tag => (
                      <button 
                          key={tag} 
                          onClick={() => toggleTagFilter(tag)}
                          className={`text-lg px-3 py-1 rounded-full border-2 transition-colors duration-200 ${activeTags.includes(tag) ? 'bg-amber-700 text-white border-amber-700 themed-tag-button-active' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100 themed-tag-button'}`}
                      >
                          {tag}
                      </button>
                  ))}
                  {activeTags.length > 0 && (
                      <button onClick={() => setActiveTags([])} className="text-lg text-red-600 hover:underline themed-tag-button-clear">Clear Filters</button>
                  )}
              </div>
          )}
      </section>

      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8">
        {stackingNoteId && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-amber-800/80 text-white p-4 rounded-xl shadow-lg flex items-center gap-4">
                <p className="text-2xl">Stacking Mode: Select a note to stack on.</p>
                <button onClick={() => setStackingNoteId(null)} className="text-white hover:bg-white/20 p-2 rounded-full">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
        )}
        {notes.length > 0 ? (
            carouselNotes.length > 0 ? (
            <div className="relative w-full h-[550px] flex items-center justify-center overflow-hidden">
                <div className="relative w-full max-w-sm h-[400px] transform-style-preserve-3d perspective-1000">
                    {carouselNotes.map((note, index) => {
                        const offset = index - activeIndex;
                        const isVisible = Math.abs(offset) <= 2; // Show active, and 2 on each side
                        const transform = `rotateY(${offset * -25}deg) scale(${1 - Math.abs(offset) * 0.2}) translateX(${offset * 40}%) translateZ(${Math.abs(offset) * -150}px)`;
                        const opacity = isVisible ? 1 : 0;
                        const zIndex = 100 - Math.abs(offset);
                        const pointerEvents = offset === 0 ? 'auto' : 'none';

                        const relatedNotes = (note.relatedNoteIds || [])
                            .map(id => notes.find(n => n.id === id))
                            .filter((n): n is Note => !!n);
                            
                        const stackedNotes = filteredNotes.filter(n => n.stackId === note.id);

                        return (
                            <div
                                key={note.id}
                                className="absolute top-0 left-0 w-full h-full transition-all duration-500 ease-in-out"
                                style={{ transform, opacity, zIndex, pointerEvents }}
                            >
                                {stackedNotes.map((stackedNote, stackIndex) => (
                                    <div
                                        key={stackedNote.id}
                                        className={`absolute top-0 left-0 w-full h-full rounded-lg shadow-xl border border-amber-300/50 ${stackedNote.color} opacity-80`}
                                        style={{ transform: `translateY(${(stackIndex + 1) * 6}px) translateX(${(stackIndex + 1) * 4}px) translateZ(-${(stackIndex + 1) * 5}px) scale(${1 - (stackIndex + 1) * 0.02})` }}
                                    />
                                ))}
                                <NoteCard
                                    note={note}
                                    relatedNotes={relatedNotes}
                                    onDelete={() => deleteNote(note.id)}
                                    onEdit={() => handleEditNote(note.id)}
                                    onSummarize={() => handleSummarize(note.id)}
                                    onTranscribe={() => handleTranscribe(note.id)}
                                    onTagClick={handleTagClick}
                                    onTextUpdate={handleTextUpdate}
                                    onFindTasks={() => handleFindTasks(note.id)}
                                    onFindRelatedNotes={() => handleFindRelatedNotes(note.id)}
                                    onNavigateToNote={handleNavigateToNote}
                                    onStartStack={handleStartStack}
                                    onFinishStack={handleFinishStack}
                                    isSummarizing={isLoadingSummary === note.id}
                                    isTranscribing={isTranscribing === note.id}
                                    isExtractingTasks={isExtractingTasks === note.id}
                                    isFindingLinks={isFindingLinks === note.id}
                                    stackingNoteId={stackingNoteId}
                                    stackCount={stackedNotes.length}
                                />
                            </div>
                        )
                    })}
                </div>
                {carouselNotes.length > 1 && (
                    <>
                        <button onClick={goPrev} className="absolute left-4 sm:left-16 top-1/2 -translate-y-1/2 z-30 bg-white/50 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg backdrop-blur-sm" aria-label="Previous note">
                            <ChevronLeftIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-700" />
                        </button>
                         <button onClick={goNext} className="absolute right-4 sm:right-16 top-1/2 -translate-y-1/2 z-30 bg-white/50 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg backdrop-blur-sm" aria-label="Next note">
                            <ChevronRightIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-700" />
                        </button>
                    </>
                )}
            </div>
            ) : (
                <div className="text-center py-10">
                    <h2 className="text-3xl sm:text-4xl text-amber-700 mb-4">No notes found!</h2>
                    <p className="text-xl sm:text-2xl text-amber-600">Try adjusting your search or filters.</p>
                </div>
            )
        ) : (
          <div className="text-center py-20">
              <h2 className="text-3xl sm:text-4xl text-amber-700 mb-4">Your canvas is empty!</h2>
              <p className="text-xl sm:text-2xl text-amber-600 mb-8">Click "New Note" to capture your first idea.</p>
              <button onClick={handleAddNewNote} className="flex items-center mx-auto gap-2 text-lg sm:text-xl bg-amber-700 text-white py-2 px-5 sm:py-3 sm:px-6 rounded-full hover:bg-amber-800 transition-transform duration-300 transform hover:scale-105 shadow-lg">
                  <PlusIcon className="w-6 h-6" /> Create a Note
              </button>
          </div>
        )}
      </main>

      {isFormVisible && (
        <AddNoteForm
          onSave={handleSaveNote}
          onClose={() => { setIsFormVisible(false); setEditingNote(null); }}
          noteToEdit={editingNote}
          showToast={showToast}
        />
      )}

      {isChatVisible && (
          <AiChatAssistant
            notes={notes}
            onClose={() => setIsChatVisible(false)}
            onNoteCreate={handleAiCreateNote}
            showToast={showToast}
          />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;