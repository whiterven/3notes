import React, { useState, useEffect, useRef } from 'react';
import type { Note, ToastType } from '../types';
import { generateImage, generateImagePrompt } from '../services/geminiService';
import { AudioRecorder } from './AudioRecorder';
import { ImageIcon, MicIcon, PlusIcon, SparklesIcon, LoaderIcon, CloseIcon, LightbulbIcon, TagIcon, PencilIcon, BoldIcon, ItalicIcon, ListIcon, CheckSquareIcon, LayersIcon } from './icons';

interface DrawingCanvasProps {
  initialDrawing: string | null;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ initialDrawing, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#b45309'); // amber-700
  const [lineWidth, setLineWidth] = useState(5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDrawing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialDrawing;
    }
  }, [initialDrawing]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(offsetX, offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    canvasRef.current?.getContext('2d')?.closePath();
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-3 sm:p-4 gap-2">
        <div className="flex flex-wrap justify-between items-center pb-2 border-b gap-2">
          <h3 className="text-xl sm:text-2xl text-amber-800 font-bold">Sketch Pad</h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10" title="Select color"/>
            <input type="range" min="1" max="50" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-24 sm:w-32 accent-amber-500" title="Adjust brush size"/>
            <button onClick={handleClear} className="text-lg text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition">Clear</button>
            <button onClick={handleSave} className="text-lg bg-amber-600 text-white hover:bg-amber-700 px-4 py-1.5 rounded-lg transition">Save Drawing</button>
            <button onClick={onClose} className="text-amber-600 hover:text-amber-900"><CloseIcon className="w-7 h-7"/></button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="flex-grow w-full h-full bg-white rounded-lg border-2 border-amber-200 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
};


interface NoteFormProps {
  onSave: (note: Omit<Note, 'id' | 'summary' | 'tasks' | 'relatedNoteIds'>, id?: string) => void;
  onClose: () => void;
  noteToEdit: Note | null;
  showToast: (message: string, type?: ToastType) => void;
}

const NOTE_COLORS = ['bg-amber-100', 'bg-sky-100', 'bg-lime-100', 'bg-rose-100', 'bg-violet-100', 'bg-white'];

export const AddNoteForm: React.FC<NoteFormProps> = ({ onSave, onClose, noteToEdit, showToast }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [stackId, setStackId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (noteToEdit) {
      if (editorRef.current) {
        editorRef.current.innerHTML = noteToEdit.text;
      }
      setImageUrl(noteToEdit.imageUrl);
      setDrawingUrl(noteToEdit.drawingUrl);
      setAudioUrl(noteToEdit.audioUrl);
      setColor(noteToEdit.color);
      setTags(noteToEdit.tags || []);
      setStackId(noteToEdit.stackId || null);
    }
     if (editorRef.current) editorRef.current.focus();
  }, [noteToEdit]);
  
  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };
  
  const handleInsertChecklist = () => {
    const html = `<div class="checklist-item" contenteditable="false"><input type="checkbox" /><span contenteditable="true"></span></div>`;
    document.execCommand('insertHTML', false, html);
  };


  const handleSuggestPrompt = async () => {
    const textContent = editorRef.current?.textContent;
    if (!textContent) {
        showToast("Please write some text in your note first to suggest a prompt.");
        return;
    }
    setIsSuggestingPrompt(true);
    try {
        const suggestedPrompt = await generateImagePrompt(textContent);
        setImagePrompt(suggestedPrompt);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        showToast(`Could not suggest a prompt. ${errorMessage}`);
    } finally {
        setIsSuggestingPrompt(false);
    }
  };

  const handleImageGenerate = async () => {
    if (!imagePrompt) return;
    setIsGeneratingImage(true);
    try {
      const generatedImageUrl = await generateImage(imagePrompt);
      setImageUrl(generatedImageUrl);
      setShowImageGenerator(false);
      showToast("Image generated successfully!", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      showToast(`Failed to generate image. ${errorMessage}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        const newTag = tagInput.trim().replace(/,/g, '');
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
        }
        setTagInput('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };
  
  const handleUnstack = () => {
    setStackId(null);
    showToast("Note has been unstacked. Save to confirm.", "success");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = editorRef.current?.innerHTML || '';
    if (!text && !imageUrl && !audioUrl && !drawingUrl) {
        showToast("Please add some content to your note.");
        return;
    }
    onSave({ text, imageUrl, drawingUrl, audioUrl, color, tags, stackId }, noteToEdit?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
        <form onSubmit={handleSubmit} className="relative bg-white/90 shadow-2xl rounded-2xl p-4 sm:p-6 w-full max-w-2xl border border-amber-200 space-y-3 sm:space-y-4 animate-fade-in-up max-h-[90vh] overflow-y-auto thin-scrollbar themed-modal-bg">
          <button type="button" onClick={onClose} className="absolute top-3 right-3 text-amber-600 hover:text-amber-900 themed-modal-text z-10" aria-label="Close form">
            <CloseIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          
          <h2 className="text-3xl sm:text-4xl text-amber-800 text-center themed-modal-text">{noteToEdit ? 'Edit Note' : 'New Note'}</h2>

          <div className="flex items-center gap-1 border border-amber-200 rounded-lg p-1 sm:p-2 themed-modal-input-bg">
              <button type="button" onClick={() => handleFormat('bold')} className="p-1.5 sm:p-2 rounded hover:bg-amber-100 themed-modal-button" title="Bold"><BoldIcon className="w-5 h-5"/></button>
              <button type="button" onClick={() => handleFormat('italic')} className="p-1.5 sm:p-2 rounded hover:bg-amber-100 themed-modal-button" title="Italic"><ItalicIcon className="w-5 h-5"/></button>
              <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 sm:p-2 rounded hover:bg-amber-100 themed-modal-button" title="Bullet List"><ListIcon className="w-5 h-5"/></button>
              <button type="button" onClick={handleInsertChecklist} className="p-1.5 sm:p-2 rounded hover:bg-amber-100 themed-modal-button" title="Checklist"><CheckSquareIcon className="w-5 h-5"/></button>
          </div>
          
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full bg-transparent border-b-2 border-amber-300 focus:border-amber-500 text-xl sm:text-2xl p-2 min-h-[250px] resize-y overflow-y-auto transition duration-300 focus:outline-none placeholder-amber-500 themed-modal-text themed-modal-text-alt [&_ul]:list-disc [&_ul]:pl-8 [&_.checklist-item]:flex [&_.checklist-item]:items-center [&_.checklist-item]:gap-2 [&_.checklist-item_input]:w-5 [&_.checklist-item_input]:h-5 [&_.checklist-item_input]:accent-amber-600 thin-scrollbar"
            data-placeholder="Jot down an idea..."
          />
          
           <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                  {imageUrl && (
                      <div className="relative group">
                          <img src={imageUrl} alt="Generated preview" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-amber-200" />
                          <button type="button" onClick={() => setImageUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Remove image">
                              <CloseIcon className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  {drawingUrl && (
                      <div className="relative group">
                          <img src={drawingUrl} alt="Drawing preview" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-amber-200 bg-white" />
                          <button type="button" onClick={() => setDrawingUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Remove drawing">
                              <CloseIcon className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  {audioUrl && (
                      <div className="relative group flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-amber-100 rounded-lg border-2 border-amber-200 p-2 text-center">
                          <MicIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-700 mb-2"/>
                          <p className="text-xs sm:text-sm text-amber-800">Audio Attached</p>
                           <button type="button" onClick={() => setAudioUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Remove audio">
                              <CloseIcon className="w-4 h-4" />
                          </button>
                      </div>
                  )}
              </div>
              {stackId && (
                  <button onClick={handleUnstack} className="flex items-center gap-2 bg-rose-100 text-rose-700 px-2 py-1 rounded-md hover:bg-rose-200 text-base">
                      <LayersIcon className="w-5 h-5" /> Note is stacked. Click to unstack.
                  </button>
              )}
          </div>

          {showImageGenerator && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe an image..." className="flex-grow bg-amber-50 border-2 border-amber-200 rounded-lg p-2 text-base sm:text-lg focus:outline-none focus:border-amber-400 transition themed-modal-input-bg themed-modal-text-alt" />
              <button type="button" onClick={handleSuggestPrompt} disabled={isSuggestingPrompt || !editorRef.current?.textContent} className="bg-amber-400 text-white p-2 rounded-lg text-lg sm:text-xl hover:bg-amber-500 transition duration-200 disabled:bg-amber-300 flex items-center justify-center" title="Suggest prompt from note text">
                {isSuggestingPrompt ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <LightbulbIcon className="w-6 h-6" />}
              </button>
              <button type="button" onClick={handleImageGenerate} disabled={isGeneratingImage || !imagePrompt} className="bg-amber-500 text-white p-2 rounded-lg text-lg sm:text-xl hover:bg-amber-600 transition duration-200 disabled:bg-amber-300 flex items-center justify-center" title="Generate image">
                {isGeneratingImage ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <SparklesIcon className="w-6 h-6" />}
              </button>
            </div>
          )}

          {showAudioRecorder && <AudioRecorder onRecordingComplete={(url) => { setAudioUrl(url); setShowAudioRecorder(false); }} showToast={showToast} />}
          {isDrawing && <DrawingCanvas initialDrawing={drawingUrl} onSave={(data) => { setDrawingUrl(data); setIsDrawing(false); }} onClose={() => setIsDrawing(false)} />}

          <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg text-amber-700 themed-modal-text-alt"><TagIcon className="w-5 h-5" /><label htmlFor="tags-input" className="font-bold">Tags</label></div>
              <div className="flex flex-wrap items-center gap-2 p-2 bg-amber-50 border-2 border-amber-200 rounded-lg themed-modal-input-bg">
                  {tags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-1 bg-amber-400 text-white text-base font-bold px-2 py-1 rounded-full animate-fade-in-up">
                          <span>{tag}</span>
                          <button type="button" onClick={() => removeTag(index)} className="text-white/80 hover:text-white" aria-label={`Remove ${tag} tag`}><CloseIcon className="w-4 h-4" /></button>
                      </div>
                  ))}
                  <input id="tags-input" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagInputKeyDown} placeholder="Add tags (Enter)..." className="flex-grow bg-transparent text-base sm:text-lg focus:outline-none p-1 themed-modal-text-alt" />
              </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5 items-center" role="radiogroup" aria-labelledby="color-chooser-label">
                  <span id="color-chooser-label" className="sr-only">Choose note color</span>
                  {NOTE_COLORS.map(c => ( <button type="button" key={c} onClick={() => setColor(c)} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full cursor-pointer border-2 transition-transform duration-200 hover:scale-110 ${c} ${color === c ? 'border-amber-600 scale-110' : 'border-transparent'}`} aria-label={`Set color to ${c.split('-')[1]}`}></button> ))}
                </div>
                <div className="h-8 w-px bg-amber-200 mx-1 themed-modal-input-bg"></div>
                <button type="button" onClick={() => setIsDrawing(true)} className={`p-2 sm:p-3 rounded-full transition duration-200 bg-amber-100 hover:bg-amber-200 themed-modal-button`} title="Draw a Sketch" aria-label="Draw a Sketch"><PencilIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700"/></button>
                <button type="button" onClick={() => {setShowImageGenerator(s => !s); setShowAudioRecorder(false)}} className={`p-2 sm:p-3 rounded-full transition duration-200 ${showImageGenerator ? 'bg-amber-300 themed-modal-button-active' : 'bg-amber-100 hover:bg-amber-200 themed-modal-button'}`} title="Generate Image" aria-label="Generate Image"><ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700"/></button>
                <button type="button" onClick={() => {setShowAudioRecorder(s => !s); setShowImageGenerator(false)}} className={`p-2 sm:p-3 rounded-full transition duration-200 ${showAudioRecorder ? 'bg-amber-300 themed-modal-button-active' : 'bg-amber-100 hover:bg-amber-200 themed-modal-button'}`} title="Record Audio" aria-label="Record Audio"><MicIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700"/></button>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <button type="button" onClick={onClose} className="w-full sm:w-auto text-amber-700 text-base sm:text-lg font-bold py-2.5 px-4 sm:py-2 sm:px-5 rounded-full hover:bg-amber-100 transition duration-300 themed-modal-button">Cancel</button>
                <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-700 text-white text-base sm:text-lg font-bold py-2.5 px-4 sm:py-2 sm:px-5 rounded-full hover:bg-amber-800 transition duration-300 transform hover:scale-105 shadow-lg">
                  <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6" /> {noteToEdit ? 'Save Note' : 'Add Note'}
                </button>
            </div>
          </div>
        </form>
    </div>
  );
};