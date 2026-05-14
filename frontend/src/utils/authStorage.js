const AUTH_STORAGE_KEYS = ["accessToken", "refreshToken", "userData"];

function readFromStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function getAuthStorage() {
  if (readFromStorage(localStorage, "accessToken")) {
    return localStorage;
  }

  if (readFromStorage(sessionStorage, "accessToken")) {
    return sessionStorage;
  }

  return null;
}

export function getAccessToken() {
  return readFromStorage(localStorage, "accessToken") || readFromStorage(sessionStorage, "accessToken");
}

export function getStoredUserData() {
  return readFromStorage(localStorage, "userData") || readFromStorage(sessionStorage, "userData");
}

export function clearAuthStorage(storage = null) {
  const storages = storage ? [storage] : [localStorage, sessionStorage];

  storages.forEach((targetStorage) => {
    AUTH_STORAGE_KEYS.forEach((key) => {
      try {
        targetStorage.removeItem(key);
      } catch {
        // Ignore storage errors (private mode, disabled storage, etc.)
      }
    });
  });
}

export function saveAuthSession({ accessToken, refreshToken, userData, rememberMe = true }) {
  const primaryStorage = rememberMe ? localStorage : sessionStorage;
  const secondaryStorage = rememberMe ? sessionStorage : localStorage;

  clearAuthStorage(secondaryStorage);

  primaryStorage.setItem("accessToken", accessToken);
  primaryStorage.setItem("refreshToken", refreshToken);
  primaryStorage.setItem("userData", JSON.stringify(userData));
}
