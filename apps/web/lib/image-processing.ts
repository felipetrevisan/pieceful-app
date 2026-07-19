const MAX_BYTES = 20 * 1024 * 1024;
const signatures = [
  [0xff, 0xd8, 0xff],
  [0x89, 0x50, 0x4e, 0x47],
  [0x52, 0x49, 0x46, 0x46],
] as const;

export async function retainImageFile(file: File): Promise<File> {
  if (file.size > MAX_BYTES) throw new Error("A foto deve ter no máximo 20 MB.");
  try {
    const bytes = await file.arrayBuffer();
    return new File([bytes], file.name || `foto-${Date.now()}.jpg`, {
      type: file.type || "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    throw new Error(
      "Não foi possível acessar essa foto. Baixe-a para o dispositivo ou permita acesso às Fotos e tente novamente.",
    );
  }
}

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

export async function readImageDimensions(file: File) {
  await validateImage(file);
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

export async function processImage(
  file: File,
  zoom: number,
  rotation: number,
  aspectRatio = 4 / 3,
): Promise<Blob> {
  await validateImage(file);
  const bitmap = await createImageBitmap(file);
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 4 / 3;
  const width = safeAspectRatio >= 1 ? 1600 : Math.round(1600 * safeAspectRatio);
  const height = safeAspectRatio >= 1 ? Math.round(1600 / safeAspectRatio) : 1600;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu processar esta foto.");
  context.translate(width / 2, height / 2);
  context.rotate((rotation * Math.PI) / 180);
  const quarterTurn = Math.abs(Math.round(rotation / 90)) % 2 === 1;
  const rotatedWidth = quarterTurn ? bitmap.height : bitmap.width;
  const rotatedHeight = quarterTurn ? bitmap.width : bitmap.height;
  const cover = Math.max(width / rotatedWidth, height / rotatedHeight) * zoom;
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
