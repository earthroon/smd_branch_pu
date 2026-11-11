/** @type {import('tailwindcss').Config} */

const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const scale = (name: string) => {
  const result: Record<string, string> = {};
  steps.forEach((step) => {
    result[step] = `oklch(var(--${name}-${step}) / <alpha-value>)`;
  });
  return result;
};

export default {
  content: ["./app/**/*.{vue,ts,js}", "./shared/**/*.{ts,js}"],
  theme: {
    extend: {
      colors: {
        background: scale("background"),
        foreground: scale("foreground"),
        primary: scale("primary"),
        accent: scale("accent"),
        secondary: scale("secondary"),
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        body: ["var(--font-body)"],
        heading: ["var(--font-heading)"],
        display: ["var(--font-heading)"],
        label: ["var(--font-label)"],
      },
      lineHeight: {
        relaxed: "var(--type-body-leading)",
      },
      maxWidth: {
        content: "1280px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(22px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fadeIn 0.8s ease-out both",
      },
    },
  },
  plugins: [],
};