import { notFound } from "next/navigation";

/** Qualquer caminho que o site não tem cai no "não encontrado" do idioma. */
export default function Missing() {
  notFound();
}
