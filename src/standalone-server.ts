import http from "http";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import {
  GET as getPlatform,
  POST as postPlatform,
} from "./app/api/platform/route";
import { GET as getXrpl, POST as postXrpl } from "./app/api/xrpl/route";

const PORT = Number(process.env.PORT || 3070);
const PUBLIC_INDEX = path.join(process.cwd(), "public", "index.html");

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const urlStr = `http://localhost:${PORT}${req.url || "/"}`;
    const parsedUrl = new URL(urlStr);

    if (parsedUrl.pathname === "/api/platform") {
      if (req.method === "GET") {
        const nextRes = await getPlatform();
        const body = await nextRes.text();
        res.writeHead(nextRes.status, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }
      if (req.method === "POST") {
        const rawBody = await readRequestBody(req);
        const nextReq = new NextRequest(urlStr, {
          method: "POST",
          body: rawBody,
          headers: { "Content-Type": "application/json" },
        });
        const nextRes = await postPlatform(nextReq);
        const body = await nextRes.text();
        res.writeHead(nextRes.status, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }
    }

    if (parsedUrl.pathname === "/api/xrpl") {
      if (req.method === "GET") {
        const nextReq = new NextRequest(urlStr, { method: "GET" });
        const nextRes = await getXrpl(nextReq);
        const body = await nextRes.text();
        res.writeHead(nextRes.status, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }
      if (req.method === "POST") {
        const rawBody = await readRequestBody(req);
        const nextReq = new NextRequest(urlStr, {
          method: "POST",
          body: rawBody,
          headers: { "Content-Type": "application/json" },
        });
        const nextRes = await postXrpl(nextReq);
        const body = await nextRes.text();
        res.writeHead(nextRes.status, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(body);
        return;
      }
    }

    // Serve main web application UI
    const html = fs.readFileSync(PUBLIC_INDEX, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Server error",
      })
    );
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `AEROSETTLE Enterprise Server listening on http://localhost:${PORT}`
  );
});
