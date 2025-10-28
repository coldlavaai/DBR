'use client'

import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

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
  onDragEnd
}: SectionHeaderProps) {
  return (
    <div className="group flex items-center">
      {/* Drag Handle */}
      {draggable && (
        <div
          draggable={true}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="px-3 py-4 hover:bg-white/5 transition-colors cursor-move flex items-center"
        >
          <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-coldlava-cyan transition-colors" />
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
