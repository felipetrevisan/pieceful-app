import AsyncStorage from "@react-native-async-storage/async-storage";
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
    sort_order: number;
    is_published: boolean;
  }[];
}

export async function listFreeChildImagePacks(): Promise<ImagePack[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("image_packs")
    .select("id, slug, title_pt, title_en, description_pt, description_en, cover_url, total_bytes, sort_order, pack_images(id, title_pt, title_en, image_url, thumbnail_url, width, height, bytes, sort_order, is_published)")
    .in("audience", ["child", "all"])
    .eq("is_free", true)
    .eq("is_published", true)
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as PackRow[]).map(mapPackRow);
}

export async function getInstalledImagePacks(): Promise<ImagePack[]> {
  const value = await AsyncStorage.getItem(INSTALLED_PACKS_KEY);
  if (!value) return [];
  try {
    const packs = JSON.parse(value) as ImagePack[];
    return packs.filter((pack) => pack.pictures.some((picture) => picture.localUri && new File(picture.localUri).exists));
  } catch {
    return [];
  }
}

export async function downloadImagePack(pack: ImagePack, onProgress: (progress: number) => void): Promise<ImagePack> {
  const directory = new Directory(Paths.document, "pieceful-image-packs", pack.slug);
  directory.create({ idempotent: true, intermediates: true });
  const downloadedPictures: ImagePackPicture[] = [];
  const total = Math.max(1, pack.pictures.length);

  for (let index = 0; index < pack.pictures.length; index += 1) {
    const picture = pack.pictures[index];
    const extension = fileExtension(picture.imageUrl);
    const destination = new File(directory, `${picture.id}.${extension}`);
    const file = await File.downloadFileAsync(picture.imageUrl, destination, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const fileProgress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
        onProgress(Math.min(99, ((index + fileProgress) / total) * 100));
      },
    });
    downloadedPictures.push({ ...picture, localUri: file.uri });
    onProgress(((index + 1) / total) * 100);
  }

  const installedPack = { ...pack, pictures: downloadedPictures };
  const installed = await getInstalledImagePacks();
  await AsyncStorage.setItem(
    INSTALLED_PACKS_KEY,
    JSON.stringify([...installed.filter((item) => item.id !== pack.id), installedPack]),
  );
  return installedPack;
}

export async function removeImagePack(pack: ImagePack): Promise<void> {
  const directory = new Directory(Paths.document, "pieceful-image-packs", pack.slug);
  if (directory.exists) directory.delete();
  const installed = await getInstalledImagePacks();
  await AsyncStorage.setItem(INSTALLED_PACKS_KEY, JSON.stringify(installed.filter((item) => item.id !== pack.id)));
}

function mapPackRow(row: PackRow): ImagePack {
  return {
    id: row.id,
    slug: row.slug,
    titlePt: row.title_pt,
    titleEn: row.title_en,
    descriptionPt: row.description_pt,
    descriptionEn: row.description_en,
    coverUrl: row.cover_url,
    totalBytes: Number(row.total_bytes),
    pictures: row.pack_images
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
      })),
  };
}

function fileExtension(url: string) {
  const clean = url.split("?")[0];
  const extension = clean.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
}

export function formatPackSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
