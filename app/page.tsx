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

const ALL_LINES = ['1','2','3','4','5','6','7','A','C','E','B','D','F','M','G','J','Z','L','N','Q','R','W','S']

const ISSUE_TYPES = [
  { value: 'major_delay', label: '🚨 Major Delay' },
  { value: 'minor_delay', label: '⚠️ Minor Delay' },
  { value: 'service_change', label: '🚧 Service Change' },
  { value: 'overcrowding', label: '👥 Overcrowding' },
  { value: 'mechanical', label: '🔧 Mechanical Issue' },
  { value: 'running_fine', label: '✅ Running Fine' },
]

const ALERT_ICONS: Record<string, string> = {
  delay: '⚠️',
  suspended: '🚫',
  stops_skipped: '⏭️',
  express_to_local: '🐢',
  reduced_service: '📉',
  planned_work: '🔧',
  service_change: '🔄',
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

interface Report {
  id: number
  line: string
  issue_type: string
  description: string
  upvotes: number
  created_at: string
}

interface Alert {
  id: number
  line: string
  alert_type: string
  header: string
  description: string
  created_at: string
}

function EmailSubscribe({ line, api }: { line: string; api: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch(`${api}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, line })
      })
      const data = await res.json()
      setStatus('success')
      setMessage(data.message || 'Subscribed!')
    } catch {
      setStatus('error')
      setMessage('Something went wrong, try again')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-3 text-center">
        <p className="text-blue-400 text-sm">✅ {message}</p>
        <p className="text-gray-500 text-xs mt-1">You'll get an email when Line {line} is delayed</p>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
        placeholder="your@email.com"
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={handleSubscribe}
        disabled={status === 'loading'}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
      >
        {status === 'loading' ? '...' : 'Notify Me'}
      </button>
    </div>
  )
}

function getRushHourMessage() {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  if (day === 0 || day === 6) return 'Check back on a weekday during rush hour!'
  if (hour < 7) return 'Check back during morning rush hour (7-9am)!'
  if (hour >= 7 && hour < 10) return 'Rush hour is now - data should appear shortly!'
  if (hour >= 10 && hour < 16) return 'Check back during evening rush hour (4-7pm)!'
  if (hour >= 16 && hour < 19) return 'Evening rush hour is now - data should appear shortly!'
  return 'Check back during rush hour tomorrow morning (7-9am)!'
}

export default function Home() {
  const [lines, setLines] = useState<LineData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lineAlerts, setLineAlerts] = useState<Record<string, Alert[]>>({})
  const [issueType, setIssueType] = useState('minor_delay')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [upvotedReports, setUpvotedReports] = useState<Set<number>>(new Set())

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

  const fetchRecentReports = async () => {
    try {
      const res = await fetch(`${API}/api/reports/recent?limit=8`)
      const data = await res.json()
      setRecentReports(data)
    } catch (err) {
      console.error('Failed to fetch recent reports:', err)
    }
  }

  // ✅ NEW — fetch alerts for a specific line (used in modal)
  const fetchLineAlerts = async (line: string) => {
    try {
      const res = await fetch(`${API}/api/alerts/${line}`)
      const data = await res.json()
      setAlerts(data)
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    }
  }

  // ✅ NEW — fetch alerts for ALL lines (used on line cards)
  const fetchAllAlerts = async () => {
    try {
      const results = await Promise.all(
        ALL_LINES.map(line =>
          fetch(`${API}/api/alerts/${line}`).then(r => r.json()).then(data => ({ line, data }))
        )
      )
      const map: Record<string, Alert[]> = {}
      results.forEach(({ line, data }) => {
        if (data.length > 0) map[line] = data
      })
      setLineAlerts(map)
    } catch (err) {
      console.error('Failed to fetch all alerts:', err)
    }
  }

  const openReports = (line: string) => {
    setSelectedLine(line)
    setSubmitted(false)
    setDescription('')
    setIssueType('minor_delay')
    fetchReports(line)
    fetchLineAlerts(line)
  }

  const submitReport = async () => {
    if (!selectedLine) return
    setSubmitting(true)
    try {
      await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: selectedLine, issue_type: issueType, description })
      })
      setSubmitted(true)
      fetchReports(selectedLine)
      fetchRecentReports()
    } catch (err) {
      console.error('Failed to submit report:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const upvoteReport = async (id: number) => {
    if (upvotedReports.has(id)) return
    try {
      await fetch(`${API}/api/reports/${id}/upvote`, { method: 'POST' })
      setUpvotedReports(prev => new Set([...prev, id]))
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

  const allLineCards = ALL_LINES.map(line => {
    const data = lines.find(l => l.line === line)
    return {
      line,
      total_delays: data?.total_delays ?? 0,
      avg_delay: data?.avg_delay ?? '0.0',
      max_delay: data?.max_delay ?? 0,
      last_updated: data?.last_updated ?? '',
      hasData: !!data
    }
  })

  useEffect(() => {
    fetchData()
    fetchRecentReports()
    fetchAllAlerts()
    const interval = setInterval(() => {
      fetchData()
      fetchRecentReports()
      fetchAllAlerts()
    }, 60000)
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-gray-400 mb-1">No delay data yet</p>
            <p className="text-gray-600 text-sm">{getRushHourMessage()}</p>
          </div>
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

      {/* Community Feed */}
      {recentReports.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🗣️ Live Community Reports</h2>
            <span className="text-gray-500 text-xs">Last 2 hours · Click to view line</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                onClick={() => openReports(report.line)}
                className="flex items-start gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-xl p-3 cursor-pointer transition-all"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: LINE_COLORS[report.line] || '#555',
                    color: ['N', 'Q', 'R', 'W'].includes(report.line) ? '#000' : '#fff'
                  }}
                >
                  {report.line}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">
                      {ISSUE_TYPES.find(t => t.value === report.issue_type)?.label || report.issue_type}
                    </span>
                    <span className="text-gray-500 text-xs flex-shrink-0">{getTimeAgo(report.created_at)}</span>
                  </div>
                  {report.description && (
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{report.description}</p>
                  )}
                  <p className="text-gray-600 text-xs mt-1">👍 {report.upvotes} · Tap to open Line {report.line}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line Cards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">All Lines</h2>
        <p className="text-gray-500 text-sm">Click any line to report or view issues</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allLineCards.map((line) => {
          const activeAlerts = lineAlerts[line.line] || []
          return (
            <div
              key={line.line}
              className={`bg-gray-900 rounded-xl p-4 border transition-all hover:shadow-lg cursor-pointer ${
                activeAlerts.length > 0
                  ? 'border-yellow-600 hover:border-yellow-400'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
              onClick={() => openReports(line.line)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{
                    backgroundColor: LINE_COLORS[line.line] || '#555',
                    color: ['N', 'Q', 'R', 'W'].includes(line.line) ? '#000' : '#fff'
                  }}
                >
                  {line.line}
                </div>
                <div>
                  <p className="font-bold">Line {line.line}</p>
                  <p className={`text-xs ${line.total_delays > 0 ? 'text-red-400' : activeAlerts.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {line.total_delays > 0
                      ? `${line.total_delays} delays today`
                      : activeAlerts.length > 0
                      ? `⚠️ MTA Alert`
                      : '✓ No delays today'}
                  </p>
                </div>
              </div>

              {/* ✅ NEW — Show MTA alert banner on card */}
              {activeAlerts.length > 0 && (
                <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg px-2 py-1.5 mb-3">
                  <p className="text-yellow-400 text-xs leading-snug">
                    {ALERT_ICONS[activeAlerts[0].alert_type] || '⚠️'} {activeAlerts[0].header.length > 60 ? activeAlerts[0].header.slice(0, 60) + '...' : activeAlerts[0].header}
                  </p>
                </div>
              )}

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Avg delay</span>
                  <span className={`font-medium ${line.hasData ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {line.hasData ? `${line.avg_delay} min` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max delay</span>
                  <span className={`font-medium ${line.hasData ? 'text-red-400' : 'text-gray-600'}`}>
                    {line.hasData ? `${line.max_delay} min` : '—'}
                  </span>
                </div>
              </div>
              <div className="w-full text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-center transition-colors">
                📣 Report / View Issues
              </div>
            </div>
          )
        })}
      </div>

      {/* Reports Modal */}
      {selectedLine && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLine(null) }}
        >
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
                  <div>
                    <h3 className="text-xl font-bold">Line {selectedLine}</h3>
                    <p className="text-gray-400 text-sm">Community Reports</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLine(null)}
                  className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* ✅ NEW — MTA Alerts in modal */}
              {alerts.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-300 mb-2">🚨 MTA Service Alerts</p>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-xl p-3"
                      >
                        <p className="text-yellow-400 text-sm font-medium">
                          {ALERT_ICONS[alert.alert_type] || '⚠️'} {alert.header}
                        </p>
                        {alert.description && (
                          <p className="text-gray-400 text-xs mt-1 leading-relaxed">{alert.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Report */}
              {!submitted ? (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-300 mb-3">What&apos;s happening right now?</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {ISSUE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setIssueType(type.value)}
                        className={`text-xs p-2 rounded-lg border transition-colors text-left ${
                          issueType === type.value
                            ? 'border-blue-500 bg-blue-500 bg-opacity-20 text-white'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a note (optional) — e.g. stuck at Jay St for 10 mins"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none h-20 mb-3 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={submitReport}
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              ) : (
                <div className="mb-6 bg-green-900 bg-opacity-30 border border-green-700 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-medium text-lg">✅ Report submitted!</p>
                  <p className="text-gray-400 text-sm mt-1">Thanks for helping other commuters 🚇</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    Submit another
                  </button>
                </div>
              )}

              {/* Email Subscription */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-2">
                  🔔 Get notified when Line {selectedLine} is delayed
                </p>
                <EmailSubscribe line={selectedLine} api={API} />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-800 mb-4" />

              {/* Recent Reports */}
              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">
                  Recent reports <span className="text-gray-500 font-normal">(last 2 hours)</span>
                </p>
                {reports.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">🟢</p>
                    <p className="text-gray-400 text-sm">No issues reported</p>
                    <p className="text-gray-600 text-xs mt-1">Be the first to report!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-gray-800 rounded-xl p-3 border border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium">
                            {ISSUE_TYPES.find(t => t.value === report.issue_type)?.label || report.issue_type}
                          </span>
                          <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
                            {getTimeAgo(report.created_at)}
                          </span>
                        </div>
                        {report.description && (
                          <p className="text-gray-400 text-xs mb-2 leading-relaxed">{report.description}</p>
                        )}
                        <button
                          onClick={() => upvoteReport(report.id)}
                          disabled={upvotedReports.has(report.id)}
                          className={`text-xs transition-colors flex items-center gap-1 ${
                            upvotedReports.has(report.id)
                              ? 'text-blue-400 cursor-not-allowed'
                              : 'text-gray-500 hover:text-blue-400'
                          }`}
                        >
                          👍 <span>{report.upvotes} agree</span>
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