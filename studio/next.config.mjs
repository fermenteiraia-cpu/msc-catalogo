/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@napi-rs/canvas", "pdf-lib"],
  },
};
export default nextConfig;
