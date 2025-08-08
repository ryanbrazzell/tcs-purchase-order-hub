/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfkit', 'pdfjs-dist'],
  },
};

export default nextConfig;