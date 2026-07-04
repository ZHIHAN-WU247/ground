import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { resolve } from "node:path";

const listenPort = Number(process.env.HTTPS_PROXY_PORT ?? 3000);
const targetPort = Number(process.env.HTTPS_PROXY_TARGET_PORT ?? 3002);
const pfxFile = process.env.HTTPS_PFX_FILE?.trim();
const passphrase = process.env.HTTPS_PFX_PASSPHRASE?.trim();

if (!pfxFile) {
  throw new Error("HTTPS_PFX_FILE is required.");
}

const resolvedPfxFile = resolve(process.cwd(), pfxFile);

if (!existsSync(resolvedPfxFile)) {
  throw new Error(`HTTPS_PFX_FILE does not exist: ${resolvedPfxFile}`);
}

const proxyRequest = (req, res) => {
  const upstream = http.request(
    {
      hostname: "localhost",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`HTTPS proxy upstream error: ${error.message}`);
  });

  req.pipe(upstream);
};

const server = https.createServer(
  {
    pfx: readFileSync(resolvedPfxFile),
    ...(passphrase ? { passphrase } : {})
  },
  proxyRequest
);

server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(targetPort, "localhost", () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);

    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          upstream.write(`${name}: ${item}\r\n`);
        }
      } else if (value !== undefined) {
        upstream.write(`${name}: ${value}\r\n`);
      }
    }

    upstream.write("\r\n");
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on("error", () => socket.destroy());
});

server.listen(listenPort, () => {
  process.stdout.write(`HTTPS proxy listening on https://localhost:${listenPort} -> http://localhost:${targetPort}\n`);
});
