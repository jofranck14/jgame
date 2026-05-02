/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary:   "#7C3AED",
        secondary: "#06B6D4",
        dark:      "#0F172A",
        darker:    "#020617",
        success:   "#22C55E",
        danger:    "#EF4444",
      },
    },
  },
  plugins: [],
}