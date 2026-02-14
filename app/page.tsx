'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const LINE_COLORS: Record<string, string> = {
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  '4': '#00933C', '5': '#00933C', '6': '#00933C',
  '7': '#B933AD',
  'A': '#0039A6', 'C': '#0039A6', 'E': '#0039A6',
  'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319',
  'G': '#6CBE45',
  'J': '#996633', 'Z': '#996633',
  'L': '#A7A9AC',
  'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A',
  'S': '#808183',
}

interface LineData {
  line: string
  total_delays: number
  avg_delay: string
  max_delay: number
  last_updated: string
}

interface Stats {
  total_delays_recorded: number
  lines_tracked: number
  overall_avg_delay: string
  last_scrape: string
}

export default function Home() {
  const [lines, setLines] = useState<LineData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  const fetchData = async () => {
    try {
const [linesRes, statsRes] = await Promise.all([
  fetch('https://web-production-2afb5.up.railway.app/api/lines'),
  fetch('https://web-production-2afb5.up.railway.app/api/stats')
])
      const linesData = await linesRes.json()
      const statsData = await statsRes.json()
      setLines(linesData)
      setStats(statsData)
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚇</div>
          <p className="text-gray-400 text-xl">Loading subway data...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🚇</span>
          <h1 className="text-4xl font-bold">NYC Subway Delay Tracker</h1>
        </div>
        <p className="text-gray-400">
          Real-time delay analytics for all NYC subway lines
        </p>
        <p className="text-gray-600 text-sm mt-1">
          Last updated: {lastRefresh} · Auto-refreshes every 60 seconds
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Total Delays Recorded</p>
            <p className="text-3xl font-bold text-white mt-1">
              {stats.total_delays_recorded.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Lines Tracked</p>
            <p className="text-3xl font-bold text-white mt-1">
              {stats.lines_tracked}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Avg Delay</p>
            <p className="text-3xl font-bold text-yellow-400 mt-1">
              {stats.overall_avg_delay} min
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Last Scrape</p>
            <p className="text-lg font-bold text-green-400 mt-1">
              {new Date(stats.last_scrape).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Bar Chart - Most Delayed Lines */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
        <h2 className="text-xl font-bold mb-4">Most Delayed Lines (Last 24 Hours)</h2>
        {lines.length === 0 ? (
          <p className="text-gray-400">No delay data yet - check back during rush hour!</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={lines.slice(0, 10)}>
              <XAxis dataKey="line" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar
                dataKey="total_delays"
                name="Total Delays"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line Cards Grid */}
      <h2 className="text-xl font-bold mb-4">All Lines</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {lines.map((line) => (
          <div
            key={line.line}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                style={{
                  backgroundColor: LINE_COLORS[line.line] || '#555',
                  color: ['N', 'Q', 'R', 'W'].includes(line.line) ? '#000' : '#fff'
                }}
              >
                {line.line}
              </div>
              <div>
                <p className="font-bold">Line {line.line}</p>
                <p className="text-gray-400 text-xs">
                  {line.total_delays} delays today
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg delay</span>
                <span className="text-yellow-400 font-medium">{line.avg_delay} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Max delay</span>
                <span className="text-red-400 font-medium">{line.max_delay} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-gray-600 text-sm">
        <p>Data sourced from MTA Real-Time GTFS feeds · Updated every 60 seconds</p>
        <p className="mt-1">Built by Harsh Pahilajani</p>
      </div>

    </main>
  )
}