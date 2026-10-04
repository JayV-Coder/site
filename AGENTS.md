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
