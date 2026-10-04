export type Provider = "github" | "gitlab" | "bitbucket";
export const PROVIDERS: Provider[] = ["github", "gitlab", "bitbucket"];

/** O nome de cada provedor é marca: não se traduz. */
export const PROVIDER_NAMES: Record<Provider, string> = { github: "GitHub", gitlab: "GitLab", bitbucket: "Bitbucket" };
