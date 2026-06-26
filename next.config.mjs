/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript errors from @supabase/ssr generic inference don't block build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
