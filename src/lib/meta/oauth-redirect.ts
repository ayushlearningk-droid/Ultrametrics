import { getAppOrigin } from "@/lib/app-url";
import { META_ADS_CONNECT_PATH } from "@/lib/connectors/providers";

export function metaConnectUrl(params?: Record<string, string>): string {
  const origin = getAppOrigin();
  const url = new URL(META_ADS_CONNECT_PATH, origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
