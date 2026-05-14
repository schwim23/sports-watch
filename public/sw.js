self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* ignore */
  }
  const title = payload.title || "sports-watch";
  const opts = {
    body: payload.body || "",
    data: { url: payload.url || "/", unsubscribeUrl: payload.unsubscribeUrl || "/settings" },
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    actions: [
      { action: "open", title: "View" },
      { action: "unsubscribe", title: "Mute" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = event.action === "unsubscribe" ? data.unsubscribeUrl || "/settings" : data.url || "/";
  event.waitUntil(clients.openWindow(url));
});
