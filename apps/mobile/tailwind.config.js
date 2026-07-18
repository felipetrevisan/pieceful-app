/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#071126",
        panel: "#111c36",
        cyan: "#4cd7f6",
        violet: "#a879ff",
        pink: "#ff77aa",
        mist: "#aeb8d3",
      },
    },
  },
  plugins: [],
};
