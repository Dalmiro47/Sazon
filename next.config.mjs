/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
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
