"use client";

import type { Provider } from "@/modules/auth/identities";
import { ProviderIcon } from "@/components/atoms";
import { Button } from "@/components/ui/button";

/** Entrar ou vincular por um provedor: a marca e o que o botão faz. Enquanto
 * espera o provedor, o giro toma o lugar da marca dentro do botão. */
export function ProviderButton({ provider, label, onClick, disabled, loading }: { provider: Provider; label: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Button type="button" variant="outline" disabled={disabled} loading={loading} onClick={onClick}>
      <ProviderIcon provider={provider} />
      <span className="truncate">{label}</span>
    </Button>
  );
}
