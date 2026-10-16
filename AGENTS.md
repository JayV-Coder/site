# AGENTS.md

As regras do app (`JayV-Coder/jayv-coder`) valem aqui:

- Todo texto que a pessoa lê passa pelo i18n (`useT()` no cliente, `getT()`
  no servidor). Chave nova nasce em inglês em `src/modules/i18n/messages/en.ts`
  com o prefixo `site.` e ganha uma migração em `JayV-Coder/supabase` com os
  dez idiomas de `public.locales` (`on conflict (locale, key) do update`).
- Identificadores em inglês; comentários podem ser em português.
- Cor só pelos tokens de `src/app/globals.css` (os mesmos do app), nunca
  `#hex` em componente.
- Todo PR sobe a versão do `package.json` e do `package-lock.json` (SemVer) e a
  mensagem do commit começa por `vX.Y.Z: resumo`.
- A página inicial mostra o app pelos prints das páginas dos mods (os do
  estúdio do app, nos dez idiomas), escolhidos em `src/modules/home`: uma
  versão nova com tela ganha a sua linha em `RELEASE_SHOTS` (o id do item do
  changelog → o print de um mod), e a faixa da novidade passa a mostrá-la.
