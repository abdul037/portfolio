/**
 * ⌘K command terminal — command resolution.
 *
 * Resolution order matches the prototype: exact navigation verbs, then exact
 * section / project / industry / agent aliases, then a fuzzy substring sweep
 * across the same four namespaces. Anything unmatched reports back rather than
 * navigating somewhere surprising.
 */
import { agentStudies, projects } from '@/data'
import { modalAliases, presSteps, sectionAliases } from '@/data/site'

export type TerminalAction =
  | { kind: 'none' }
  | { kind: 'close' }
  | { kind: 'clear' }
  | { kind: 'step'; index: number }
  | { kind: 'view'; view: 'home' | 'catalog' }
  | { kind: 'section'; id: string }
  | { kind: 'modal'; key: string }
  | { kind: 'agent'; id: string }
  | { kind: 'industry'; industry: string }

export interface TerminalResult {
  /** Line echoed into the terminal log. Empty means "print nothing". */
  response: string
  action: TerminalAction
}

const HELP =
  'Sections: hero, products, career, method, roadmap, contact · Projects: fero, shifa, pop health, newborn, ticket, planner, ceo, pgx, care gap… · Agents: caresentinel, flowpilot, dispatchiq, claimresolve, chainwatch… or an industry: supply chain, fintech, delivery, airlines, crypto · Nav: next, prev, plan, home, catalog, close'

const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

const projectName = (key: string, fallback: string) => projects[key]?.name ?? fallback

function agentLookups() {
  const byAlias: Record<string, string> = {}
  const industries: Record<string, string> = {}

  for (const study of agentStudies) {
    byAlias[study.agent.toLowerCase()] = study.id
    byAlias[study.id.replace(/_/g, ' ')] = study.id
    byAlias[study.vertical.toLowerCase()] = study.id
    industries[study.industry.toLowerCase()] = study.industry
  }

  return { byAlias, industries }
}

/** Fuzzy pass: substring match in either direction, with and without spaces. */
function fuzzyResolve(command: string): TerminalResult | null {
  const squashed = command.replace(/\s+/g, '')
  const overlaps = (candidate: string) => {
    const candidateSquashed = candidate.replace(/\s+/g, '')
    return (
      candidate.includes(command) ||
      command.includes(candidate) ||
      candidateSquashed.includes(squashed) ||
      squashed.includes(candidateSquashed)
    )
  }

  for (const [alias, key] of Object.entries(modalAliases)) {
    if (overlaps(alias)) {
      return { response: '→ ' + projectName(key, command), action: { kind: 'modal', key } }
    }
  }

  for (const [alias, id] of Object.entries(sectionAliases)) {
    if (alias.includes(command) || command.includes(alias) || squashed.includes(alias)) {
      return { response: '→ ' + titleCase(id), action: { kind: 'section', id } }
    }
  }

  for (const study of agentStudies) {
    const haystack = `${study.agent} ${study.name} ${study.vertical} ${study.id.replace(/_/g, ' ')}`.toLowerCase()
    if (haystack.includes(command) || haystack.replace(/\s+/g, '').includes(squashed)) {
      return { response: '→ ' + study.agent, action: { kind: 'agent', id: study.id } }
    }
  }

  for (const [key, project] of Object.entries(projects)) {
    const name = project.name?.toLowerCase()
    if (!name) continue
    if (name.includes(command) || name.replace(/\s+/g, '').includes(squashed)) {
      return { response: '→ ' + project.name, action: { kind: 'modal', key } }
    }
  }

  return null
}

/**
 * Resolve one typed command.
 *
 * @param raw       what the user typed
 * @param stepIndex the walkthrough step the terminal is currently parked on,
 *                  so `next` / `prev` can move relative to it
 */
export function resolveCommand(raw: string, stepIndex: number): TerminalResult {
  const command = (raw || '').trim().toLowerCase()
  if (!command) return { response: '', action: { kind: 'none' } }

  if (command === 'help') return { response: HELP, action: { kind: 'none' } }

  if (command === 'next') {
    const next = stepIndex + 1
    return next < presSteps.length
      ? { response: '→ ' + presSteps[next].label, action: { kind: 'step', index: next } }
      : { response: 'Last step reached.', action: { kind: 'none' } }
  }

  if (command === 'prev' || command === 'back') {
    const previous = stepIndex - 1
    return previous >= 0
      ? { response: '→ ' + presSteps[previous].label, action: { kind: 'step', index: previous } }
      : { response: 'Already at first step.', action: { kind: 'none' } }
  }

  if (command === 'plan') {
    return {
      response: presSteps.map((step, i) => `${i + 1}. ${step.label}`).join(' · '),
      action: { kind: 'none' },
    }
  }

  if (command === 'home') return { response: '→ Home', action: { kind: 'view', view: 'home' } }
  if (command === 'catalog' || command === 'all')
    return { response: '→ Full Catalog', action: { kind: 'view', view: 'catalog' } }
  if (command === 'close') return { response: '', action: { kind: 'close' } }
  if (command === 'clear') return { response: '', action: { kind: 'clear' } }

  if (sectionAliases[command]) {
    return { response: '→ ' + titleCase(command), action: { kind: 'section', id: sectionAliases[command] } }
  }

  if (modalAliases[command]) {
    const key = modalAliases[command]
    return { response: '→ ' + projectName(key, command), action: { kind: 'modal', key } }
  }

  const { byAlias, industries } = agentLookups()

  if (industries[command]) {
    const industry = industries[command]
    return { response: `→ ${industry} agents`, action: { kind: 'industry', industry } }
  }

  if (byAlias[command]) {
    const id = byAlias[command]
    const study = agentStudies.find((a) => a.id === id)
    return { response: '→ ' + (study?.agent ?? command), action: { kind: 'agent', id } }
  }

  return fuzzyResolve(command) ?? { response: 'Not found. Try "help" for commands.', action: { kind: 'none' } }
}
