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

const ISSUE_TYPES = [
  { value: 'major_delay', label: '🚨 Major Delay' },
  { value: 'minor_delay', label: '⚠️ Minor Delay' },
  { value: 'service_change', label: '🚧 Service Change' },
  { value: 'overcrowding', label: '👥 Overcrowding' },
  { value: 'mechanical', label: '🔧 Mechanical Issue' },
  { value: 'running_fine', label: '✅ Running Fine' },
]

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

interface Report {
  id: number
  line: string
  issue_type: string
  description: string
  upvotes: number
  created_at: string
}

export default function Home() {
  const [lines, setLines] = useState<LineData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [issueType, setIssueType] = useState('minor_delay')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const API = 'https://web-production-2afb5.up.railway.app'

  const fetchData = async () => {
    try {
      const [linesRes, statsRes] = await Promise.all([
        fetch(`${API}/api/lines`),
        fetch(`${API}/api/stats`)
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

  const fetchReports = async (line: string) => {
    try {
      const res = await fetch(`${API}/api/reports/${line}`)
      const data = await res.json()
      setReports(data)
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    }
  }

  const openReports = (line: string) => {
    setSelectedLine(line)
    setSubmitted(false)
    setDescription('')
    setIssueType('minor_delay')
    fetchReports(line)
  }

  const submitReport = async () => {
    if (!selectedLine) return
    setSubmitting(true)
    try {
      await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line: selectedLine,
          issue_type: issueType,
          description
        })
      })
      setSubmitted(true)
      fetchReports(selectedLine)
    } catch (err) {
      console.error('Failed to submit report:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const upvoteReport = async (id: number) => {
    try {
      await fetch(`${API}/api/reports/${id}/upvote`, { method: 'POST' })
      if (selectedLine) fetchReports(selectedLine)
    } catch (err) {
      console.error('Failed to upvote:', err)
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins === 1) return '1 min ago'
    return `${mins} mins ago`
  }

  useEffect(() => {
    fetchData()
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
        <p className="text-gray-400">Real-time delay analytics for all NYC subway lines</p>
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
            <p className="text-3xl font-bold text-white mt-1">{stats.lines_tracked}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Avg Delay</p>
            <p className="text-3xl font-bold text-yellow-400 mt-1">
              {stats.overall_avg_delay} min
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Last Delay Recorded</p>
            <p className="text-lg font-bold text-green-400 mt-1">
              {new Date(stats.last_scrape).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Bar Chart */}
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
              <Bar dataKey="total_delays" name="Total Delays" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line Cards */}
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
                <p className="text-gray-400 text-xs">{line.total_delays} delays today</p>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg delay</span>
                <span className="text-yellow-400 font-medium">{line.avg_delay} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Max delay</span>
                <span className="text-red-400 font-medium">{line.max_delay} min</span>
              </div>
            </div>
            <button
              onClick={() => openReports(line.line)}
              className="w-full text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 transition-colors"
            >
              📣 Report / View Issues
            </button>
          </div>
        ))}
      </div>

      {/* Reports Modal */}
      {selectedLine && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">

              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{
                      backgroundColor: LINE_COLORS[selectedLine] || '#555',
                      color: ['N', 'Q', 'R', 'W'].includes(selectedLine) ? '#000' : '#fff'
                    }}
                  >
                    {selectedLine}
                  </div>
                  <h3 className="text-xl font-bold">Line {selectedLine} Reports</h3>
                </div>
                <button
                  onClick={() => setSelectedLine(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Submit Report */}
              {!submitted ? (
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-3">Report an issue right now:</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {ISSUE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setIssueType(type.value)}
                        className={`text-xs p-2 rounded-lg border transition-colors ${
                          issueType === type.value
                            ? 'border-blue-500 bg-blue-500 bg-opacity-20 text-white'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a note (optional) - e.g. stuck at Jay St for 10 mins"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none h-20 mb-3"
                  />
                  <button
                    onClick={submitReport}
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              ) : (
                <div className="mb-6 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4 text-center">
                  <p className="text-green-400 font-medium">✅ Report submitted!</p>
                  <p className="text-gray-400 text-sm mt-1">Thanks for helping other commuters</p>
                </div>
              )}

              {/* Recent Reports */}
              <div>
                <p className="text-sm text-gray-400 mb-3">
                  Recent reports (last 2 hours):
                </p>
                {reports.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No reports yet - be the first!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium">
                            {ISSUE_TYPES.find(t => t.value === report.issue_type)?.label || report.issue_type}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {getTimeAgo(report.created_at)}
                          </span>
                        </div>
                        {report.description && (
                          <p className="text-gray-400 text-xs mb-2">{report.description}</p>
                        )}
                        <button
                          onClick={() => upvoteReport(report.id)}
                          className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          👍 {report.upvotes} agree
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-gray-600 text-sm">
        <p>Data sourced from MTA Real-Time GTFS feeds · Updated every 60 seconds</p>
        <p className="mt-1">Built by Harsh Pahilajani</p>
      </div>

    </main>
  )
}