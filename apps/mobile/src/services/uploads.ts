import { supabase } from "@/services/supabase";

function apiUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  return value;
}

async function authorization() {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("Authentication required.");
  return `Bearer ${token}`;
}

function imageForm(uri: string, name: string) {
  const form = new FormData();
  form.append("file", { uri, name, type: "image/jpeg" } as unknown as Blob);
  return form;
}

export async function uploadAvatarImage(uri: string) {
  const response = await fetch(`${apiUrl()}/api/uploads/avatar`, {
    method: "POST",
    headers: { Authorization: await authorization() },
    body: imageForm(uri, "avatar.jpg"),
  });
  const data = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !data.url) throw new Error(data.message ?? "Avatar upload failed.");
  return data.url;
}

export async function uploadPuzzleImage(puzzleId: string, uri: string) {
  const response = await fetch(`${apiUrl()}/api/uploads/puzzles/${encodeURIComponent(puzzleId)}`, {
    method: "POST",
    headers: { Authorization: await authorization() },
    body: imageForm(uri, `${puzzleId}.jpg`),
  });
  const data = (await response.json()) as { path?: string; message?: string };
  if (!response.ok || !data.path) throw new Error(data.message ?? "Puzzle image upload failed.");
  return data.path;
}

export async function deleteRemotePuzzles(ids: string[]) {
  const response = await fetch(`${apiUrl()}/api/uploads/puzzles`, {
    method: "DELETE",
    headers: {
      Authorization: await authorization(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error("Remote puzzle deletion failed.");
}

export async function deleteRemoteAccount() {
  const response = await fetch(`${apiUrl()}/api/uploads/account`, {
    method: "DELETE",
    headers: { Authorization: await authorization() },
  });
  if (!response.ok) throw new Error("Remote account deletion failed.");
}
