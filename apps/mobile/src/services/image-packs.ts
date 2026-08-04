import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { supabase } from "@/services/supabase";

const INSTALLED_PACKS_KEY = "pieceful.installed-image-packs.v1";

export interface ImagePackPicture {
  id: string;
  titlePt: string;
  titleEn: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  bytes: number;
  contentSha256: string | null;
  localUri?: string;
}

export interface ImagePack {
  id: string;
  slug: string;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  coverUrl: string;
  totalBytes: number;
  audience: "child" | "teen" | "adult" | "all";
  isFree: boolean;
  productId: string | null;
  rewardLevel: number | null;
  imageCount: number;
  pictures: ImagePackPicture[];
}

interface PackRow {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  cover_url: string;
  total_bytes: number;
  audience: "child" | "teen" | "adult" | "all";
  is_free: boolean;
  store_product_id: string | null;
  reward_level?: number | null;
  image_count?: number;
  sort_order: number;
  pack_images: {
    id: string;
    title_pt: string;
    title_en: string;
    image_url: string;
    thumbnail_url: string;
    width: number;
    height: number;
    bytes: number;
    content_sha256: string | null;
    sort_order: number;
    is_published: boolean;
  }[];
}

export async function listImagePacks(audience: "child" | "teen" | "adult"): Promise<ImagePack[]> {
  const response = await fetch(`${apiUrl()}/api/packs?audience=${encodeURIComponent(audience)}`, {
    headers: appVersionHeaders(),
  });
  if (!response.ok) throw new Error("Image pack catalog is unavailable.");
  const data = (await response.json()) as { packs?: PackRow[] };
  return (data.packs ?? []).map(mapPackRow);
}

export async function getInstalledImagePacks(): Promise<ImagePack[]> {
  const value = await AsyncStorage.getItem(INSTALLED_PACKS_KEY);
  if (!value) return [];
  try {
    const packs = JSON.parse(value) as ImagePack[];
    return packs.filter((pack) =>
      pack.pictures.some((picture) => picture.localUri && new File(picture.localUri).exists),
    );
  } catch {
    return [];
  }
}

export async function downloadImagePack(
  pack: ImagePack,
  onProgress: (progress: number) => void,
): Promise<ImagePack> {
  const authorizedPack = await authorizeImagePack(pack.id);
  const directory = new Directory(Paths.document, "pieceful-image-packs", pack.slug);
  directory.create({ idempotent: true, intermediates: true });
  const downloadedPictures: ImagePackPicture[] = [];
  const total = Math.max(1, authorizedPack.pictures.length);

  for (let index = 0; index < authorizedPack.pictures.length; index += 1) {
    const picture = authorizedPack.pictures[index];
    const extension = fileExtension(picture.imageUrl);
    const destination = new File(directory, `${picture.id}.${extension}`);
    const file = await File.downloadFileAsync(picture.imageUrl, destination, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const fileProgress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
        onProgress(Math.min(99, ((index + fileProgress) / total) * 100));
      },
    });
    if (!picture.contentSha256) {
      file.delete();
      throw new Error("Image pack integrity metadata is missing.");
    }
    const actualHash = bytesToHex(
      await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.bytes()),
    );
    if (actualHash.toLowerCase() !== picture.contentSha256.toLowerCase()) {
      file.delete();
      throw new Error("Image pack integrity verification failed.");
    }
    downloadedPictures.push({ ...picture, localUri: file.uri });
    onProgress(((index + 1) / total) * 100);
  }

  const installedPack = { ...authorizedPack, pictures: downloadedPictures };
  const installed = await getInstalledImagePacks();
  await AsyncStorage.setItem(
    INSTALLED_PACKS_KEY,
    JSON.stringify([...installed.filter((item) => item.id !== pack.id), installedPack]),
  );
  return installedPack;
}

async function authorizeImagePack(packId: string) {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  const response = await fetch(`${apiUrl()}/api/packs/${encodeURIComponent(packId)}/access`, {
    method: "POST",
    headers: { ...appVersionHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error("Image pack access was not authorized.");
  const data = (await response.json()) as { pack?: PackRow };
  if (!data.pack) throw new Error("Image pack response is invalid.");
  return mapPackRow(data.pack);
}

function apiUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  return value;
}

function appVersionHeaders() {
  return { "X-App-Version": Constants.expoConfig?.version ?? "0.0.0" };
}

export async function removeImagePack(pack: ImagePack): Promise<void> {
  const directory = new Directory(Paths.document, "pieceful-image-packs", pack.slug);
  if (directory.exists) directory.delete();
  const installed = await getInstalledImagePacks();
  await AsyncStorage.setItem(
    INSTALLED_PACKS_KEY,
    JSON.stringify(installed.filter((item) => item.id !== pack.id)),
  );
}

function mapPackRow(row: PackRow): ImagePack {
  const pictures = row.pack_images
    .filter((picture) => picture.is_published)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((picture) => ({
      id: picture.id,
      titlePt: picture.title_pt,
      titleEn: picture.title_en,
      imageUrl: picture.image_url,
      thumbnailUrl: picture.thumbnail_url,
      width: picture.width,
      height: picture.height,
      bytes: Number(picture.bytes),
      contentSha256: picture.content_sha256,
    }));
  return {
    id: row.id,
    slug: row.slug,
    titlePt: row.title_pt,
    titleEn: row.title_en,
    descriptionPt: row.description_pt,
    descriptionEn: row.description_en,
    coverUrl: row.cover_url,
    totalBytes: Number(row.total_bytes),
    audience: row.audience,
    isFree: row.is_free,
    productId: row.store_product_id,
    rewardLevel: row.reward_level ?? null,
    imageCount: Number(row.image_count ?? pictures.length),
    pictures,
  };
}

function fileExtension(url: string) {
  const clean = url.split("?")[0];
  const extension = clean.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function formatPackSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
