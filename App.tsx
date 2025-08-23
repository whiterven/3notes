

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Note, ToastMessage, ToastType, UserProfile } from './types';
import { AddNoteForm } from './components/AddNoteForm';
import { NoteCard } from './components/NoteCard';
import { Toast } from './components/Toast';
import { AiChatAssistant } from './components/AiChatAssistant';
import { EnvironmentSelector } from './components/EnvironmentSelector';
import type { Environment } from './components/EnvironmentSelector';
import { summarizeText, transcribeAudio, extractTasks, findRelatedNotes, expandNoteText } from './services/geminiService';
import { PlusIcon, ProfileIcon, SearchIcon, TagIcon, ChevronLeftIcon, ChevronRightIcon, BrainCircuitIcon, CloseIcon, TrendingUpIcon, LayoutGridIcon, CarouselIcon } from './components/icons';
import { InsightsModal } from './components/InsightsModal';
import { StackViewModal } from './components/StackViewModal';
import { ViewNoteModal } from './components/ViewNoteModal';
import { ProfileModal } from './components/ProfileModal';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';
import type { Session } from '@supabase/supabase-js';
import { InfiniteCanvas } from './components/InfiniteCanvas';

const ENV_STORAGE_KEY = 'ai-3d-notes-env';
const NOTE_COLORS = ['bg-amber-100', 'bg-sky-100', 'bg-lime-100', 'bg-rose-100', 'bg-violet-100', 'bg-white'];

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
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: 'Explorer', avatar: 'avatar1' });
  const [isLoadingSummary, setIsLoadingSummary] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
  const [isExtractingTasks, setIsExtractingTasks] = useState<string | null>(null);
  const [isFindingLinks, setIsFindingLinks] = useState<string | null>(null);
  const [isExpandingNote, setIsExpandingNote] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isInsightsVisible, setIsInsightsVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [environment, setEnvironment] = useState<Environment>(getInitialEnv);
  const [stackingNoteId, setStackingNoteId] = useState<string | null>(null);
  const [viewingStack, setViewingStack] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'carousel' | 'canvas'>('carousel');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string, type: ToastType = 'error') => {
    setToast({ message, type });
  };
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user) {
        // Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching profile:', profileError);
          showToast('Could not fetch your profile.');
        } else if (profileData) {
          setUserProfile({ name: profileData.name, avatar: profileData.avatar });
        } else {
            // If no profile, create one with default values
            const { error: insertError } = await supabase.from('profiles').insert({
                id: session.user.id,
                name: 'Explorer',
                avatar: 'avatar1',
            });
            if(insertError) console.error('Error creating profile:', insertError);
        }

        // Fetch Notes
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false });

        if (notesError) {
          console.error('Error fetching notes:', notesError);
          showToast('Could not fetch your notes.');
        } else {
          setNotes(notesData || []);
        }
      } else {
        // User logged out, clear data
        setNotes([]);
        setUserProfile({ name: 'Explorer', avatar: 'avatar1' });
      }
    };

    fetchUserData();
  }, [session]);
  
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
    const filtered = notes.filter(note => {
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

    // Sort to bring pinned notes to the front
    return filtered.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0; // maintain original order for notes with same pinned status
    });
  }, [notes, searchTerm, activeTags]);
  
  const carouselNotes = useMemo(() => {
    return filteredNotes.filter(note => !note.stack_id);
  }, [filteredNotes]);
  
  const notesInStack = useMemo(() => {
    if (!viewingStack) return [];
    return filteredNotes.filter(note => note.stack_id === viewingStack.id);
  }, [filteredNotes, viewingStack]);

  useEffect(() => {
    setActiveIndex(0);
  }, [carouselNotes.length]);

  const handleSaveNote = async (noteData: Omit<Note, 'id' | 'summary' | 'tasks' | 'related_note_ids' | 'user_id' | 'created_at' | 'canvas_x' | 'canvas_y'>, id?: string) => {
    if (!session?.user) {
        showToast("You must be logged in to save notes.");
        return;
    }

    if (id) {
        const { data, error } = await supabase
            .from('notes')
            .update({ ...noteData, tags: noteData.tags || [] })
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            showToast(`Error updating note: ${error.message}`);
        } else if (data) {
            setNotes(prevNotes => prevNotes.map(n => (n.id === id ? data : n)));
        }
    } else {
        const newNotePayload = {
            ...noteData,
            user_id: session.user.id,
            summary: null,
            tags: noteData.tags || [],
            tasks: null,
            related_note_ids: null,
            is_pinned: false,
            canvas_x: 0,
            canvas_y: 0,
        };
        const { data, error } = await supabase
            .from('notes')
            .insert(newNotePayload)
            .select()
            .single();
        
        if (error) {
            showToast(`Error creating note: ${error.message}`);
        } else if (data) {
            setNotes(prevNotes => [data, ...prevNotes]);
        }
    }
    setIsFormVisible(false);
    setEditingNote(null);
  };
  
  const handleAiCreateNote = async (noteData: { text: string; tags: string[] }) => {
    if (!session?.user) return showToast("You must be logged in.");

    const newNotePayload = {
        user_id: session.user.id,
        text: noteData.text,
        tags: noteData.tags || [],
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        image_url: null,
        drawing_url: null,
        audio_url: null,
        stack_id: null,
        summary: null,
        tasks: null,
        related_note_ids: null,
        is_pinned: false,
        canvas_x: 0,
        canvas_y: 0,
    };

    const { data, error } = await supabase.from('notes').insert(newNotePayload).select().single();
    if (error) {
        showToast(`AI failed to save note: ${error.message}`);
    } else if (data) {
        setNotes(prevNotes => [data, ...prevNotes]);
        showToast("AI created a new note for you!", "success");
    }
  };
  
  const handleAiUpdateNote = async (updateData: { id: string; text?: string; tags?: string[]; color?: string }) => {
    const { id, ...updatePayload } = updateData;
    const { data, error } = await supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        showToast(`AI failed to update note: ${error.message}`);
    } else if (data) {
        setNotes(prev => prev.map(n => n.id === id ? data : n));
        showToast("AI has updated the note!", "success");
    }
  };

  const deleteNote = async (id: string) => {
    const originalNotes = [...notes];
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id)); // Optimistic delete
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
        showToast(`Error deleting note: ${error.message}`);
        setNotes(originalNotes); // Revert on failure
    }
  };

  const handleEditNote = (id: string) => {
    const noteToEdit = notes.find(n => n.id === id);
    if (noteToEdit) {
      setEditingNote(noteToEdit);
      setIsFormVisible(true);
      setViewingStack(null);
      setViewingNote(null);
    }
  };

  const handleViewNote = (note: Note) => {
    setViewingNote(note);
  };

  const handleAddNewNote = () => {
    setEditingNote(null);
    setIsFormVisible(true);
  };

  const updateNoteInDbAndState = async (id: string, update: Partial<Note>) => {
      const { data, error } = await supabase
        .from('notes')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
          throw new Error(error.message);
      }
      if (data) {
          setNotes(prev => prev.map(n => (n.id === id ? data : n)));
      }
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
        await updateNoteInDbAndState(id, { summary });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        showToast(`Could not summarize. ${errorMessage}`);
    } finally {
        setIsLoadingSummary(null);
    }
  };

  const handleTranscribe = async (id: string) => {
    const noteToTranscribe = notes.find(n => n.id === id);
    if (!noteToTranscribe || !noteToTranscribe.audio_url) {
        showToast("Note has no audio to transcribe.");
        return;
    }

    setIsTranscribing(id);
    try {
        const transcribedText = await transcribeAudio(noteToTranscribe.audio_url);
        const newText = noteToTranscribe.text ? `${noteToTranscribe.text}<p>${transcribedText}</p>` : `<p>${transcribedText}</p>`;
        await updateNoteInDbAndState(id, { text: newText });
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
        await updateNoteInDbAndState(id, { tasks });
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
          const related_note_ids = await findRelatedNotes(note, notes);
          await updateNoteInDbAndState(id, { related_note_ids });
          if (related_note_ids.length > 0) {
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

  const handleExpandNote = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note || !note.text) {
        showToast("Note has no text to expand.");
        return;
    }
    setIsExpandingNote(id);
    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = note.text;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        const expandedText = await expandNoteText(plainText);
        const newText = `${note.text}<hr class="my-4 border-amber-300"><h3 class="text-xl font-bold text-amber-800">AI Expansion:</h3>${expandedText}`;
        await updateNoteInDbAndState(id, { text: newText });
        showToast("Note expanded!", "success");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        showToast(`Could not expand note. ${errorMessage}`);
    } finally {
        setIsExpandingNote(null);
    }
  };
  
  const handleNavigateToNote = (id: string) => {
      if (viewMode === 'canvas') {
        showToast("Note navigation is available in Carousel view.", "success");
        return;
      }
      const noteIndex = carouselNotes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
          setActiveIndex(noteIndex);
      } else {
          showToast("Could not find the selected note. It might be filtered out or stacked.");
      }
  };

  const handleImportClick = () => {
      importInputRef.current?.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File could not be read.");
            
            const importedNotes = JSON.parse(text);
            if (!Array.isArray(importedNotes)) throw new Error("Invalid format: Not an array.");

            const validNotes: Note[] = importedNotes.filter(n => n.id && typeof n.text !== 'undefined');
            const newNotes = validNotes.map(n => ({
                ...n,
                is_pinned: n.is_pinned || false,
                tags: n.tags || [],
                canvas_x: n.canvas_x || 0,
                canvas_y: n.canvas_y || 0,
            }));

            const existingIds = new Set(notes.map(n => n.id));
            const uniqueNewNotes = newNotes
                .filter(n => !existingIds.has(n.id))
                .map(n => ({...n, user_id: session.user?.id }));
            
            if (uniqueNewNotes.length === 0) {
                showToast("No new notes to import.", "success");
                return;
            }

            const { error } = await supabase.from('notes').insert(uniqueNewNotes as any);

            if (error) {
                throw new Error(error.message);
            }

            setNotes(prev => [...uniqueNewNotes as Note[], ...prev]);
            showToast(`${uniqueNewNotes.length} notes imported successfully!`, "success");

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            showToast(`Import failed: ${errorMessage}`);
        } finally {
            if (importInputRef.current) {
                importInputRef.current.value = "";
            }
        }
    };
    reader.readAsText(file);
  };
  
  const handleExport = () => {
    if (notes.length === 0) {
      showToast("There are no notes to export.");
      return;
    }
    try {
        const dataStr = JSON.stringify(notes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stickon-ai-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Notes exported successfully!", "success");
    } catch (error) {
        showToast("Failed to export notes.");
    }
  };

  const handleDeleteAllNotes = async () => {
    if(window.confirm("Are you sure you want to delete ALL notes? This action cannot be undone.")) {
        if (!session?.user) return;
        const { error } = await supabase.from('notes').delete().eq('user_id', session.user.id);
        if (error) {
            showToast(`Error deleting notes: ${error.message}`);
        } else {
            setNotes([]);
            showToast("All notes have been deleted.", "success");
        }
    }
  };

  const handleProfileUpdate = async (newProfile: UserProfile) => {
    if (!session?.user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ name: newProfile.name, avatar: newProfile.avatar, updated_at: new Date() })
      .eq('id', session.user.id);

    if (error) {
      showToast(`Error updating profile: ${error.message}`);
    } else {
      setUserProfile(newProfile);
      showToast("Profile updated successfully!", "success");
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showToast(`Logout failed: ${error.message}`);
    } else {
        setIsProfileVisible(false);
    }
  };

  const handleStartStack = (id: string) => {
    setStackingNoteId(current => (current === id ? null : id));
  };
  
  const handleFinishStack = async (targetId: string) => {
    if (!stackingNoteId || stackingNoteId === targetId) return;
    try {
        await updateNoteInDbAndState(stackingNoteId, { stack_id: targetId });
        setStackingNoteId(null);
        showToast("Notes stacked successfully!", "success");
    } catch (error: any) {
        showToast(`Error stacking note: ${error.message}`);
    }
  };

  const handleTogglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    try {
      await updateNoteInDbAndState(id, { is_pinned: !note.is_pinned });
    } catch (error: any) {
      showToast(`Error pinning note: ${error.message}`);
    }
  };
  
  const handleUnstackNote = async (id: string) => {
    try {
        await updateNoteInDbAndState(id, { stack_id: null });
        showToast("Note unstacked!", "success");
    } catch (error: any) {
        showToast(`Error unstacking note: ${error.message}`);
    }
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

  const handleTextUpdate = async (noteId: string, newText: string) => {
    try {
        await updateNoteInDbAndState(noteId, { text: newText });
    } catch (error: any) {
        showToast(`Error saving update: ${error.message}`);
    }
  };
  
  const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
      let timeout: ReturnType<typeof setTimeout>;
      return (...args: Parameters<F>): void => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), delay);
      };
  };

  const savePositionUpdate = useCallback(async (noteId: string, x: number, y: number) => {
      const { error } = await supabase
          .from('notes')
          .update({ canvas_x: x, canvas_y: y })
          .eq('id', noteId);
      if (error) {
          showToast(`Could not save note position: ${error.message}`);
          // Note: No state reversal on failure for now to avoid jumpiness. Position is saved locally.
      }
  }, []);

  const debouncedSavePosition = useMemo(() => debounce(savePositionUpdate, 500), [savePositionUpdate]);

  const handleNotePositionUpdate = useCallback((noteId: string, x: number, y: number) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, canvas_x: x, canvas_y: y } : n));
      debouncedSavePosition(noteId, x, y);
  }, [debouncedSavePosition]);
  
  const handleUpdateNotePositions = async (updates: {id: string; user_id: string; canvas_x: number | null; canvas_y: number | null; }[]) => {
      // 1. Update local state for immediate feedback
      const updateMap = new Map(updates.map(u => [u.id, u]));
      setNotes(prev => prev.map(n => {
          const update = updateMap.get(n.id);
          return update ? { ...n, canvas_x: update.canvas_x, canvas_y: update.canvas_y } : n;
      }));

      // 2. Update database
      const { error } = await supabase.from('notes').upsert(updates);
      if (error) {
          showToast(`Could not save tidy layout: ${error.message}`);
      } else {
          showToast("Canvas tidied!", "success");
      }
  };

  const handleTidyCanvas = () => {
    const notesToTidy = filteredNotes;
    if (notesToTidy.length === 0) {
      showToast("No notes on canvas to tidy.");
      return;
    }

    const NOTE_WIDTH = 280;
    const NOTE_HEIGHT = 180;
    const GAP_X = 40;
    const GAP_Y = 40;
    
    // Use a slightly smaller width to account for scrollbars/padding
    const containerWidth = window.innerWidth * 0.95; 
    const COLUMNS = Math.max(1, Math.floor(containerWidth / (NOTE_WIDTH + GAP_X)));

    const updates = notesToTidy.map((note, index) => {
        const row = Math.floor(index / COLUMNS);
        const col = index % COLUMNS;
        return {
            id: note.id,
            user_id: note.user_id,
            canvas_x: col * (NOTE_WIDTH + GAP_X) + GAP_X, // Add offset from edge
            canvas_y: row * (NOTE_HEIGHT + GAP_Y) + GAP_Y, // Add offset from edge
        };
    });

    handleUpdateNotePositions(updates);
  };


  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % carouselNotes.length);
  };
  
  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + carouselNotes.length) % carouselNotes.length);
  };

  const envClass = `env-${environment}`;
  const isDarkTheme = environment === 'library' || environment === 'scifi';

  if (!session) {
    return <Auth />;
  }

  return (
    <div className={`min-h-screen w-full text-amber-900 font-handwritten selection:bg-amber-400/50 flex flex-col transition-colors duration-500 ${envClass} ${isDarkTheme ? 'dark' : ''}`}>
      <header className="p-2 sm:p-3 flex justify-between items-center sticky top-0 z-30 border-b themed-header transition-colors duration-500">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-amber-800">Stickon AI</h1>
          <p className="text-sm sm:text-lg text-amber-600">Welcome, {userProfile.name}!</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
           <div className="bg-amber-100/50 dark:bg-gray-700/50 p-0.5 rounded-full flex items-center">
              <button onClick={() => setViewMode('carousel')} className={`p-1 sm:px-2 rounded-full flex items-center gap-1.5 text-sm transition ${viewMode === 'carousel' ? 'bg-white dark:bg-gray-900 shadow' : 'opacity-70'}`} title="Carousel View">
                <CarouselIcon className="w-5 h-5"/> <span className="hidden md:inline">Carousel</span>
              </button>
              <button onClick={() => setViewMode('canvas')} className={`p-1 sm:px-2 rounded-full flex items-center gap-1.5 text-sm transition ${viewMode === 'canvas' ? 'bg-white dark:bg-gray-900 shadow' : 'opacity-70'}`} title="Canvas View">
                <LayoutGridIcon className="w-5 h-5"/> <span className="hidden md:inline">Canvas</span>
              </button>
           </div>
           <button onClick={() => setIsInsightsVisible(true)} className="flex items-center text-sm sm:text-base p-1.5 sm:px-2.5 rounded-full transition-colors duration-300 themed-button-violet" title="Get AI Insights">
            <TrendingUpIcon className="w-5 h-5" /> <span className="hidden sm:inline ml-1.5">Insights</span>
          </button>
          <button onClick={() => setIsChatVisible(true)} className="flex items-center text-sm sm:text-base p-1.5 sm:px-2.5 rounded-full transition-colors duration-300 themed-button-violet" title="Ask Your Notes">
            <BrainCircuitIcon className="w-5 h-5" /> <span className="hidden sm:inline ml-1.5">Ask AI</span>
          </button>
          <EnvironmentSelector currentEnv={environment} onSelect={setEnvironment} />
           <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
          <button onClick={() => setIsProfileVisible(true)} className="flex items-center text-sm sm:text-base p-1.5 sm:px-2.5 rounded-full transition-colors duration-300 themed-button" title="Profile & Settings">
            <ProfileIcon className="w-5 h-5" /> <span className="hidden sm:inline ml-1.5">Profile</span>
          </button>
          <button onClick={handleAddNewNote} className="flex items-center gap-1.5 text-sm sm:text-base bg-amber-700 text-white p-2 sm:px-3 rounded-full hover:bg-amber-800 transition-transform duration-300 transform hover:scale-105 shadow-lg" aria-label="Create new note">
            <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">New Note</span>
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
                  className="w-full text-base sm:text-xl p-1.5 sm:p-3 pl-9 sm:pl-12 rounded-full border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-300 transition duration-300 themed-search-input"
              />
          </div>
          {allTags.length > 0 && (
              <div className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto">
                  <TagIcon className="w-5 h-5 themed-filters-text" />
                  {allTags.map(tag => (
                      <button 
                          key={tag} 
                          onClick={() => toggleTagFilter(tag)}
                          className={`text-base px-2.5 py-0.5 rounded-full border transition-colors duration-200 ${activeTags.includes(tag) ? 'bg-amber-700 text-white border-amber-700 themed-tag-button-active' : 'bg-white/60 text-amber-700 border-amber-300 hover:bg-amber-100 themed-tag-button'}`}
                      >
                          {tag}
                      </button>
                  ))}
                  {activeTags.length > 0 && (
                      <button onClick={() => setActiveTags([])} className="text-base text-red-600 hover:underline themed-tag-button-clear">Clear Filters</button>
                  )}
              </div>
          )}
      </section>

      <main className="flex-1 relative">
        {stackingNoteId && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-amber-800/80 text-white p-4 rounded-xl shadow-lg flex items-center gap-4">
                <p className="text-2xl">Stacking Mode: Select a note to stack on.</p>
                <button onClick={() => setStackingNoteId(null)} className="text-white hover:bg-white/20 p-2 rounded-full">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
        )}
        {notes.length > 0 ? (
            (filteredNotes.length > 0) ? (
                <>
                    {viewMode === 'carousel' ? (
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 sm:p-8">
                          <div className="relative w-full max-w-xs sm:max-w-sm h-[384px] sm:h-[400px] transform-style-preserve-3d perspective-1000">
                              {carouselNotes.map((note, index) => {
                                  const offset = index - activeIndex;
                                  const isVisible = Math.abs(offset) <= 2; // Show active, and 2 on each side
                                  const transform = `rotateY(${offset * -25}deg) scale(${1 - Math.abs(offset) * 0.2}) translateX(${offset * 40}%) translateZ(${Math.abs(offset) * -150}px)`;
                                  const opacity = isVisible ? 1 : 0;
                                  const zIndex = 100 - Math.abs(offset);
                                  const pointerEvents = offset === 0 ? 'auto' : 'none';

                                  const relatedNotes = (note.related_note_ids || [])
                                      .map(id => notes.find(n => n.id === id))
                                      .filter((n): n is Note => !!n);
                                      
                                  const stackedNotes = filteredNotes.filter(n => n.stack_id === note.id);

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
                                              onView={() => handleViewNote(note)}
                                              onSummarize={() => handleSummarize(note.id)}
                                              onTranscribe={() => handleTranscribe(note.id)}
                                              onTagClick={handleTagClick}
                                              onTextUpdate={handleTextUpdate}
                                              onFindTasks={() => handleFindTasks(note.id)}
                                              onFindRelatedNotes={() => handleFindRelatedNotes(note.id)}
                                              onExpand={() => handleExpandNote(note.id)}
                                              onNavigateToNote={handleNavigateToNote}
                                              onStartStack={handleStartStack}
                                              onFinishStack={handleFinishStack}
                                              onTogglePin={() => handleTogglePin(note.id)}
                                              onViewStack={() => setViewingStack(note)}
                                              isSummarizing={isLoadingSummary === note.id}
                                              isTranscribing={isTranscribing === note.id}
                                              isExtractingTasks={isExtractingTasks === note.id}
                                              isFindingLinks={isFindingLinks === note.id}
                                              isExpanding={isExpandingNote === note.id}
                                              stackingNoteId={stackingNoteId}
                                              stackCount={stackedNotes.length}
                                          />
                                      </div>
                                  )
                              })}
                          </div>
                          {carouselNotes.length > 1 && (
                              <>
                                  <button onClick={goPrev} className="absolute left-2 sm:left-16 top-1/2 -translate-y-1/2 z-30 bg-white/50 hover:bg-white rounded-full p-1 sm:p-3 shadow-lg backdrop-blur-sm" aria-label="Previous note">
                                      <ChevronLeftIcon className="w-5 h-5 sm:w-8 sm:h-8 text-amber-700" />
                                  </button>
                                  <button onClick={goNext} className="absolute right-2 sm:right-16 top-1/2 -translate-y-1/2 z-30 bg-white/50 hover:bg-white rounded-full p-1 sm:p-3 shadow-lg backdrop-blur-sm" aria-label="Next note">
                                      <ChevronRightIcon className="w-5 h-5 sm:w-8 sm:h-8 text-amber-700" />
                                  </button>
                              </>
                          )}
                      </div>
                    ) : (
                      <div className="absolute inset-0">
                        <InfiniteCanvas 
                          notes={filteredNotes} 
                          onNotePositionChange={handleNotePositionUpdate}
                          onViewNote={handleViewNote}
                          onTidyNotes={handleTidyCanvas}
                        />
                      </div>
                    )}
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center py-10">
                        <h2 className="text-3xl sm:text-4xl text-amber-700 mb-4">No notes found!</h2>
                        <p className="text-xl sm:text-2xl text-amber-600">Try adjusting your search or filters.</p>
                    </div>
                </div>
            )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center py-20">
                <h2 className="text-3xl sm:text-4xl text-amber-700 mb-4">Your canvas is empty!</h2>
                <p className="text-xl sm:text-2xl text-amber-600 mb-8">Click "New Note" to capture your first idea.</p>
                <button onClick={handleAddNewNote} className="flex items-center mx-auto gap-2 text-lg sm:text-xl bg-amber-700 text-white py-2 px-5 sm:py-3 sm:px-6 rounded-full hover:bg-amber-800 transition-transform duration-300 transform hover:scale-105 shadow-lg">
                    <PlusIcon className="w-6 h-6" /> Create a Note
                </button>
            </div>
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
            onNoteUpdate={handleAiUpdateNote}
            showToast={showToast}
          />
      )}

      {isInsightsVisible && (
          <InsightsModal
              notes={notes}
              onClose={() => setIsInsightsVisible(false)}
              showToast={showToast}
          />
      )}
      
      {isProfileVisible && (
          <ProfileModal
            notes={notes}
            userProfile={userProfile}
            onClose={() => setIsProfileVisible(false)}
            onProfileUpdate={handleProfileUpdate}
            onImportClick={handleImportClick}
            onExport={handleExport}
            onDeleteAll={handleDeleteAllNotes}
            onLogout={handleLogout}
          />
      )}

      {viewingStack && (
        <StackViewModal
          parentNote={viewingStack}
          stackedNotes={notesInStack}
          onClose={() => setViewingStack(null)}
          onUnstack={handleUnstackNote}
          onEdit={handleEditNote}
        />
      )}
      
      {viewingNote && (
        <ViewNoteModal 
            note={viewingNote}
            onClose={() => setViewingNote(null)}
            onEdit={handleEditNote}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;