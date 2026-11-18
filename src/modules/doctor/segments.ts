import type { Key } from "@/modules/i18n";

/** Os Segmentos de uma Organização no Doctor. Na API o Segmento é texto livre: grava-se o
 * valor em português, o mesmo que as Organizações já criadas têm nos três primeiros. */
const VALUES = {
  consulting: "Consultoria de integração",
  industry: "Indústria",
  retail: "Varejo",
  finance: "Serviços financeiros",
  health: "Saúde",
  logistics: "Logística e transporte",
  energy: "Energia e utilidades",
  telecom: "Telecomunicações",
  technology: "Tecnologia e software",
  public: "Setor público",
  agribusiness: "Agronegócio",
  education: "Educação",
  other: "Outro",
} as const;

export type Segment = keyof typeof VALUES;

/** Na ordem da lista; "Outro" por último. */
export const SEGMENTS = Object.keys(VALUES) as Segment[];

export const isSegment = (value: string): value is Segment => Object.hasOwn(VALUES, value);

export const segmentValue = (segment: Segment) => VALUES[segment];

/** O rótulo de cada Segmento: um mapa tipado, para o compilador cobrar a mensagem de um novo. */
const LABELS = {
  consulting: "site.doctor.org.segment.consulting",
  industry: "site.doctor.org.segment.industry",
  retail: "site.doctor.org.segment.retail",
  finance: "site.doctor.org.segment.finance",
  health: "site.doctor.org.segment.health",
  logistics: "site.doctor.org.segment.logistics",
  energy: "site.doctor.org.segment.energy",
  telecom: "site.doctor.org.segment.telecom",
  technology: "site.doctor.org.segment.technology",
  public: "site.doctor.org.segment.public",
  agribusiness: "site.doctor.org.segment.agribusiness",
  education: "site.doctor.org.segment.education",
  other: "site.doctor.org.segment.other",
} as const satisfies Record<Segment, Key>;

/** As opções da lista, em ordem alfabética no idioma de quem vê, com "Outro" por último. */
export function segmentOptions(t: (key: Key) => string, locale: string) {
  const collator = new Intl.Collator(locale);
  const options = SEGMENTS.filter((value) => value !== "other")
    .map((value) => ({ value, label: t(LABELS[value]) }))
    .sort((a, b) => collator.compare(a.label, b.label));
  return [...options, { value: "other" as const, label: t(LABELS.other) }];
}
