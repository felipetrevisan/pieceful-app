const MAX_BYTES = 20 * 1024 * 1024;
const signatures = [
  [0xff, 0xd8, 0xff],
  [0x89, 0x50, 0x4e, 0x47],
  [0x52, 0x49, 0x46, 0x46],
] as const;

export async function validateImage(file: File): Promise<void> {
  if (file.size > MAX_BYTES) throw new Error("A foto deve ter no máximo 20 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validSignature = signatures.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
  const webp =
    bytes[0] === 0x52 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!validSignature || (bytes[0] === 0x52 && !webp))
    throw new Error("Use uma imagem JPG, PNG ou WEBP válida.");
}

export async function processImage(file: File, zoom: number, rotation: number): Promise<Blob> {
  await validateImage(file);
  const bitmap = await createImageBitmap(file);
  const width = 1600;
  const height = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu processar esta foto.");
  context.translate(width / 2, height / 2);
  context.rotate((rotation * Math.PI) / 180);
  const cover = Math.max(width / bitmap.width, height / bitmap.height) * zoom;
  context.drawImage(
    bitmap,
    -(bitmap.width * cover) / 2,
    -(bitmap.height * cover) / 2,
    bitmap.width * cover,
    bitmap.height * cover,
  );
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível recortar a imagem."))),
      "image/webp",
      0.9,
    ),
  );
}
