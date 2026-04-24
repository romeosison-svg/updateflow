/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#0d7377",
        "accent-hover": "#0a5f63",
        "accent-light": "#e8f4f5",
        bg: "#f8f9fa",
        card: "#ffffff",
        text: "#1a2332",
        muted: "#5c6b7a",
        border: "#e2e7ec",
        error: "#dc2626"
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif']
      },
      lineHeight: {
        tight: "1.1",
        base: "1.6",
        relaxed: "1.7"
      },
      borderRadius: {
        pill: "999px",
        card: "20px",
        control: "14px",
        input: "10px"
      },
      screens: {
        mobile: { max: "720px" }
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
