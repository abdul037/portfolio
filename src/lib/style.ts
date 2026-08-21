import type { CSSProperties } from 'react'

/**
 * Parse a CSS declaration string into a React style object.
 *
 * The design keeps a handful of styles as strings because they are composed at
 * runtime from per-item colours (an agent study's `color`, a status tint). This
 * is the one place that string gets turned back into a style object.
 */
export function css(declarations: string | null | undefined): CSSProperties {
  if (!declarations) return {}

  const style: Record<string, string> = {}
  for (const declaration of declarations.split(';')) {
    const separator = declaration.indexOf(':')
    if (separator < 0) continue

    const property = declaration.slice(0, separator).trim()
    const value = declaration.slice(separator + 1).trim()
    if (!property || !value) continue

    // Custom properties (--a, --aRGB) are set verbatim; everything else is
    // camel-cased the way React expects.
    const key = property.startsWith('--')
      ? property
      : property.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase())

    style[key] = value
  }

  return style as CSSProperties
}

/** Narrow a possibly-missing collection to an array so `.map` is always safe. */
export function arr<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}
