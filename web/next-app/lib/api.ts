function resolveApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window === "undefined") {
    return envUrl || "http://localhost:8000";
  }

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      const hostname = parsed.hostname.toLowerCase();
      const isDockerInternalHostname =
        !hostname.includes(".") && hostname !== "localhost" && hostname !== "127.0.0.1";

      if (!isDockerInternalHostname) {
        return envUrl;
      }
    } catch {
      return envUrl;
    }
  }

  const { protocol, hostname } = window.location;
  const port = process.env.NEXT_PUBLIC_API_PORT || "8000";

  return `${protocol}//${hostname}:${port}`;
}

export async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }
  return res.json();
}

