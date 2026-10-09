# JayV — site

O site do JayV: a página de downloads, o cadastro, o login, o painel (que abre
no Dashboard, com o uso do app da conta e, para o admin, o do sistema inteiro)
e a Administração do sistema (feature flags e planos do Stripe), que antes
moravam no app.

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

O provedor git das organizações (aba **Repositórios**) usa um app do próprio
site em cada provedor, com o retorno em `https://<domínio>/api/git/callback`
e as variáveis `GIT_<PROVEDOR>_CLIENT_ID` / `GIT_<PROVEDOR>_CLIENT_SECRET`
(veja `.env.example`). Um provedor sem elas aparece indisponível. O GitHub é
só por **GitHub App** (OAuth App não é mais aceito): além do Client ID e do
secret do app, `GIT_GITHUB_APP_SLUG` é obrigatório. Conectar o GitHub pede a
autorização da pessoa (que sempre volta para o site) e abre a escolha entre as
contas e organizações onde o app já está instalado; sem nenhuma, segue para a
tela do GitHub de instalar. A escolha tem "Instalar o GitHub App em outra
conta ou organização", que abre essa tela numa aba nova: numa conta onde o
app já está instalado, o GitHub abre as configurações da instalação e não
volta, e a aba do site relê a lista quando a pessoa volta a ela (Setup URL e
Callback URL apontando para `/api/git/callback`, com "Redirect on update"
ligado, permissões de repositório Metadata e Contents só leitura). Uma organização conectada antes
por OAuth App pede para conectar de novo. No GitLab e no Bitbucket, a
organização (grupo ou workspace) é escolhida no site, logo depois de entrar. O token
do owner fica só num cookie cifrado com o `AUTH_SECRET`, por uma hora, e
nunca vai ao banco: serve para listar e conferir os repositórios na hora de
associar.

No Supabase › Authentication › URL Configuration, inclua
`https://<domínio>/**` em **Redirect URLs**: é para onde voltam o login por
GitHub/GitLab/Bitbucket, a confirmação de e-mail e a recuperação de senha.

O **login com GitHub** (no site e no app) também é por GitHub App: em
Supabase › Authentication › Providers › GitHub vão o Client ID e um client
secret do GitHub App, não de um OAuth App. No GitHub App, a Callback URL
inclui `https://<projeto>.supabase.co/auth/v1/callback` (ele aceita várias,
então pode ser o mesmo app do provedor git) e a permissão de conta
**Email addresses: Read-only**, sem a qual o Supabase não lê o e-mail de quem
entra.

## Versão

Todo PR sobe a versão do `package.json` (e do `package-lock.json`) seguindo o
[SemVer](https://semver.org/lang/pt-BR/).
