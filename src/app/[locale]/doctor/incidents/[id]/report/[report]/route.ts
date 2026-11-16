import { doctorGet, type Schemas } from "@/modules/doctor/api";
import { downloadName } from "@/modules/doctor/reports";
import { getT } from "@/modules/i18n/server";

type Report = Schemas["Report"];
type Incident = Schemas["IncidentDetail"];

/** "Baixar": a URL assinada (curta) nasce na hora do clique, com o nome do arquivo. */
export async function GET(_request: Request, { params }: RouteContext<"/[locale]/doctor/incidents/[id]/report/[report]">): Promise<Response> {
  const { locale, id, report } = await params;
  const [found, incident] = await Promise.all([
    doctorGet<Report>(`/reports/${encodeURIComponent(report)}`),
    doctorGet<Incident>(`/incidents/${encodeURIComponent(id)}`),
  ]);
  if (!found || found === "not_found" || found.incident_id !== id || !found.download_url) {
    const t = await getT(locale);
    const missing = !found || found === "not_found" || found.incident_id !== id;
    return new Response(t(missing ? "site.doctor.error.notFound" : "site.doctor.report.error.notReady"), {
      status: missing ? 404 : 409, headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const url = new URL(found.download_url);
  const number = incident && incident !== "not_found" ? incident.number : null;
  url.searchParams.set("download", number === null ? `report-${found.id.slice(0, 8)}.${found.format}` : downloadName(number, found.format));
  return Response.redirect(url, 303);
}
