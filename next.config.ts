import type { NextConfig } from "next";

/** O site roda num servidor Node (Vercel ou `next start`): o login do
 * NextAuth e a Administração precisam de rotas no servidor, então não há
 * exportação estática. */
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A foto de perfil sobe por uma ação do servidor: já recortada, até 1 MB
  // (o limite do bucket `avatars`), mais o envelope do formulário.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};

export default config;
