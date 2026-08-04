import sharp from "sharp";

const allowedFormats = new Set(["jpeg", "png", "webp"]);
const maximumInputBytes = 15 * 1024 * 1024;
const maximumInputPixels = 40_000_000;

export interface ProcessedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ProcessedImagePair {
  image: ProcessedImage;
  thumbnail: ProcessedImage;
}

export async function processImage(
  file: File,
  options: { minimumDimension: number; maximumDimension: number; thumbnailDimension: number },
): Promise<ProcessedImagePair> {
  if (file.size < 1 || file.size > maximumInputBytes) throw new Error("invalid_image_size");
  const input = new Uint8Array(await file.arrayBuffer());
  const source = sharp(input, {
    animated: false,
    failOn: "warning",
    limitInputPixels: maximumInputPixels,
  }).rotate();
  const metadata = await source.metadata();
  if (
    !metadata.format ||
    !allowedFormats.has(metadata.format) ||
    !metadata.width ||
    !metadata.height ||
    Math.min(metadata.width, metadata.height) < options.minimumDimension ||
    metadata.width * metadata.height > maximumInputPixels ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new Error("invalid_image_content");
  }

  const [image, thumbnail] = await Promise.all([
    source
      .clone()
      .resize({
        width: options.maximumDimension,
        height: options.maximumDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    source
      .clone()
      .resize({
        width: options.thumbnailDimension,
        height: options.thumbnailDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
  ]);
  return {
    image: { bytes: image.data, width: image.info.width, height: image.info.height },
    thumbnail: {
      bytes: thumbnail.data,
      width: thumbnail.info.width,
      height: thumbnail.info.height,
    },
  };
}
