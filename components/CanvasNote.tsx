import React, { useRef } from 'react';
import type { Note } from '../types';
import { PinIcon } from './icons';

interface CanvasNoteProps {
    note: Note;
    onPositionChange: (id: string, x: number, y: number) => void;
    onView: (note: Note) => void;
    scale: number;
}

export const CanvasNote: React.FC<CanvasNoteProps> = ({ note, onPositionChange, onView, scale }) => {
    const noteRef = useRef<HTMLDivElement>(null);
    // Use a more detailed state for dragging to make it robust
    const dragData = useRef({ isDragging: false, startX: 0, startY: 0, startNoteX: 0, startNoteY: 0, hasMoved: false });

    const plainText = (note.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 100);

    const handleDragStart = (clientX: number, clientY: number) => {
        dragData.current = {
            isDragging: true,
            startX: clientX,
            startY: clientY,
            startNoteX: note.canvas_x || 0, // Capture position at drag start
            startNoteY: note.canvas_y || 0,
            hasMoved: false
        };
        if (noteRef.current) {
            noteRef.current.style.transition = 'none';
            noteRef.current.classList.add('cursor-grabbing', 'shadow-2xl', 'z-50');
        }
    };

    const handleDragMove = (clientX: number, clientY: number) => {
        if (!dragData.current.isDragging || !noteRef.current) return;

        // Use pixel distance for move detection to avoid scale issues
        const pixelDx = clientX - dragData.current.startX;
        const pixelDy = clientY - dragData.current.startY;
        
        if (!dragData.current.hasMoved && (Math.abs(pixelDx) > 5 || Math.abs(pixelDy) > 5)) {
            dragData.current.hasMoved = true;
        }
        
        const dx = pixelDx / scale;
        const dy = pixelDy / scale;

        const newX = dragData.current.startNoteX + dx;
        const newY = dragData.current.startNoteY + dy;
        noteRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    };

    const handleDragEnd = (clientX: number, clientY: number) => {
        if (!dragData.current.isDragging) return;

        const wasMoved = dragData.current.hasMoved;
        
        // Finalize dragging state before anything else
        dragData.current.isDragging = false;

        if (noteRef.current) {
            // Always clean up styles
            noteRef.current.style.transition = '';
            noteRef.current.classList.remove('cursor-grabbing', 'shadow-2xl', 'z-50');
        }

        if (wasMoved) {
            const dx = (clientX - dragData.current.startX) / scale;
            const dy = (clientY - dragData.current.startY) / scale;
            const finalX = dragData.current.startNoteX + dx;
            const finalY = dragData.current.startNoteY + dy;

            // Immediately set the final transform style. This is the key to preventing the jump.
            // The note will stay visually in place while React state catches up.
            if (noteRef.current) {
                noteRef.current.style.transform = `translate(${finalX}px, ${finalY}px)`;
            }
            
            // Now, tell the parent about the new final position.
            onPositionChange(note.id, finalX, finalY);
        } else {
            // If it wasn't moved, treat it as a click/tap.
            onView(note);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleDragStart(e.clientX, e.clientY);
        
        const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientX, ev.clientY);
        const onMouseUp = (ev: MouseEvent) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            handleDragEnd(ev.clientX, ev.clientY);
        };
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        handleDragStart(touch.clientX, touch.clientY);
        
        const onTouchMove = (ev: TouchEvent) => {
            if (ev.touches.length === 1) {
                handleDragMove(ev.touches[0].clientX, ev.touches[0].clientY);
            }
        };
        const onTouchEnd = (ev: TouchEvent) => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            handleDragEnd(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
        };
        
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);
    };


    return (
        <div
            ref={noteRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{ 
                transform: `translate(${note.canvas_x || 0}px, ${note.canvas_y || 0}px)`,
            }}
            className={`absolute w-60 h-40 sm:w-72 sm:h-48 p-3 rounded-lg shadow-lg border border-amber-300/50 flex flex-col gap-2 cursor-grab transition-transform duration-500 ease-in-out ${note.color}`}
            aria-label={`Note with text: ${plainText.substring(0, 30)}...`}
        >
             {note.is_pinned && (
                <div className="absolute top-2 right-2 z-0" title="Pinned note">
                     <PinIcon className="w-5 h-5 text-amber-600/50" isFilled={true} />
                </div>
            )}
            <div className="flex-grow overflow-hidden space-y-2 pointer-events-none">
                {note.image_url && (
                    <div className="w-full h-12 sm:h-16 rounded-md overflow-hidden shadow-inner border border-amber-200">
                        <img src={note.image_url} alt="Note illustration" className="w-full h-full object-cover" />
                    </div>
                )}
                {note.drawing_url && (
                    <div className="w-full h-12 sm:h-16 rounded-md overflow-hidden shadow-inner border border-amber-200 bg-white">
                        <img src={note.drawing_url} alt="User drawing" className="w-full h-full object-contain" />
                    </div>
                )}
                <p className="text-amber-900 text-base sm:text-lg leading-tight">{plainText}{plainText.length === 100 ? '...' : ''}</p>
            </div>

            {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pointer-events-none">
                    {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-amber-200/80 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};