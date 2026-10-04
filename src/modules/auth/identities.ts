export type Provider = "github" | "gitlab" | "bitbucket";
export const PROVIDERS: Provider[] = ["github", "gitlab", "bitbucket"];

/** O nome de cada provedor é marca: não se traduz. */
export const PROVIDER_NAMES: Record<Provider, string> = { github: "GitHub", gitlab: "GitLab", bitbucket: "Bitbucket" };

/** Desvincular só quando sobra outra forma de entrar: a senha ou outra
 * identidade (inclusive a `email`). A mesma regra do app. */
export function canUnlink(providers: string[], hasPassword: boolean, provider: Provider) {
  if (!providers.includes(provider)) return false;
  return hasPassword || providers.some((other) => other !== provider);
}

export const isProvider = (value: unknown): value is Provider => PROVIDERS.includes(value as Provider);
