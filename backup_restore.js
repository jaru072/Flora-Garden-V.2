// ==================== BACKUP & RESTORE MODULE (backup_restore.js) ====================
import { doc, setDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  getBlob, 
  getBytes 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let tempParsedRestoreData = null;

async function replaceCollectionInFirestore(collName, newList) {
  if (!window.db || !window.isFirebaseReady) return;
  try {
    const snap = await getDocs(collection(window.db, collName));
    const newIds = new Set((newList || []).map(x => x && x.id).filter(Boolean));
    const newImageUrls = new Set((newList || []).map(x => x && (x.imageUrl || x.photoUrl)).filter(Boolean));

    for (const docSnap of snap.docs) {
      if (!newIds.has(docSnap.id)) {
        await deleteDoc(doc(window.db, collName, docSnap.id));
      }
    }
    for (const item of (newList || [])) {
      if (item && item.id) {
        await setDoc(doc(window.db, collName, item.id), item);
      }
    }
  } catch (err) {
    console.warn(`Error replacing Firestore collection ${collName}:`, err);
  }
}

window.localImageBackupDirectoryHandle = null;
window.localBackupFolderName = '';
window.localFolderFilesList = [];

// Helper to safely obtain window global functions
function getGlobalToast() {
  return typeof window.showToast === 'function' ? window.showToast : (msg) => console.log("Toast:", msg);
}

function safeJsonClone(obj) {
  try {
    if (typeof window.safeJsonStringify === 'function') {
      return JSON.parse(window.safeJsonStringify(obj || []));
    }
    return JSON.parse(JSON.stringify(obj || []));
  } catch (e) {
    console.warn("safeJsonClone fallback:", e);
    return Array.isArray(obj) ? [...obj] : { ...obj };
  }
}

function getComprehensiveDepartmentsList() {
  const seen = new Set();
  const list = [];
  const addDept = (item) => {
    if (!item) return;
    const name = (typeof item === 'object' ? (item.name || item.id || '') : String(item)).trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      list.push(name);
    }
  };
  if (Array.isArray(window.departmentsList) && window.departmentsList.length > 0) {
    window.departmentsList.forEach(addDept);
  } else if (Array.isArray(window.employeeList)) {
    window.employeeList.forEach(emp => {
      if (emp && emp.department) {
        addDept(emp.department);
      }
    });
  }
  return list;
}

function getComprehensiveLocationsList() {
  const set = new Set(window.locationsList || []);
  (window.equipmentList || []).forEach(eq => {
    if (eq && eq.location && typeof eq.location === 'string' && eq.location.trim()) {
      set.add(eq.location.trim());
    }
  });
  return Array.from(set).filter(Boolean);
}

// 1. Open Backup/Restore Modal
window.openBackupRestoreModal = function() {
  const role = window.currentRole || (typeof currentRole !== 'undefined' ? currentRole : null);
  if (role && role !== 'ADMIN') {
    getGlobalToast()("⚠️ เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์เข้าถึงส่วนนี้ (โปรดสลับสิทธิ์เป็น 'ผู้ดูแลระบบ' ในเมนูด้านบนก่อนครับ)");
    return;
  }
  try {
    const equipCount = (window.equipmentList || []).length;
    const empCount = (window.employeeList || []).length;
    const txCount = (window.transactionHistory || []).length;
    const attCount = (window.attendanceLogs || []).length;
    const metaCount = (window.categoriesList || []).length + (window.departmentsList || []).length;

    let imageCount = 0;
    (window.equipmentList || []).forEach(item => { if (item && item.imageUrl) imageCount++; });
    (window.employeeList || []).forEach(emp => { if (emp && emp.photoUrl) imageCount++; });

    const elEquip = document.getElementById('backupCountEquip');
    const elEmp = document.getElementById('backupCountEmp');
    const elTx = document.getElementById('backupCountTx');
    const elAtt = document.getElementById('backupCountAtt');
    const elMeta = document.getElementById('backupCountMeta');
    const elImg = document.getElementById('backupCountImg');

    const audCount = (window.auditLogs || []).length;
    if (elEquip) elEquip.textContent = `${equipCount} รายการ`;
    if (elEmp) elEmp.textContent = `${empCount} คน`;
    if (elTx) elTx.textContent = `${txCount} รายการ (+ audit ${audCount})`;
    if (elAtt) elAtt.textContent = `${attCount} รายการ`;
    if (elMeta) elMeta.textContent = `${metaCount} หมวด/แผนก`;
    if (elImg) elImg.textContent = `${imageCount} รูปภาพ`;

    tempParsedRestoreData = null;
    if (typeof window.updateBackupProgress === 'function') {
      window.updateBackupProgress(0, '', '', false);
    }
    const restoreInput = document.getElementById('restoreFileInput');
    if (restoreInput) restoreInput.value = '';

    const previewCard = document.getElementById('restorePreviewCard');
    if (previewCard) previewCard.classList.add('d-none');

    const btnRestore = document.getElementById('btnExecuteRestore');
    if (btnRestore) btnRestore.classList.add('d-none');

    const modalElem = document.getElementById('backupRestoreModal');
    if (modalElem) {
      const modalInst = bootstrap.Modal.getOrCreateInstance(modalElem);
      modalInst.show();
    } else {
      alert("ไม่พบส่วนประกอบ Modal สำรองข้อมูล");
    }
  } catch (err) {
    console.error("Error opening Backup Restore modal:", err);
    alert("เกิดข้อผิดพลาดในการเปิดหน้าต่างสำรอง/กู้คืนข้อมูล: " + err.message);
  }
};

// 2. Progress Bar Updater
window.updateBackupProgress = function(percent, statusText, detailsText = '', isVisible = true, colorClass = 'bg-primary') {
  const container = document.getElementById('backupProgressContainer');
  const bar = document.getElementById('backupProgressBar');
  const percentElem = document.getElementById('backupProgressPercent');
  const titleElem = document.getElementById('backupProgressTitle');
  const textElem = document.getElementById('backupProgressText');
  const spinnerElem = document.getElementById('backupProgressSpinner');

  if (!container) return;

  if (!isVisible) {
    container.classList.add('d-none');
    return;
  }

  container.classList.remove('d-none');
  const cleanPercent = Math.min(100, Math.max(0, Math.round(percent)));
  
  if (bar) {
    bar.style.width = `${cleanPercent}%`;
    bar.textContent = `${cleanPercent}%`;
    bar.className = `progress-bar progress-bar-striped progress-bar-animated ${colorClass} fw-bold fs-8`;
  }
  if (percentElem) {
    percentElem.textContent = `${cleanPercent}%`;
    percentElem.className = `badge rounded-pill px-3 py-1 fs-7 fw-bold ${colorClass}`;
  }
  if (titleElem && statusText) titleElem.textContent = statusText;
  if (textElem) textElem.textContent = detailsText || statusText;

  if (spinnerElem) {
    if (cleanPercent >= 100) {
      spinnerElem.classList.add('d-none');
    } else {
      spinnerElem.classList.remove('d-none');
    }
  }
};

// 3. Delete Image from Firebase Storage Helper
window.deleteImageFromFirebaseStorage = async function(imagePathOrUrl) {
  if (!window.isFirebaseReady || !window.storage || !imagePathOrUrl) return;
  try {
    if (typeof imagePathOrUrl === 'string') {
      let storagePath = imagePathOrUrl;
      if (imagePathOrUrl.includes('/o/')) {
        storagePath = decodeURIComponent(imagePathOrUrl.split('/o/')[1].split('?')[0]);
      } else if (imagePathOrUrl.startsWith('gs://')) {
        storagePath = imagePathOrUrl.replace(/^gs:\/\/[^\/]+\//, '');
      }
      const storageRef = ref(window.storage, storagePath);
      await deleteObject(storageRef);
      console.log("Deleted old image from Firebase Storage path:", storagePath);
    }
  } catch (err) {
    console.warn("Notice: Firebase Storage image delete notice:", err.message);
  }
};

// 4. Data URL to Blob Helper
window.dataURLToBlob = function(dataurl) {
  if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) return null;
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn("Notice: dataURLToBlob conversion failed:", e);
    return null;
  }
};

// 5. Placeholder Canvas Generator
window.generateImageBlobPlaceholder = function(fallbackLabel = 'Flora Item', itemType = 'EQUIPMENT') {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, 500, 500);
      if (itemType === 'EMPLOYEE') {
        grad.addColorStop(0, '#1d3557');
        grad.addColorStop(1, '#457b9d');
      } else {
        grad.addColorStop(0, '#2d6a4f');
        grad.addColorStop(1, '#1b4332');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 500, 500);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(itemType === 'EMPLOYEE' ? "👤 Flora Staff" : "🌿 Flora Equipment", 250, 200);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = itemType === 'EMPLOYEE' ? '#a8dadc' : '#d8f3dc';
      ctx.fillText(String(fallbackLabel || 'Item').slice(0, 28), 250, 270);

      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    } catch (e) {
      resolve(null);
    }
  });
};

// 6. Fetch Image as Blob Helper
window.fetchImageAsBlobOrBase64 = async function(imageUrl, fallbackLabel = 'Flora Item', itemType = 'EQUIPMENT') {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return await window.generateImageBlobPlaceholder(fallbackLabel, itemType);
  }

  const trimmedUrl = imageUrl.trim();

  if (trimmedUrl.startsWith('data:')) {
    const directBlob = window.dataURLToBlob(trimmedUrl);
    if (directBlob && directBlob.size > 0) return directBlob;
    try {
      const res = await fetch(trimmedUrl);
      const b = await res.blob();
      if (b && b.size > 0) return b;
    } catch (e) {}
  }

  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 15000));

  const fetchWork = (async () => {
    if (window.isFirebaseReady && window.storage && 
       (trimmedUrl.includes('firebasestorage') || trimmedUrl.includes('storage.googleapis.com') || trimmedUrl.startsWith('gs://'))) {
      
      try {
        const stRef = ref(window.storage, trimmedUrl);
        const buf = await getBytes(stRef);
        if (buf && buf.byteLength > 0) return new Blob([buf], { type: 'image/jpeg' });
      } catch (e1) {}

      try {
        const stRef = ref(window.storage, trimmedUrl);
        const stBlob = await getBlob(stRef);
        if (stBlob && stBlob.size > 0) return stBlob;
      } catch (e2) {}

      let storagePath = trimmedUrl;
      if (trimmedUrl.includes('/o/')) {
        storagePath = decodeURIComponent(trimmedUrl.split('/o/')[1].split('?')[0]);
      } else if (trimmedUrl.startsWith('gs://')) {
        storagePath = trimmedUrl.replace(/^gs:\/\/[^\/]+\//, '');
      }

      try {
        const stRefPath = ref(window.storage, storagePath);
        const buf = await getBytes(stRefPath);
        if (buf && buf.byteLength > 0) return new Blob([buf], { type: 'image/jpeg' });
      } catch (e3) {}

      try {
        const stRefPath = ref(window.storage, storagePath);
        const stBlob = await getBlob(stRefPath);
        if (stBlob && stBlob.size > 0) return stBlob;
      } catch (e4) {}

      try {
        const stRefPath = ref(window.storage, storagePath);
        const freshUrl = await getDownloadURL(stRefPath);
        const res = await fetch(freshUrl);
        if (res.ok) {
          const freshBlob = await res.blob();
          if (freshBlob && freshBlob.size > 0) return freshBlob;
        }
      } catch (e5) {}
    }

    try {
      const res = await fetch(trimmedUrl, { mode: 'cors' });
      if (res.ok) {
        const b = await res.blob();
        if (b && b.size > 0) return b;
      }
    } catch (e) {}

    try {
      const res2 = await fetch(trimmedUrl);
      if (res2.ok) {
        const b2 = await res2.blob();
        if (b2 && b2.size > 0) return b2;
      }
    } catch (e) {}

    const corsProxies = [
      (u) => `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    ];

    for (const proxyFn of corsProxies) {
      try {
        const proxyUrl = proxyFn(trimmedUrl);
        const resP = await fetch(proxyUrl);
        if (resP.ok) {
          const bP = await resP.blob();
          if (bP && bP.size > 0) return bP;
        }
      } catch (eProxy) {}
    }

    try {
      const canvasBlob = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 500;
            canvas.height = img.naturalHeight || img.height || 500;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = trimmedUrl;
      });

      if (canvasBlob && canvasBlob.size > 0) return canvasBlob;
    } catch (e2) {}

    return await window.generateImageBlobPlaceholder(fallbackLabel, itemType);
  })();

  const result = await Promise.race([fetchWork, timeoutPromise]);
  if (result && result.size > 0) return result;
  return await window.generateImageBlobPlaceholder(fallbackLabel, itemType);
};

// 7. Blob to Base64 Helper
window.blobToBase64 = function(blob) {
  return new Promise((resolve) => {
    if (!blob) return resolve(null);
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

// 8. Export Backup to Selected Folder
window.exportBackupToSelectedFolder = async function() {
  if (!('showDirectoryPicker' in window)) {
    alert("⚠️ เบราว์เซอร์หรือสภาพแวดล้อมปัจจุบันไม่รองรับการเลือกโฟลเดอร์โดยตรง (Directory Picker API)\n\nระบบจะสลับไปดาวน์โหลดเป็นแพ็กเกจ ZIP ครบชุด (.zip) ซึ่งมีโฟลเดอร์ images/ และไฟล์ flora_garden_backup_data.json แทนให้อัตโนมัติ");
    await window.downloadBackupAsZipPackage();
    return;
  }

  let dirHandle = null;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.warn("Folder picker blocked or error, fallback to zip:", err);
    alert("⚠️ ไม่สามารถเปิดระบบเลือกโฟลเดอร์ในสภาพแวดล้อมปัจจุบันได้\n\nระบบจะสลับไปดาวน์โหลดเป็นแพ็กเกจ ZIP สำรองข้อมูลครบชุด ให้ทันทีครับ");
    await window.downloadBackupAsZipPackage();
    return;
  }

  try {
    getGlobalToast()("⏳ กำลังสำรองข้อมูลและดาวน์โหลดรูปภาพจริงลงโฟลเดอร์...");

    const imgDirHandle = await dirHandle.getDirectoryHandle('images', { create: true });
    const imagesBase64Map = {};
    let savedImagesCount = 0;

    const clonedEquipment = safeJsonClone(window.equipmentList);
    const clonedEmployees = safeJsonClone(window.employeeList);

    for (let i = 0; i < (window.equipmentList || []).length; i++) {
      const eq = window.equipmentList[i];
      const imgSource = eq ? (eq.imageUrl || eq.imageBase64 || eq.photoUrl || eq.photoBase64) : null;
      if (imgSource) {
        const safeCode = (eq.code || eq.id || `item_${i+1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeId = String(eq.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');

        try {
          const blob = await window.fetchImageAsBlobOrBase64(imgSource, eq.name || 'Equipment');
          if (blob && blob.size > 0) {
            const ext = blob.type.includes('png') ? '.png' : (blob.type.includes('webp') ? '.webp' : '.jpg');
            const filename = `equipment_${safeCode}${ext}`;
            const fileHandle = await imgDirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            const b64 = await window.blobToBase64(blob);
            if (b64) {
              imagesBase64Map[filename] = b64;
              imagesBase64Map[`equipment_${safeCode}.jpg`] = b64;
              if (safeId) imagesBase64Map[`equipment_${safeId}.jpg`] = b64;
              if (eq.code) imagesBase64Map[`equipment_${eq.code.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`] = b64;
              imagesBase64Map[safeCode] = b64;
              clonedEquipment[i].imageBase64 = b64;
              clonedEquipment[i].imageUrl = b64;
            }
            savedImagesCount++;
          }
        } catch (e) {
          console.warn(`Save image failed for ${eq.name}:`, e);
        }
      }
    }

    for (let i = 0; i < (window.employeeList || []).length; i++) {
      const emp = window.employeeList[i];
      const photoSource = emp ? (emp.photoUrl || emp.photoBase64 || emp.imageUrl || emp.imageBase64) : null;
      if (photoSource) {
        const safeCode = (emp.code || emp.id || `emp_${i+1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeId = String(emp.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');

        try {
          const blob = await window.fetchImageAsBlobOrBase64(photoSource, emp.name || 'Employee');
          if (blob && blob.size > 0) {
            const ext = blob.type.includes('png') ? '.png' : (blob.type.includes('webp') ? '.webp' : '.jpg');
            const filename = `employee_${safeCode}${ext}`;
            const fileHandle = await imgDirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            const b64 = await window.blobToBase64(blob);
            if (b64) {
              imagesBase64Map[filename] = b64;
              imagesBase64Map[`employee_${safeCode}.jpg`] = b64;
              if (safeId) imagesBase64Map[`employee_${safeId}.jpg`] = b64;
              if (emp.code) imagesBase64Map[`employee_${emp.code.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`] = b64;
              imagesBase64Map[safeCode] = b64;
              clonedEmployees[i].photoBase64 = b64;
              clonedEmployees[i].photoUrl = b64;
            }
            savedImagesCount++;
          }
        } catch (e) {
          console.warn(`Save photo failed for ${emp.name}:`, e);
        }
      }
    }

    const now = new Date();
    const backupData = {
      version: "2.0",
      appName: "Flora Garden Stock & Employee System",
      backupTimestamp: now.toISOString(),
      backupDateThai: now.toLocaleString('th-TH'),
      equipmentList: clonedEquipment,
      employeeList: clonedEmployees,
      transactionHistory: window.transactionHistory || [],
      attendanceLogs: window.attendanceLogs || [],
      auditLogs: window.auditLogs || [],
      categoriesList: window.categoriesList || [],
      departmentsList: getComprehensiveDepartmentsList(),
      locationsList: getComprehensiveLocationsList(),
      imagesBase64Map: imagesBase64Map
    };

    const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const jsonFileHandle = await dirHandle.getFileHandle('flora_garden_backup_data.json', { create: true });
    const jsonWritable = await jsonFileHandle.createWritable();
    await jsonWritable.write(jsonBlob);
    await jsonWritable.close();

    getGlobalToast()(`🎉 บันทึกไฟล์ flora_garden_backup_data.json และรูปภาพ ${savedImagesCount} รูป ลงโฟลเดอร์ "${dirHandle.name}" เรียบร้อยแล้ว!`);
    alert(`🎉 สำเร็จ! ระบบได้บันทึกไฟล์ข้อมูล flora_garden_backup_data.json และสร้างโฟลเดอร์ images/ พร้อมรูปภาพจริงจำนวน ${savedImagesCount} รูป ในโฟลเดอร์ "${dirHandle.name}" เรียบร้อยแล้ว`);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.warn("Folder picker write notice, fallback to zip:", err);
    getGlobalToast()("สลับไปใช้ดาวน์โหลดแพ็กเกจ ZIP ครบชุดแทน");
    await window.downloadBackupAsZipPackage();
  }
};

// 9. Download ZIP Package
window.getThaiDateTimeFilenameString = function(date = new Date()) {
  try {
    const options = { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-GB", options);
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
    const adYear = parseInt(parts.year, 10);
    const beYear = adYear + 543;
    const day = parts.day;
    const month = parts.month;
    let hour = parts.hour ? parts.hour.padStart(2, "0") : "00";
    if (hour === "24") hour = "00";
    const minute = parts.minute ? parts.minute.padStart(2, "0") : "00";
    const second = parts.second ? parts.second.padStart(2, "0") : "00";
    return `${day}-${month}-${beYear}_${hour}-${minute}-${second}`;
  } catch (e) {
    const now = new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const beYear = now.getFullYear() + 543;
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${beYear}_${hour}-${minute}-${second}`;
  }
};

window.downloadBackupAsZipPackage = async function() {
  if (typeof window.JSZip !== 'function' && typeof JSZip !== 'function') {
    alert("กำลังโหลดไลบรารี Zip กรุณาลองใหม่อีกครั้งใน 2 วินาที");
    return;
  }
  const zipLib = window.JSZip || JSZip;

  window.updateBackupProgress(10, "กำลังเริ่มสำรองข้อมูล ZIP...", "รวบรวมข้อมูลโครงสร้างระบบ (ไม่รวมรูปภาพ)", true, "bg-success");
  getGlobalToast()("⏳ กำลังเตรียมสร้างไฟล์ ZIP สำรองข้อมูล...");

  const now = new Date();
  const timestampStr = window.getThaiDateTimeFilenameString(now);

  const clonedEquipment = safeJsonClone(window.equipmentList);
  const clonedEmployees = safeJsonClone(window.employeeList);

  clonedEquipment.forEach(eq => {
    delete eq.imageBase64;
    delete eq.photoBase64;
  });
  clonedEmployees.forEach(emp => {
    delete emp.imageBase64;
    delete emp.photoBase64;
  });

  const backupData = {
    version: "2.0",
    appName: "Flora Garden Stock & Employee System",
    backupTimestamp: now.toISOString(),
    backupDateThai: now.toLocaleString('th-TH'),
    equipmentList: clonedEquipment,
    employeeList: clonedEmployees,
    transactionHistory: window.transactionHistory || [],
    attendanceLogs: window.attendanceLogs || [],
    auditLogs: window.auditLogs || [],
    categoriesList: window.categoriesList || [],
    departmentsList: getComprehensiveDepartmentsList(),
    locationsList: getComprehensiveLocationsList(),
    imagesBase64Map: {}
  };

  window.updateBackupProgress(50, "กำลังสร้างไฟล์ ZIP สำรองข้อมูล...", "รวมข้อมูลอุปกรณ์ บุคลากร ประวัติ หมวดหมู่ แผนก", true, "bg-success");

  const dataZip = new zipLib();
  dataZip.file("flora_garden_backup_data.json", JSON.stringify(backupData, null, 2));

  window.updateBackupProgress(85, "กำลังส่งออกไฟล์ .zip...", "เริ่มการดาวน์โหลด", true, "bg-success");

  const dataZipBlob = await dataZip.generateAsync({ type: "blob" });
  const dataUrl = URL.createObjectURL(dataZipBlob);

  const dataLink = document.createElement('a');
  dataLink.href = dataUrl;
  dataLink.download = `flora_garden_backup_data_${timestampStr}.zip`;
  document.body.appendChild(dataLink);
  dataLink.click();
  document.body.removeChild(dataLink);
  URL.revokeObjectURL(dataUrl);

  window.updateBackupProgress(100, "สำรองข้อมูล ZIP สำเร็จ 100%", "ดาวน์โหลดไฟล์ ZIP สำรองข้อมูล (เฉพาะข้อมูล) เรียบร้อยแล้ว", true, "bg-success");
  getGlobalToast()("🟢 ดาวน์โหลดไฟล์ ZIP สำรองข้อมูล (.zip) เรียบร้อยแล้ว!");
};

// 10. Download JSON Database Backup
window.downloadDatabaseBackup = async function() {
  try {
    window.updateBackupProgress(10, "กำลังเริ่มสำรองข้อมูล JSON...", "รวบรวมข้อมูลโครงสร้างระบบ (ไม่รวมรูปภาพ)", true, "bg-primary");
    const now = new Date();
    const timestampStr = window.getThaiDateTimeFilenameString(now);
    const thaiDateStr = now.toLocaleString('th-TH');

    getGlobalToast()("⏳ กำลังรวบรวมข้อมูลเข้าสู่ไฟล์ JSON...");

    const clonedEquipment = safeJsonClone(window.equipmentList);
    const clonedEmployees = safeJsonClone(window.employeeList);

    clonedEquipment.forEach(eq => {
      delete eq.imageBase64;
      delete eq.photoBase64;
    });
    clonedEmployees.forEach(emp => {
      delete emp.imageBase64;
      delete emp.photoBase64;
    });

    window.updateBackupProgress(70, "กำลังสร้างไฟล์ JSON สำรองข้อมูล...", "รวมข้อมูลอุปกรณ์ บุคลากร ประวัติ หมวดหมู่ แผนก", true, "bg-primary");

    const backupData = {
      version: "2.0",
      appName: "Flora Garden Stock & Employee System",
      backupTimestamp: now.toISOString(),
      backupDateThai: thaiDateStr,
      equipmentList: clonedEquipment,
      employeeList: clonedEmployees,
      transactionHistory: window.transactionHistory || [],
      attendanceLogs: window.attendanceLogs || [],
      auditLogs: window.auditLogs || [],
      categoriesList: window.categoriesList || [],
      departmentsList: getComprehensiveDepartmentsList(),
      locationsList: getComprehensiveLocationsList(),
      imagesBase64Map: {}
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    window.updateBackupProgress(90, "กำลังส่งออกไฟล์ .json...", "เริ่มการดาวน์โหลด", true, "bg-primary");

    const link = document.createElement('a');
    link.href = url;
    link.download = `flora_garden_backup_${timestampStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.updateBackupProgress(100, "สำรองข้อมูล JSON สำเร็จ 100%", "ดาวน์โหลดไฟล์สำรองข้อมูล JSON (เฉพาะข้อมูล) เรียบร้อยแล้ว", true, "bg-primary");
    getGlobalToast()("🟢 ดาวน์โหลดไฟล์สำรองข้อมูล (.json) เรียบร้อยแล้ว!");
  } catch (err) {
    console.error("Backup download error:", err);
    window.updateBackupProgress(0, "เกิดข้อผิดพลาดในการสำรองข้อมูล", err.message, true, "bg-danger");
    getGlobalToast()(`เกิดข้อผิดพลาดในการสร้างไฟล์สำรอง: ${err.message}`);
  }
};

// 11. Folder UI Display & Selection Helpers
window.updateFolderUIDisplay = function(folderName) {
  const subtextElem = document.getElementById('autoBackupFolderSubtext');
  const folderInput = document.getElementById('selectedFolderInput');

  if (!folderInput) return;

  const nameToUse = folderName || (window.localImageBackupDirectoryHandle ? window.localImageBackupDirectoryHandle.name : '') || window.localBackupFolderName || '';

  if (nameToUse) {
    folderInput.value = nameToUse;
    folderInput.classList.remove('text-muted', 'text-danger');
    folderInput.classList.add('text-success', 'fw-bold');
    if (subtextElem) {
      subtextElem.textContent = `โฟลเดอร์ที่จะบันทึก "${nameToUse}"`;
      subtextElem.className = "text-success fw-bold fs-9";
    }
  } else {
    folderInput.value = "";
    folderInput.classList.remove('text-success');
    if (subtextElem) {
      subtextElem.textContent = "ต้องเลือกโฟลเดอร์ก่อน";
      subtextElem.className = "text-danger fw-bold fs-9";
    }
  }
};

window.onManualFolderInput = function(val) {
  const trimmed = val ? val.trim() : '';
  window.localBackupFolderName = trimmed;
  const subtextElem = document.getElementById('autoBackupFolderSubtext');
  if (subtextElem) {
    if (trimmed) {
      subtextElem.textContent = `ระบุตำแหน่งโฟลเดอร์ "${trimmed}" เรียบร้อยแล้ว`;
      subtextElem.className = "text-success fw-bold fs-9";
    } else {
      subtextElem.textContent = "ต้องเลือกโฟลเดอร์ก่อน";
      subtextElem.className = "text-danger fw-bold fs-9";
    }
  }
};

window.handleFallbackFolderSelected = function(e) {
  const files = e.target.files;
  let folderName = '';

  if (files && files.length > 0) {
    const firstPath = files[0].webkitRelativePath || files[0].name || '';
    folderName = firstPath.split('/')[0] || firstPath.split('\\')[0] || '';
  }

  if (!folderName && e.target && e.target.value) {
    folderName = e.target.value.replace(/^.*[\\\/]/, '');
  }

  if (!folderName) {
    folderName = 'Selected Folder';
  }

  window.localFolderFilesList = files ? Array.from(files) : [];
  window.localBackupFolderName = folderName;

  const folderInput = document.getElementById('selectedFolderInput');
  if (folderInput) {
    folderInput.value = folderName;
    folderInput.classList.remove('text-muted');
    folderInput.classList.add('text-success', 'fw-bold');
  }

  window.updateFolderUIDisplay(folderName);
  getGlobalToast()(`📁 เลือกโฟลเดอร์ "${folderName}" เรียบร้อยแล้ว!`);
};

window.refreshFolderUIDisplay = async function() {
  const name = (window.localImageBackupDirectoryHandle && window.localImageBackupDirectoryHandle.name)
    ? window.localImageBackupDirectoryHandle.name
    : (window.localBackupFolderName || '');
  window.updateFolderUIDisplay(name);
};

window.connectLocalFolderForImageBackup = async function() {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (handle) {
        window.localImageBackupDirectoryHandle = handle;
        window.localBackupFolderName = handle.name;

        const folderInput = document.getElementById('selectedFolderInput');
        if (folderInput) {
          folderInput.value = handle.name;
          folderInput.classList.remove('text-muted');
          folderInput.classList.add('text-success', 'fw-bold');
        }

        window.updateFolderUIDisplay(handle.name);
        getGlobalToast()(`📁 เชื่อมต่อโฟลเดอร์ "${handle.name}" สำหรับสำรองรูปภาพเรียบร้อยแล้ว!`);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn("showDirectoryPicker unable to open in current frame:", err);
    }
  }

  const folderInput = document.getElementById('selectedFolderInput');
  const currentVal = window.localBackupFolderName || '';

  const userTypedFolder = prompt(
    "📁 ระบุชื่อ Drive หรือ โฟลเดอร์สำหรับสำรองรูปภาพบนเครื่องของคุณ\n(เช่น D:\\ImageBackup หรือ Photos_Backup):",
    currentVal
  );

  if (userTypedFolder !== null) {
    const trimmed = userTypedFolder.trim();
    if (trimmed) {
      window.localBackupFolderName = trimmed;
      window.updateFolderUIDisplay(trimmed);
      getGlobalToast()(`📁 กำหนดตำแหน่งโฟลเดอร์สำรองข้อมูล "${trimmed}" เรียบร้อยแล้ว!`);
    } else {
      window.localBackupFolderName = '';
      window.updateFolderUIDisplay('');
    }
  } else {
    if (!window.localBackupFolderName && !window.localImageBackupDirectoryHandle) {
      window.updateFolderUIDisplay('');
    }
  }
};

// 12. Auto Image Backup
window.startAutoImageBackup = async function() {
  try {
    let handle = window.localImageBackupDirectoryHandle;
    let folderName = window.localBackupFolderName;

    if (handle) {
      try {
        let perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          perm = await handle.requestPermission({ mode: 'readwrite' });
        }
        if (perm !== 'granted') {
          handle = null;
          window.localImageBackupDirectoryHandle = null;
        }
      } catch (e) {
        handle = null;
        window.localImageBackupDirectoryHandle = null;
      }
    }

    if (!handle && !folderName) {
      alert("⚠️ ยังไม่ได้เลือกโฟลเดอร์บนเครื่อง\n\nกรุณากดปุ่ม 'เลือกโฟลเดอร์บนเครื่อง' ก่อนเริ่มการสำรองรูปภาพอัตโนมัติ");
      window.updateFolderUIDisplay('');
      if (typeof window.connectLocalFolderForImageBackup === 'function') {
        await window.connectLocalFolderForImageBackup();
      }

      handle = window.localImageBackupDirectoryHandle;
      folderName = window.localBackupFolderName;
      if (!handle && !folderName) {
        return;
      }
    }
    window.updateBackupProgress(10, "กำลังเชื่อมต่อกับ Server สำรองข้อมูล...", "เริ่มต้นการตรวจสอบและสำรองรูปภาพอัตโนมัติ...", true, "bg-purple");
    getGlobalToast()("⏳ กำลังสำรองรูปภาพอัตโนมัติ...");

    let prog = 15;
    const progInterval = setInterval(() => {
      if (prog < 80) {
        prog += 10;
        window.updateBackupProgress(prog, "กำลังเปรียบเทียบขนาดไฟล์และวันที่แก้ไข...", "ตรวจสอบไฟล์ใหม่/ไฟล์เดิม...", true, "bg-purple");
      }
    }, 500);

    let resp = null;
    try {
      resp = await fetch('/api/auto-backup-images', { method: 'POST' });
    } finally {
      clearInterval(progInterval);
    }

    if (!resp || !resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const serverSummary = data.summary || { total: 0, added: 0, updated: 0, unchanged: 0 };
    let displaySummary = { ...serverSummary };

    if (data.diskWarning || data.stoppedDueToDisk) {
      const freeMB = data.freeDiskMB !== undefined ? `${data.freeDiskMB} MB` : 'น้อยกว่า 500 MB';
      const warnMsg = `⚠️ คำเตือน: พื้นที่ดิสก์ของ Container เหลือน้อย (${freeMB})\nระบบได้ปฏิเสธ/หยุดการดาวน์โหลดสำรองรูปภาพเพิ่มเติมเพื่อป้องกันระบบขัดข้อง`;
      getGlobalToast()(warnMsg);
    }

    if (window.localImageBackupDirectoryHandle) {
      try {
        window.updateBackupProgress(85, "กำลังซิงค์ไฟล์ลงโฟลเดอร์บนเครื่องคอมพิวเตอร์ของคุณ...", "คัดลอกไฟล์ลงโฟลเดอร์ PC...", true, "bg-purple");
        const handle = window.localImageBackupDirectoryHandle;
        if (await handle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
          await handle.requestPermission({ mode: 'readwrite' });
        }

        const indexObj = data.index || {};
        const pcSummary = { total: Object.keys(indexObj).length, added: 0, updated: 0, unchanged: 0 };

        for (const relPath of Object.keys(indexObj)) {
          try {
            const itemInfo = indexObj[relPath] || {};
            const expectedSize = itemInfo.size || 0;

            const parts = relPath.split('/');
            let currentDir = handle;
            for (let i = 0; i < parts.length - 1; i++) {
              currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
            }
            const fileName = parts[parts.length - 1];

            let existingSize = -1;
            try {
              const existingHandle = await currentDir.getFileHandle(fileName, { create: false });
              const existingFile = await existingHandle.getFile();
              existingSize = existingFile.size;
            } catch (e) {}

            if (existingSize > 0 && expectedSize > 0 && existingSize === expectedSize) {
              console.log(`[PC Sync] Skip "${relPath}" - file exists with equal size (${existingSize} bytes)`);
              pcSummary.unchanged++;
              continue;
            }

            const fetchUrl = `/api/backup-image-file?path=${encodeURIComponent(relPath)}`;
            const imgResp = await fetch(fetchUrl);
            if (!imgResp.ok) {
              pcSummary.unchanged++;
              continue;
            }

            const blob = await imgResp.blob();
            if (!blob || blob.size === 0) {
              pcSummary.unchanged++;
              continue;
            }

            if (existingSize > 0 && existingSize === blob.size) {
              console.log(`[PC Sync] Skip "${relPath}" - file exists with equal blob size (${existingSize} bytes)`);
              pcSummary.unchanged++;
              continue;
            }

            const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            if (existingSize > 0) {
              pcSummary.updated++;
            } else {
              pcSummary.added++;
            }
          } catch (subErr) {
            console.warn(`Local file sync warning (${relPath}):`, subErr);
          }
        }
        displaySummary = pcSummary;
      } catch (pcSyncErr) {
        console.warn("PC Local sync warning:", pcSyncErr);
      }
    }

    window.updateBackupProgress(100, "สำรองรูปภาพอัตโนมัติสำเร็จ 100%", `ประมวลผลรูปภาพทั้งหมด ${displaySummary.total} รายการเรียบร้อยแล้ว`, true, "bg-success");
    getGlobalToast()("🎉 สำรองรูปภาพอัตโนมัติสำเร็จ!");

    const logCard = document.getElementById('autoImageSyncLogCard');
    if (logCard) {
      logCard.classList.remove('d-none');
      logCard.innerHTML = `
        <div class="alert alert-success border-0 shadow-2xs rounded-3 mb-0 p-3 bg-success bg-opacity-10 text-dark">
          <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-success border-opacity-25">
            <span class="fw-bold text-success fs-7"><i class="bi bi-check-circle-fill me-1.5"></i> ผลการสำรองรูปภาพอัตโนมัติ</span>
            <span class="badge bg-success rounded-pill px-2.5 py-1 fs-8 fw-bold">เสร็จสมบูรณ์</span>
          </div>
          <div class="row g-2 text-center my-2">
            <div class="col-3">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">รวมทั้งหมด</div>
                <div class="fw-bold text-dark fs-6">${displaySummary.total} รูป</div>
              </div>
            </div>
            <div class="col-3">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">เพิ่มไฟล์ใหม่</div>
                <div class="fw-bold text-success fs-6">+${displaySummary.added}</div>
              </div>
            </div>
            <div class="col-3">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">เขียนทับ/แก้ไข</div>
                <div class="fw-bold text-warning fs-6">✏️ ${displaySummary.updated}</div>
              </div>
            </div>
            <div class="col-3">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">ข้าม (ขนาดเท่ากัน)</div>
                <div class="fw-bold text-secondary fs-6">⚡ ${displaySummary.unchanged}</div>
              </div>
            </div>
          </div>
          <div class="fs-8 text-muted d-flex align-items-center justify-content-between mt-2 pt-1 border-top">
            <span><i class="bi bi-shield-check text-success me-1"></i> เปรียบเทียบขนาดไฟล์: มีไฟล์เดิมและขนาดเท่ากันจะ<b>ข้าม (Skip)</b> ไม่ดาวน์โหลดและไม่เขียนทับ</span>
            <span class="fw-semibold text-dark"><i class="bi bi-clock-history me-1"></i> ${new Date().toLocaleTimeString('th-TH')}</span>
          </div>
        </div>
      `;
    }

    alert(`🎉 สำเร็จ! ระบบได้ทำการสำรองรูปภาพอัตโนมัติเรียบร้อยแล้ว\n\n(เปรียบเทียบขนาดไฟล์: หากมีไฟล์อยู่แล้วและขนาดเท่ากันพอดี ระบบจะข้ามการดาวน์โหลดและไม่เขียนทับไฟล์เดิม)\n\n• จำนวนรูปภาพทั้งหมด: ${displaySummary.total} รูป\n• เพิ่มไฟล์ใหม่: ${displaySummary.added} รูป\n• เขียนทับ/แก้ไข: ${displaySummary.updated} รูป\n• ข้าม (มีไฟล์เดิมและขนาดเท่ากัน): ${displaySummary.unchanged} รูป`);
  } catch (err) {
    console.error("Auto image backup error:", err);
    window.updateBackupProgress(0, "เกิดข้อผิดพลาดในการสำรองรูปภาพ", err.message, true, "bg-danger");
    getGlobalToast()("❌ เกิดข้อผิดพลาดในการสำรองรูปภาพ: " + err.message);
  }
};

// 13. Auto Image Restore
window.startAutoImageRestore = async function() {
  try {
    window.updateBackupProgress(10, "กำลังเชื่อมต่อเพื่อสแกนไฟล์ในโฟลเดอร์สำรองรูปภาพ...", "เริ่มต้นการกู้คืนรูปภาพอัตโนมัติ...", true, "bg-warning");
    getGlobalToast()("⏳ กำลังกู้คืนรูปภาพอัตโนมัติ...");

    let prog = 15;
    const progInterval = setInterval(() => {
      if (prog < 80) {
        prog += 10;
        window.updateBackupProgress(prog, "กำลังตรวจสอบและกู้คืนรูปภาพลงใน Firebase Storage...", "ประมวลผลการกู้คืนไฟล์ภาพ...", true, "bg-warning");
      }
    }, 500);

    let resp = null;
    try {
      resp = await fetch('/api/auto-restore-images', { method: 'POST' });
    } finally {
      clearInterval(progInterval);
    }

    if (!resp || !resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const summary = data.summary || { total: 0, restored: 0, skipped: 0, errors: 0 };

    window.updateBackupProgress(100, "กู้คืนรูปภาพอัตโนมัติสำเร็จ 100%", `กู้คืนรูปภาพสำเร็จ ${summary.restored} รูปภาพ`, true, "bg-success");
    getGlobalToast()("🎉 กู้คืนรูปภาพอัตโนมัติสำเร็จ!");

    if (typeof window.loadFirebaseData === 'function') {
      window.loadFirebaseData();
    }

    const logCard = document.getElementById('autoImageSyncLogCard');
    if (logCard) {
      logCard.classList.remove('d-none');
      logCard.innerHTML = `
        <div class="alert alert-warning border-0 shadow-2xs rounded-3 mb-0 p-3 bg-warning bg-opacity-10 text-dark">
          <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-warning border-opacity-25">
            <span class="fw-bold text-dark fs-7"><i class="bi bi-arrow-counterclockwise text-warning me-1.5"></i> ผลการกู้คืนรูปภาพอัตโนมัติ</span>
            <span class="badge bg-warning text-dark rounded-pill px-2.5 py-1 fs-8 fw-bold">เสร็จสมบูรณ์</span>
          </div>
          <div class="row g-2 text-center my-2">
            <div class="col-4">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">ไฟล์ในโฟลเดอร์สำรอง</div>
                <div class="fw-bold text-dark fs-6">${summary.total} รูป</div>
              </div>
            </div>
            <div class="col-4">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">กู้คืนเข้า Server</div>
                <div class="fw-bold text-success fs-6">✅ ${summary.restored} รูป</div>
              </div>
            </div>
            <div class="col-4">
              <div class="bg-white p-2 rounded-3 border">
                <div class="text-muted fs-9 mb-0.5">สมบูรณ์อยู่แล้ว (ข้าม)</div>
                <div class="fw-bold text-secondary fs-6">⚡ ${summary.skipped} รูป</div>
              </div>
            </div>
          </div>
          <div class="fs-8 text-muted d-flex align-items-center justify-content-between mt-2 pt-1 border-top">
            <span><i class="bi bi-check-all text-success me-1"></i> รูปภาพทั้งหมดถูกฟื้นฟูกลับเข้าสู่ระบบเรียบร้อยแล้ว</span>
            <span class="fw-semibold text-dark"><i class="bi bi-clock-history me-1"></i> ${new Date().toLocaleTimeString('th-TH')}</span>
          </div>
        </div>
      `;
    }

    alert(`🎉 สำเร็จ! ระบบได้กู้คืนรูปภาพทั้งหมดจากโฟลเดอร์สำรองเรียบร้อยแล้ว\n\n• จำนวนไฟล์ในโฟลเดอร์สำรอง: ${summary.total} รูป\n• กู้คืนเข้า Server สำเร็จ: ${summary.restored} รูป\n• สมบูรณ์อยู่แล้ว (ไม่ต้องอัปโหลดซ้ำ): ${summary.skipped} รูป`);
  } catch (err) {
    console.error("Auto image restore error:", err);
    window.updateBackupProgress(0, "เกิดข้อผิดพลาดในการกู้คืนรูปภาพ", err.message, true, "bg-danger");
    getGlobalToast()("❌ เกิดข้อผิดพลาดในการกู้คืนรูปภาพ: " + err.message);
  }
};

// 14. Handle Restore File Selected
window.handleRestoreFileSelected = async function(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const fileNameElem = document.getElementById('restoreFileName');
  if (fileNameElem) fileNameElem.textContent = file.name;

  if (file.name.toLowerCase().endsWith('.zip')) {
    const zipLib = window.JSZip || JSZip;
    if (typeof zipLib !== 'function') {
      alert("ไลบรารีอ่านไฟล์ ZIP ยังไม่พร้อมใช้งาน");
      return;
    }
    try {
      getGlobalToast()("⏳ กำลังคลี่ไฟล์และอ่านแพ็กเกจสำรอง (.zip)...");
      const zip = await zipLib.loadAsync(file);

      let jsonFile = zip.file("flora_garden_backup_data.json");
      if (!jsonFile) {
        const jsonNames = Object.keys(zip.files).filter(k => k.endsWith('.json'));
        if (jsonNames.length > 0) jsonFile = zip.file(jsonNames[0]);
      }

      if (!jsonFile) {
        alert("⚠️ ไม่พบไฟล์ข้อมูลสำรอง JSON ในไฟล์ ZIP ที่เลือก");
        return;
      }

      const jsonStr = await jsonFile.async("string");
      const parsed = JSON.parse(jsonStr);

      if (!parsed.imagesBase64Map) parsed.imagesBase64Map = {};

      const allKeys = Object.keys(zip.files);
      const imageKeys = allKeys.filter(k => {
        if (zip.files[k].dir) return false;
        const kLower = k.toLowerCase();
        return kLower.endsWith('.jpg') || kLower.endsWith('.jpeg') || kLower.endsWith('.png') || kLower.endsWith('.webp') || kLower.endsWith('.gif') || kLower.endsWith('.bmp');
      });

      if (imageKeys.length > 0) {
        getGlobalToast()(`⏳ กำลังถอดรหัสรูปภาพออกจากแพ็กเกจ ZIP (${imageKeys.length} รูป)...`);
      }

      for (const imgKey of imageKeys) {
        try {
          const fileNameOnly = imgKey.split(/[/\\]/).pop();
          if (!fileNameOnly) continue;

          const imgBlob = await zip.files[imgKey].async("blob");
          const b64 = await window.blobToBase64(imgBlob);
          if (b64) {
            parsed.imagesBase64Map[fileNameOnly] = b64;
            parsed.imagesBase64Map[fileNameOnly.toLowerCase()] = b64;

            const nameNoExt = fileNameOnly.substring(0, fileNameOnly.lastIndexOf('.'));
            if (nameNoExt) {
              parsed.imagesBase64Map[nameNoExt] = b64;
              parsed.imagesBase64Map[nameNoExt.toLowerCase()] = b64;
            }
          }
        } catch (imgErr) {
          console.warn("Notice: Extract image from zip error:", imgKey, imgErr);
        }
      }

      tempParsedRestoreData = parsed;
      window.displayRestoreSummary(parsed, file.name);
    } catch (err) {
      alert("⚠️ เกิดข้อผิดพลาดในการอ่านไฟล์ ZIP: " + err.message);
    }
  } else {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || (typeof parsed !== 'object') || (!parsed.equipmentList && !parsed.employeeList && !parsed.transactionHistory)) {
          alert("⚠️ ไฟล์ที่เลือกไม่ใช่ไฟล์สำรองข้อมูลที่ถูกต้องของระบบ");
          return;
        }
        tempParsedRestoreData = parsed;
        window.displayRestoreSummary(parsed, file.name);
      } catch (err) {
        alert("⚠️ ไม่สามารถอ่านไฟล์สำรองได้ รูปแบบไฟล์ JSON ไม่ถูกต้อง: " + err.message);
      }
    };
    reader.readAsText(file);
  }
};

// 15. Init Backup Drop Zone
window.initBackupDropZone = function() {
  const dropZone = document.getElementById('backupDropZone');
  const fileInput = document.getElementById('restoreFileInput');
  if (!dropZone || !fileInput) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('bg-primary', 'bg-opacity-10', 'border-success');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('bg-primary', 'bg-opacity-10', 'border-success');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt ? dt.files : null;
    if (files && files.length > 0) {
      try {
        fileInput.files = files;
      } catch (fileErr) {}
      window.handleRestoreFileSelected({ target: { files: files } });
    }
  }, false);
};

// 16. Display Restore Summary
window.displayRestoreSummary = function(parsed, fileName) {
  const detailsBox = document.getElementById('restoreSummaryDetails');
  if (detailsBox) {
    const eqC = (parsed.equipmentList || []).length;
    const empC = (parsed.employeeList || []).length;
    const txC = (parsed.transactionHistory || []).length;
    const attC = (parsed.attendanceLogs || []).length;
    const audC = (parsed.auditLogs || []).length;
    const catC = (parsed.categoriesList || []).length;

    // Deduplicate and count unique departments accurately directly from parsed.departmentsList
    const deptSet = new Set();
    const cleanDepts = [];
    const addPreviewDept = (d) => {
      if (!d) return;
      const name = (typeof d === 'object' ? (d.name || d.id || '') : String(d)).trim();
      if (name && !deptSet.has(name.toLowerCase())) {
        deptSet.add(name.toLowerCase());
        cleanDepts.push(name);
      }
    };
    if (Array.isArray(parsed.departmentsList)) {
      parsed.departmentsList.forEach(addPreviewDept);
    } else if (Array.isArray(parsed.employeeList)) {
      parsed.employeeList.forEach(e => {
        if (e && e.department) addPreviewDept(e.department);
      });
    }
    const depC = cleanDepts.length;

    const locSet = new Set();
    const cleanLocs = [];
    const addPreviewLoc = (l) => {
      if (!l) return;
      const name = (typeof l === 'object' ? (l.name || l.id || '') : String(l)).trim();
      if (name && !locSet.has(name.toLowerCase())) {
        locSet.add(name.toLowerCase());
        cleanLocs.push(name);
      }
    };
    if (Array.isArray(parsed.locationsList)) {
      parsed.locationsList.forEach(addPreviewLoc);
    } else if (Array.isArray(parsed.equipmentList)) {
      parsed.equipmentList.forEach(eq => {
        if (eq && eq.location) addPreviewLoc(eq.location);
      });
    }
    const locC = cleanLocs.length;

    let imgC = 0;
    if (parsed.imagesBase64Map && Object.keys(parsed.imagesBase64Map).length > 0) {
      imgC = Object.keys(parsed.imagesBase64Map).length;
    } else {
      (parsed.equipmentList || []).forEach(x => { if (x && x.imageUrl) imgC++; });
      (parsed.employeeList || []).forEach(x => { if (x && x.photoUrl) imgC++; });
    }

    detailsBox.innerHTML = `
      <div class="col-6 col-md-4">• อุปกรณ์การเกษตร: <strong class="text-success">${eqC}</strong> รายการ</div>
      <div class="col-6 col-md-4">• รายชื่อบุคลากร: <strong class="text-primary">${empC}</strong> คน</div>
      <div class="col-6 col-md-4">• ประวัติเบิก/ยืม/คืน/รับเข้า: <strong class="text-warning">${txC}</strong> รายการ</div>
      <div class="col-6 col-md-4">• ประวัติเพิ่ม/แก้ไข/ลบ: <strong class="text-purple fw-bold">${audC}</strong> รายการ</div>
      <div class="col-6 col-md-4">• บันทึกเวลาเข้า-ออก: <strong class="text-info">${attC}</strong> รายการ</div>
      <div class="col-6 col-md-4">• หมวดหมู่อุปกรณ์: <strong class="text-secondary">${catC}</strong> หมวด</div>
      <div class="col-6 col-md-4">• แผนก / สวน: <strong class="text-dark">${depC}</strong> แผนก</div>
      <div class="col-6 col-md-4">• สถานที่จัดเก็บ: <strong class="text-secondary">${locC}</strong> แห่ง</div>
      <div class="col-12 text-success fw-semibold mt-1"><i class="bi bi-check-circle-fill me-1"></i> ระบบจะกู้คืนข้อมูลพร้อมตรวจสอบความถูกต้องและตัดชื่อแผนกที่ซ้ำซ้อนออกอัตโนมัติ</div>
    `;
  }

  const previewCard = document.getElementById('restorePreviewCard');
  if (previewCard) previewCard.classList.remove('d-none');

  const btnRestore = document.getElementById('btnExecuteRestore');
  if (btnRestore) btnRestore.classList.remove('d-none');
};

// 17. Execute Restore Database
window.executeRestoreDatabase = async function() {
  if (!tempParsedRestoreData) {
    alert("กรุณาเลือกไฟล์สำรองข้อมูลก่อน");
    return;
  }

  const modeElem = document.querySelector('input[name="restoreMode"]:checked');
  const mode = modeElem ? modeElem.value : 'REPLACE';

  const modeText = mode === 'REPLACE' ? 'เขียนทับข้อมูลเดิมทั้งหมด' : 'รวมข้อมูลใหม่เข้ากับข้อมูลเดิม';
  const confirmed = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: "ฟื้นฟูข้อมูลระบบ",
        message: `ยืนยันการฟื้นฟูข้อมูล (${modeText}) หรือไม่? ข้อมูลจะถูกปรับเปลี่ยนตามไฟล์สำรองทันที`,
        type: mode === 'REPLACE' ? 'warning' : 'primary',
        icon: 'bi-database-fill-up',
        confirmText: 'เริ่มฟื้นฟูข้อมูล'
      })
    : confirm(`ยืนยันการฟื้นฟูข้อมูลระบบ?\nรูปแบบ: ${modeText}`);

  if (!confirmed) return;

  try {
    window.updateBackupProgress(10, "กำลังเริ่มฟื้นฟูข้อมูล...", "อ่านและปรับแต่งโครงสร้างข้อมูลพร้อมตรวจสอบความถูกต้องของแผนก", true, "bg-warning");

    let equipmentList = window.equipmentList || [];
    let employeeList = window.employeeList || [];
    let transactionHistory = window.transactionHistory || [];
    let attendanceLogs = window.attendanceLogs || [];
    let auditLogs = window.auditLogs || [];
    let categoriesList = window.categoriesList || [];
    let departmentsList = window.departmentsList || [];
    let locationsList = window.locationsList || [];

    // Extract strictly unique departments from backup file (must equal departmentsList in .json)
    const seenRestoredDept = new Set();
    const restoredDepts = [];
    const addRestoredDept = (d) => {
      if (!d) return;
      const name = (typeof d === 'object' ? (d.name || d.id || '') : String(d)).trim();
      if (name && !seenRestoredDept.has(name.toLowerCase())) {
        seenRestoredDept.add(name.toLowerCase());
        restoredDepts.push(name);
      }
    };
    if (Array.isArray(tempParsedRestoreData.departmentsList)) {
      tempParsedRestoreData.departmentsList.forEach(addRestoredDept);
    } else if (Array.isArray(tempParsedRestoreData.employeeList)) {
      tempParsedRestoreData.employeeList.forEach(emp => {
        if (emp && emp.department) addRestoredDept(emp.department);
      });
    }

    const seenRestoredLoc = new Set();
    const restoredLocs = [];
    const addRestoredLoc = (l) => {
      if (!l) return;
      const name = (typeof l === 'object' ? (l.name || l.id || '') : String(l)).trim();
      if (name && !seenRestoredLoc.has(name.toLowerCase())) {
        seenRestoredLoc.add(name.toLowerCase());
        restoredLocs.push(name);
      }
    };
    if (Array.isArray(tempParsedRestoreData.locationsList)) {
      tempParsedRestoreData.locationsList.forEach(addRestoredLoc);
    } else if (Array.isArray(tempParsedRestoreData.equipmentList)) {
      tempParsedRestoreData.equipmentList.forEach(eq => {
        if (eq && eq.location) addRestoredLoc(eq.location);
      });
    }

    if (mode === 'REPLACE') {
      equipmentList = (tempParsedRestoreData.equipmentList || []).map(item => ({ ...item }));
      employeeList = (tempParsedRestoreData.employeeList || []).map(emp => ({ ...emp }));
      transactionHistory = tempParsedRestoreData.transactionHistory || [];
      attendanceLogs = tempParsedRestoreData.attendanceLogs || [];
      auditLogs = tempParsedRestoreData.auditLogs || [];
      if (tempParsedRestoreData.categoriesList) categoriesList = tempParsedRestoreData.categoriesList;
      departmentsList = restoredDepts;
      locationsList = restoredLocs;
    } else {
      const newEquip = tempParsedRestoreData.equipmentList || [];
      newEquip.forEach(item => {
        const idx = equipmentList.findIndex(e => e.id === item.id || e.code === item.code);
        if (idx >= 0) {
          const merged = { ...equipmentList[idx], ...item };
          if (!item.imageUrl && equipmentList[idx].imageUrl) merged.imageUrl = equipmentList[idx].imageUrl;
          equipmentList[idx] = merged;
        } else {
          equipmentList.push({ ...item });
        }
      });

      const newEmp = tempParsedRestoreData.employeeList || [];
      newEmp.forEach(emp => {
        const idx = employeeList.findIndex(e => e.id === emp.id || e.code === emp.code);
        if (idx >= 0) {
          const merged = { ...employeeList[idx], ...emp };
          if (!emp.photoUrl && employeeList[idx].photoUrl) merged.photoUrl = employeeList[idx].photoUrl;
          employeeList[idx] = merged;
        } else {
          employeeList.push({ ...emp });
        }
      });

      const newTxs = tempParsedRestoreData.transactionHistory || [];
      newTxs.forEach(tx => {
        if (!transactionHistory.some(x => x.id === tx.id)) {
          transactionHistory.push(tx);
        }
      });

      const newAtt = tempParsedRestoreData.attendanceLogs || [];
      newAtt.forEach(att => {
        if (!attendanceLogs.some(x => x.id === att.id)) {
          attendanceLogs.push(att);
        }
      });

      const newAud = tempParsedRestoreData.auditLogs || [];
      newAud.forEach(log => {
        if (!auditLogs.some(x => x.id === log.id)) {
          auditLogs.push(log);
        }
      });

      if (Array.isArray(tempParsedRestoreData.categoriesList)) {
        tempParsedRestoreData.categoriesList.forEach(c => {
          if (!categoriesList.some(x => x.name === c.name || x.id === c.id)) {
            categoriesList.push(c);
          }
        });
      }

      // Merge departments preventing duplicates
      const mergeDeptMap = new Map();
      const addMergeDept = (item) => {
        if (!item) return;
        const name = (typeof item === 'object' ? (item.name || item.id || '') : String(item)).trim();
        if (name && !mergeDeptMap.has(name.toLowerCase())) {
          mergeDeptMap.set(name.toLowerCase(), name);
        }
      };
      departmentsList.forEach(addMergeDept);
      restoredDepts.forEach(addMergeDept);
      departmentsList = Array.from(mergeDeptMap.values());

      const mergeLocMap = new Map();
      const addMergeLoc = (item) => {
        if (!item) return;
        const name = (typeof item === 'object' ? (item.name || item.id || '') : String(item)).trim();
        if (name && !mergeLocMap.has(name.toLowerCase())) {
          mergeLocMap.set(name.toLowerCase(), name);
        }
      };
      locationsList.forEach(addMergeLoc);
      restoredLocs.forEach(addMergeLoc);
      locationsList = Array.from(mergeLocMap.values());
    }

    equipmentList.forEach(item => {
      if (item && (item.minQuantity === undefined || item.minQuantity === null)) {
        item.minQuantity = 3;
      }
    });

    // Final deduplication pass for departments
    const finalDeptSet = new Set();
    const finalDepartmentsList = [];
    departmentsList.forEach(d => {
      const name = (typeof d === 'object' ? (d.name || d.id || '') : String(d)).trim();
      if (name && !finalDeptSet.has(name.toLowerCase())) {
        finalDeptSet.add(name.toLowerCase());
        finalDepartmentsList.push(name);
      }
    });
    departmentsList = finalDepartmentsList;

    window.equipmentList = equipmentList;
    window.employeeList = employeeList;
    window.transactionHistory = transactionHistory;
    window.attendanceLogs = attendanceLogs;
    window.auditLogs = auditLogs;
    window.categoriesList = categoriesList;
    window.departmentsList = departmentsList;
    window.locationsList = locationsList;

    window.updateBackupProgress(70, "กำลังบันทึกข้อมูลลงเครื่อง...", "บันทึกใน LocalStorage", true, "bg-warning");
    if (typeof window.saveToLocalStorage === 'function') {
      window.saveToLocalStorage();
    }
    try {
      localStorage.setItem('flora_departments', JSON.stringify(departmentsList));
      localStorage.setItem('flora_locations', JSON.stringify(locationsList));
    } catch(e) {}

    if (window.db && window.isFirebaseReady) {
      window.updateBackupProgress(90, "กำลังซิงค์ข้อมูลไปยัง Firebase Firestore...", "อัปเดต collections ทั้งหมดรวมถึงแผนกและสถานที่จัดเก็บ", true, "bg-warning");
      try {
        const eqDocs = (equipmentList || []).map((eq, i) => {
          const code = (eq.code || (eq.id && !eq.id.startsWith('eq-') ? eq.id : `EQ-${String(i + 1).padStart(3, '0')}`)).trim();
          return { ...eq, id: code, code: code };
        });
        const deptDocs = departmentsList.map((dName, i) => {
          const code = `DEP-${String(i + 1).padStart(3, '0')}`;
          return { id: code, code: code, name: dName };
        });
        const locDocs = locationsList.map((l, i) => {
          const lName = typeof l === 'object' ? (l.name || l.id) : String(l).trim();
          const code = `LOC-${String(i + 1).padStart(3, '0')}`;
          return { id: code, code: code, name: lName };
        });
        const catDocs = (categoriesList || []).map((c, i) => {
          const code = c.code || (c.id && c.id.startsWith('CAT-') ? c.id : `CAT-${String(i + 1).padStart(3, '0')}`);
          return { ...c, id: code, code: code };
        });

        if (mode === 'REPLACE') {
          await replaceCollectionInFirestore("equipment", eqDocs);
          await replaceCollectionInFirestore("employees", employeeList);
          await replaceCollectionInFirestore("transactions", transactionHistory);
          await replaceCollectionInFirestore("attendance", attendanceLogs);
          await replaceCollectionInFirestore("categories", catDocs);
          await replaceCollectionInFirestore("audit_logs", auditLogs);
          await replaceCollectionInFirestore("departments", deptDocs);
          await replaceCollectionInFirestore("locations", locDocs);
        } else {
          for (const eq of eqDocs) {
            if (eq && eq.id) await setDoc(doc(window.db, "equipment", eq.id), eq);
          }
          for (const emp of employeeList) {
            if (emp && emp.id) await setDoc(doc(window.db, "employees", emp.id), emp);
          }
          for (const tx of transactionHistory) {
            if (tx && tx.id) await setDoc(doc(window.db, "transactions", tx.id), tx);
          }
          for (const att of attendanceLogs) {
            if (att && att.id) await setDoc(doc(window.db, "attendance", att.id), att);
          }
          for (const cat of catDocs) {
            if (cat && cat.id) await setDoc(doc(window.db, "categories", cat.id), cat);
          }
          for (const dept of deptDocs) {
            if (dept && dept.id) await setDoc(doc(window.db, "departments", dept.id), dept);
          }
          for (const loc of locDocs) {
            if (loc && loc.id) await setDoc(doc(window.db, "locations", loc.id), loc);
          }
          for (const aud of (auditLogs || [])) {
            if (aud && aud.id) await setDoc(doc(window.db, "audit_logs", aud.id), aud);
          }
        }
      } catch (fsErr) {
        console.warn("Firestore sync during restore notice:", fsErr);
      }
    }

    window.updateBackupProgress(100, "กู้คืนข้อมูลสำเร็จ 100%", "ฟื้นฟูข้อมูลและลิงก์รูปภาพสมบูรณ์เรียบร้อยแล้ว", true, "bg-success");

    if (typeof window.renderCategoryDropdowns === 'function') window.renderCategoryDropdowns();
    if (typeof window.populateDepartmentDropdowns === 'function') window.populateDepartmentDropdowns();
    if (typeof window.populateEmployeeDropdowns === 'function') window.populateEmployeeDropdowns();
    if (typeof window.populateEquipmentDropdown === 'function') window.populateEquipmentDropdown();
    if (typeof window.populateQuickScanDropdown === 'function') window.populateQuickScanDropdown();

    if (typeof window.renderCatalogGrid === 'function') window.renderCatalogGrid();
    if (typeof window.renderStaffTable === 'function') window.renderStaffTable();
    if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
    if (typeof window.renderEmployeeDirectory === 'function') window.renderEmployeeDirectory();
    if (typeof window.renderAttendanceTable === 'function') window.renderAttendanceTable();
    if (typeof window.updateStats === 'function') window.updateStats();

    setTimeout(() => {
      const modalElem = document.getElementById('backupRestoreModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();
    }, 1500);

    getGlobalToast()("🎉 ฟื้นฟูข้อมูลระบบและลิงก์รูปภาพ เรียบร้อยแล้ว!");
    alert("🎉 สำเร็จ! ระบบได้ฟื้นฟูข้อมูลและลิงก์รูปภาพทั้งหมดเรียบร้อยแล้ว");
  } catch (err) {
    console.error("Restore execution error:", err);
    window.updateBackupProgress(0, "เกิดข้อผิดพลาดในการกู้คืนข้อมูล", err.message, true, "bg-danger");
    alert("เกิดข้อผิดพลาดขณะฟื้นฟูข้อมูล: " + err.message);
  }
};

// 18. Firebase Storage Image Upload Sync
window.uploadBase64OrUrlToFirebaseStorage = async function(imageUrl, folderName = "equipment_images", defaultName = "item.jpeg", forceReupload = false) {
  if (!imageUrl) return imageUrl;

  const currentBucket = (typeof window.firebaseConfig !== 'undefined' && window.firebaseConfig.storageBucket) ? window.firebaseConfig.storageBucket : "flora-gaden.firebasestorage.app";
  
  if (!forceReupload && typeof imageUrl === 'string' && imageUrl.includes(currentBucket) && !imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  if (window.isFirebaseReady && window.storage) {
    try {
      let rawBlob = null;
      if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl);
        rawBlob = await res.blob();
      } else {
        rawBlob = await window.fetchImageAsBlobOrBase64(imageUrl);
      }

      if (rawBlob) {
        const presetType = (folderName === 'employee_photos') ? 'EMPLOYEE' : 'EQUIPMENT';
        let targetBlob = rawBlob;
        let ext = 'webp';

        if (typeof window.autoOptimizeAndResizeImage === 'function') {
          const optRes = await window.autoOptimizeAndResizeImage(rawBlob, { presetType });
          if (optRes && optRes.blob) {
            targetBlob = optRes.blob;
            ext = optRes.extension || 'webp';
          }
        }

        const cleanName = defaultName ? defaultName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'item';
        const baseName = cleanName.replace(/\.(jpeg|jpg|png|webp)$/i, '');
        const fileName = `${baseName}.${ext}`;

        const storageRef = ref(window.storage, `${folderName}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, targetBlob);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`Uploaded optimized image to current Firebase Storage (${folderName}/${fileName}):`, downloadUrl);
        return downloadUrl;
      }
    } catch (err) {
      console.warn("Upload image to current Firebase Storage notice:", err);
    }
  }

  return imageUrl;
};

window.syncAllImagesToFirebaseStorage = async function() {
  if (!window.isFirebaseReady || !window.storage) {
    if (typeof getGlobalToast === 'function') getGlobalToast()("⚠️ Firebase Storage ยังไม่พร้อมใช้งาน");
    else alert("⚠️ Firebase Storage ยังไม่พร้อมใช้งาน");
    return;
  }

  const ok = typeof window.showConfirmDialog === 'function'
    ? await window.showConfirmDialog({
        title: "ซิงก์รูปภาพสู่ Storage",
        message: "ต้องการซิงก์และอัปโหลดรูปภาพทั้งหมด (อุปกรณ์และพนักงาน) สู่ Firebase Storage หรือไม่?",
        type: "primary",
        icon: "bi-cloud-arrow-up-fill",
        confirmText: "เริ่มซิงก์รูปภาพ"
      })
    : confirm("ต้องการซิงก์รูปภาพทั้งหมดหรือไม่?");

  if (!ok) {
    return;
  }

  getGlobalToast()("⏳ กำลังเริ่มประมวลผลและอัปโหลดรูปภาพทั้งหมดไปยัง Firebase Storage...");
  let equipUploaded = 0;
  let empUploaded = 0;

  try {
    const equipmentList = window.equipmentList || [];
    const employeeList = window.employeeList || [];

    for (let i = 0; i < equipmentList.length; i++) {
      const eq = equipmentList[i];
      if (eq && eq.imageUrl && !eq.imageUrl.includes('firebasestorage.googleapis.com')) {
        const safeCode = (eq.code || eq.id || `eq_${i}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const newUrl = await window.uploadBase64OrUrlToFirebaseStorage(eq.imageUrl, "equipment_images", `${safeCode}.jpeg`);
        if (newUrl && newUrl !== eq.imageUrl) {
          eq.imageUrl = newUrl;
          equipUploaded++;
          if (window.isFirebaseReady && window.db && eq.id) {
            try { await setDoc(doc(window.db, "equipment", eq.id), eq, { merge: true }); } catch (e) {}
          }
        }
      }
    }

    for (let i = 0; i < employeeList.length; i++) {
      const emp = employeeList[i];
      if (emp && emp.photoUrl && !emp.photoUrl.includes('firebasestorage.googleapis.com')) {
        const safeCode = (emp.code || emp.id || `emp_${i}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const newUrl = await window.uploadBase64OrUrlToFirebaseStorage(emp.photoUrl, "employee_photos", `${safeCode}.jpeg`);
        if (newUrl && newUrl !== emp.photoUrl) {
          emp.photoUrl = newUrl;
          empUploaded++;
          if (window.isFirebaseReady && window.db && emp.id) {
            try { await setDoc(doc(window.db, "employees", emp.id), emp, { merge: true }); } catch (e) {}
          }
        }
      }
    }

    if (typeof window.saveToLocalStorage === 'function') window.saveToLocalStorage();
    if (typeof window.renderCatalogGrid === 'function') window.renderCatalogGrid();
    if (typeof window.renderStaffTable === 'function') window.renderStaffTable();
    if (typeof window.renderEmployeeDirectory === 'function') window.renderEmployeeDirectory();

    const successMsg = `🎉 ซิงก์รูปภาพเข้า Firebase Storage เรียบร้อยแล้ว!\n\n• อัปโหลดรูปอุปกรณ์สำเร็จ: ${equipUploaded} รายการ\n• อัปโหลดรูปถ่ายพนักงานสำเร็จ: ${empUploaded} รายการ\n\nรูปภาพทั้งหมดเปลี่ยนไปใช้ URL จาก Firebase Storage ของโปรเจกต์ใหม่แล้วครับ`;
    alert(successMsg);
    getGlobalToast()("🎉 ซิงก์รูปภาพทั้งหมดเข้า Firebase Storage สำเร็จแล้ว!");
  } catch (err) {
    console.error("Sync images to Storage error:", err);
    alert("เกิดข้อผิดพลาดขณะอัปโหลดรูปภาพ: " + err.message);
  }
};

// 19. Listeners for folder UI refresh
function initBackupRestore() {
  if (typeof window.refreshFolderUIDisplay === 'function') {
    window.refreshFolderUIDisplay();
  }

  const modalElem = document.getElementById('backupRestoreModal');
  if (modalElem) {
    modalElem.addEventListener('show.bs.modal', () => {
      if (typeof window.refreshFolderUIDisplay === 'function') {
        window.refreshFolderUIDisplay();
      }
    });
    modalElem.addEventListener('shown.bs.modal', () => {
      if (typeof window.refreshFolderUIDisplay === 'function') {
        window.refreshFolderUIDisplay();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackupRestore);
} else {
  initBackupRestore();
}
