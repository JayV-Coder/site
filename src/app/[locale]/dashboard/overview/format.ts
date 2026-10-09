/** Como a página Dashboard escreve números, dinheiro e datas no idioma de
 * quem vê. Os dias vêm do banco já cortados no fuso do perfil (`2026-10-09`)
 * e são escritos como estão; os instantes, no mesmo fuso. */
export function formatters(locale: string, zone: string) {
  const whole = new Intl.NumberFormat(locale);
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const usd = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const smallUsd = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 4 });
  const oneDecimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const longDay = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  let moment: Intl.DateTimeFormat;
  try {
    moment = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: zone });
  } catch {
    moment = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  }
  const asDay = (day: string) => new Date(`${day}T00:00:00Z`);
  return {
    number: (value: number) => whole.format(value),
    compact: (value: number) => compact.format(value),
    /** Centavos de dólar somem em 2 casas: abaixo de 1 dólar, mostra até 4. */
    money: (value: number) => (value > 0 && value < 1 ? smallUsd : usd).format(value),
    seconds: (ms: number) => oneDecimal.format(ms / 1000),
    day: (day: string) => (day ? dayLabel.format(asDay(day)) : "—"),
    longDay: (day: string) => (day ? longDay.format(asDay(day)) : "—"),
    moment: (iso: string | null) => (iso ? moment.format(new Date(iso)) : "—"),
  };
}

export type Formatters = ReturnType<typeof formatters>;
