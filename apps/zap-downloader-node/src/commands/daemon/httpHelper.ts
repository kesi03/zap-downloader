import http from "node:http";
import https from "node:https";

export function httpGet(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    client
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, data }));
      })
      .on("error", reject);
  });
}