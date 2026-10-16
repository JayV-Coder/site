/** O aviso que o site manda ao app depois de instalar um mod na conta:
 * `jayv://mods/sync?mod=<id>&environment=<ambiente>`. O link não instala nada
 * nem diz o que instalar — isso o site já gravou no estado dos mods do
 * ambiente, com a pessoa logada; ele só faz o app sincronizar na hora (o app
 * lê em `@/modules/mods/siteLink`). O `at` deixa cada clique diferente do
 * anterior: o app ignora o mesmo link repetido. */
export function syncLink(mod: string, environment: string, at = Date.now()): string {
  const query = new URLSearchParams({ mod, environment, at: String(at) });
  return `jayv://mods/sync?${query.toString()}`;
}
