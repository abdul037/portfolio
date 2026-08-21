'use client'

/**
 * Whether this page load plays the boot intro.
 *
 * The decision depends on browser-only state — the visitor's reduced-motion
 * preference and a per-session flag — so it cannot be made while rendering on
 * the server. It is made once, outside React, and both the overlay and the
 * shell subscribe to it: the shell needs to know when the intro has cleared
 * before it offers the ⌘K hint.
 */
import { useSyncExternalStore } from 'react'

const SESSION_KEY = 'v7_booted'

type IntroState = 'undecided' | 'playing' | 'done'

let state: IntroState = 'undecided'
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Decide, once per page load, whether the intro runs.
 *
 * It is skipped for reduced-motion visitors, and after the first load of a
 * session — reloads are frequent during a live walkthrough and a 17-second
 * cold open every time would be hostile.
 */
function decide(): IntroState {
  if (state !== 'undecided') return state

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state = 'done'
    return state
  }

  let alreadyBooted = false
  try {
    alreadyBooted = !!sessionStorage.getItem(SESSION_KEY)
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Storage blocked — play it; the intro is skippable either way.
  }

  state = alreadyBooted ? 'done' : 'playing'
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => decide()

// The server renders no overlay, so hydration starts from the same markup.
const getServerSnapshot = (): IntroState => 'done'

/** End the intro. Safe to call more than once. */
export function dismissIntro() {
  if (state === 'done') return
  state = 'done'
  emit()
}

/** `true` while the boot overlay should be on screen. */
export function useIntroPlaying(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) === 'playing'
}
