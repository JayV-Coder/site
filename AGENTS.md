# AGENTS.md

As regras do app (`JayV-Coder/jayv-coder`) valem aqui:

- Todo texto que a pessoa lê passa pelo i18n (`useT()` no cliente, `getT()`
  no servidor). Chave nova nasce em inglês em `src/modules/i18n/messages/en.ts`
  com o prefixo `site.` e ganha uma migração em `JayV-Coder/supabase` com os
  dez idiomas de `public.locales` (`on conflict (locale, key) do update`).
- O texto segue o tom do app: curto, direto e genérico, sem citar jogos,
  sem comparar o JayV com outros produtos e sem o `@` de organização; marca só
  onde é preciso para usar a função.
- Identificadores em inglês; comentários podem ser em português.
- Cor só pelos tokens de `src/app/globals.css` (os mesmos do app), nunca
  `#hex` em componente.
- Todo PR sobe a versão do `package.json` e do `package-lock.json` (SemVer) e a
  mensagem do commit começa por `vX.Y.Z: resumo`.
- A página inicial mostra o app pelos prints das páginas dos mods (os do
  estúdio do app, nos dez idiomas), escolhidos em `src/modules/home`: uma
  versão nova com tela ganha a sua linha em `RELEASE_SHOTS` (o id do item do
  changelog → o print de um mod), e a faixa da novidade passa a mostrá-la.
- Instalar um mod é na página dele (`/mods/[id]`), com a conta aberta: o
  botão Instalar no JayV grava o mod no `installedMods` do ambiente escolhido
  (`changeMod`, a mesma ação do Painel › Mods, com as mesmas permissões) e só
  depois abre `jayv://mods/sync?mod=<id>&environment=<ambiente>`
  (`src/modules/mods/appLink.ts`). O link não instala nada, só acorda o sync
  do app; nunca faça o app instalar a partir do link, sem a conta. Sem login, a
  página mostra Entrar para instalar, e o app não lista mais o catálogo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
- O Integration AI Doctor mora em `/[locale]/doctor` (`src/app/[locale]/doctor` e
  `src/modules/doctor`). As telas gravam pela API do `JayV-Coder/jayv-doctor`
  (`DOCTOR_API_URL`), só no servidor, com o token de quem entrou (`doctorFetch`). As leituras
  que já têm função no schema `doctor_read` vão direto ao Supabase, no servidor, com o mesmo
  token (`doctorRead`, ADR-0026 do jayv-doctor), e voltam para a API se falharem; nada do
  schema `doctor` é lido direto. O Realtime (`LiveRefresh`) usa o token no navegador. Os tipos vêm de `contracts.gen.ts`, copiado de lá. O
  vocabulário é o do `GLOSSARY.md` do jayv-doctor (Organização, Integração, Execução,
  Incidente, Diagnóstico, Evidência), com inicial maiúscula. As chaves são `site.doctor.*`
  em `src/modules/i18n/messages/doctor.ts`, e a migração das traduções **não** leva
  `_doctor_` logo depois do carimbo (esse nome é das migrações do schema `doctor`, que o
  deploy não aplica): use `<carimbo>_site_doctor_<nome>.sql`. Trocar a Organização ativa
  renova a sessão (`unstable_update({ refresh: true })`), porque ela vai nas claims do token.
