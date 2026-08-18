import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';

const app = express();
const PORT = 3000;

function getStorageBucketName(): string {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
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
    await new Promise((r) => setTimeout(r, 400));
  }
  throw lastError || new Error('Fetch failed');
}

function getFreeDiskSpaceMB(): number {
  try {
    if (fs.statfsSync) {
      const stats = fs.statfsSync('/');
      const freeBytes = Number(stats.bavail) * Number(stats.bsize);
      return freeBytes / (1024 * 1024);
    }
  } catch (e) {}
  return 999999;
}

// ----------------------------------------------------
// API ROUTES (MUST COME BEFORE VITE / STATIC MIDLEWARE)
// ----------------------------------------------------

// Endpoint 1: Auto-Backup Images with Smart Diff Check (Size & Modified Timestamp) & Disk Protection
app.post('/api/auto-backup-images', async (req, res) => {
  try {
    const bucket = getStorageBucketName();
    const backupDir = path.resolve(process.cwd(), 'backups', 'images');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Check disk space before proceeding
    const initialFreeMB = getFreeDiskSpaceMB();
    const MIN_FREE_DISK_MB = 500; // Minimum 500 MB threshold
    let diskWarning = false;

    if (initialFreeMB < MIN_FREE_DISK_MB) {
      res.status(400).json({
        error: `พื้นที่ดิสก์ในระบบเหลือน้อยเกินไป (${Math.round(initialFreeMB)} MB) ระบบปฏิเสธการดาวน์โหลดรูปภาพสำรองเพิ่มเติมเพื่อป้องกันระบบขัดข้อง`,
        diskWarning: true,
        freeDiskMB: Math.round(initialFreeMB)
      });
      return;
    }

    const indexFilePath = path.join(backupDir, 'index.json');
    let previousIndex: Record<string, { size: number; updated: string }> = {};
    if (fs.existsSync(indexFilePath)) {
      try {
        previousIndex = JSON.parse(fs.readFileSync(indexFilePath, 'utf-8'));
      } catch (e) {}
    }

    let pageToken: string | undefined = undefined;
    const allItems: { name: string; bucket: string; updated?: string; size?: string }[] = [];

    // 1. List ALL files in Firebase Storage
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

    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let stoppedDueToDisk = false;
    const newIndex: Record<string, { size: number; updated: string }> = {};

    // 2. Process each item with Diff Check and Disk Protection
    for (const item of allItems) {
      if (!item.name) continue;

      // Check current disk space before downloading each image
      const currentFreeMB = getFreeDiskSpaceMB();
      if (currentFreeMB < MIN_FREE_DISK_MB) {
        console.warn(`[Disk Protection] Disk space reached threshold (${currentFreeMB.toFixed(2)} MB remaining). Stopping further downloads.`);
        diskWarning = true;
        stoppedDueToDisk = true;
        break; // Stop loop immediately
      }

      const relativePath = item.name;
      const localFilePath = path.join(backupDir, relativePath);
      const fileDir = path.dirname(localFilePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Get remote metadata & download token
      const encodedName = encodeURIComponent(item.name);
      const metaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}`;
      let remoteSize = 0;
      let remoteUpdated = '';
      let downloadToken = '';

      try {
        const metaResp = await fetch(metaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (metaResp.ok) {
          const metaJson = (await metaResp.json()) as any;
          remoteSize = parseInt(metaJson.size || '0', 10);
          remoteUpdated = metaJson.updated || '';
          if (metaJson.downloadTokens) {
            downloadToken = metaJson.downloadTokens.split(',')[0];
          }
        }
      } catch (e) {}

      let needDownload = false;
      let isUpdate = false;

      if (!fs.existsSync(localFilePath)) {
        needDownload = true;
      } else {
        const localStats = fs.statSync(localFilePath);
        const prevInfo = previousIndex[relativePath];

        // Diff Check: Compare file size and updated timestamp. Force re-download if file is 0 bytes!
        if (localStats.size === 0) {
          needDownload = true;
        } else if (remoteSize > 0 && localStats.size !== remoteSize) {
          needDownload = true;
          isUpdate = true;
        } else if (remoteSize > 0 && localStats.size === remoteSize) {
          // File exists and size is equal -> Skip writing/overwriting
          needDownload = false;
        } else if (remoteUpdated && prevInfo && prevInfo.updated !== remoteUpdated) {
          needDownload = true;
          isUpdate = true;
        }
      }

      if (needDownload) {
        const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media${
          downloadToken ? '&token=' + downloadToken : ''
        }`;
        try {
          const imgBuf = await fetchBufferWithRetry(mediaUrl, 3);
          if (imgBuf && imgBuf.length > 0) {
            fs.writeFileSync(localFilePath, imgBuf);
            if (isUpdate) {
              updatedCount++;
            } else {
              addedCount++;
            }
          } else {
            console.warn(`Empty buffer received for ${item.name}`);
            if (fs.existsSync(localFilePath)) {
              try { fs.unlinkSync(localFilePath); } catch (e) {}
            }
          }
        } catch (downloadErr) {
          console.error(`Failed to download backup image ${item.name}:`, downloadErr);
          if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size === 0) {
            try { fs.unlinkSync(localFilePath); } catch (e) {}
          }
        }
      } else {
        unchangedCount++;
      }

      const finalStats = fs.existsSync(localFilePath) ? fs.statSync(localFilePath) : null;
      newIndex[relativePath] = {
        size: finalStats ? finalStats.size : remoteSize,
        updated: remoteUpdated || new Date().toISOString()
      };
    }

    // Save updated index
    fs.writeFileSync(indexFilePath, JSON.stringify(newIndex, null, 2), 'utf-8');

    res.json({
      success: true,
      diskWarning: diskWarning || stoppedDueToDisk,
      stoppedDueToDisk: stoppedDueToDisk,
      freeDiskMB: Math.round(getFreeDiskSpaceMB()),
      summary: {
        total: allItems.length,
        added: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        timestamp: new Date().toISOString()
      },
      index: newIndex
    });
  } catch (err: any) {
    console.error('Auto backup images error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 2: Auto-Restore Images from Backup Folder to Firebase Storage
app.post('/api/auto-restore-images', async (req, res) => {
  try {
    const bucket = getStorageBucketName();
    const backupDir = path.resolve(process.cwd(), 'backups', 'images');

    if (!fs.existsSync(backupDir)) {
      res.status(404).json({ error: 'ไม่พบโฟลเดอร์สำรองรูปภาพในระบบ' });
      return;
    }

    // Recursively collect all image files in backupDir
    function getFilesRecursively(dir: string, baseDir: string = dir): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        if (file === 'index.json') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath, baseDir));
        } else {
          results.push(path.relative(baseDir, fullPath));
        }
      }
      return results;
    }

    const backupFiles = getFilesRecursively(backupDir);
    let restoredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const relPath of backupFiles) {
      const fullPath = path.join(backupDir, relPath);
      const encodedName = encodeURIComponent(relPath.replace(/\\/g, '/'));
      const metaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}`;

      try {
        const fileBuf = fs.readFileSync(fullPath);
        const fileStats = fs.statSync(fullPath);

        // Check existing in Storage
        const metaResp = await fetch(metaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let needUpload = true;

        if (metaResp.ok) {
          const metaJson = (await metaResp.json()) as any;
          if (parseInt(metaJson.size || '0', 10) === fileStats.size) {
            needUpload = false;
          }
        }

        if (needUpload) {
          const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedName}`;
          const ext = path.extname(relPath).toLowerCase();
          const contentType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');

          const uploadResp = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': contentType,
              'User-Agent': 'Mozilla/5.0'
            },
            body: fileBuf
          });

          if (uploadResp.ok) {
            restoredCount++;
          } else {
            errorCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Restore image error for ${relPath}:`, err);
        errorCount++;
      }
    }

    res.json({
      success: true,
      summary: {
        total: backupFiles.length,
        restored: restoredCount,
        skipped: skippedCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('Auto restore images error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 3: Check Backup Images Status
app.get('/api/backup-images-status', (req, res) => {
  try {
    const backupDir = path.resolve(process.cwd(), 'backups', 'images');
    if (!fs.existsSync(backupDir)) {
      res.json({ exists: false, totalFiles: 0, lastBackup: null });
      return;
    }

    const indexFilePath = path.join(backupDir, 'index.json');
    let lastBackup = null;
    let totalFiles = 0;

    if (fs.existsSync(indexFilePath)) {
      try {
        const stats = fs.statSync(indexFilePath);
        lastBackup = stats.mtime;
        const indexData = JSON.parse(fs.readFileSync(indexFilePath, 'utf-8'));
        totalFiles = Object.keys(indexData).length;
      } catch (e) {}
    }

    const freeMB = Math.round(getFreeDiskSpaceMB());
    res.json({
      exists: true,
      totalFiles,
      lastBackup,
      freeDiskMB: freeMB,
      diskWarning: freeMB < 500
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 4: Get backed-up image file directly from server disk
app.get('/api/backup-image-file', (req, res) => {
  try {
    const relPath = req.query.path as string;
    if (!relPath) {
      res.status(400).send('Missing path parameter');
      return;
    }
    const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(process.cwd(), 'backups', 'images', safePath);

    if (!fs.existsSync(fullPath)) {
      res.status(404).send('Image file not found in backup');
      return;
    }

    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      res.status(404).send('Backup image file is empty (0 bytes)');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Endpoint 5: Proxy individual image to bypass CORS and auto-retrieve download token if needed
app.get('/api/proxy-image', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('Missing url param');
      return;
    }

    let fetchUrl = targetUrl;
    if (targetUrl.includes('firebasestorage.googleapis.com') && !targetUrl.includes('token=')) {
      try {
        const metaUrl = targetUrl.replace('?alt=media', '').replace('&alt=media', '');
        const metaResp = await fetch(metaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (metaResp.ok) {
          const metaJson = (await metaResp.json()) as any;
          if (metaJson.downloadTokens) {
            const token = metaJson.downloadTokens.split(',')[0];
            fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + `token=${token}`;
          }
        }
      } catch (e) {}
    }

    const imgBuf = await fetchBufferWithRetry(fetchUrl, 2);
    if (!imgBuf || imgBuf.length === 0) {
      res.status(404).send('Image data empty');
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', imgBuf.length.toString());
    res.end(imgBuf);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Endpoint 6: List all files in Firebase Storage with metadata and download URLs
app.get('/api/list-storage-files', async (req, res) => {
  try {
    const bucket = getStorageBucketName();
    let pageToken: string | undefined = undefined;
    const allItems: { name: string; size: number; updated: string; downloadUrl: string; contentType?: string }[] = [];

    do {
      const listUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o` +
        (pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '');

      const listResp = await fetch(listUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!listResp.ok) break;
      const listData = (await listResp.json()) as any;
      if (listData.items && Array.isArray(listData.items)) {
        for (const item of listData.items) {
          if (!item.name) continue;
          const encodedName = encodeURIComponent(item.name);
          const metaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}`;
          let remoteSize = 0;
          let remoteUpdated = '';
          let downloadToken = '';
          let contentType = 'image/jpeg';

          try {
            const metaResp = await fetch(metaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (metaResp.ok) {
              const metaJson = (await metaResp.json()) as any;
              remoteSize = parseInt(metaJson.size || '0', 10);
              remoteUpdated = metaJson.updated || '';
              contentType = metaJson.contentType || 'image/jpeg';
              if (metaJson.downloadTokens) {
                downloadToken = metaJson.downloadTokens.split(',')[0];
              }
            }
          } catch (e) {}

          const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media${
            downloadToken ? '&token=' + downloadToken : ''
          }`;

          allItems.push({
            name: item.name,
            size: remoteSize,
            updated: remoteUpdated,
            downloadUrl: mediaUrl,
            contentType
          });
        }
      }
      pageToken = listData.nextPageToken;
    } while (pageToken);

    res.json({
      success: true,
      bucket,
      total: allItems.length,
      items: allItems
    });
  } catch (err: any) {
    console.error('List storage files error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// VITE / STATIC FILE SERVING
// ----------------------------------------------------
async function main() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

main();
