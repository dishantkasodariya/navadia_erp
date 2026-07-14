const getApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    envUrl = envUrl.trim();
    if (!envUrl.startsWith("http://") && !envUrl.startsWith("https://")) {
      envUrl = `https://${envUrl}`;
    }
    if (!envUrl.includes("localhost")) {
      return envUrl;
    }
  }

  const hostname = window.location.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return "https://smileflow-backend.onrender.com";
  }

  return envUrl || "http://localhost:5000";
};

export const API_BASE_URL = getApiBaseUrl();

// Helper to build API endpoints
export const api = (path: string) => `${API_BASE_URL}${path}`;
