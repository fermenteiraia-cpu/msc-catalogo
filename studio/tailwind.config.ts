import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        msc: { blue: "#2C3D6E", amber: "#F5C84B" },
      },
    },
  },
  plugins: [],
};
export default config;
