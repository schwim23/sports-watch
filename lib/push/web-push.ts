import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:dev@sports-watch.local";
  if (!pub || !priv) throw new Error("VAPID keys missing");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function sendPush(sub: PushSub, payload: object): Promise<"sent" | "gone" | "error"> {
  ensureConfigured();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    return "error";
  }
}
