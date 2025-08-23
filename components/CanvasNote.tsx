
import React, { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';
import { LayersIcon, PinIcon } from './icons';

interface CanvasNoteProps {
    note: Note;
    onPositionChange: (id: string, x: number, y: number) => void;
    onView: (note: Note) => void;
    scale: number;
}

export const CanvasNote: React.FC<CanvasNoteProps> = ({ note, onPositionChange, onView, scale }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const noteRef = useRef<HTMLDivElement>(null);

    const plainText = (note.text || "").replace(/<[^>]*>?/gm, ' ').substring(0, 100);
    const stackCount = 0; // Simplified for now, could be passed in if needed

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !noteRef.current) return;
            e.preventDefault();

            const dx = (e.clientX - dragStartPos.current.x) / scale;
            const dy = (e.clientY - dragStartPos.current.y) / scale;

            const newX = (note.canvas_x || 0) + dx;
            const newY = (note.canvas_y || 0) + dy;
            
            noteRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isDragging || !noteRef.current) return;
            
            const dx = (e.clientX - dragStartPos.current.x);
            const dy = (e.clientY - dragStartPos.current.y);

            // If it moved significantly, it's a drag, otherwise it's a click
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                const newX = (note.canvas_x || 0) + dx / scale;
                const newY = (note.canvas_y || 0) + dy / scale;
                onPositionChange(note.id, newX, newY);
            } else {
                onView(note);
            }

            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, scale, note.id, note.canvas_x, note.canvas_y, onPositionChange, onView]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
    };

    return (
        <div
            ref={noteRef}
            onMouseDown={handleMouseDown}
            style={{ 
                transform: `translate(${note.canvas_x || 0}px, ${note.canvas_y || 0}px)`,
                width: '280px',
                height: '180px',
            }}
            className={`absolute p-3 rounded-lg shadow-lg border border-amber-300/50 flex flex-col gap-2 cursor-grab transition-transform duration-500 ease-in-out ${isDragging ? 'cursor-grabbing shadow-2xl z-50' : ''} ${note.color}`}
            aria-label={`Note with text: ${plainText.substring(0, 30)}...`}
        >
             {note.is_pinned && (
                <div className="absolute top-2 right-2 z-0" title="Pinned note">
                     <PinIcon className="w-5 h-5 text-amber-600/50" isFilled={true} />
                </div>
            )}
            <div className="flex-grow overflow-hidden space-y-2 pointer-events-none">
                {note.image_url && (
                    <div className="w-full h-16 rounded-md overflow-hidden shadow-inner border border-amber-200">
                        <img src={note.image_url} alt="Note illustration" className="w-full h-full object-cover" />
                    </div>
                )}
                {note.drawing_url && (
                    <div className="w-full h-16 rounded-md overflow-hidden shadow-inner border border-amber-200 bg-white">
                        <img src={note.drawing_url} alt="User drawing" className="w-full h-full object-contain" />
                    </div>
                )}
                <p className="text-amber-900 text-lg leading-tight">{plainText}{plainText.length === 100 ? '...' : ''}</p>
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
