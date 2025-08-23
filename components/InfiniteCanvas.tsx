
import React, { useState, useRef } from 'react';
import type { Note } from '../types';
import { CanvasNote } from './CanvasNote';
import { CanvasControls } from './CanvasControls';

interface InfiniteCanvasProps {
    notes: Note[];
    onNotePositionChange: (id: string, x: number, y: number) => void;
    onViewNote: (note: Note) => void;
    onTidyNotes: () => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ notes, onNotePositionChange, onViewNote, onTidyNotes }) => {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const startPanPos = useRef({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target !== canvasRef.current) return;
        e.preventDefault();
        setIsPanning(true);
        startPanPos.current = { 
            x: e.clientX - transform.x,
            y: e.clientY - transform.y 
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        setTransform(prev => ({
            ...prev,
            x: e.clientX - startPanPos.current.x,
            y: e.clientY - startPanPos.current.y
        }));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * -0.005;
        const newScale = Math.min(Math.max(transform.scale + delta, MIN_SCALE), MAX_SCALE);

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Pan the canvas so the point under the mouse stays in the same place
            const newX = transform.x + (mouseX - transform.x) * (1 - newScale / transform.scale);
            const newY = transform.y + (mouseY - transform.y) * (1 - newScale / transform.scale);
            
            setTransform({ x: newX, y: newY, scale: newScale });
        }
    };

    const handleZoom = (direction: 'in' | 'out') => {
        const zoomFactor = 1.2;
        const newScale = direction === 'in' 
            ? Math.min(transform.scale * zoomFactor, MAX_SCALE)
            : Math.max(transform.scale / zoomFactor, MIN_SCALE);
        
        setTransform(prev => ({ ...prev, scale: newScale }));
    };

    const resetView = () => {
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    return (
        <div 
            ref={canvasRef}
            className="w-full h-full overflow-hidden cursor-grab relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
             <div 
                className="absolute top-0 left-0"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                }}
             >
                {notes.map(note => (
                    <CanvasNote
                        key={note.id}
                        note={note}
                        onPositionChange={onNotePositionChange}
                        onView={onViewNote}
                        scale={transform.scale}
                    />
                ))}
             </div>
             
             <CanvasControls 
                onZoom={handleZoom}
                onResetView={resetView}
                onTidy={onTidyNotes}
             />
        </div>
    );
};
