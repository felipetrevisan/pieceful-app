const DEFAULT_API_URL = "http://localhost:3001";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

interface BrowserLocation {
  hostname: string;
  protocol: string;
}

export function resolveApiUrl(
  configuredUrl = process.env.NEXT_PUBLIC_API_URL,
  browserLocation: BrowserLocation | undefined = typeof window === "undefined"
    ? undefined
    : window.location,
): string {
  const value = configuredUrl?.trim() || DEFAULT_API_URL;
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("O endereço da API de fotos é inválido.");
  }

  if (
    browserLocation &&
    LOCAL_HOSTS.has(url.hostname) &&
    !LOCAL_HOSTS.has(browserLocation.hostname)
  ) {
    url.hostname = browserLocation.hostname;
  }

  if (browserLocation?.protocol === "https:" && url.protocol === "http:") {
    throw new Error("A API de fotos também precisa usar HTTPS neste endereço.");
  }

  return url.origin;
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${resolveApiUrl()}${path}`, init);
  } catch (error) {
    if (error instanceof Error && !/fetch/i.test(error.message)) throw error;
    throw new Error(
      "Não foi possível conectar à API de fotos. Confirme que ela está em execução e acessível neste dispositivo.",
    );
  }
}

export interface PhotoCredit {
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

export interface UnsplashPhoto extends PhotoCredit {
  id: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
}

interface SearchResponse {
  ok: boolean;
  message?: string;
  photos?: UnsplashPhoto[];
}

export async function searchUnsplashPhotos(query: string): Promise<UnsplashPhoto[]> {
  const response = await apiFetch(`/api/photos/search?query=${encodeURIComponent(query)}`);
  const result = (await response.json()) as SearchResponse;
  if (!response.ok || !result.ok)
    throw new Error(result.message ?? "Não foi possível buscar fotos.");
  return result.photos ?? [];
}

export async function selectUnsplashPhoto(photo: UnsplashPhoto): Promise<File> {
  const tracking = await apiFetch(`/api/photos/${encodeURIComponent(photo.id)}/download`, {
    method: "POST",
  });
  if (!tracking.ok) throw new Error("Não foi possível registrar a escolha da foto.");
  const response = await fetch(photo.imageUrl);
  if (!response.ok) throw new Error("Não foi possível carregar a foto escolhida.");
  const blob = await response.blob();
  return new File([blob], `unsplash-${photo.id}.jpg`, { type: blob.type || "image/jpeg" });
}
