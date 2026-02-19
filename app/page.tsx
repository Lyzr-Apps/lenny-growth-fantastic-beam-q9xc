'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { uploadAndTrainDocument, getDocuments, deleteDocuments } from '@/lib/ragKnowledgeBase'
import { useLyzrAgentEvents } from '@/lib/lyzrAgentEvents'
import { FiSend, FiPlus, FiMessageSquare, FiUser, FiMenu, FiX, FiUpload, FiFile, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import AgentActivityPanel from '@/components/AgentActivityPanel'

// --- Constants ---
const AGENT_ID = '6996c897fee7859ce82fcdb6'
const RAG_ID = '6996c877e12ce168202cedc8'

const TOPIC_FILTERS = ['Acquisition', 'Activation', 'Retention', 'Monetization', 'PLG', 'GTM'] as const

const STARTER_QUESTIONS = [
  'What are the best PLG onboarding tactics?',
  'How do top PMs think about retention?',
  'What activation metrics matter most for dev tools?',
  'How should early-stage startups think about GTM?',
  'What are common mistakes in monetization strategy?',
]

const TOPIC_COLORS: Record<string, string> = {
  acquisition: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  activation: 'bg-teal-100 text-teal-800 border-teal-200',
  retention: 'bg-green-100 text-green-800 border-green-200',
  monetization: 'bg-lime-100 text-lime-800 border-lime-200',
  plg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  gtm: 'bg-sky-100 text-sky-800 border-sky-200',
  growth: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  onboarding: 'bg-teal-100 text-teal-800 border-teal-200',
  product: 'bg-green-100 text-green-800 border-green-200',
  strategy: 'bg-lime-100 text-lime-800 border-lime-200',
}

// --- Types ---
interface Perspective {
  guest_name: string
  episode_title: string
  company: string
  insight: string
}

interface AgentParsedResponse {
  answer?: string
  perspectives?: Perspective[]
  topics?: string[]
  follow_up_questions?: string[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  parsed?: AgentParsedResponse
  timestamp: number
}

interface Conversation {
  id: string
  title: string
  sessionId: string
  messages: ChatMessage[]
  topics: string[]
  createdAt: number
  updatedAt: number
}

// --- Sample Data ---
const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: 'sample-1',
    title: 'PLG Onboarding Tactics',
    sessionId: 'sample-session-1',
    messages: [
      {
        id: 'sm-1',
        role: 'user',
        content: 'What are the best PLG onboarding tactics?',
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'sm-2',
        role: 'agent',
        content: '',
        parsed: {
          answer: 'Based on insights from Lenny\'s Podcast guests, the most effective PLG onboarding tactics revolve around **reducing time-to-value** and creating **"aha moments"** early in the user journey.\n\n### Key Tactics:\n\n1. **Progressive Disclosure** - Don\'t overwhelm new users. Show features gradually as they demonstrate readiness.\n\n2. **Template-First Approach** - Pre-built templates let users see value before they build from scratch. Companies like Notion and Figma use this extensively.\n\n3. **Social Proof in Onboarding** - Show how similar companies use the product during the setup flow.\n\n4. **Checklist-Driven Setup** - A clear, completable list of setup steps with progress tracking drives activation.\n\n5. **Reverse Trial Model** - Start users on the premium plan, then downgrade. This shows the full value before asking them to pay.',
          perspectives: [
            {
              guest_name: 'Elena Verna',
              episode_title: 'The Ultimate Guide to PLG',
              company: 'Amplitude',
              insight: 'Focus on time-to-value, not feature completeness. The best onboarding flows are the ones where users experience the core value proposition within the first session.',
            },
            {
              guest_name: 'Hila Qu',
              episode_title: 'Growth Frameworks That Scale',
              company: 'GitLab',
              insight: 'The activation metric should be the single action that most correlates with long-term retention. Find it, then optimize your onboarding to drive users toward it.',
            },
            {
              guest_name: 'Casey Winters',
              episode_title: 'Building Growth Engines',
              company: 'Eventbrite',
              insight: 'Templates are the most underrated onboarding tool. They let users skip the blank-canvas problem and immediately see what success looks like.',
            },
          ],
          topics: ['PLG', 'activation', 'onboarding'],
          follow_up_questions: [
            'How do you measure onboarding success in PLG?',
            'What are the best examples of reverse trials?',
            'How do top companies identify their activation metric?',
          ],
        },
        timestamp: Date.now() - 3550000,
      },
    ],
    topics: ['PLG', 'activation', 'onboarding'],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3550000,
  },
  {
    id: 'sample-2',
    title: 'Retention Strategies',
    sessionId: 'sample-session-2',
    messages: [
      {
        id: 'sm-3',
        role: 'user',
        content: 'How do top PMs think about retention?',
        timestamp: Date.now() - 7200000,
      },
      {
        id: 'sm-4',
        role: 'agent',
        content: '',
        parsed: {
          answer: 'Retention is arguably **the most important growth metric** because it compounds over time. Top PMs approach retention through several key frameworks:\n\n### Core Principles:\n\n1. **Habit Loops** - The best products create natural usage habits. Think about what triggers users to come back.\n\n2. **Value Realization Loops** - Each session should deliver clear value that makes the next session more valuable.\n\n3. **Cohort Analysis First** - Don\'t look at aggregate retention. Break it down by cohort, acquisition channel, and use case.\n\n4. **Resurrection Flows** - Build specific re-engagement campaigns for users who\'ve churned but haven\'t deleted their account.\n\n5. **Feature Adoption Curves** - Map which features correlate with retention and invest in driving adoption of those features.',
          perspectives: [
            {
              guest_name: 'Lenny Rachitsky',
              episode_title: 'What Makes Great Products Stick',
              company: 'Newsletter / Podcast',
              insight: 'The best retention curves flatten out, they don\'t keep declining. If your curve never flattens, you have a product-market fit problem, not a retention problem.',
            },
            {
              guest_name: 'Dan Hockenmaier',
              episode_title: 'Marketplace Retention Deep Dive',
              company: 'Faire',
              insight: 'In marketplaces, retention is driven by supply quality. If buyers consistently find what they need, they come back. Focus on curating supply, not just growing it.',
            },
          ],
          topics: ['retention', 'growth', 'product'],
          follow_up_questions: [
            'What is a good D7 retention rate for SaaS?',
            'How do you build effective resurrection campaigns?',
            'What are the best retention metrics to track?',
          ],
        },
        timestamp: Date.now() - 7150000,
      },
    ],
    topics: ['retention', 'growth', 'product'],
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7150000,
  },
]

// --- Markdown Renderer ---

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-foreground">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1 text-foreground">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-foreground">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm text-foreground/90" style={{ lineHeight: '1.55' }}>
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm text-foreground/90" style={{ lineHeight: '1.55' }}>
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-foreground/90" style={{ lineHeight: '1.55' }}>
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

// --- Helper Functions ---

function getTopicColor(topic: string): string {
  const lower = topic.toLowerCase()
  return TOPIC_COLORS[lower] ?? 'bg-secondary text-secondary-foreground border-border'
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function formatTime(ts: number): string {
  const now = Date.now()
  const diffMs = now - ts
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// --- Sub-components ---

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FiMessageSquare className="w-4 h-4 text-primary" />
      </div>
      <div className="backdrop-blur-md bg-card/75 border border-white/[0.18] rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function PerspectiveCard({ perspective }: { perspective: Perspective }) {
  return (
    <div className="backdrop-blur-md bg-card/75 border border-white/[0.18] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">
            {perspective?.guest_name ?? 'Guest'}
          </h4>
          <p className="text-xs text-muted-foreground italic truncate mt-0.5">
            {perspective?.episode_title ?? ''}
          </p>
        </div>
        {perspective?.company && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0 border border-primary/20">
            {perspective.company}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground/85" style={{ lineHeight: '1.55' }}>
        {perspective?.insight ?? ''}
      </p>
    </div>
  )
}

function AgentMessageContent({
  parsed,
  onFollowUp,
}: {
  parsed: AgentParsedResponse | undefined
  onFollowUp: (q: string) => void
}) {
  if (!parsed) return null

  return (
    <div className="space-y-4">
      {parsed.answer && <div>{renderMarkdown(parsed.answer)}</div>}

      {Array.isArray(parsed.perspectives) && parsed.perspectives.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <FiUser className="w-3.5 h-3.5" />
            Expert Perspectives
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {parsed.perspectives.map((p, i) => (
              <PerspectiveCard key={i} perspective={p} />
            ))}
          </div>
        </div>
      )}

      {Array.isArray(parsed.topics) && parsed.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {parsed.topics.map((topic, i) => (
            <span
              key={i}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getTopicColor(topic)}`}
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Follow-up Questions
          </p>
          <div className="flex flex-wrap gap-2">
            {parsed.follow_up_questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/15 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 text-left cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WelcomeScreen({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
          <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Architect Growth Advisor
          </h1>
          <p className="text-muted-foreground mt-2 text-base" style={{ lineHeight: '1.55' }}>
            Powered by insights from Lenny's Podcast -- ask about growth, product, and go-to-market strategy.
          </p>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto" style={{ lineHeight: '1.55' }}>
          Get expert perspectives from top product leaders, growth practitioners, and startup founders. Each answer includes sourced insights from real podcast episodes.
        </p>
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Try asking about
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {STARTER_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => onAsk(q)}
                className="text-sm px-4 py-2 rounded-full backdrop-blur-md bg-card/75 border border-white/[0.18] text-foreground/80 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KnowledgeBaseSection() {
  const [expanded, setExpanded] = useState(false)
  const [docs, setDocs] = useState<Array<{ fileName: string; status?: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true)
    try {
      const result = await getDocuments(RAG_ID)
      if (result.success && Array.isArray(result.documents)) {
        setDocs(result.documents.map((d) => ({ fileName: d.fileName, status: d.status })))
      }
    } catch {
      // silent
    }
    setLoadingDocs(false)
  }, [])

  useEffect(() => {
    if (expanded) {
      loadDocs()
    }
  }, [expanded, loadDocs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const result = await uploadAndTrainDocument(RAG_ID, file)
      if (result.success) {
        setUploadMsg('Uploaded successfully')
        await loadDocs()
      } else {
        setUploadMsg(result.error ?? 'Upload failed')
      }
    } catch {
      setUploadMsg('Upload failed')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (fileName: string) => {
    try {
      const result = await deleteDocuments(RAG_ID, [fileName])
      if (result.success) {
        setDocs((prev) => prev.filter((d) => d.fileName !== fileName))
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <FiFile className="w-3.5 h-3.5" />
          Knowledge Base
        </span>
        {expanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FiUpload className="w-3.5 h-3.5" />
                Upload Document (PDF, DOCX, TXT)
              </>
            )}
          </button>

          {uploadMsg && (
            <p className={`text-xs px-2 ${uploadMsg.includes('success') ? 'text-primary' : 'text-destructive'}`}>
              {uploadMsg}
            </p>
          )}

          {loadingDocs && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              Loading documents...
            </div>
          )}

          {docs.length > 0 && (
            <div className="space-y-1.5">
              {docs.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-secondary/50 text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FiFile className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground/80">{doc.fileName}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.fileName)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loadingDocs && docs.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">No documents uploaded yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main Page Component ---

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTopicFilters, setActiveTopicFilters] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sampleMode, setSampleMode] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [agentSessionId, setAgentSessionId] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Agent activity monitoring
  const agentActivity = useLyzrAgentEvents(agentSessionId || null)

  // Derived state
  const displayConversations = sampleMode ? SAMPLE_CONVERSATIONS : conversations
  const filteredConversations =
    activeTopicFilters.length > 0
      ? displayConversations.filter((c) =>
          c.topics.some((t) =>
            activeTopicFilters.some((f) => t.toLowerCase().includes(f.toLowerCase()))
          )
        )
      : displayConversations

  const currentConv = displayConversations.find((c) => c.id === currentConvId) ?? null
  const messages = currentConv?.messages ?? []

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [])

  // Create new conversation
  const createNewConversation = useCallback((): Conversation => {
    const newId = generateId()
    const sessionId = generateId() + '-' + Date.now().toString(36)
    const conv: Conversation = {
      id: newId,
      title: 'New conversation',
      sessionId,
      messages: [],
      topics: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations((prev) => [conv, ...prev])
    setCurrentConvId(newId)
    setAgentSessionId(sessionId)
    return conv
  }, [])

  // Send message
  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim()
      if (!trimmed || loading) return

      let conv = currentConv
      let convId = currentConvId

      // If in sample mode or no conversation, create a new one
      if (!conv || sampleMode) {
        if (sampleMode) setSampleMode(false)
        const newConv = createNewConversation()
        conv = newConv
        convId = newConv.id
      }

      const finalConvId = convId!

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      // Add user message and update title if first message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === finalConvId
            ? {
                ...c,
                messages: [...c.messages, userMsg],
                title:
                  c.messages.length === 0
                    ? trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : '')
                    : c.title,
                updatedAt: Date.now(),
              }
            : c
        )
      )

      setInputValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      setLoading(true)
      setActiveAgentId(AGENT_ID)

      try {
        const result = await callAIAgent(trimmed, AGENT_ID, {
          session_id: conv.sessionId,
        })

        let parsed: AgentParsedResponse = {}

        if (result.success) {
          let raw = result?.response?.result
          if (typeof raw === 'string') {
            try {
              raw = JSON.parse(raw)
            } catch {
              parsed = { answer: raw as string }
              raw = null
            }
          }
          if (raw && typeof raw === 'object') {
            const data = raw as Record<string, unknown>
            parsed = {
              answer: typeof data?.answer === 'string' ? data.answer : undefined,
              perspectives: Array.isArray(data?.perspectives)
                ? (data.perspectives as Perspective[])
                : undefined,
              topics: Array.isArray(data?.topics) ? (data.topics as string[]) : undefined,
              follow_up_questions: Array.isArray(data?.follow_up_questions)
                ? (data.follow_up_questions as string[])
                : undefined,
            }
          }
          // Fallback to message if no answer parsed
          if (!parsed.answer && !raw) {
            const msg = result?.response?.message ?? ''
            if (msg) parsed = { answer: msg }
          }
        } else {
          parsed = {
            answer:
              result?.error ??
              result?.response?.message ??
              'Sorry, something went wrong. Please try again.',
          }
        }

        const agentMsg: ChatMessage = {
          id: generateId(),
          role: 'agent',
          content: parsed.answer ?? '',
          parsed,
          timestamp: Date.now(),
        }

        const newTopics = Array.isArray(parsed.topics) ? parsed.topics : []

        setConversations((prev) =>
          prev.map((c) =>
            c.id === finalConvId
              ? {
                  ...c,
                  messages: [...c.messages, agentMsg],
                  topics: [...new Set([...c.topics, ...newTopics])],
                  updatedAt: Date.now(),
                }
              : c
          )
        )
      } catch {
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'agent',
          content: 'An error occurred while processing your request. Please try again.',
          parsed: {
            answer: 'An error occurred while processing your request. Please try again.',
          },
          timestamp: Date.now(),
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === finalConvId
              ? { ...c, messages: [...c.messages, errorMsg], updatedAt: Date.now() }
              : c
          )
        )
      }

      setLoading(false)
      setActiveAgentId(null)
      setSidebarOpen(false)
    },
    [currentConv, currentConvId, loading, sampleMode, createNewConversation]
  )

  // Handle follow-up click
  const handleFollowUp = useCallback(
    (question: string) => {
      sendMessage(question)
    },
    [sendMessage]
  )

  // Key handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(inputValue)
      }
    },
    [inputValue, sendMessage]
  )

  // Toggle topic filter
  const toggleTopicFilter = useCallback((topic: string) => {
    setActiveTopicFilters((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }, [])

  // Start new chat
  const startNewChat = useCallback(() => {
    if (sampleMode) setSampleMode(false)
    createNewConversation()
    setSidebarOpen(false)
  }, [sampleMode, createNewConversation])

  // Select conversation
  const selectConversation = useCallback(
    (convId: string) => {
      setCurrentConvId(convId)
      const conv = displayConversations.find((c) => c.id === convId)
      if (conv) {
        setAgentSessionId(conv.sessionId)
      }
      setSidebarOpen(false)
    },
    [displayConversations]
  )

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, hsl(120 25% 96%) 0%, hsl(140 30% 94%) 35%, hsl(160 25% 95%) 70%, hsl(100 20% 96%) 100%)',
      }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-40 md:z-auto h-full w-[280px] flex-shrink-0 flex flex-col border-r border-border/50 backdrop-blur-md bg-card/60 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-foreground tracking-tight">Conversations</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Sample Data Toggle */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-muted-foreground">Sample Data</span>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={sampleMode}
                onChange={() => {
                  const next = !sampleMode
                  setSampleMode(next)
                  if (next) {
                    setCurrentConvId('sample-1')
                    setAgentSessionId('sample-session-1')
                  } else {
                    setCurrentConvId(null)
                    setAgentSessionId('')
                  }
                }}
              />
              <div
                className={`w-9 h-5 rounded-full transition-colors duration-200 ${sampleMode ? 'bg-primary' : 'bg-muted'}`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${sampleMode ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </div>
          </label>
        </div>

        {/* Topic Filters */}
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Filter by Topic
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_FILTERS.map((topic) => (
              <button
                key={topic}
                onClick={() => toggleTopicFilter(topic)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer ${activeTopicFilters.includes(topic) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-secondary/50 text-secondary-foreground border-border/50 hover:border-primary/30 hover:bg-primary/5'}`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center">
              <FiMessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {activeTopicFilters.length > 0
                  ? 'No conversations match the selected filters.'
                  : 'No conversations yet. Start a new chat!'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 transition-colors duration-150 cursor-pointer border-r-2 ${conv.id === currentConvId ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-secondary/50'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <FiMessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {conv.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(conv.updatedAt)}
                      </p>
                      {conv.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {conv.topics.slice(0, 3).map((t, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/70"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Knowledge Base */}
        <KnowledgeBaseSection />

        {/* Agent Status */}
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/30">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${activeAgentId ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-foreground/70 truncate">
                Growth Advisor Agent
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {activeAgentId ? 'Processing...' : 'Ready'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Chat Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/50 backdrop-blur-md bg-card/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground tracking-tight leading-tight">
                  Architect Growth Advisor
                </h1>
                <p className="text-[11px] text-muted-foreground">Lenny's Podcast Insights</p>
              </div>
            </div>
          </div>
        </header>

        {/* Messages or Welcome */}
        {messages.length === 0 && !loading ? (
          <WelcomeScreen
            onAsk={(q) => {
              sendMessage(q)
            }}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-lg">
                    <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm shadow-sm" style={{ lineHeight: '1.55' }}>
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right mt-1 mr-1">
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 max-w-3xl w-full">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiMessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="backdrop-blur-md bg-card/75 border border-white/[0.18] rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                        <AgentMessageContent parsed={msg.parsed} onFollowUp={handleFollowUp} />
                        {!msg.parsed && msg.content && renderMarkdown(msg.content)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Agent Activity Panel */}
        {agentSessionId && (
          <div className="px-4 md:px-6">
            <AgentActivityPanel {...agentActivity} className="mb-2" />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 md:px-6 border-t border-border/50 backdrop-blur-md bg-card/40 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 backdrop-blur-md bg-card/75 border border-white/[0.18] rounded-2xl p-2 shadow-sm focus-within:border-primary/30 focus-within:shadow-md transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  autoResize()
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about growth, product strategy, retention..."
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground resize-none outline-none px-3 py-2 max-h-40 disabled:opacity-50"
                style={{ letterSpacing: '-0.01em', lineHeight: '1.55' }}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={loading || !inputValue.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 shadow-sm"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <FiSend className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
