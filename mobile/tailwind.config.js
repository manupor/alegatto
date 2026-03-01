/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        card: "#1e293b",
        accent: "#10B981",
        foreground: "#f8fafc",
        muted: "#64748b",
        destructive: "#ef4444",
      },
    },
  },
  plugins: [],
};
