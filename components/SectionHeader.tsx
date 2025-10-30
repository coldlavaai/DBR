'use client'

import { ChevronUp, ChevronDown, GripVertical, Maximize2 } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  count?: number
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onFullScreenClick?: () => void
}

export default function SectionHeader({
  title,
  isExpanded,
  onToggle,
  count,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onFullScreenClick
}: SectionHeaderProps) {
  return (
    <div className="group flex items-center">
      {/* Drag Handle and Full Screen Button */}
      {draggable && (
        <div className="flex items-center">
          <div
            draggable={true}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="px-3 py-4 hover:bg-white/5 transition-colors cursor-move flex items-center"
          >
            <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-coldlava-cyan transition-colors" />
          </div>

          {/* Full Screen Button */}
          {onFullScreenClick && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFullScreenClick()
              }}
              className="px-2 py-2 hover:bg-white/10 rounded-lg transition-colors flex items-center"
              title="Open fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-gray-400 hover:text-coldlava-cyan transition-colors" />
            </button>
          )}
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={onToggle}
        className="px-3 py-4 hover:bg-white/5 transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-coldlava-cyan" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Title and Count */}
      <div className="flex-1 flex items-center gap-3 px-4 py-4">
        <span className="text-lg font-bold text-white">
          {title}
        </span>
        {count !== undefined && (
          <span className="px-3 py-1 rounded-full bg-coldlava-cyan/20 text-coldlava-cyan text-sm font-semibold">
            {count}
          </span>
        )}
      </div>
    </div>
  )
}
