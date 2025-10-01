"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface ResizableSplitterProps {
  /** The initial width of the right panel in pixels */
  initialWidth?: number;
  /** Minimum width of the right panel in pixels */
  minWidth?: number;
  /** Maximum width of the right panel in pixels */
  maxWidth?: number;
  /** The left panel content */
  leftPanel: React.ReactNode;
  /** The right panel content */
  rightPanel: React.ReactNode;
  /** Whether the right panel is visible */
  showRightPanel: boolean;
  /** Callback when width changes */
  onWidthChange?: (width: number) => void;
  /** Class name for the container */
  className?: string;
}

export function ResizableSplitter({
  initialWidth = 320,
  minWidth = 200,
  maxWidth = 600,
  leftPanel,
  rightPanel,
  showRightPanel,
  onWidthChange,
  className = "",
}: ResizableSplitterProps) {
  const [rightPanelWidth, setRightPanelWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = rightPanelWidth;
    
    // Add selection prevention
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, [rightPanelWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = startXRef.current - e.clientX; // Inverted because we're resizing from the left edge
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));
    
    setRightPanelWidth(newWidth);
    onWidthChange?.(newWidth);
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex min-h-0 ${className}`}>
      {/* Left Panel */}
      <div 
        className="flex-1 min-h-0 flex flex-col"
        style={{ 
          marginRight: '0px'
        }}
      >
        {leftPanel}
      </div>

      {/* Right Panel with Resizer */}
      {showRightPanel && (
        <div 
          className="relative flex min-h-0"
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className={`
              absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10
              hover:bg-primary/20 active:bg-primary/30 transition-colors
              ${isResizing ? 'bg-primary/30' : ''}
            `}
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />
          
          {/* Right Panel Content */}
          <div className="flex-1 min-h-0">
            {rightPanel}
          </div>
        </div>
      )}
    </div>
  );
}