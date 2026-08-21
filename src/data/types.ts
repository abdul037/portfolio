/**
 * Shapes for the ported content. The handoff's data is hand-authored and
 * irregular — most fields are optional and many entries carry only a subset —
 * so these types document intent rather than enforcing a rigid schema.
 */

export interface Shot {
  src: string
  caption?: string
  w?: number
  h?: number
}

export interface ProjectModule {
  name?: string
  desc?: string
  shots?: Shot[]
  [key: string]: any
}

export interface Metric {
  k?: string
  v?: string
  label?: string
  value?: string
  display?: string
  suffix?: string
  gauge?: number
  [key: string]: any
}

export interface EnhancementItem {
  enhance: string
  current?: string
  metric?: string
  impact?: string
  effort?: string
  /** 'quick' = shippable low-hanging fruit, 'bet' = visionary big bet. */
  tier?: 'quick' | 'bet'
}

export interface Enhancements {
  /** 'live' = shipped by the health authority, 'concept' = proposal. */
  studyType?: 'live' | 'concept'
  studyBasis?: string
  items?: EnhancementItem[]
}

export interface Project {
  name: string
  badge?: string
  roleTitle?: string
  tags?: string[]
  problemDesc?: string
  solutionDesc?: string
  modules?: ProjectModule[]
  metrics?: Metric[]
  phases?: any[]
  screens?: any[]
  feedback?: any[]
  deliverables?: any[]
  shipAI?: { k: string; v: string }[]
  nvidiaAI?: any[]
  ecosystemNote?: string
  realImpact?: string
  pm?: any
  enhancements?: Enhancements
  [key: string]: any
}

/** Role tags on an example run, colour-coded in the deep-dive transcript. */
export type TechRole = 'User' | 'Agent' | 'Tool' | 'System' | 'Human'

/** Autonomy level for a capability: act freely, ask a human, or hard-stop. */
export type AutonomyMode = 'act' | 'ask' | 'block'

export interface ProjectTech {
  /** An annotated example run, one line per turn. */
  example?: { who: TechRole; t: string }[]
  /** Architecture steps: `s` = step name, `d` = detail. */
  arch?: { s: string; d: string }[]
  /** Tool contracts: name, args, returns, effects. */
  contracts?: { n: string; a: string; r: string; e: string }[]
  /** Context sources: `k` = source, `d` = what it contributes. */
  context?: { k: string; d: string }[]
  /** Token / step budget lines. */
  budget?: { k: string; v: string }[]
  /** Autonomy table: `w` = capability, `a` = behaviour, `mode` = level. */
  autonomy?: { w: string; a: string; mode: AutonomyMode }[]
}

export interface FlowStep {
  /** 0 = Clinician/User, 1 = AI Agent, 2 = Systems & Data. */
  lane: 0 | 1 | 2
  label: string
}

export interface IntegrationGroup {
  layer: string
  color: string
  items: string[]
}

export interface AgentStudy {
  id: string
  color: string
  industry: string
  vertical: string
  agent: string
  name: string
  tagline: string
  status: string
  problem: string
  goal: string
  example?: string
  flow: FlowStep[]
  integrations: IntegrationGroup[]
  evalsOffline: any[]
  evalsOnline: any[]
  metrics: { v: string; l: string }[]
  [key: string]: any
}
