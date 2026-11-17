/** O arquivo vai direto do navegador para o Storage, pela URL assinada: não passa pela API nem
 * pelo servidor do site. Com XHR, para a tela mostrar o progresso. */
export function putSigned(url: string, file: File, type: string, onProgress?: (ratio: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", type);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(event.loaded / event.total); };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.send(file);
  });
}
