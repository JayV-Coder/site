// Service worker só do push dos alertas do Integration AI Doctor: não guarda cache nem
// intercepta navegação. O servidor manda título, corpo curto e o link do Incidente.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const url = typeof data.url === "string" ? data.url : "/";
  event.waitUntil(
    self.registration.showNotification(typeof data.title === "string" ? data.title : "Integration AI Doctor", {
      body: typeof data.body === "string" ? data.body : "",
      tag: url,
      data: { url },
    }),
  );
});

// Só abre endereço do próprio site: o link vem do servidor, mas a notificação não navega para fora.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  const url = target.origin === self.location.origin ? target.pathname + target.search : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => "focus" in client);
      return open ? open.navigate(url).then((client) => client?.focus()) : self.clients.openWindow(url);
    }),
  );
});
