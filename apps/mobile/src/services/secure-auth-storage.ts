import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const chunkSize = 1800;
const manifestKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`;

// Session values (JWT + refresh token) routinely span multiple chunks, so an
// uncached getItem costs several sequential native Keychain/Keystore round
// trips. Supabase reads the session on most auth-gated calls, so cache the
// decrypted value in memory for the process lifetime and only invalidate it
// on an explicit write.
const readCache = new Map<string, string | null>();

async function secureValue(key: string) {
  const manifest = await SecureStore.getItemAsync(manifestKey(key));
  if (!manifest) return SecureStore.getItemAsync(key);
  const chunks = Number(manifest);
  if (!Number.isInteger(chunks) || chunks < 1 || chunks > 100) return null;
  const values = await Promise.all(
    Array.from({ length: chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
  );
  return values.every((value): value is string => value !== null) ? values.join("") : null;
}

async function removeSecureValue(key: string) {
  const manifest = await SecureStore.getItemAsync(manifestKey(key));
  const chunks = Number(manifest ?? 0);
  if (Number.isInteger(chunks) && chunks > 0 && chunks <= 100) {
    await Promise.all(
      Array.from({ length: chunks }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    );
  }
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    SecureStore.deleteItemAsync(manifestKey(key)),
  ]);
}

async function setSecureValue(key: string, value: string) {
  await removeSecureValue(key);
  const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, "gs")) ?? [""];
  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)),
  );
  await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
}

export const secureAuthStorage = {
  async getItem(key: string) {
    if (readCache.has(key)) return readCache.get(key) ?? null;
    const secured = await secureValue(key);
    if (secured !== null) {
      readCache.set(key, secured);
      return secured;
    }
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await setSecureValue(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    readCache.set(key, legacy);
    return legacy;
  },
  async setItem(key: string, value: string) {
    await setSecureValue(key, value);
    await AsyncStorage.removeItem(key);
    readCache.set(key, value);
  },
  async removeItem(key: string) {
    await Promise.all([removeSecureValue(key), AsyncStorage.removeItem(key)]);
    readCache.set(key, null);
  },
};
