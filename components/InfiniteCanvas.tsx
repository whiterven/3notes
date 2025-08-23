

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

const getDistance = (touches: React.TouchList | TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
};

const getMidpoint = (touches: React.TouchList | TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
};

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ notes, onNotePositionChange, onViewNote, onTidyNotes }) => {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const isPanningRef = useRef(false);
    const startPanPos = useRef({ x: 0, y: 0 });
    const pinchStartDistance = useRef(0);
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target !== canvasRef.current) return;
        e.preventDefault();
        isPanningRef.current = true;
        startPanPos.current = { 
            x: e.clientX - transform.x,
            y: e.clientY - transform.y 
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanningRef.current) return;
        e.preventDefault();
        setTransform(prev => ({
            ...prev,
            x: e.clientX - startPanPos.current.x,
            y: e.clientY - startPanPos.current.y
        }));
    };

    const handleMouseUp = () => {
        isPanningRef.current = false;
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

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.target !== canvasRef.current) return;
        e.preventDefault();

        if (e.touches.length === 1) { // Pan
            isPanningRef.current = true;
            startPanPos.current = {
                x: e.touches[0].clientX - transform.x,
                y: e.touches[0].clientY - transform.y
            };
        } else if (e.touches.length === 2) { // Pinch
            isPanningRef.current = false; // Stop panning if it was active
            pinchStartDistance.current = getDistance(e.touches);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();

        if (e.touches.length === 1 && isPanningRef.current) { // Pan
            setTransform(prev => ({
                ...prev,
                x: e.touches[0].clientX - startPanPos.current.x,
                y: e.touches[0].clientY - startPanPos.current.y
            }));
        } else if (e.touches.length === 2 && pinchStartDistance.current > 0) { // Pinch
            const newDistance = getDistance(e.touches);
            const scaleFactor = newDistance / pinchStartDistance.current;
            
            setTransform(prevTransform => {
                const newScale = Math.min(Math.max(prevTransform.scale * scaleFactor, MIN_SCALE), MAX_SCALE);
                
                if (canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect();
                    const midpoint = getMidpoint(e.touches);
                    const mouseX = midpoint.x - rect.left;
                    const mouseY = midpoint.y - rect.top;

                    const newX = prevTransform.x + (mouseX - prevTransform.x) * (1 - newScale / prevTransform.scale);
                    const newY = prevTransform.y + (mouseY - prevTransform.y) * (1 - newScale / prevTransform.scale);
                    
                    return { x: newX, y: newY, scale: newScale };
                }
                return { ...prevTransform, scale: newScale };
            });

            pinchStartDistance.current = newDistance; // Update for continuous zoom
        }
    };

    const handleTouchEnd = () => {
        isPanningRef.current = false;
        pinchStartDistance.current = 0;
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
            className="w-full h-full overflow-hidden cursor-grab relative touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
