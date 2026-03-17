/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
      allowedOrigins: [
        'localhost:3000',
        // GitHub Codespaces / forwarded proxy hosts
        '*.app.github.dev',
        '*.githubpreview.dev',
      ],
    },
  },
};

export default nextConfig;
