/**
 * Assistant chat — scripted decision tree.
 *
 * The handoff flags this as the one genuinely unfinished piece of the design:
 * the intended production version answers questions in first person about
 * Abdul's work, grounded in the project and agent content, via a server-side
 * LLM call. That needs an API key held server-side and a confirmed scope, so
 * what ships here is the scripted tree the prototype specified. Swapping in the
 * live version means replacing `chatMessages`/`chatReplies` with a transcript
 * fed by a route handler — the dock UI does not need to change.
 */

export type ChatStep = 'welcome' | 'recruiter' | 'collab' | 'exploring'

export interface ChatMessage {
  text: string
  isBot?: boolean
  isUser?: boolean
}

export interface ChatReply {
  icon: string
  label: string
  /** Either advance the tree, or navigate and close the dock. */
  action: { kind: 'step'; step: ChatStep } | { kind: 'nav'; section: string }
}

const GREETING = "Hey! 👋 I'm Muwahib's AI assistant. What brings you to this portfolio today?"

const MESSAGES: Record<ChatStep, ChatMessage[]> = {
  welcome: [{ isBot: true, text: GREETING }],
  recruiter: [
    { isBot: true, text: GREETING },
    { isUser: true, text: "🔍 I'm a Recruiter" },
    {
      isBot: true,
      text: 'Great to have you! Muwahib is a Senior PM with 6 years across Amazon, Rivigo, and Gulf Cryo — leading AI-powered logistics products across 10 countries. Here’s what might interest you:',
    },
  ],
  collab: [
    { isBot: true, text: GREETING },
    { isUser: true, text: '🤝 Work Collaboration' },
    {
      isBot: true,
      text: 'Muwahib is open to advisory, fractional product leadership, and hands-on AI builds. He specializes in logistics AI, enterprise agents, and data platforms. Here’s how to explore:',
    },
  ],
  exploring: [
    { isBot: true, text: GREETING },
    { isUser: true, text: '💡 Just Exploring' },
    {
      isBot: true,
      text: 'Welcome! This portfolio showcases enterprise AI products, autonomous agents, and data platforms built across 10 countries. Let me point you to the highlights:',
    },
  ],
}

const START_OVER: ChatReply = {
  icon: '🔄',
  label: 'Start Over',
  action: { kind: 'step', step: 'welcome' },
}

const REPLIES: Record<ChatStep, ChatReply[]> = {
  welcome: [
    { icon: '🔍', label: "I'm a Recruiter", action: { kind: 'step', step: 'recruiter' } },
    { icon: '🤝', label: 'Work Collaboration', action: { kind: 'step', step: 'collab' } },
    { icon: '💡', label: 'Just Exploring', action: { kind: 'step', step: 'exploring' } },
  ],
  recruiter: [
    { icon: '👤', label: 'Who I Am & What I Do', action: { kind: 'nav', section: 'about' } },
    { icon: '📋', label: 'View Career & Impact', action: { kind: 'nav', section: 'career' } },
    { icon: '🚀', label: 'See What I Build', action: { kind: 'nav', section: 'featured' } },
    { icon: '📧', label: 'Contact Muwahib', action: { kind: 'nav', section: 'contact' } },
    START_OVER,
  ],
  collab: [
    { icon: '👤', label: 'Who I Am & What I Do', action: { kind: 'nav', section: 'about' } },
    { icon: '🛠️', label: 'Products & AI Apps', action: { kind: 'nav', section: 'featured' } },
    { icon: '📡', label: "What's In Progress", action: { kind: 'nav', section: 'roadmap' } },
    { icon: '📧', label: 'Get in Touch', action: { kind: 'nav', section: 'contact' } },
    START_OVER,
  ],
  exploring: [
    { icon: '👤', label: 'Who I Am & What I Do', action: { kind: 'nav', section: 'about' } },
    { icon: '🚀', label: 'Products, Apps & Agents', action: { kind: 'nav', section: 'featured' } },
    { icon: '📊', label: 'Career Trajectory', action: { kind: 'nav', section: 'career' } },
    { icon: '🗺️', label: 'Delivery Roadmap', action: { kind: 'nav', section: 'roadmap' } },
    { icon: '💡', label: 'How I Work', action: { kind: 'nav', section: 'method' } },
    START_OVER,
  ],
}

export function chatMessagesFor(step: ChatStep): ChatMessage[] {
  return MESSAGES[step] ?? MESSAGES.welcome
}

export function chatRepliesFor(step: ChatStep): ChatReply[] {
  return REPLIES[step] ?? REPLIES.welcome
}
