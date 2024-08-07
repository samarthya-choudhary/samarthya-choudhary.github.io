/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        azo_gray: "#F3F3F3",
        azo_purple: "#3537E84D",
        azo_darkPurple: "#383CF0",
        azo_lightPurple: "#3537E8",
        azo_darkGray :"#768089",
        azo_lightGray :"#64748B",
        azo_pink :"#9B8AFB",
        azo_lightOrange :"#FFA332"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
