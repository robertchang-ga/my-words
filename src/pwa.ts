import { useEffect, useState } from "react";

export function useOffline() {
  const [status, setStatus] = useState("Preparing offline use…");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let alive = true;
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const registrationListeners: (() => void)[] = [];
    if (!("serviceWorker" in navigator))
      setStatus("Offline saving is unavailable in this browser.");
    else if (import.meta.env.DEV)
      setStatus("Offline use is available in the production build.");
    else {
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, {
          scope: import.meta.env.BASE_URL,
        })
        .then(async (registration) => {
          if (!alive) return;
          const update = () => {
            if (alive) setWaiting(registration.waiting);
          };
          update();
          const found = () => {
            const worker = registration.installing;
            const changed = () => {
              update();
              if (worker?.state === "redundant" && alive)
                setStatus(
                  "Offline saving failed. Reopen while connected to try again.",
                );
            };
            worker?.addEventListener("statechange", changed);
            registrationListeners.push(() =>
              worker?.removeEventListener("statechange", changed),
            );
          };
          registration.addEventListener("updatefound", found);
          found();
          registrationListeners.push(() =>
            registration.removeEventListener("updatefound", found),
          );
          const ready = await navigator.serviceWorker.ready;
          const channel = new MessageChannel();
          const timeout = window.setTimeout(() => {
            channel.port1.close();
            if (alive)
              setStatus(
                "Offline readiness could not be confirmed. Reopen while connected.",
              );
          }, 8000);
          channel.port1.onmessage = (event) => {
            clearTimeout(timeout);
            channel.port1.close();
            if (alive)
              setStatus(
                event.data
                  ? "Ready for offline use"
                  : "Offline files are missing. Reconnect and apply an offered update. If this persists, back up and reinstall.",
              );
          };
          ready.active?.postMessage("CHECK_READY", [channel.port2]);
        })
        .catch(() => {
          if (alive)
            setStatus(
              "Offline saving failed. Reopen while connected to try again.",
            );
        });
    }
    return () => {
      alive = false;
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      registrationListeners.forEach((remove) => remove());
    };
  }, []);
  const applyUpdate = () => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    waiting.postMessage("APPLY_UPDATE");
  };
  return { status, online, waiting: !!waiting, applyUpdate };
}
