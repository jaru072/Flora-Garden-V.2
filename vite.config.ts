import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import JSZip from 'jszip';
import fs from 'fs';

function getStorageBucketName(): string {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.storageBucket) return config.storageBucket;
    }
  } catch (e) {}
  return 'flora-gaden.firebasestorage.app';
}

async function fetchBufferWithRetry(urlStr: string, retries = 3): Promise<Buffer> {
  let lastError: any = null;
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastError = err;
    }
    // Small delay before retry
    await new Promise((r) => setTimeout(r, 400));
  }
  throw lastError || new Error('Fetch failed');
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'firebase-image-zip-proxy',
        configureServer(server) {
          // Endpoint 1: Direct ZIP download from server
          server.middlewares.use('/api/download-images-zip', async (req, res) => {
            try {
              const bucket = getStorageBucketName();
              let pageToken: string | undefined = undefined;
              const allItems: { name: string; bucket: string }[] = [];

              // 1. List ALL files in storage bucket (with pagination support)
              do {
                const listUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o` +
                  (pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '');
                
                const listResp = await fetch(listUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (!listResp.ok) break;
                const listData = (await listResp.json()) as any;
                if (listData.items && Array.isArray(listData.items)) {
                  allItems.push(...listData.items);
                }
                pageToken = listData.nextPageToken;
              } while (pageToken);

              if (allItems.length === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No images found in Firebase Storage' }));
                return;
              }

              const zip = new JSZip();

              // 2. Fetch images in parallel batches (6 at a time for high reliability and speed)
              const batchSize = 6;
              let successCount = 0;

              for (let i = 0; i < allItems.length; i += batchSize) {
                const batch = allItems.slice(i, i + batchSize);
                await Promise.all(
                  batch.map(async (item) => {
                    const name = item.name;
                    if (!name) return;
                    const encodedName = encodeURIComponent(name);
                    const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media`;
                    try {
                      const imageBuf = await fetchBufferWithRetry(mediaUrl, 3);
                      if (imageBuf && imageBuf.length > 0) {
                        zip.file(name, imageBuf);
                        successCount++;
                      }
                    } catch (e) {
                      console.error(`Error downloading ${name} from Firebase Storage:`, e);
                    }
                  })
                );
              }

              if (successCount === 0) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to download image contents from Firebase Storage' }));
                return;
              }

              const zipBuffer = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
              });

              const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Disposition', `attachment; filename="flora_garden_all_images_${timestamp}.zip"`);
              res.setHeader('Content-Length', zipBuffer.length.toString());
              res.setHeader('X-Image-Count', successCount.toString());
              res.end(zipBuffer);
            } catch (err: any) {
              console.error('API Zip error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });

          // Endpoint 2: Proxy individual image to bypass browser CORS
          server.middlewares.use('/api/proxy-image', async (req, res) => {
            try {
              const reqUrl = new URL(req.url || '', 'http://localhost:3000');
              const targetUrl = reqUrl.searchParams.get('url');
              if (!targetUrl) {
                res.statusCode = 400;
                res.end('Missing url param');
                return;
              }
              const imgBuf = await fetchBufferWithRetry(targetUrl, 2);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'image/jpeg');
              res.end(imgBuf);
            } catch (err: any) {
              res.statusCode = 500;
              res.end(err.message);
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
