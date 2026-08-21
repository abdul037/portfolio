import next from 'eslint-config-next/core-web-vitals'

export default [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // The design sizes and positions every screenshot with exact CSS and is
      // served as static files, so next/image's layout wrapper is not wanted
      // here (see the images.unoptimized note in next.config.ts).
      '@next/next/no-img-element': 'off',
      // Copy is ported verbatim from the handoff; apostrophes and quotes stay
      // as written rather than being HTML-escaped.
      'react/no-unescaped-entities': 'off',
    },
  },
]
