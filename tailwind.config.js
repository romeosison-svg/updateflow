/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0E1411",
        line: "#E2DCD2",
        "bg-paper": "#F4F1EC",
        "bg-surface": "#FFFFFF",
        "text-ink": "#0E1411",
        "text-ink-soft": "#3A4541",
        "text-muted": "#6E7A75",
        "border-line": "#E2DCD2",
        "border-line-soft": "#EDE8DF",
        "bg-accent": "#0D6B6E",
        "text-accent-ink": "#FFFFFF",
        "bg-accent-soft": "#E6EFEE",
        "text-accent": "#0D6B6E",
        error: "#B14040"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      fontSize: {
        "hero-brief": "clamp(2.75rem, 8vw, 6.875rem)",
        "display-110": "110px",
        "display-72": "72px",
        "display-48": "48px",
        "display-44": "44px",
        "kicker-h3": "28px",
        "body-serif": "19px",
        "mono-caption": "11px",
        "mono-input": "13px"
      },
      lineHeight: {
        tight: "1.1",
        base: "1.6",
        relaxed: "1.7"
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        full: "999px"
      },
      screens: {
        mobile: { max: "640px" }
      },
      keyframes: {
        "pulse-opacity": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" }
        }
      },
      animation: {
        "pulse-opacity": "pulse-opacity 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
