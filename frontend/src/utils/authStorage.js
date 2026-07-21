const AUTH_STORAGE_KEYS = ["accessToken", "refreshToken", "userData"];

function readFromStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeToStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getAuthStorage() {
  if (readFromStorage(localStorage, "accessToken")) {
    return localStorage;
  }

  if (readFromStorage(sessionStorage, "accessToken")) {
    return sessionStorage;
  }

  if (readFromStorage(localStorage, "refreshToken") || readFromStorage(localStorage, "userData")) {
    return localStorage;
  }

  if (readFromStorage(sessionStorage, "refreshToken") || readFromStorage(sessionStorage, "userData")) {
    return sessionStorage;
  }

  return null;
}

export function getAccessToken() {
  return readFromStorage(localStorage, "accessToken") || readFromStorage(sessionStorage, "accessToken");
}

export function setAccessToken(accessToken) {
  const activeStorage = getAuthStorage() || localStorage;
  writeToStorage(activeStorage, "accessToken", accessToken);
}

export function getRefreshToken() {
  return readFromStorage(localStorage, "refreshToken") || readFromStorage(sessionStorage, "refreshToken");
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
  const preferredStorage = rememberMe ? localStorage : sessionStorage;
  const fallbackStorage = rememberMe ? sessionStorage : localStorage;

  clearAuthStorage();

  const serializedUserData = JSON.stringify(userData);
  const wroteToPreferred =
    writeToStorage(preferredStorage, "accessToken", accessToken) &&
    writeToStorage(preferredStorage, "refreshToken", refreshToken) &&
    writeToStorage(preferredStorage, "userData", serializedUserData);

  if (!wroteToPreferred) {
    writeToStorage(fallbackStorage, "accessToken", accessToken);
    writeToStorage(fallbackStorage, "refreshToken", refreshToken);
    writeToStorage(fallbackStorage, "userData", serializedUserData);
  }
}
