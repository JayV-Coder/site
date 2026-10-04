"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Enviar um formulário de ação do servidor (ou um `next/form`): o giro aparece
 * dentro do botão enquanto o envio não volta. */
export function SubmitButton({ loading, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending || loading} {...props} />;
}
