/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}', // Ensure that Tailwind processes your TSX files
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwindcss-animate"), // make sure to "npm install tailwindcss-animate"
    require("@assistant-ui/react/tailwindcss")({
      components: ["thread"],
    })
  ],
}


