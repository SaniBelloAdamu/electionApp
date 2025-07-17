"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, AlertTriangle, Zap } from "lucide-react"
import { Skeleton } from "./ui/skeleton"

interface ElectionCountdownProps {
  endTime: string
  title: string
}

export function ElectionCountdown({ endTime, title }: ElectionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const [isWarning, setIsWarning] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const difference = end - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })

        // Show warning if less than 10 minutes left
        setIsWarning(difference < 10 * 60 * 1000)
      } else {
        setTimeLeft(null)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    // Clear interval on component unmount
    return () => clearInterval(timer)
  }, [endTime])

  if (!timeLeft) {
    return (
      <Card className="glass-card border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-3 text-red-700">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Voting Has Ended</h2>
              <p className="text-red-600 mt-1">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`glass-card border-0 shadow-lg rounded-2xl overflow-hidden ${
        isWarning ? "ring-2 ring-orange-400 animate-pulse-green" : ""
      }`}
    >
      <CardContent className="p-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isWarning ? "bg-orange-100" : "bg-emerald-100"
              }`}
            >
              {isWarning ? <Zap className="h-6 w-6 text-orange-600" /> : <Clock className="h-6 w-6 text-emerald-600" />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isWarning ? "text-orange-700" : "text-emerald-700"}`}>
                {isWarning ? "Voting Ends Soon!" : "Time Remaining"}
              </h2>
              <p className={`text-lg ${isWarning ? "text-orange-600" : "text-emerald-600"}`}>{title}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6 max-w-lg mx-auto">
            {[
              { value: timeLeft.days, label: "Days" },
              { value: timeLeft.hours, label: "Hours" },
              { value: timeLeft.minutes, label: "Minutes" },
              { value: timeLeft.seconds, label: "Seconds" },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div
                  className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-2 ${
                    isWarning ? "bg-orange-500" : "bg-green-gradient"
                  } shadow-lg`}
                >
                  {item.value.toString().padStart(2, "0")}
                </div>
                <div className="text-sm font-medium text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>

          {isWarning && (
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-orange-700 font-medium flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Voting will close in less than 10 minutes!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}