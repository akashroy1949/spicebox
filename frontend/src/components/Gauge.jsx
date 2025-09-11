
"use client"
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"
import { useState, useEffect } from "react"
import { ChartContainer } from "@/components/ui/chart"
import { validateWeight } from "../lib/utils"

const getColorByPercentage = (percentage) => {
  if (percentage < 30) return "#ef4444" // red
  if (percentage < 50) return "#eab308" // yellow
  if (percentage < 70) return "#3b82f6" // blue
  return "#22c55e" // green
}

const getStatusText = (percentage) => {
  if (percentage < 30) return "Low!"
  if (percentage < 50) return "Getting low"
  if (percentage < 70) return "Half full"
  return "Good level"
}

const getCustomMessage = (percentage) => {
  if (percentage < 30) return {
    text: "⚠️ Critically low - Restock needed!",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700"
  }
  if (percentage < 50) return {
    text: "📦 Running low - Consider restocking",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700"
  }
  if (percentage < 70) return {
    text: "👍 Moderate level - Monitor usage",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700"
  }
  return {
    text: "✅ Well-stocked - Ready to cook!",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700"
  }
}

export default function Gauge({ value, max }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  const maxCap = max || 500

  // Validate and clamp the weight value
  const validatedValue = validateWeight(value, maxCap)
  const current = validatedValue

  const percentage = Math.round((current / maxCap) * 100)
  const color = getColorByPercentage(percentage)
  const statusText = getStatusText(percentage)
  const customMessage = getCustomMessage(percentage)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const chartData = [
    {
      remaining: current,
      used: maxCap - current,
    },
  ]

  const chartConfig = {
    remaining: {
      label: "Remaining",
      color: color,
    },
    used: {
      label: "Used",
      color: "#d1d5db",
    },
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Quantity Status</div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full transition-colors duration-300" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium" style={{ color }}>{statusText}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex-shrink-0 relative">
          <ChartContainer config={chartConfig} className="w-32 h-32 sm:w-40 sm:h-40 md:w-32 md:h-32">
            <RadialBarChart data={chartData} startAngle={180} endAngle={0} innerRadius={50} outerRadius={60}>
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 4} className="text-2xl font-bold" fill={color}>
                            {animatedPercentage}%
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="text-sm" fill={color}>
                            remaining
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </PolarRadiusAxis>
              <RadialBar
                dataKey="remaining"
                stackId="stack"
                fill={color}
                cornerRadius={3}
                className="stroke-transparent transition-all duration-1000 ease-out"
              />
              <RadialBar
                dataKey="used"
                stackId="stack"
                fill="#d1d5db"
                cornerRadius={3}
                className="stroke-transparent"
              />
            </RadialBarChart>
          </ChartContainer>

          {/* Level labels around the gauge */}
          {[0, 20, 40, 60, 80, 100].map((level) => {
            const angle = 180 + (level * 180 / 100); // 180° to 360° for semicircle
            const radian = (angle * Math.PI) / 180;
            const radius = 49; // Slightly outside the gauge
            const x = 50 + radius * Math.cos(radian); // 50% is center
            const y = 50 + radius * Math.sin(radian); // 50% is center

            return (
              <div
                key={level}
                className="absolute text-[8px] font-bold text-gray-600 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                {level}
              </div>
            );
          })}

          {/* Arrow indicator positioned absolutely for semicircle */}
          <div
            className="absolute w-2 h-2 rounded-full border border-white transition-all duration-1000"
            style={{
              backgroundColor: color,
              top: '50%',
              left: '50%',
              transform: `
                translate(-50%, -50%) 
                rotate(${180 + (animatedPercentage * 180 / 100)}deg) 
                translateX(42px)
              `,
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">{current}g remaining</div>
          <div className="text-xs text-gray-500">of {maxCap}g total capacity</div>
        </div>
      </div>

      {/* Custom Message Section */}
      <div className={`mt-4 p-3 rounded-lg border ${customMessage.bgColor} ${customMessage.borderColor}`}>
        <p className={`text-sm font-medium ${customMessage.textColor} leading-relaxed`}>
          {customMessage.text}
        </p>
      </div>
    </div>
  )
}
