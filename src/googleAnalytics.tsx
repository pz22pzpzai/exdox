import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const googleAnalyticsMeasurementId = "G-D9RPNFH0M2";
export const cookieConsentStorageKey = "exdox-cookie-consent-v1";

export type CookieConsentChoice = "essential_only" | "all_cookies";

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

let googleAnalyticsConfigured = false;
let lastTrackedPage: string | null = null;

const privateWorkspacePrefixes = [
  "/overview",
  "/costs",
  "/sales",
  "/customer-rules",
  "/vault",
  "/claims",
  "/rules",
  "/company-cards",
  "/recycle-bin",
  "/reconciliation",
  "/settings",
  "/requisitions",
  "/billing",
  "/dropbox",
  "/employee",
  "/bank-callback",
];

function hasAnalyticsConsent() {
  return window.localStorage.getItem(cookieConsentStorageKey) === "all_cookies";
}

function isPrivateWorkspacePage(pathname: string) {
  return privateWorkspacePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function ensureGoogleTagQueue() {
  window.dataLayer = window.dataLayer || [];
  // Match Google's gtag bootstrap: its command queue contains Arguments
  // objects, not arrays constructed by a rest-parameter wrapper.
  window.gtag = window.gtag || function () {
    window.dataLayer?.push(arguments);
  };
}

function configureGoogleAnalytics() {
  if (googleAnalyticsConfigured || !hasAnalyticsConsent()) {
    return;
  }

  ensureGoogleTagQueue();
  window.gtag?.("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag?.("js", new Date());
  window.gtag?.("config", googleAnalyticsMeasurementId, { send_page_view: false });

  if (!document.querySelector(`script[data-exdox-google-analytics="${googleAnalyticsMeasurementId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsMeasurementId}`;
    script.dataset.exdoxGoogleAnalytics = googleAnalyticsMeasurementId;
    document.head.appendChild(script);
  }

  googleAnalyticsConfigured = true;
}

function clearGoogleAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name && (name === "_ga" || name.startsWith("_ga_"))));

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
  }
}

export function setGoogleAnalyticsConsent(choice: CookieConsentChoice) {
  if (choice === "all_cookies") {
    configureGoogleAnalytics();
    lastTrackedPage = null;
    trackPage(window.location.pathname, window.location.search);
    return;
  }

  const analyticsWasLoaded = googleAnalyticsConfigured;
  if (window.gtag) {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }
  lastTrackedPage = null;
  clearGoogleAnalyticsCookies();

  // Once gtag.js has run, a reload is the only reliable way to remove its
  // automatic event listeners after consent is withdrawn.
  if (analyticsWasLoaded) {
    window.location.reload();
  }
}

function trackPage(pathname: string, search: string) {
  if (!hasAnalyticsConsent() || isPrivateWorkspacePage(pathname)) {
    return;
  }

  configureGoogleAnalytics();
  const pagePath = `${pathname}${search}`;
  if (lastTrackedPage === pagePath) {
    return;
  }

  window.gtag?.("event", "page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: pagePath,
  });
  lastTrackedPage = pagePath;
}

export function GoogleAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const pageViewTimer = window.setTimeout(() => {
      trackPage(location.pathname, location.search);
    }, 0);

    return () => window.clearTimeout(pageViewTimer);
  }, [location.pathname, location.search]);

  return null;
}
