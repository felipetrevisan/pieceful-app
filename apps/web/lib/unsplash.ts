const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  const response = await fetch(`${API_URL}/api/photos/search?query=${encodeURIComponent(query)}`);
  const result = (await response.json()) as SearchResponse;
  if (!response.ok || !result.ok)
    throw new Error(result.message ?? "Não foi possível buscar fotos.");
  return result.photos ?? [];
}

export async function selectUnsplashPhoto(photo: UnsplashPhoto): Promise<File> {
  const tracking = await fetch(`${API_URL}/api/photos/${encodeURIComponent(photo.id)}/download`, {
    method: "POST",
  });
  if (!tracking.ok) throw new Error("Não foi possível registrar a escolha da foto.");
  const response = await fetch(photo.imageUrl);
  if (!response.ok) throw new Error("Não foi possível carregar a foto escolhida.");
  const blob = await response.blob();
  return new File([blob], `unsplash-${photo.id}.jpg`, { type: blob.type || "image/jpeg" });
}
