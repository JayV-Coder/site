"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { CameraIcon, ImageUpIcon, MinusIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import {
  clampOffset, clampZoom, coverScale, MAX_ZOOM, MIN_ZOOM, OUTPUT, pickable, rezoom, sourceRect, uploadable, type Offset, type Size,
} from "@/modules/profile/crop";
import { removeProfilePhoto, uploadProfilePhoto } from "./actions";

/** O lado da janela de recorte na tela; no celular estreito ela encolhe. */
const VIEW = 288;

interface Picked { url: string; image: HTMLImageElement; size: Size }

/** A imagem recortada, em `OUTPUT` × `OUTPUT`: WebP onde o navegador sabe
 * gerar, JPEG no resto (o Safari devolve PNG para WebP, que pesa mais). */
async function render(picked: Picked, view: number, zoom: number, offset: Offset): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const { sx, sy, size } = sourceRect(picked.size, view, zoom, offset);
  context.imageSmoothingQuality = "high";
  context.drawImage(picked.image, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await encode("image/webp", 0.9);
  if (webp?.type === "image/webp" && uploadable(webp)) return webp;
  const jpeg = await encode("image/jpeg", 0.88);
  return jpeg && uploadable(jpeg) ? jpeg : null;
}

/** A foto do cartão da conta, com o botão de trocar. Trocar abre um modal:
 * escolher (ou arrastar) uma imagem, ajustar o que aparece no círculo —
 * arrastando, com a roda do mouse, com o controle de zoom ou pelo teclado —
 * e salvar. A foto vale no site e no app, em qualquer forma de login. */
export function PhotoEditor({ name, photo, custom }: { name: string; photo: string | null; custom: boolean }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [view, setView] = useState(VIEW);
  const [dropping, setDropping] = useState(false);
  const [busy, startBusy] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; from: Offset } | null>(null);

  // A janela acompanha a largura do modal (celular estreito).
  useEffect(() => {
    if (!picked || !frame.current) return;
    const element = frame.current;
    const observer = new ResizeObserver(([entry]) => setView(Math.round(entry.contentRect.width) || VIEW));
    observer.observe(element);
    return () => observer.disconnect();
  }, [picked]);

  // A imagem anterior sai da memória quando outra entra ou o modal fecha.
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url); }, [picked]);

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  const choose = (file: File | null | undefined) => {
    if (!file) return;
    if (!pickable(file)) {
      report({ key: "site.account.photo.invalid" });
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setPicked({ url, image, size: { width: image.naturalWidth, height: image.naturalHeight } });
      reset();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      report({ key: "site.account.photo.invalid" });
    };
    image.src = url;
  };

  const close = (wanted: boolean) => {
    if (busy) return;
    setOpen(wanted);
    if (!wanted) {
      setPicked(null);
      setDropping(false);
      reset();
    }
  };

  const zoomTo = (next: number) => {
    if (!picked) return;
    const target = clampZoom(next);
    setOffset((current) => rezoom(current, picked.size, view, zoom, target));
    setZoom(target);
  };

  const move = (dx: number, dy: number) => {
    if (!picked) return;
    setOffset((current) => clampOffset({ x: current.x + dx, y: current.y + dy }, picked.size, view, zoom));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!picked || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: offset };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!picked || !start || start.id !== event.pointerId) return;
    setOffset(clampOffset({ x: start.from.x + event.clientX - start.x, y: start.from.y + event.clientY - start.y }, picked.size, view, zoom));
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!picked) return;
    zoomTo(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 10;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(step, 0), ArrowRight: () => move(-step, 0), ArrowUp: () => move(0, step), ArrowDown: () => move(0, -step),
      "+": () => zoomTo(zoom + 0.1), "=": () => zoomTo(zoom + 0.1), "-": () => zoomTo(zoom - 0.1), "0": reset,
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const save = () => {
    if (!picked) return;
    startBusy(async () => {
      const blob = await render(picked, view, zoom, offset);
      if (!blob) {
        report({ key: "site.account.photo.invalid" });
        return;
      }
      const form = new FormData();
      form.set("photo", blob, `photo.${blob.type === "image/webp" ? "webp" : "jpg"}`);
      const result = await uploadProfilePhoto(form);
      if (!result.ok) {
        report(typeof result.error === "string" ? new Error(result.error) : result.error);
        return;
      }
      notify(t("site.account.photo.saved"));
      setOpen(false);
      setPicked(null);
      router.refresh();
    });
  };

  const remove = () => {
    startBusy(async () => {
      const result = await removeProfilePhoto();
      if (!result.ok) {
        report(typeof result.error === "string" ? new Error(result.error) : result.error);
        return;
      }
      notify(t("site.account.photo.removed"));
      setOpen(false);
      router.refresh();
    });
  };

  const scale = picked ? coverScale(picked.size, view) * zoom : 1;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("site.account.photo.change")} title={t("site.account.photo.change")}
        className="group relative -mt-10 shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none">
        <UserAvatar name={name} src={photo} className="size-[84px] border-4 border-card text-h1" />
        <span aria-hidden="true" className="absolute inset-1 grid place-items-center rounded-full bg-overlay text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <CameraIcon className="size-5" />
        </span>
        <span aria-hidden="true" className="absolute end-0 bottom-0 grid size-7 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground">
          <CameraIcon className="size-3.5" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent closeLabel={t("common.close")} className="sm:max-w-md" onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>{t("site.account.photo.title")}</DialogTitle>
            <DialogDescription>{t("site.account.photo.description")}</DialogDescription>
          </DialogHeader>

          <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />

          {picked ? (
            <div className="grid justify-items-center gap-4">
              <div ref={frame} role="application" tabIndex={0} aria-label={t("site.account.photo.drag")}
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                onWheel={onWheel} onKeyDown={onKeyDown}
                className="relative aspect-square w-full max-w-[288px] cursor-grab touch-none overflow-hidden rounded-lg bg-muted select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing">
                <img src={picked.url} alt="" draggable={false}
                  className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                  style={{
                    width: picked.size.width * scale,
                    height: picked.size.height * scale,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  }} />
                {/* A máscara: o que fica fora do círculo aparece escurecido. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_var(--overlay)] ring-2 ring-accent" />
              </div>
              <div className="flex w-full max-w-[288px] items-center gap-2">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("site.account.photo.zoomOut")} disabled={zoom <= MIN_ZOOM} onClick={() => zoomTo(zoom - 0.25)}><MinusIcon /></Button>
                <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} aria-label={t("site.account.photo.zoom")}
                  onChange={(event) => zoomTo(Number(event.target.value))} className="h-1.5 flex-1 cursor-pointer accent-foreground" />
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("site.account.photo.zoomIn")} disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom + 0.25)}><PlusIcon /></Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">{t("site.account.photo.hint")}</p>
              {/* Trocar a imagem e desfazer o ajuste ficam junto do recorte, e
                  quebram linha: no rodapé, ao lado de Salvar, não cabiam em
                  todos os idiomas e o modal rolava para o lado. */}
              <div className="flex max-w-full flex-wrap justify-center gap-1">
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => input.current?.click()}><ImageUpIcon />{t("site.account.photo.another")}</Button>
                <Button type="button" variant="ghost" size="sm" disabled={busy || (zoom === MIN_ZOOM && offset.x === 0 && offset.y === 0)} onClick={reset}><RotateCcwIcon />{t("site.account.photo.reset")}</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => input.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDropping(true); }}
              onDragLeave={() => setDropping(false)}
              onDrop={(event) => { event.preventDefault(); setDropping(false); choose(event.dataTransfer.files?.[0]); }}
              className={`grid w-full place-items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors hover:border-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${dropping ? "border-foreground bg-secondary" : "border-border"}`}>
              <UserAvatar name={name} src={photo} className="size-20 text-h1" />
              <span className="flex items-center gap-2 text-sm font-medium"><ImageUpIcon className="size-4" />{t("site.account.photo.choose")}</span>
              <span className="max-w-[32ch] text-xs text-muted-foreground">{t("site.account.photo.drop")}</span>
            </button>
          )}

          <DialogFooter>
            {!picked && custom && (
              <Button type="button" variant="ghost" loading={busy} onClick={remove} className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:me-auto"><Trash2Icon />{t("site.account.photo.remove")}</Button>
            )}
            <Button type="button" variant="outline" disabled={busy} onClick={() => close(false)}>{t("common.cancel")}</Button>
            {picked && <Button type="button" loading={busy} onClick={save}>{t("site.account.photo.save")}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
