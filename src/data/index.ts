/**
 * Content layer.
 *
 * The handoff's prototype merged its data modules at load time via IIFEs on
 * `window`. That merge is re-implemented here explicitly and evaluated once at
 * module load, so every consumer sees a single fully-composed project record.
 */
import { PORTFOLIO_PROJECTS, PROJECT_TECH } from './projects'
import { PORTFOLIO_DEEPDIVE } from './deepdive'
import { PORTFOLIO_PM } from './pm'
import { PORTFOLIO_ENHANCEMENTS } from './enhancements'
import { AGENT_STUDIES, AGENT_EXTRAS, AGENT_TECH } from './agentStudies'
import type { AgentStudy, Project, ProjectTech } from './types'

function composeProjects(): Record<string, Project> {
  const projects: Record<string, any> = {}
  for (const [key, project] of Object.entries(PORTFOLIO_PROJECTS)) {
    projects[key] = { ...(project as object) }
  }

  // Deep-dive fields (phases, screens, feedback, impact) merge onto the project.
  for (const [key, extra] of Object.entries(PORTFOLIO_DEEPDIVE)) {
    if (projects[key]) Object.assign(projects[key], extra)
  }

  // PM artefacts and enhancement roadmaps hang off their own sub-keys.
  for (const [key, pm] of Object.entries(PORTFOLIO_PM)) {
    if (projects[key]) projects[key].pm = pm
  }
  for (const [key, enhancements] of Object.entries(PORTFOLIO_ENHANCEMENTS)) {
    if (projects[key]) projects[key].enhancements = enhancements
  }

  return projects as Record<string, Project>
}

export const projects: Record<string, Project> = composeProjects()
export const projectTech: Record<string, ProjectTech> = PROJECT_TECH as Record<string, ProjectTech>
export const agentStudies: AgentStudy[] = AGENT_STUDIES as AgentStudy[]
export const agentExtras: Record<string, any> = AGENT_EXTRAS
export const agentTech: Record<string, ProjectTech> = AGENT_TECH as Record<string, ProjectTech>

export * from './types'
