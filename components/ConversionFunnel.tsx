'use client'

interface FunnelData {
  totalSent: number
  replied: number
  positive: number
  scheduled: number
  converted: number
}

interface ConversionFunnelProps {
  data: FunnelData
}

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  const stages = [
    { label: 'Messages Sent', value: data.totalSent, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Replied', value: data.replied, color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700' },
    { label: 'Positive Response', value: data.positive, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { label: 'Scheduled', value: data.scheduled, color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
    { label: 'Converted', value: data.converted, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
  ]

  const maxValue = data.totalSent

  const calculateConversion = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current / previous) * 100).toFixed(1)
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/40 to-transparent rounded-full blur-3xl -mr-16 -mt-16" />

      <h3 className="text-lg font-bold text-gray-900 mb-6 relative z-10">Conversion Funnel</h3>

      <div className="space-y-4 relative z-10">
        {stages.map((stage, index) => {
          const widthPercentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
          const conversionFromPrevious =
            index > 0 ? calculateConversion(stage.value, stages[index - 1].value) : '100.0'

          return (
            <div key={index} className="relative">
              {/* Stage container */}
              <div className="flex items-center gap-4">
                {/* Funnel bar */}
                <div className="flex-1">
                  <div
                    className={`
                      relative h-16 rounded-xl ${stage.bgColor} overflow-hidden
                      transition-all duration-500 ease-out
                      hover:shadow-md
                    `}
                  >
                    {/* Animated fill */}
                    <div
                      className={`
                        h-full ${stage.color} relative
                        transition-all duration-700 ease-out
                      `}
                      style={{
                        width: `${widthPercentage}%`,
                        minWidth: stage.value > 0 ? '15%' : '0%',
                      }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Label and value */}
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <span className={`font-semibold ${stage.textColor}`}>
                        {stage.label}
                      </span>
                      <div className="flex items-center gap-3">
                        {index > 0 && (
                          <span className="text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded-lg">
                            {conversionFromPrevious}%
                          </span>
                        )}
                        <span className={`text-xl font-bold ${stage.textColor}`}>
                          {stage.value}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {index < stages.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-gray-300 to-transparent" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t-2 border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Overall Conversion</p>
            <p className="text-2xl font-bold text-blue-600">
              {calculateConversion(data.converted, data.totalSent)}%
            </p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Reply Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {calculateConversion(data.replied, data.totalSent)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
