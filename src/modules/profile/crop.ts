/** O recorte da foto de perfil: a imagem cobre uma janela quadrada (o círculo
 * é só a máscara) e a pessoa arrasta e aproxima. Tudo em pixels de tela; o
 * desenho final sai em `OUTPUT` × `OUTPUT`. */

export const OUTPUT = 512;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** A imagem escolhida, antes do recorte. */
export const SOURCE_MAX_BYTES = 10 * 1024 * 1024;
/** O arquivo que sobe para o Storage (o limite do bucket `avatars`). */
export const UPLOAD_MAX_BYTES = 1024 * 1024;
export const UPLOAD_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

export interface Size { width: number; height: number }
export interface Offset { x: number; y: number }
export interface SourceRect { sx: number; sy: number; size: number }

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clampZoom = (zoom: number) => clampNumber(Number.isFinite(zoom) ? zoom : MIN_ZOOM, MIN_ZOOM, MAX_ZOOM);

/** A escala que faz o lado menor da imagem caber exato na janela. */
export const coverScale = (image: Size, view: number) => view / Math.min(image.width, image.height);

/** O deslocamento do centro da imagem, preso para ela nunca deixar canto vazio
 * na janela. */
export function clampOffset(offset: Offset, image: Size, view: number, zoom: number): Offset {
  const scale = coverScale(image, view) * clampZoom(zoom);
  const spareX = Math.max(0, (image.width * scale - view) / 2);
  const spareY = Math.max(0, (image.height * scale - view) / 2);
  return { x: clampNumber(offset.x, -spareX, spareX) || 0, y: clampNumber(offset.y, -spareY, spareY) || 0 };
}

/** Trocar o zoom mantém o mesmo ponto no centro da janela. */
export function rezoom(offset: Offset, image: Size, view: number, from: number, to: number): Offset {
  const ratio = clampZoom(to) / clampZoom(from);
  return clampOffset({ x: offset.x * ratio, y: offset.y * ratio }, image, view, to);
}

/** O pedaço da imagem original que a janela mostra, para o `drawImage`. */
export function sourceRect(image: Size, view: number, zoom: number, offset: Offset): SourceRect {
  const scale = coverScale(image, view) * clampZoom(zoom);
  const { x, y } = clampOffset(offset, image, view, zoom);
  const size = Math.min(view / scale, image.width, image.height);
  const sx = clampNumber(image.width / 2 - x / scale - size / 2, 0, image.width - size);
  const sy = clampNumber(image.height / 2 - y / scale - size / 2, 0, image.height - size);
  return { sx, sy, size };
}

/** A imagem escolhida serve para recortar? */
export const pickable = (file: { type: string; size: number }) => file.type.startsWith("image/") && file.size > 0 && file.size <= SOURCE_MAX_BYTES;

/** O arquivo recortado pode subir? A mesma regra do bucket. */
export const uploadable = (file: { type: string; size: number }) =>
  (UPLOAD_TYPES as readonly string[]).includes(file.type) && file.size > 0 && file.size <= UPLOAD_MAX_BYTES;

export const extensionOf = (type: string) => (type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg");
