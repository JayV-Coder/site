import { isGitProvider, type GitProvider } from "@/modules/git/providers";

/** Um repositório da organização que algum membro tem como projeto no app
 * (`org_projects`). Cada membro tem a própria cópia do projeto; a linha junta
 * todas: quantos membros o têm, os chats vivos e a última atividade. */
export interface OrgProject {
  repositoryId: string;
  provider: GitProvider;
  path: string;
  repoKey: string;
  webUrl: string | null;
  members: number;
  chats: number;
  /** O chat mais recente ou, sem chat, o projeto mais novo; nulo quando o app
   * não gravou data legível. */
  lastActivity: string | null;
}

type Row = Record<string, unknown>;

// O PostgREST às vezes manda `bigint` como texto.
const count = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
};
const text = (value: unknown) => (typeof value === "string" && value ? value : null);

/** As linhas de `org_projects` como a aba Projetos as mostra; a que não tem
 * repositório, provedor conhecido ou caminho fica de fora. */
export function orgProjectsOf(rows: unknown): OrgProject[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((value): OrgProject[] => {
    const row = (value && typeof value === "object" ? value : {}) as Row;
    const repositoryId = text(row.repository_id);
    const path = text(row.path);
    if (!repositoryId || !path || !isGitProvider(row.provider)) return [];
    const lastActivity = text(row.last_activity);
    return [{
      repositoryId,
      provider: row.provider,
      path,
      repoKey: text(row.repo_key) ?? path,
      webUrl: text(row.web_url),
      members: count(row.members),
      chats: count(row.chats),
      lastActivity: lastActivity && !Number.isNaN(Date.parse(lastActivity)) ? lastActivity : null,
    }];
  });
}
