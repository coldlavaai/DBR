'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  trend?: number
  subtitle?: string
  icon?: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray'
  onClick?: () => void
  className?: string
}

const colorClasses = {
  blue: {
    bg: 'from-blue-50 to-blue-100/50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:shadow-blue-100',
    trend: 'text-blue-600',
  },
  green: {
    bg: 'from-green-50 to-emerald-100/50',
    text: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:border-green-400 hover:shadow-green-100',
    trend: 'text-green-600',
  },
  orange: {
    bg: 'from-orange-50 to-amber-100/50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:border-orange-400 hover:shadow-orange-100',
    trend: 'text-orange-600',
  },
  purple: {
    bg: 'from-purple-50 to-violet-100/50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:border-purple-400 hover:shadow-purple-100',
    trend: 'text-purple-600',
  },
  red: {
    bg: 'from-red-50 to-rose-100/50',
    text: 'text-red-600',
    border: 'border-red-200',
    hover: 'hover:border-red-400 hover:shadow-red-100',
    trend: 'text-red-600',
  },
  gray: {
    bg: 'from-gray-50 to-slate-100/50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    hover: 'hover:border-gray-400 hover:shadow-gray-100',
    trend: 'text-gray-600',
  },
}

export default function MetricCard({
  title,
  value,
  trend,
  subtitle,
  icon: Icon,
  color = 'gray',
  onClick,
  className = '',
}: MetricCardProps) {
  const colors = colorClasses[color]
  const isClickable = !!onClick

  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null
    if (trend > 0) return <TrendingUp className="w-4 h-4" />
    if (trend < 0) return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (trend === undefined || trend === null) return ''
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-400'
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${colors.bg} backdrop-blur-sm
        border-2 ${colors.border}
        rounded-2xl p-6
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        ${isClickable ? `cursor-pointer ${colors.hover} hover:scale-[1.02] active:scale-[0.98]` : ''}
        ${className}
      `}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-2xl -mr-16 -mt-16" />

      <div className="relative z-10">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${colors.text} tracking-tight`}>
                {value}
              </p>
              {trend !== undefined && trend !== null && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
          {Icon && (
            <div className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}>
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Subtitle/footer */}
        {subtitle && (
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        )}

        {isClickable && (
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            Click to view details →
          </p>
        )}
      </div>
    </div>
  )
}
