/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint is its own CI step. A style rule should not be able to block a build,
  // and Next's ESLint patching is incompatible with ESLint 9.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
