# เอกสารสรุปการอัปเดตและปรับปรุงโค้ด (Update Code Summary)
**Flora Garden Project: V.2 Migration & Optimization Guide**
**วันที่จัดทำ:** 15 สิงหาคม 2026

---

## 📌 1. ภาพรวมการเปลี่ยนแปลงหลัก (Key Changelog)

การเปลี่ยนแปลงทั้งหมดในโปรเจกต์นี้ มีจุดประสงค์หลักเพื่อแก้ปัญหา **"ข้อมูลซ้ำซ้อน (Duplicate Records)"**, **"ความไม่สอดคล้องกันของ Document ID ใน Firestore"**, และ **"เพิ่มความปลอดภัย/เครื่องมือจัดระเบียบฐานข้อมูล"** โดยมีสาระสำคัญแบ่งตามไฟล์ดังนี้:

---

### 1.1 ไฟล์ `script.js` (หัวใจหลักของ Logic ฐานข้อมูลและการจัดเก็บ)

1. **การกำหนดมาตรฐาน Document ID เป็น Canonical Code 100%:**
   - เดิมทีระบบบางส่วนใช้ Auto-generated ID (เช่น สุ่มรหัสเอกสาร `7xK9sD0...`) ทำให้เกิดเอกสารซ้ำซ้อนกับเอกสารที่มีรหัสประจำตัว (`code`) เช่น `CAT-001`, `DEP-001`, `LOC-001`
   - ปรับให้ทุกคอลเลกชัน (`categories`, `departments`, `locations`, `equipment`, `employees`) บังคับใช้ `doc(db, collectionName, officialCode)` โดยตรง

2. **ระบบ Realtime OnSnapshot Auto-Migration & Deduplication:**
   - ใน Event Listener `onSnapshot` ของ `categories`, `departments`, `locations`:
     - มีการสร้าง Map เพื่อคัดกรองข้อมูลซ้ำตามรหัส (`code`) และชื่อ (`name`) แบบ In-Memory ก่อนนำไป Render
     - หากตรวจพบเอกสารที่มี `d.id !== code` (เอกสารเก่าที่สร้างด้วย ID สุ่ม) ระบบจะคัดลอกข้อมูลไปยัง Document ID ที่เป็น `code` ทางการ และลบเอกสาร Random ID เก่าทิ้งอัตโนมัติ

3. **ฟังก์ชัน `cleanAndDeduplicateAllCollections()`:**
   - ฟังก์ชันทำความสะอาดและจัดระเบียบ ID ทุกคอลเลกชันในคลิกเดียว:
     - ตรวจสอบ `categories`, `departments`, `locations`, `equipment`, `employees`
     - สแกนหาเอกสารที่ซ้ำกันตามรหัส `code` และตามชื่อ
     - คัดเลือกเอกสารที่มี Document ID ตรงกับ `code` ให้เป็นตัวหลัก (Master)
     - รวมข้อมูลและลบเอกสารที่สร้างขึ้นซ้ำซ้อนทิ้ง
     - บังคับใช้สิทธิ์ความปลอดภัย ตรวจสอบเฉพาะ Admin คุณ Thamma Srithong (`jaru072@gmail.com`) เท่านั้น

4. **ปรับปรุงฟังก์ชัน Sync จาก Database ต้นทาง (`copyDataFromOldDatabases`):**
   - เมื่อดึงข้อมูลจาก Database เก่า (`floragardentest`) ระบบจะแปลงให้ Document ID ปลายทางเป็น `code:` ประจำตัวเสมอ
   - หากตรวจพบว่าเอกสารต้นทางมี ID ต่างจาก `code:` ระบบจะล้างตัวขยะที่สร้างซ้ำออกให้โดยอัตโนมัติ

---

### 1.2 ไฟล์ `index.html` และ `modals.html` (UI และหน้าจอผู้ใช้งาน)

1. **เพิ่มปุ่ม "ล้างข้อมูลซ้ำและจัดระเบียบ ID":**
   - เพิ่มปุ่มสีน้ำเงินพร้อมไอคอนประกายดาว `[ล้างข้อมูลซ้ำและจัดระเบียบ ID]` ในโมดอล **"สำรองและกู้คืนข้อมูล" (Backup & Restore Modal)**
   - เรียกใช้คำสั่ง `cleanAndDeduplicateAllCollections()` เพื่อให้ผู้ดูแลระบบกดคลีนฐานข้อมูลได้ตลอดเวลา

2. **ปรับแต่งการแสดงผลการ์ด Sync:**
   - ปรับปุ่มกดซิงค์และการ์ดดึงข้อมูลให้รองรับหน้าจอทุกขนาด (Responsive Mobile & Desktop)

---

## 💡 2. คำแนะนำ: วิธีทำให้ 2 Project มีโค้ดเหมือนกัน ต่างกันแค่ Database ID

> **คำถาม:** นำเอกสารนี้ไปแก้ใน Project ต้นแบบดีหรือไม่? หรือมีวิธีอื่นที่ดีกว่า?

### คำแนะนำเปรียบเทียบ 2 วิธี:

---

### 🌟 วิธีที่ 1 (แนะนำที่สุด): ทำการ Export/Download โค้ดทั้งหมดจาก V.2 ไปทับ Project ต้นแบบ แล้วแก้แค่ Database ID

**ทำไมวิธีนี้ถึงดีและปลอดภัยที่สุด?**
- โปรเจกต์ V.2 ปัจจุบันผ่านการ Build, Lint, แก้ไข CSS/HTML และตรวจสอบ JavaScript ทั้งระบบอย่างสมบูรณ์แล้ว
- การแก้ไขทีละบรรทัดใน Project ต้นแบบ อาจเกิดข้อผิดพลาดจากการคัดลอกไม่ครบ (Human Error)
- **จุดที่ต่างกันระหว่าง 2 โปรเจกต์มีเพียงแค่ 1 บรรทัดเท่านั้น** คือค่า `databaseId` ในไฟล์คอนฟิก

#### ขั้นตอนการทำวิธีที่ 1:
1. **คัดลอกไฟล์จาก V.2 ไปยังโปรเจกต์ต้นแบบ:**
   - นำไฟล์ `script.js`, `index.html`, `modals.html`, `backup_restore.js` จาก V.2 ไปแทนที่ในโปรเจกต์ต้นแบบ
2. **ตรวจสอบจุดกำหนด Database ID ในโปรเจกต์ต้นแบบ:**
   - ในไฟล์ `script.js` (หรือไฟล์ตั้งค่า Firebase) ปรับให้ชี้ไปยัง Database ID ของโปรเจกต์นั้น:
     ```javascript
     // สำหรับโปรเจกต์ต้นแบบ (Test):
     const db = getFirestore(app, "ai-studio-floragardentest-b067b23c-205a-446d-8774-e8804286e5e1");
     
     // สำหรับโปรเจกต์ V.2:
     const db = getFirestore(app, "ai-studio-floragardenv2-c509b5a5-f4a3-4546-bbae-c5f21564ba7d");
     ```
3. **เปิดหน้าเว็บโปรเจกต์ต้นแบบ -> เข้าเมนูสำรองและกู้คืนข้อมูล -> กดปุ่ม `[ล้างข้อมูลซ้ำและจัดระเบียบ ID]` 1 ครั้ง:**
   - ฐานข้อมูลต้นแบบจะถูกจัดระเบียบให้มี Document ID ตรงกับ `code:` และลบข้อมูลที่ซ้ำซ้อนออกทันทีเหมือนกัน 100%

---

### 📝 วิธีที่ 2: นำโค้ดฟังก์ชันหลักไปใส่ในโปรเจกต์ต้นแบบแบบ Manual

หากต้องการแก้เฉพาะส่วนในโปรเจกต์ต้นแบบ ให้เพิ่ม/แทนที่ฟังก์ชันต่อไปนี้ใน `script.js`:

```javascript
// ฟังก์ชันสำหรับสแกนและลบตัวซ้ำทุกคอลเลกชัน
window.cleanAndDeduplicateAllCollections = async function(showFeedback = true) {
  if (!isFirebaseReady || !db) return;
  
  const collectionsToCheck = [
    { name: "categories", codePrefix: "CAT", nameField: "name" },
    { name: "departments", codePrefix: "DEP", nameField: "name" },
    { name: "locations", codePrefix: "LOC", nameField: "name" },
    { name: "equipment", codePrefix: "EQ", nameField: "name" },
    { name: "employees", codePrefix: "EMP", nameField: "name" }
  ];

  for (const colInfo of collectionsToCheck) {
    const colName = colInfo.name;
    const qSnap = await getDocs(collection(db, colName));
    if (qSnap.empty) continue;

    const seenByCode = new Map();
    const docsToDelete = [];

    for (const dSnap of qSnap.docs) {
      const data = dSnap.data() || {};
      const codeVal = (data.code || (colName === 'equipment' ? data.equipmentCode : '') || data.id || dSnap.id || '').trim();
      const isStandardId = (dSnap.id === codeVal);

      const record = { dSnap, data, docId: dSnap.id, codeVal, isStandardId };
      const codeKey = codeVal.toLowerCase();

      if (codeKey) {
        if (!seenByCode.has(codeKey)) {
          seenByCode.set(codeKey, record);
        } else {
          const existing = seenByCode.get(codeKey);
          if (isStandardId && !existing.isStandardId) {
            docsToDelete.push(existing.dSnap);
            seenByCode.set(codeKey, record);
          } else {
            docsToDelete.push(dSnap);
          }
        }
      }
    }

    for (const [codeKey, record] of seenByCode.entries()) {
      const targetId = record.codeVal || record.docId;
      const cleanData = { ...record.data, id: targetId, code: targetId };
      await setDoc(doc(db, colName, targetId), cleanData, { merge: true });
      if (record.docId !== targetId) docsToDelete.push(record.dSnap);
    }

    for (const strayDoc of Array.from(new Set(docsToDelete))) {
      try { await deleteDoc(strayDoc.ref); } catch(e){}
    }
  }
};
```
