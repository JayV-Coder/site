# JayV — site

O site do JayV: a página de downloads, o cadastro, o login e a Administração
do sistema (feature flags e planos do Stripe), que antes moravam no app.

- **Next.js 16** (App Router, TypeScript) num servidor Node.
- **NextAuth v5** guarda a sessão num cookie cifrado. O login acontece pelo
  **Supabase Auth** do mesmo projeto do app (mesmos usuários, mesmo segundo
  fator, mesmo papel de admin): o navegador entra pelo Supabase e entrega os
  tokens ao NextAuth (provedor `supabase` em `src/auth.ts`), que confere com o
  Supabase e renova sozinho.
- **i18n** igual ao app: as chaves nascem em inglês em
  `src/modules/i18n/messages/en.ts`; os outros idiomas vêm da tabela
  `translations` do Supabase, lida no servidor. Chave nova do site começa por
  `site.` e ganha uma migração no repositório `JayV-Coder/supabase` com os dez
  idiomas. As chaves divididas com o app (`auth.*`, `admin.*`, `feature.*`...)
  têm o mesmo nome e texto das dele.
- **Visual** igual ao app: os tokens claro/escuro de `src/app/globals.css`
  são os do app, fonte mono em tudo, cantos pequenos, sem sombra.

## Rodar

```sh
npm install
cp .env.example .env.local   # preencha AUTH_SECRET
npm run dev
```

`npm run typecheck`, `npm test` e `npm run build` são o que o CI roda.

## Publicar

O site precisa de um servidor Node (Vercel, ou `npm run build && npm start`):
o NextAuth e a Administração rodam no servidor, então não há exportação
estática. Variáveis: `AUTH_SECRET` (obrigatória), `AUTH_URL` fora da Vercel e,
se mudar de projeto, `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

O provedor git das organizações (aba **Repositórios**) usa um app OAuth do
próprio site em cada provedor, com o retorno em `https://<domínio>/api/git/callback`
e as variáveis `GIT_<PROVEDOR>_CLIENT_ID` / `GIT_<PROVEDOR>_CLIENT_SECRET`
(veja `.env.example`). Um provedor sem as duas aparece indisponível. O token
do owner fica só num cookie cifrado com o `AUTH_SECRET`, por uma hora, e
nunca vai ao banco: serve para listar e conferir os repositórios na hora de
associar.

No Supabase › Authentication › URL Configuration, inclua
`https://<domínio>/**` em **Redirect URLs**: é para onde voltam o login por
GitHub/GitLab/Bitbucket, a confirmação de e-mail e a recuperação de senha.

## Versão

Todo PR sobe a versão do `package.json` (e do `package-lock.json`) seguindo o
[SemVer](https://semver.org/lang/pt-BR/).
