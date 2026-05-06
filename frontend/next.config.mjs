/** @type {import('next').NextConfig} */
const nextConfig = {
    // This is required to make Docker work correctly
    output: 'standalone',
};

export default nextConfig;
