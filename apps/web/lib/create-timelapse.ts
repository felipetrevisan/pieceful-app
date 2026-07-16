import {
  type PuzzlePiece,
  type PuzzleTimelapse,
  type PuzzleTimelapsePiece,
  tracePiecePath,
} from "@puzzled/puzzle-engine";

interface Options {
  imageUrl: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  timelapse: PuzzleTimelapse | undefined;
  elapsed: number;
  onProgress: (progress: number) => void;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem do timelapse."));
    image.src = source;
  });
}

function videoMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}

function drawFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  pieces: PuzzlePiece[],
  states: Map<string, PuzzleTimelapsePiece>,
  rows: number,
  columns: number,
  elapsed: number,
  progress: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#091125");
  gradient.addColorStop(0.52, "#171b36");
  gradient.addColorStop(1, "#25183d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#4cd7f6";
  ctx.font = "800 22px Inter, sans-serif";
  ctx.fillText("MEU QUEBRA-CABEÇA", width / 2, 66);
  ctx.fillStyle = "#f5f6ff";
  ctx.font = "700 42px Inter, sans-serif";
  ctx.fillText("Uma memória, peça por peça", width / 2, 122);
  ctx.fillStyle = "#9ea8c5";
  ctx.font = "500 19px Inter, sans-serif";
  ctx.fillText("TIMELAPSE DA MONTAGEM", width / 2, 158);

  const maxBoardWidth = 620;
  const maxBoardHeight = 760;
  const cell = Math.min(maxBoardWidth / columns, maxBoardHeight / rows);
  const boardWidth = columns * cell;
  const boardHeight = rows * cell;
  const originX = (width - boardWidth) / 2;
  const originY = 218 + (maxBoardHeight - boardHeight) / 2;

  ctx.fillStyle = "rgba(4, 10, 24, .72)";
  ctx.strokeStyle = "rgba(208, 188, 255, .18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(originX - 14, originY - 14, boardWidth + 28, boardHeight + 28, 22);
  ctx.fill();
  ctx.stroke();

  for (const piece of pieces) {
    const state = states.get(piece.id);
    if (!state?.visible) continue;
    const x = originX + state.x * cell;
    const y = originY + state.y * cell;
    ctx.save();
    ctx.translate(x + cell / 2, y + cell / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.translate(-cell / 2, -cell / 2);
    tracePiecePath(ctx, piece.shape, cell);
    ctx.save();
    ctx.clip();
    ctx.drawImage(image, -piece.column * cell, -piece.row * cell, columns * cell, rows * cell);
    ctx.restore();
    ctx.strokeStyle = state.isPlaced ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.7)";
    ctx.lineWidth = state.isPlaced ? 1 : 1.6;
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = state.isPlaced ? 2 : 10;
    tracePiecePath(ctx, piece.shape, cell);
    ctx.stroke();
    ctx.restore();
  }

  const placed = [...states.values()].filter((piece) => piece.isPlaced).length;
  const completed = Math.round((placed / pieces.length) * 100);
  const displayTime = new Date(elapsed * 1000 * progress).toISOString().slice(11, 19);
  ctx.fillStyle = "rgba(7, 13, 31, .78)";
  ctx.beginPath();
  ctx.roundRect(52, 1040, width - 104, 132, 28);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = "#f5f6ff";
  ctx.font = "750 34px Inter, sans-serif";
  ctx.fillText(`${completed}% concluído`, 82, 1093);
  ctx.fillStyle = "#9ea8c5";
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText(`${placed} de ${pieces.length} peças`, 82, 1128);
  ctx.textAlign = "right";
  ctx.fillStyle = "#4cd7f6";
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText(displayTime, width - 82, 1111);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fillRect(52, 1204, width - 104, 10);
  ctx.fillStyle = "#4cd7f6";
  ctx.fillRect(52, 1204, (width - 104) * progress, 10);
  ctx.textAlign = "center";
  ctx.fillStyle = "#d9ddf5";
  ctx.font = "600 16px Inter, sans-serif";
  ctx.fillText("Criado com Meu Quebra-Cabeça", width / 2, 1250);
}

export async function createTimelapse(options: Options): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Este navegador não consegue gerar vídeos. Tente pelo celular.");
  }
  const image = await loadImage(options.imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const stream = canvas.captureStream(30);
  const mimeType = videoMime();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Não foi possível finalizar o vídeo."));
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: mimeType.split(";")[0] ?? "video/webm" }));
  });

  const fallbackInitial = options.pieces.map((piece) => ({
    id: piece.id,
    x: piece.currentPosition.x,
    y: piece.currentPosition.y,
    rotation: piece.currentPosition.rotation,
    isPlaced: piece.isPlaced,
    visible: piece.trayId === null,
  }));
  const timeline = options.timelapse ?? { initial: fallbackInitial, frames: [] };
  const states = new Map(timeline.initial.map((piece) => [piece.id, { ...piece }]));
  const frames = timeline.frames;
  const duration = Math.min(16, Math.max(7, frames.length * 0.07));
  let appliedFrame = -1;
  recorder.start(500);

  await new Promise<void>((resolve) => {
    const startedAt = performance.now();
    const render = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / (duration * 1000));
      const framePosition = progress * frames.length;
      const targetFrame = Math.floor(framePosition) - 1;
      while (appliedFrame < targetFrame) {
        appliedFrame += 1;
        const frame = frames[appliedFrame];
        if (frame) for (const change of frame.changes) states.set(change.id, { ...change });
      }
      let renderStates = states;
      const nextFrame = frames[targetFrame + 1];
      if (nextFrame && progress < 1) {
        const transition = framePosition - Math.floor(framePosition);
        renderStates = new Map(states);
        for (const change of nextFrame.changes) {
          const before = states.get(change.id);
          renderStates.set(
            change.id,
            before
              ? {
                  ...change,
                  x: before.x + (change.x - before.x) * transition,
                  y: before.y + (change.y - before.y) * transition,
                  rotation: before.rotation + (change.rotation - before.rotation) * transition,
                  isPlaced: transition > 0.82 ? change.isPlaced : before.isPlaced,
                  visible: change.visible || before.visible,
                }
              : change,
          );
        }
      }
      if (progress === 1) {
        for (const piece of options.pieces) {
          states.set(piece.id, {
            id: piece.id,
            x: piece.currentPosition.x,
            y: piece.currentPosition.y,
            rotation: piece.currentPosition.rotation,
            isPlaced: piece.isPlaced,
            visible: piece.trayId === null,
          });
        }
      }
      drawFrame(
        canvas,
        image,
        options.pieces,
        renderStates,
        options.rows,
        options.columns,
        options.elapsed,
        progress,
      );
      options.onProgress(Math.round(progress * 100));
      if (progress < 1) requestAnimationFrame(render);
      else window.setTimeout(resolve, 650);
    };
    requestAnimationFrame(render);
  });

  recorder.stop();
  for (const track of stream.getTracks()) track.stop();
  return finished;
}
