const rawBase = import.meta.env.BASE_URL || "/";

export const APP_BASE_PATH =
  rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

export function withBasePath(url: string): string {
  if (
    !url ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  if (
    !APP_BASE_PATH ||
    normalizedUrl === APP_BASE_PATH ||
    normalizedUrl.startsWith(`${APP_BASE_PATH}/`)
  ) {
    return normalizedUrl;
  }

  return `${APP_BASE_PATH}${normalizedUrl}`;
}

export function apiUrl(path: string): string {
  return withBasePath(path);
}

export function storageUrl(path: string): string {
  return withBasePath(path);
}
