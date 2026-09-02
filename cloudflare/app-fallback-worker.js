const DEFAULT_ORIGIN_URL = "https://origin-app.inclusive-hire.org.kg";
const DEFAULT_LANDING_URL = "https://inclusive-hire.org.kg";

const tunnelErrorStatuses = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);

const targetUrl = (request, origin) => {
  const url = new URL(request.url);
  const originUrl = new URL(origin);
  url.protocol = originUrl.protocol;
  url.hostname = originUrl.hostname;
  url.port = originUrl.port;
  return url;
};

const landingRedirectUrl = (request, landing) => {
  const landingUrl = new URL(landing);
  const requestUrl = new URL(request.url);
  landingUrl.searchParams.set("app_offline", "1");
  landingUrl.searchParams.set("return_to", requestUrl.pathname + requestUrl.search + requestUrl.hash);
  return landingUrl;
};

const shouldRedirectToLanding = (request, responseStatus) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return false;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return tunnelErrorStatuses.has(responseStatus);
};

const offlineApiResponse = () => Response.json(
  { error: { message: "Приложение временно недоступно. Попробуйте позже.", status: 503 } },
  { status: 503 }
);

export default {
  async fetch(request, env) {
    const origin = env.APP_ORIGIN_URL || DEFAULT_ORIGIN_URL;
    const landing = env.PUBLIC_SITE_URL || DEFAULT_LANDING_URL;

    try {
      const originRequest = new Request(targetUrl(request, origin), request);
      const response = await fetch(originRequest);
      if (shouldRedirectToLanding(request, response.status)) {
        return Response.redirect(landingRedirectUrl(request, landing), 302);
      }
      return response;
    } catch {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return offlineApiResponse();
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return offlineApiResponse();
      }
      return Response.redirect(landingRedirectUrl(request, landing), 302);
    }
  }
};
