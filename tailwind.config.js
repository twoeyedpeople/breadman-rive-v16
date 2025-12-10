/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "scale-up-down": {
          "0%, 100%": { transform: "scale(1.25)" },
          "50%": { transform: "scale(1.4)" }, // Scale up to 120%
        },
      },
      animation: {
        "scale-up-down": "scale-up-down 2s ease-in-out infinite", // Apply the animation
      },
    },
  },
  plugins: [],
};
