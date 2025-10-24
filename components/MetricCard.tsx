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
    gradient: 'from-blue-400 to-cyan-500',
    glow: 'shadow-blue-500/20',
    hoverGlow: 'hover:shadow-blue-500/40',
    border: 'border-blue-400/30',
    hoverBorder: 'hover:border-blue-400/60',
    icon: 'bg-blue-500/20',
  },
  green: {
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-500/20',
    hoverGlow: 'hover:shadow-emerald-500/40',
    border: 'border-emerald-400/30',
    hoverBorder: 'hover:border-emerald-400/60',
    icon: 'bg-emerald-500/20',
  },
  orange: {
    gradient: 'from-orange-400 to-red-500',
    glow: 'shadow-orange-500/20',
    hoverGlow: 'hover:shadow-orange-500/40',
    border: 'border-orange-400/30',
    hoverBorder: 'hover:border-orange-400/60',
    icon: 'bg-orange-500/20',
  },
  purple: {
    gradient: 'from-purple-400 to-pink-500',
    glow: 'shadow-purple-500/20',
    hoverGlow: 'hover:shadow-purple-500/40',
    border: 'border-purple-400/30',
    hoverBorder: 'hover:border-purple-400/60',
    icon: 'bg-purple-500/20',
  },
  red: {
    gradient: 'from-red-400 to-rose-500',
    glow: 'shadow-red-500/20',
    hoverGlow: 'hover:shadow-red-500/40',
    border: 'border-red-400/30',
    hoverBorder: 'hover:border-red-400/60',
    icon: 'bg-red-500/20',
  },
  gray: {
    gradient: 'from-gray-400 to-slate-500',
    glow: 'shadow-gray-500/20',
    hoverGlow: 'hover:shadow-gray-500/40',
    border: 'border-gray-400/30',
    hoverBorder: 'hover:border-gray-400/60',
    icon: 'bg-gray-500/20',
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
        group relative overflow-hidden
        bg-white/5 backdrop-blur-sm
        border-2 ${colors.border} ${isClickable ? colors.hoverBorder : ''}
        rounded-2xl p-4 sm:p-5
        shadow-xl ${colors.glow} ${isClickable ? colors.hoverGlow : ''}
        transition-all duration-300 ease-out
        ${isClickable ? 'cursor-pointer hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {/* Background gradient decoration */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${colors.gradient} opacity-10 group-hover:opacity-20 blur-2xl rounded-full transition-opacity duration-300`} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Icon and title */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {title}
          </h3>
          {Icon && (
            <div className={`p-2 rounded-lg ${colors.icon} transition-transform duration-300 ${isClickable ? 'group-hover:scale-110' : ''}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
        </div>

        {/* Value and trend */}
        <div className="flex items-baseline gap-2 mb-2">
          <p className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent tracking-tight`}>
            {value}
          </p>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Subtitle - with better multi-line handling */}
        {subtitle && (
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
            {subtitle}
          </p>
        )}

        {/* Click indicator */}
        {isClickable && (
          <div className="mt-auto pt-3">
            <p className="text-xs text-gray-500 group-hover:text-gray-400 flex items-center gap-1 transition-colors">
              Click to view <span className="group-hover:translate-x-1 transition-transform">→</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
