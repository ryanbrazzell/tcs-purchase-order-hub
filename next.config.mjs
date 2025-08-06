/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf2json', 'pdf-to-img', 'canvas'],
  },
};

export default nextConfig;
