import type { PuzzlePiece, PuzzleTimelapse, PuzzleTimelapsePiece } from "@puzzled/puzzle-engine";
import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";
import type { AppLanguage, MobilePuzzle } from "@/state/app-provider";
import PiecefulGameServices from "../../modules/my-module/src/PiecefulGameServicesModule";

function finalState(piece: PuzzlePiece): PuzzleTimelapsePiece {
  return {
    id: piece.id,
    x: piece.correctPosition.x,
    y: piece.correctPosition.y,
    rotation: piece.correctPosition.rotation,
    isPlaced: true,
    visible: true,
  };
}

function timelineFor(puzzle: MobilePuzzle): PuzzleTimelapse {
  const recorded = puzzle.session.timelapse;
  if (recorded?.frames.length) {
    const orderedFrames = [...recorded.frames].sort((left, right) => left.at - right.at);
    const activityStartedAt = orderedFrames[0]?.at ?? 0;
    return {
      initial: recorded.initial,
      frames: orderedFrames.map((frame) => ({
        ...frame,
        // Waiting before the first moved piece must not become a black video intro.
        at: Math.max(0, frame.at - activityStartedAt),
      })),
    };
  }

  // Older completed puzzles did not record movement. Rebuild them progressively,
  // so their owners can still create a complete video without assembling again.
  const initial = puzzle.session.pieces.map((piece) => ({
    ...finalState(piece),
    isPlaced: false,
    visible: false,
  }));
  const duration = Math.max(puzzle.session.elapsedTime, puzzle.session.pieces.length * 2.5, 1);
  return {
    initial,
    frames: puzzle.session.pieces.map((piece, index, pieces) => ({
      at: ((index + 1) / pieces.length) * duration,
      changes: [finalState(piece)],
    })),
  };
}

export async function createTimelapse(puzzle: MobilePuzzle, language: AppLanguage) {
  if (!PiecefulGameServices?.createTimelapse) {
    throw new Error(
      language === "en"
        ? "Video creation requires the installed Pieceful app, not Expo Go."
        : "A criação do vídeo requer o app Pieceful instalado, não o Expo Go.",
    );
  }
  const timeline = timelineFor(puzzle);
  const logoAsset = Asset.fromModule(require("../../assets/images/pieceful-logo.png"));
  await logoAsset.downloadAsync();
  const payload = JSON.stringify({
    imageUri: puzzle.imageUri,
    logoUri: logoAsset.localUri ?? logoAsset.uri,
    name: puzzle.name,
    rows: puzzle.configuration.rows,
    columns: puzzle.configuration.columns,
    elapsed: Math.max(1, timeline.frames.at(-1)?.at ?? 1),
    language,
    pieces: puzzle.session.pieces.map((piece) => ({
      id: piece.id,
      row: piece.row,
      column: piece.column,
      shape: piece.shape,
      correctPosition: piece.correctPosition,
    })),
    timelapse: timeline,
  });
  return PiecefulGameServices.createTimelapse(payload);
}

export async function shareTimelapse(uri: string, language: AppLanguage) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      language === "en"
        ? "Sharing is not available on this device."
        : "O compartilhamento não está disponível neste aparelho.",
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: "video/mp4",
    dialogTitle:
      language === "en" ? "Share Pieceful timelapse" : "Compartilhar timelapse do Pieceful",
    UTI: "public.mpeg-4",
  });
}

export async function saveTimelapse(uri: string, language: AppLanguage) {
  if (!PiecefulGameServices?.saveVideoToGallery) {
    throw new Error(
      language === "en"
        ? "Saving videos requires the latest installed Pieceful app."
        : "Para salvar vídeos, instale a versão mais recente do Pieceful.",
    );
  }
  return PiecefulGameServices.saveVideoToGallery(uri);
}
