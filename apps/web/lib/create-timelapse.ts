import {
  type PuzzlePiece,
  type PuzzleTimelapse,
  type PuzzleTimelapsePiece,
  tracePiecePath,
} from "@puzzled/puzzle-engine";
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

interface Options {
  imageUrl: string;
  rows: number;
  columns: number;
  pieces: PuzzlePiece[];
  timelapse: PuzzleTimelapse | undefined;
  elapsed: number;
  onProgress: (progress: number) => void;
  language?: "pt-BR" | "en";
}

export const TIMELAPSE_FRAMES_PER_SECOND = 24;
export const TIMELAPSE_PLAYBACK_SPEED = 60;
const VIDEO_BITRATE = 5_000_000;

export function timelapseDuration(sourceDurationSeconds: number): number {
  return Math.max(
    1 / TIMELAPSE_FRAMES_PER_SECOND,
    sourceDurationSeconds / TIMELAPSE_PLAYBACK_SPEED,
  );
}

export function timelapseFramePlan(sourceDurationSeconds: number) {
  const requestedDuration = timelapseDuration(sourceDurationSeconds);
  const totalFrames = Math.max(2, Math.ceil(requestedDuration * TIMELAPSE_FRAMES_PER_SECOND));
  return {
    duration: totalFrames / TIMELAPSE_FRAMES_PER_SECOND,
    totalFrames,
    frameDuration: 1 / TIMELAPSE_FRAMES_PER_SECOND,
  };
}

export function completedTimelapseStates(pieces: PuzzlePiece[]): Map<string, PuzzleTimelapsePiece> {
  return new Map(
    pieces.map((piece) => [
      piece.id,
      {
        id: piece.id,
        x: piece.correctPosition.x,
        y: piece.correctPosition.y,
        rotation: piece.correctPosition.rotation,
        isPlaced: true,
        visible: true,
      },
    ]),
  );
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem do timelapse."));
    image.src = source;
  });
}

export function interpolateRotation(from: number, to: number, progress: number): number {
  const shortestTurn = ((to - from + 540) % 360) - 180;
  return from + shortestTurn * progress;
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
  displayedPlaced: number,
  language: "pt-BR" | "en",
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
  ctx.fillText("PIECEFUL", width / 2, 66);
  ctx.fillStyle = "#f5f6ff";
  ctx.font = "700 42px Inter, sans-serif";
  ctx.fillText(
    language === "en" ? "A memory, piece by piece" : "Uma memória, peça por peça",
    width / 2,
    122,
  );
  ctx.fillStyle = "#9ea8c5";
  ctx.font = "500 19px Inter, sans-serif";
  ctx.fillText(language === "en" ? "ASSEMBLY TIMELAPSE" : "TIMELAPSE DA MONTAGEM", width / 2, 158);

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

  const orderedPieces = [...pieces].sort((left, right) => {
    const leftPlaced = states.get(left.id)?.isPlaced === true ? 0 : 1;
    const rightPlaced = states.get(right.id)?.isPlaced === true ? 0 : 1;
    return leftPlaced - rightPlaced;
  });
  for (const piece of orderedPieces) {
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

  const placed = Math.min(pieces.length, Math.max(0, Math.round(displayedPlaced)));
  const completed = Math.round((displayedPlaced / pieces.length) * 100);
  const displayTime = new Date(elapsed * 1000 * progress).toISOString().slice(11, 19);
  ctx.fillStyle = "rgba(7, 13, 31, .78)";
  ctx.beginPath();
  ctx.roundRect(52, 1040, width - 104, 132, 28);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = "#f5f6ff";
  ctx.font = "750 34px Inter, sans-serif";
  ctx.fillText(`${completed}% ${language === "en" ? "completed" : "concluído"}`, 82, 1093);
  ctx.fillStyle = "#9ea8c5";
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText(
    language === "en"
      ? `${placed} of ${pieces.length} pieces`
      : `${placed} de ${pieces.length} peças`,
    82,
    1128,
  );
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
  ctx.fillText(
    language === "en" ? "Created with Pieceful" : "Criado com Pieceful",
    width / 2,
    1250,
  );
}

export async function createTimelapse(options: Options): Promise<Blob> {
  if (typeof VideoEncoder === "undefined") {
    throw new Error(
      "Este navegador não oferece a codificação de vídeo necessária. Atualize o navegador e tente novamente.",
    );
  }
  const image = await loadImage(options.imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;

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
  const finalStates = completedTimelapseStates(options.pieces);
  const frames = timeline.frames.map((frame) => ({
    ...frame,
    changes: frame.changes.map((change) => ({ ...change })),
  }));
  const recordedEndStates = new Map(states);
  for (const frame of frames) {
    for (const change of frame.changes) recordedEndStates.set(change.id, { ...change });
  }
  const missingFinalChanges = [...finalStates.values()].filter((finalState) => {
    const recorded = recordedEndStates.get(finalState.id);
    return (
      !recorded ||
      !recorded.isPlaced ||
      recorded.x !== finalState.x ||
      recorded.y !== finalState.y ||
      recorded.rotation % 360 !== finalState.rotation % 360
    );
  });
  const sourceDuration = Math.max(1, options.elapsed, frames.at(-1)?.at ?? 0);
  if (missingFinalChanges.length > 0) {
    const lastFrame = frames.at(-1);
    if (lastFrame) {
      const replacements = new Set(missingFinalChanges.map((change) => change.id));
      lastFrame.changes = [
        ...lastFrame.changes.filter((change) => !replacements.has(change.id)),
        ...missingFinalChanges,
      ];
    } else {
      frames.push({ at: sourceDuration, changes: missingFinalChanges });
    }
  }
  const plan = timelapseFramePlan(sourceDuration);
  let appliedFrame = -1;

  const format = new Mp4OutputFormat({ fastStart: "in-memory" });
  const codec = await getFirstEncodableVideoCodec(["avc"], {
    width: canvas.width,
    height: canvas.height,
    bitrate: VIDEO_BITRATE,
  });
  if (!codec) {
    throw new Error("Este navegador não consegue codificar o timelapse em MP4.");
  }
  const target = new BufferTarget();
  const output = new Output({ format, target });
  const videoSource = new CanvasSource(canvas, {
    codec,
    bitrate: VIDEO_BITRATE,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: TIMELAPSE_FRAMES_PER_SECOND });

  try {
    await output.start();
    for (let videoFrame = 0; videoFrame < plan.totalFrames; videoFrame += 1) {
      const assemblyProgress = videoFrame / (plan.totalFrames - 1);
      const sourceTime = assemblyProgress * sourceDuration;
      while (true) {
        const frame = frames[appliedFrame + 1];
        if (!frame || frame.at > sourceTime) break;
        appliedFrame += 1;
        for (const change of frame.changes) states.set(change.id, { ...change });
      }

      let renderStates = states;
      const placedBeforeTransition = [...states.values()].filter((piece) => piece.isPlaced).length;
      let displayedPlaced = placedBeforeTransition;
      const nextFrame = frames[appliedFrame + 1];
      if (nextFrame && assemblyProgress < 1) {
        const previousTime = appliedFrame >= 0 ? (frames[appliedFrame]?.at ?? 0) : 0;
        const transitionDuration = Math.max(0.001, nextFrame.at - previousTime);
        const transition = Math.min(
          1,
          Math.max(0, (sourceTime - previousTime) / transitionDuration),
        );
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
                  rotation: interpolateRotation(before.rotation, change.rotation, transition),
                  isPlaced: transition > 0.82 ? change.isPlaced : before.isPlaced,
                  visible: change.visible || before.visible,
                }
              : change,
          );
        }
        const afterTransition = new Map(states);
        for (const change of nextFrame.changes) afterTransition.set(change.id, change);
        const placedAfterTransition = [...afterTransition.values()].filter(
          (piece) => piece.isPlaced,
        ).length;
        displayedPlaced =
          placedBeforeTransition + (placedAfterTransition - placedBeforeTransition) * transition;
      }
      if (assemblyProgress === 1) {
        renderStates = finalStates;
        displayedPlaced = options.pieces.length;
      }

      drawFrame(
        canvas,
        image,
        options.pieces,
        renderStates,
        options.rows,
        options.columns,
        options.elapsed,
        assemblyProgress,
        displayedPlaced,
        options.language ?? "pt-BR",
      );
      await videoSource.add(videoFrame * plan.frameDuration, plan.frameDuration);
      options.onProgress(Math.round(((videoFrame + 1) / plan.totalFrames) * 100));

      if (videoFrame > 0 && videoFrame % 12 === 0) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  }

  if (!target.buffer) {
    throw new Error("Não foi possível finalizar o arquivo do timelapse.");
  }
  return new Blob([target.buffer], { type: format.mimeType });
}
