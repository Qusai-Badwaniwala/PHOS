const RECORD_CHANNEL = "phos:record-replaced";

export function returnToOnboarding(): void {
  window.location.replace(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/dashboard/`);
}

/** Other PHOS windows must discard their cached view after record replacement. */
export function notifyRecordReplacement(): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(RECORD_CHANNEL);
    channel.postMessage("replaced");
    channel.close();
  } catch {
    /* The local operation still succeeds without cross-window notification. */
  }
}

export function watchRecordReplacement(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  try {
    const channel = new BroadcastChannel(RECORD_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data === "replaced") returnToOnboarding();
    };
    return () => channel.close();
  } catch {
    return () => undefined;
  }
}
