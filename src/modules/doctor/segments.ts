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

export const isSegment = (value: string): value is Segment => value in VALUES;

export const segmentValue = (segment: Segment) => VALUES[segment];
