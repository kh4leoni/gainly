// Tailwind v4 is handled by the @tailwindcss/vite plugin (see vite.config.ts).
// This empty config stops PostCSS from walking up and inheriting the parent
// repo's Tailwind v3 postcss.config.mjs, which would break v4 CSS.
export default {
  plugins: {},
}
