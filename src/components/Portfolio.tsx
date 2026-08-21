'use client'

/**
 * The portfolio shell.
 *
 * Composition order mirrors the design's stacking: fixed background layers,
 * sticky chrome, the active view, then the overlay stack (hover preview, chat,
 * modals, terminal, presenter bar) on top.
 */
import { BootIntro } from '@/components/BootIntro'
import { ResumeModal } from '@/components/ResumeModal'
import {
  AgentModal,
  AssistantChat,
  BackgroundLayers,
  CatalogView,
  CommandHint,
  CommandTerminal,
  HomeAbout,
  HomeAgents,
  HomeCareer,
  HomeContact,
  HomeHero,
  HomeImpact,
  HomeMarquee,
  HomeMethod,
  HomePhilosophy,
  HomeRoadmap,
  HomeRoots,
  HomeShipAI,
  HomeTeardowns,
  HomeWork,
  HoverPreview,
  MobileNav,
  PresentationBar,
  ProjectModal,
  SiteFooter,
  SiteHeader,
} from '@/components/design'
import { useIntroPlaying } from '@/lib/introStore'
import { useMotionFx, useParticleCanvases } from '@/lib/useMotionFx'
import { useViewModel } from '@/lib/useViewModel'

export function Portfolio() {
  const v = useViewModel()
  const introPlaying = useIntroPlaying()

  useMotionFx()
  useParticleCanvases()

  return (
    <div
      data-root="1"
      style={{
        fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        background: '#07070e',
        color: '#e0e0e6',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <BootIntro />

      <BackgroundLayers />

      <SiteHeader v={v} />
      <MobileNav v={v} />

      {v.isHome ? (
        <main data-screen-label="Home">
          <HomeHero v={v} />
          <HomeMarquee />
          <HomeWork v={v} />
          <HomeImpact v={v} />
          <HomeAgents v={v} />
          <HomeTeardowns v={v} />
          <HomeShipAI />
          <HomeCareer v={v} />
          <HomeRoadmap />
          <HomeMethod />
          <HomePhilosophy />
          <HomeAbout />
          <HomeRoots />
          <HomeContact v={v} />
        </main>
      ) : null}

      {v.isCatalog ? <CatalogView v={v} /> : null}

      <HoverPreview v={v} />
      <SiteFooter />
      <AssistantChat v={v} />

      <ProjectModal v={v} />
      <AgentModal v={v} />
      <ResumeModal v={v} />

      {/*
        The ⌘K hint shares the bottom-right corner with the chat dock, so it
        waits for the boot sequence to clear and yields entirely once the chat
        is open. globals.css lifts it clear of the dock button itself.
      */}
      {!introPlaying && !v.chatOpen ? <CommandHint v={v} /> : null}
      <CommandTerminal v={v} />
      <PresentationBar v={v} />
    </div>
  )
}
