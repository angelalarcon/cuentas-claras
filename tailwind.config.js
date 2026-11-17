/** @type {import('tailwindcss').Config} */
export default {
  content: ["./public/index.html"],
  theme: {
    extend: {
      colors: {
        gblue: { DEFAULT: "#1a73e8", dark: "#1557b0", light: "#e8f0fe" },
        gred: "#d93025",
        ggreen: "#188038",
        gyellow: "#f9ab00",
        surface: "#ffffff",
        bg: "#f1f3f4",
        onsurface: "#202124",
        onsurfaceVariant: "#5f6368",
        outline: "#dadce0",
      },
      fontFamily: { sans: ["Roboto", "Arial", "sans-serif"] },
    },
  },
};
