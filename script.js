    import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { 
      initializeFirestore,
      getFirestore, 
      collection, 
      addDoc, 
      getDocs,
      onSnapshot, 
      doc, 
      getDoc,
      setDoc,
      updateDoc, 
      deleteDoc, 
      serverTimestamp 
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

    import { 
      getStorage, 
      ref, 
      uploadBytes, 
      getDownloadURL,
      deleteObject,
      getBlob,
      getBytes,
      listAll
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

    import {
      getAuth,
      signInWithPopup,
      GoogleAuthProvider,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      onAuthStateChanged,
      signOut,
      updateProfile
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

    // Firebase Config (Project: Project Flora Garden - flora-gaden)
    const firebaseConfig = {
      apiKey: "AIzaSyCVFTo7glMah6eeubjCLQa6HtIrnwpmrc4",
      authDomain: "flora-gaden.firebaseapp.com",
      projectId: "flora-gaden",
      firestoreDatabaseId: "ai-studio-floragardenv2-c509b5a5-f4a3-4546-bbae-c5f21564ba7d",
      storageBucket: "flora-gaden.firebasestorage.app",
      messagingSenderId: "633519077693",
      appId: "1:633519077693:web:6267796ae34a8286ff6d54",
      measurementId: "G-CTYBQCMGQG"
    };

    // Global state holding app status
    let currentRole = 'WORKER'; // Default: WORKER
    let db = null;
    let storage = null;
    let auth = null;
    let googleProvider = null;
    let currentAuthUser = null;
    let currentUserProfile = null;
    let allUsersList = [];
    let isFirebaseReady = false;

    // Local state containers
    let equipmentList = [];
    let transactionHistory = [];
    let employeeList = [];
    let attendanceLogs = [];
    let categoriesList = [];
    let departmentsList = [];
    let locationsList = [];
    let auditLogs = [];
    let userLoginLogs = [];
    let userLoginSortColumn = 'timestamp';
    let userLoginSortDirection = 'desc';
    let userLoginPage = 1;
    let userLoginPageSize = 25;
    let lastKnownUserForLogout = null;
    let activeModalEquipId = null;

    // Expose local state variables to window for modules (backup_restore.js)
    Object.defineProperty(window, 'currentRole', { get: () => currentRole, set: (v) => { currentRole = v; }, configurable: true });
    Object.defineProperty(window, 'db', { get: () => db, set: (v) => { db = v; }, configurable: true });
    Object.defineProperty(window, 'storage', { get: () => storage, set: (v) => { storage = v; }, configurable: true });
    Object.defineProperty(window, 'auth', { get: () => auth, set: (v) => { auth = v; }, configurable: true });
    Object.defineProperty(window, 'isFirebaseReady', { get: () => isFirebaseReady, set: (v) => { isFirebaseReady = v; }, configurable: true });
    Object.defineProperty(window, 'equipmentList', { get: () => equipmentList, set: (v) => { equipmentList = v; }, configurable: true });
    Object.defineProperty(window, 'transactionHistory', { get: () => transactionHistory, set: (v) => { transactionHistory = v; }, configurable: true });
    Object.defineProperty(window, 'employeeList', { get: () => employeeList, set: (v) => { employeeList = v; }, configurable: true });
    Object.defineProperty(window, 'attendanceLogs', { get: () => attendanceLogs, set: (v) => { attendanceLogs = v; }, configurable: true });
    Object.defineProperty(window, 'categoriesList', { get: () => categoriesList, set: (v) => { categoriesList = v; }, configurable: true });
    Object.defineProperty(window, 'departmentsList', { get: () => departmentsList, set: (v) => { departmentsList = v; }, configurable: true });
    Object.defineProperty(window, 'locationsList', { get: () => locationsList, set: (v) => { locationsList = v; }, configurable: true });
    Object.defineProperty(window, 'auditLogs', { get: () => auditLogs, set: (v) => { auditLogs = v; }, configurable: true });
    Object.defineProperty(window, 'userLoginLogs', { get: () => userLoginLogs, set: (v) => { userLoginLogs = v; }, configurable: true });

    const defaultCategoriesList = [
      { id: "CAT-001", code: "CAT-001", name: "น้ำมัน", prefix: "FG", label: "น้ำมันส่วนกลางทั้งหมด", icon: "🛢️" },
      { id: "CAT-002", code: "CAT-002", name: "งานธุรการ", prefix: "EQ", label: "อุปกรณ์ธุรการ", icon: "📝" },
      { id: "CAT-003", code: "CAT-003", name: "อุปกรณ์ทำความสะอาด", prefix: "SK", label: "อุปกรณ์ทำความสะอาดทั้งหมด", icon: "🧹" },
      { id: "CAT-004", code: "CAT-004", name: "ฮาร์ดแวร์,เคมีภัณฑ์", prefix: "FT", label: "น้ำยาเคมี/สี/วัสดุอุดรอยต่อ", icon: "🧪" },
      { id: "CAT-005", code: "CAT-005", name: "เครื่องมือช่าง", prefix: "AX", label: "อุปกรณ์สำหรับทำงานช่าง", icon: "🛠️" },
      { id: "CAT-006", code: "CAT-006", name: "เมล็ดพันธ์", prefix: "OP", label: "เมล็ดพันธ์ต่างๆ", icon: "🌱" },
      { id: "CAT-007", code: "CAT-007", name: "วัสดุเกษตรทั่วไป(ใช้แล้วหมดไป)", prefix: "SF", label: "วัสดุเกษตรทั่วไป(ใช้แล้วหมดไป)", icon: "🌾" },
      { id: "CAT-008", code: "CAT-008", name: "อุปกรณ์เกษตร ประเภทยืมใช้(รถเข็น พั้ว จอบ จก ฯลฯ)", prefix: "SL", label: "อุปกรณ์เกษตร ประเภทยืมใช้(รถเข็น พั้ว จอบ จก ฯลฯ)", icon: "🚜" },
      { id: "CAT-009", code: "CAT-009", name: "ระบบไฟ", prefix: "EQ", label: "ระบบไฟ", icon: "💡" },
      { id: "CAT-010", code: "CAT-010", name: "ระบบน้ำ", prefix: "EQ", label: "ระบบน้ำ", icon: "💧" }
    ];

    const defaultDepartmentsList = [
      "แผนกงานธุรการ",
      "แผนกงานทดลอง",
      "แผนกทีมกุหลาบ",
      "แผนกทีมเจดีย์/แปลง G",
      "แผนกทีมแปลง A-B",
      "แผนกทีมแปลง E/P11",
      "แผนกทีมถนนธรรมชัย/เฟื้องฟ้า/ผสมดิน",
      "แผนกทีมไม้ดอกหลังวิหารคดคอร์ 13-20(ปอ)",
      "ทั่วไป",
      "ทีมตัดหญ้า",
      "ทีมวิหารหลวงปู่"
    ];

    const defaultLocationsList = [
      "สโตว์กรงเหล็ก",
      "โรงเก็บเครื่องมือ A",
      "ชั้นอุปกรณ์ระบบน้ำ",
      "โรงน้ำมัน",
      "พระธรรมศักดิ์ ทดสอบ",
      "โรงเก็บ A - ชั้น 1",
      "คลังวัสดุเพาะชำ",
      "เรือนกระจก 1",
      "คลังปุ๋ยและสารบำรุง",
      "ตู้เซฟตี้ 1",
      "โรงเก็บ A - ชั้น 2",
      "โรงเก็บ A - ชั้น 3",
      "โรงเก็บ B - ล็อก 1",
      "โรงเก็บ B - ล็อก 2",
      "อาคารเครื่องจักร 1",
      "อาคารเครื่องจักร 2",
      "คลังอุปกรณ์หนัก",
      "อาคารเคมีเกษตร"
    ];

    // Initialize Firebase & Auth gracefully with long polling for iframe sandbox resilience
    try {
      const app = initializeApp(firebaseConfig);
      
      try {
        const fsSettings = {
          experimentalAutoDetectLongPolling: true
        };
        const customDbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)")
          ? firebaseConfig.firestoreDatabaseId
          : undefined;

        db = customDbId
          ? initializeFirestore(app, fsSettings, customDbId)
          : initializeFirestore(app, fsSettings);
      } catch (eFs) {
        console.warn("Firestore init warning:", eFs);
        try {
          const customDbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)")
            ? firebaseConfig.firestoreDatabaseId
            : undefined;
          db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
        } catch(e) {
          console.error("Firestore fallback init failed:", e);
        }
      }

      try {
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
      } catch (eAuth) {
        console.warn("Auth init warning:", eAuth);
      }

      try {
        storage = getStorage(app);
      } catch (eSt) {
        console.warn("Storage init warning:", eSt);
      }

      isFirebaseReady = true;
      console.log("Firebase & Auth initialized successfully with project flora-gaden.");
    } catch (err) {
      console.warn("Firebase initialization warning:", err);
      isFirebaseReady = false;
    }

    // Setup Firebase Auth State Listener
    if (auth) {
      onAuthStateChanged(auth, async (user) => {
        currentAuthUser = user;
        if (user) {
          console.log("Firebase Auth User logged in:", user.email || user.uid);
          await syncUserProfileDoc(user);
          lastKnownUserForLogout = user;
          const sessionKey = 'logged_online_' + (user.uid || user.email) + '_' + Math.floor(Date.now() / (1000 * 60 * 15));
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            if (typeof window.recordUserLoginStatus === 'function') {
              window.recordUserLoginStatus('Online', user);
            }
          }
          if (typeof window.trackUserLoginPresence === 'function') {
            window.trackUserLoginPresence(user);
          }
          if (typeof window.subscribeToUserPresence === 'function') {
            window.subscribeToUserPresence();
          }
          if (typeof window.hideMandatoryLoginScreen === 'function') {
            window.hideMandatoryLoginScreen();
          }
        } else {
          console.log("Firebase Auth User initialized without active session. Defaulting to Admin Thamma Srithong.");
          if (lastKnownUserForLogout) {
            if (typeof window.recordUserLoginStatus === 'function') {
              window.recordUserLoginStatus('Offline', lastKnownUserForLogout);
            }
            lastKnownUserForLogout = null;
          }
          if (typeof window.trackUserLoginPresence === 'function') {
            window.trackUserLoginPresence(null);
          }
          if (typeof window.subscribeToUserPresence === 'function') {
            window.subscribeToUserPresence();
          }
          if (typeof window.handleQuickLogin === 'function') {
            window.handleQuickLogin('ADMIN', 'ผู้ดูแลระบบ (Admin)', 'jaru072@gmail.com');
          }
          if (typeof window.hideMandatoryLoginScreen === 'function') {
            window.hideMandatoryLoginScreen();
          }
        }
      });
    }

    // Sync User Profile Document in Firestore
    async function syncUserProfileDoc(user, initialRoleChoice = null) {
      if (!db) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const nowIso = new Date().toISOString();
        
        if (userSnap.exists()) {
          currentUserProfile = { id: user.uid, ...userSnap.data(), isOnline: true, status: 'Online', lastActiveAt: nowIso, lastLoginAt: nowIso };
          if (user.email === 'jaru072@gmail.com') {
            currentUserProfile.role = 'ADMIN';
          }
          await setDoc(userRef, {
            role: currentUserProfile.role || 'WORKER',
            isOnline: true,
            status: 'Online',
            lastActiveAt: nowIso,
            lastLoginAt: nowIso
          }, { merge: true });
        } else {
          const defaultRole = initialRoleChoice || (user.email === 'jaru072@gmail.com' ? 'ADMIN' : 'WORKER');
          currentUserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'ผู้ใช้งาน',
            photoURL: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            role: user.email === 'jaru072@gmail.com' ? 'ADMIN' : defaultRole,
            isOnline: true,
            status: 'Online',
            lastActiveAt: nowIso,
            lastLoginAt: nowIso,
            updatedAt: nowIso
          };
          await setDoc(userRef, currentUserProfile);
        }

        if (user.email === 'jaru072@gmail.com') {
          currentUserProfile.role = 'ADMIN';
        }
        
        setRole(currentUserProfile.role || 'WORKER');
        updateAuthUI();
        if (typeof window.hideMandatoryLoginScreen === 'function') {
          window.hideMandatoryLoginScreen();
        }
      } catch (err) {
        console.warn("Error syncing user profile:", err);
      }
    }

    // Update Auth UI Elements
    window.updateAuthUI = function() {
      const navAvatar = document.getElementById('navUserAvatar');
      const navRoleText = document.getElementById('currentRoleText');
      const profileLoggedOutBox = document.getElementById('profileLoggedOutBox');
      const profileLoggedInBox = document.getElementById('profileLoggedInBox');
      
      const roleTitleMap = {
        'ADMIN': 'ผู้ดูแลระบบ',
        'MANAGER': 'เจ้าหน้าที่',
        'WORKER': 'พนักงาน',
        'STAFF': 'เจ้าหน้าที่'
      };
      const rName = roleTitleMap[currentRole] || 'พนักงาน';

      if (currentAuthUser) {
        if (navAvatar) {
          navAvatar.src = currentAuthUser.photoURL || currentUserProfile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
          navAvatar.classList.remove('d-none');
        }
        if (navRoleText) navRoleText.textContent = `${currentAuthUser.displayName || currentUserProfile?.displayName || 'ผู้ใช้'}: ${rName}`;

        if (profileLoggedOutBox) profileLoggedOutBox.classList.add('d-none');
        if (profileLoggedInBox) profileLoggedInBox.classList.remove('d-none');

        const profileImg = document.getElementById('userProfileImg');
        const profileName = document.getElementById('userProfileName');
        const profileEmail = document.getElementById('userProfileEmail');
        const profileUid = document.getElementById('userProfileUid');
        const profileRoleBadge = document.getElementById('userProfileRoleBadge');

        if (profileImg) profileImg.src = currentAuthUser.photoURL || currentUserProfile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
        if (profileName) profileName.textContent = currentAuthUser.displayName || currentUserProfile?.displayName || 'ผู้ใช้งาน';
        if (profileEmail) profileEmail.textContent = currentAuthUser.email || currentUserProfile?.email || '-';
        if (profileUid) profileUid.textContent = `UID: ${currentAuthUser.uid}`;
        if (profileRoleBadge) {
          profileRoleBadge.textContent = rName;
          if (currentRole === 'ADMIN') profileRoleBadge.className = 'badge bg-danger rounded-pill px-3 py-2';
          else if (currentRole === 'MANAGER') profileRoleBadge.className = 'badge bg-primary rounded-pill px-3 py-2';
          else profileRoleBadge.className = 'badge bg-success rounded-pill px-3 py-2';
        }

        const editName = document.getElementById('editProfileNameInput');
        const editPhoto = document.getElementById('editProfilePhotoInput');
        if (editName && (!editName.value || editName.value === '')) editName.value = currentAuthUser.displayName || currentUserProfile?.displayName || '';
        if (editPhoto && (!editPhoto.value || editPhoto.value === '')) editPhoto.value = currentAuthUser.photoURL || currentUserProfile?.photoURL || '';

      } else {
        if (navAvatar) navAvatar.classList.add('d-none');
        if (navRoleText) navRoleText.textContent = `สิทธิ์: ${rName}`;

        if (profileLoggedOutBox) profileLoggedOutBox.classList.remove('d-none');
        if (profileLoggedInBox) profileLoggedInBox.classList.add('d-none');
      }

      if (typeof window.updateDbEditorMenuVisibility === 'function') {
        window.updateDbEditorMenuVisibility();
      }
    };

    // Google Sign-In
    window.handleGoogleSignIn = async function() {
      if (!auth || !googleProvider) {
        try {
          auth = getAuth();
          googleProvider = new GoogleAuthProvider();
        } catch(e) {
          console.warn("Auth re-init failed:", e);
        }
      }

      if (googleProvider) {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
      }

      if (!auth || !googleProvider) {
        showToast("⚠️ Firebase Auth ไม่พร้อมใช้งาน - เข้าสู่ระบบในโหมดเจ้าหน้าที่ (Staff)");
        if (typeof window.handleQuickLogin === 'function') {
          window.handleQuickLogin('STAFF', 'เจ้าหน้าที่สำนักงาน (Staff)');
        }
        return;
      }

      try {
        showToast("⏳ กำลังเปิดหน้าต่าง Google Sign-In...");
        const result = await signInWithPopup(auth, googleProvider);
        showToast(`🟢 เข้าสู่ระบบด้วย Google Account สำเร็จ: ${result.user.displayName || result.user.email}`);
        if (typeof window.hideMandatoryLoginScreen === 'function') {
          window.hideMandatoryLoginScreen();
        }
        switchAuthTab('auth-profile-tab');
      } catch (err) {
        console.error("Google Auth error:", err);
        let errorTitle = "เข้าสู่ระบบ Google ไม่สำเร็จ";
        if (err.code === 'auth/unauthorized-domain') {
          errorTitle = "โดเมนเว็บไซต์ยังไม่ได้เพิ่มใน Authorized Domains";
          const currentDomain = window.location.hostname;
          alert(`⚠️ การเข้าสู่ระบบด้วย Google ขัดข้องเนื่องจากโดเมนยังไม่อนุญาต (auth/unauthorized-domain)\n\nกรุณาเพิ่มโดเมนของแอปพลิเคชันนี้เข้าไปใน Firebase Console:\n\n📌 โดเมนปัจจุบันของคุณคือ:\n${currentDomain}\n\nวิธีเพิ่ม:\n1. เปิด Firebase Console > ไปที่โครงการของคุณ (flora-gaden)\n2. ไปที่เมนู Authentication > แท็บ Settings > เลือก "Authorized domains"\n3. กดปุ่ม "Add domain" แล้วนำชื่อโดเมนข้างต้นไปวางกด Save ครับ`);
        } else if (err.code === 'auth/popup-closed-by-user') {
          errorTitle = "ผู้ใช้งานปิดหน้าต่าง Pop-up ลงก่อนทำรายการสำเร็จ";
        } else if (err.code === 'auth/popup-blocked') {
          errorTitle = "เบราว์เซอร์บล็อกหน้าต่าง Pop-up ไว้";
        } else if (err.code === 'auth/operation-not-allowed') {
          errorTitle = "ยังไม่ได้เปิดใช้งาน Google Sign-in Provider ใน Firebase Console";
        }
        showToast(`🔴 ${errorTitle} (${err.code || err.message})`);
      }
    };

    // Email Login
    window.handleEmailLogin = async function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const email = document.getElementById('loginEmailInput').value;
      const pass = document.getElementById('loginPasswordInput').value;

      if (!auth) {
        showToast("Firebase Auth ไม่พร้อมใช้งาน");
        return;
      }
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        showToast(`เข้าสู่ระบบสำเร็จ: ${userCred.user.email}`);
        switchAuthTab('auth-profile-tab');
      } catch (err) {
        console.error("Email login error:", err);
        showToast(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`);
      }
    };

    // Email Register
    window.handleEmailRegister = async function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const name = document.getElementById('regNameInput').value;
      const email = document.getElementById('regEmailInput').value;
      const pass = document.getElementById('regPasswordInput').value;
      const roleChoice = document.getElementById('regRoleSelect').value;

      if (!auth) {
        showToast("Firebase Auth ไม่พร้อมใช้งาน");
        return;
      }
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCred.user, { displayName: name });
        await syncUserProfileDoc(userCred.user, roleChoice);
        showToast(`สมัครสมาชิกสำเร็จ! บทบาทสิทธิ์: ${roleChoice}`);
        switchAuthTab('auth-profile-tab');
      } catch (err) {
        console.error("Email register error:", err);
        showToast(`สมัครสมาชิกไม่สำเร็จ: ${err.message}`);
      }
    };

    // Update Profile
    window.handleUpdateUserProfile = async function() {
      if (!auth || !currentAuthUser) return;
      const name = document.getElementById('editProfileNameInput').value;
      const photo = document.getElementById('editProfilePhotoInput').value;

      try {
        await updateProfile(currentAuthUser, {
          displayName: name,
          photoURL: photo
        });
        if (db) {
          const userRef = doc(db, "users", currentAuthUser.uid);
          await updateDoc(userRef, {
            displayName: name,
            photoURL: photo,
            updatedAt: new Date().toISOString()
          });
        }
        await syncUserProfileDoc(currentAuthUser);
        showToast("อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว");
      } catch (err) {
        showToast(`อัปเดตโปรไฟล์ไม่สำเร็จ: ${err.message}`);
      }
    };

    // Mandatory Login Screen Control
    window.showMandatoryLoginScreen = function() {
      const overlay = document.getElementById('mandatoryLoginScreenOverlay');
      if (overlay) overlay.classList.remove('d-none');
    };

    window.hideMandatoryLoginScreen = function() {
      const overlay = document.getElementById('mandatoryLoginScreenOverlay');
      if (overlay) overlay.classList.add('d-none');
    };

    window.handleQuickLogin = function(role, roleTitle, emailOverride = '') {
      const targetEmail = emailOverride || (role === 'ADMIN' ? 'jaru072@gmail.com' : '');
      if (role === 'ADMIN' || targetEmail === 'jaru072@gmail.com') {
        currentRole = 'ADMIN';
        currentUserProfile = {
          uid: 'admin_jaru072',
          email: 'jaru072@gmail.com',
          displayName: 'Thamma Srithong',
          role: 'ADMIN'
        };
        currentAuthUser = {
          uid: 'admin_jaru072',
          email: 'jaru072@gmail.com',
          displayName: 'Thamma Srithong',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
        };
      } else {
        currentRole = role;
        currentUserProfile = {
          uid: 'user_guest',
          email: targetEmail || 'staff@floragarden.com',
          displayName: roleTitle || 'เจ้าหน้าที่',
          role: role
        };
        if (!currentAuthUser) {
          currentAuthUser = {
            uid: 'user_guest',
            email: targetEmail || 'staff@floragarden.com',
            displayName: roleTitle || 'เจ้าหน้าที่',
            photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
          };
        }
      }

      setRole(currentRole);
      if (typeof window.ensureAdminUserInUsersCollection === 'function') {
        window.ensureAdminUserInUsersCollection();
      }
      if (typeof window.updateDbEditorMenuVisibility === 'function') {
        window.updateDbEditorMenuVisibility();
      }
      hideMandatoryLoginScreen();
      showToast(`🟢 เข้าสู่ระบบสำเร็จ! สิทธิ์การใช้งาน: ${roleTitle || role}`);
    };

    window.handleStaffSelectLogin = function() {
      const select = document.getElementById('mandEmpSelect');
      const empId = select ? select.value : '';
      if (!empId) {
        alert('กรุณาเลือกรายชื่อพนักงาน');
        return;
      }
      const emp = employeeList.find(x => x.id === empId);
      const targetRole = emp ? (emp.role || 'WORKER') : 'WORKER';
      setRole(targetRole);
      hideMandatoryLoginScreen();
      showToast(`🟢 ยินดีต้อนรับเข้าสู่ระบบ คุณ${emp ? emp.name : empId} [${targetRole}]`);
    };

    window.formatEmpName = function(emp) {
      if (!emp) return '';
      if (typeof emp === 'string') return emp;
      const name = (emp.name || '').trim();
      const rawNick = (emp.nickname || '').trim();
      if (!rawNick) return name;

      // Clean rawNick if it already has parentheses
      const cleanNick = rawNick.replace(/^\(|\)$/g, '').trim();
      if (!cleanNick) return name;

      // If name already contains the nickname or already has parentheses with it
      if (name.includes(`(${cleanNick})`) || name.includes(`（${cleanNick}）`) || name.toLowerCase().includes(`(${cleanNick.toLowerCase()})`)) {
        return name;
      }

      return `${name} (${cleanNick})`.trim();
    };

    window.handleGoogleSignInAndClose = async function() {
      try {
        await handleGoogleSignIn();
      } catch (e) {
        console.warn("Google Login exception:", e);
      }
    };

    window.handleEmailLoginAndClose = async function(e) {
      if (e) e.preventDefault();
      const emailInput = document.getElementById('mandLoginEmail');
      const passInput = document.getElementById('mandLoginPassword');

      if (!emailInput || !passInput) return;

      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!auth) {
        handleQuickLogin('WORKER', 'พนักงานทำเกษตร (Worker)');
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, password);
        hideMandatoryLoginScreen();
        showToast("🟢 เข้าสู่ระบบด้วยอีเมลสำเร็จ");
      } catch (err) {
        console.warn("Email sign-in exception:", err);
        showToast(`⚠️ การเข้าสู่ระบบด้วยอีเมลติดปัญหา: ${err.message} (ปรับเป็นโหมด Worker สัมผัสทดลองใช้)`);
        handleQuickLogin('WORKER', 'พนักงานทำเกษตร (Worker)');
      }
    };

    window.handleEmailRegisterAndClose = async function(e) {
      if (e) e.preventDefault();
      const name = document.getElementById('mandRegName').value.trim();
      const email = document.getElementById('mandRegEmail').value.trim();
      const password = document.getElementById('mandRegPassword').value;
      const role = document.getElementById('mandRegRole').value;

      if (!auth) {
        setRole(role);
        hideMandatoryLoginScreen();
        showToast(`🟢 ลงทะเบียนสำเร็จ! สิทธิ์: ${role}`);
        return;
      }

      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        if (db) {
          await setDoc(doc(db, "users", userCred.user.uid), {
            uid: userCred.user.uid,
            displayName: name,
            email: email,
            role: role,
            createdAt: new Date().toISOString()
          });
        }
        setRole(role);
        hideMandatoryLoginScreen();
        showToast("🟢 ลงทะเบียนและเข้าสู่ระบบสำเร็จ");
      } catch (err) {
        showToast(`ลงทะเบียนไม่สำเร็จ: ${err.message}`);
      }
    };

    // Sign Out
    window.handleSignOut = async function() {
      if (currentAuthUser || currentUserProfile || lastKnownUserForLogout) {
        const u = currentAuthUser || currentUserProfile || lastKnownUserForLogout;
        sessionStorage.clear();
        if (typeof window.recordUserLoginStatus === 'function') {
          await window.recordUserLoginStatus('Offline', u);
        }
      }
      if (auth) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn("SignOut notice:", err.message);
        }
      }
      if (googleProvider) {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
      }
      showToast("ออกจากระบบเรียบร้อยแล้ว");
      showMandatoryLoginScreen();
    };

    // Switch Tab inside Auth Modal
    window.switchAuthTab = function(tabId) {
      const btn = document.getElementById(tabId);
      if (btn) {
        const bsTab = new bootstrap.Tab(btn);
        bsTab.show();
      }
    };

    // Demo Role Apply
    window.applyDemoRoleChoice = function() {
      const selected = document.querySelector('input[name="demoRoleChoice"]:checked')?.value || 'WORKER';
      setRole(selected);
      const modalElem = document.getElementById('userAuthModal');
      const bsModal = bootstrap.Modal.getInstance(modalElem);
      if (bsModal) bsModal.hide();
      
      const roleNameMap = {
        'ADMIN': 'ผู้ดูแลระบบ',
        'MANAGER': 'เจ้าหน้าที่',
        'WORKER': 'พนักงาน'
      };
      showToast(`สลับสิทธิ์ใช้งานเป็น: ${roleNameMap[selected] || selected}`);
    };

    // Ensure Admin User Thamma Srithong exists in Firestore users collection
    window.ensureAdminUserInUsersCollection = async function() {
      if (!db) return;
      try {
        const adminDocRef = doc(db, "users", "admin_jaru072");
        const adminDocSnap = await getDoc(adminDocRef);
        const nowIso = new Date().toISOString();
        
        if (!adminDocSnap.exists()) {
          await setDoc(adminDocRef, {
            uid: "admin_jaru072",
            displayName: "Thamma Srithong",
            email: "jaru072@gmail.com",
            role: "ADMIN",
            status: "Online",
            isOnline: true,
            photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
            createdAt: nowIso,
            updatedAt: nowIso,
            lastLoginAt: nowIso
          });
          console.log("[UsersSeed] Created admin user Thamma Srithong (jaru072@gmail.com) in Firestore 'users' collection.");
        } else {
          await setDoc(adminDocRef, {
            displayName: "Thamma Srithong",
            email: "jaru072@gmail.com",
            role: "ADMIN",
            status: "Online",
            isOnline: true,
            updatedAt: nowIso
          }, { merge: true });
        }
      } catch (err) {
        console.warn("ensureAdminUserInUsersCollection notice:", err);
      }
    };

    // Load Users Table from Firestore
    window.loadUsersTableFromFirestore = async function() {
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
      if (!db) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่ได้เชื่อมต่อ Firestore database</td></tr>`;
        return;
      }
      try {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3"><div class="spinner-border spinner-border-sm text-success me-2"></div> กำลังโหลดรายชื่อผู้ใช้งาน...</td></tr>`;
        
        await window.ensureAdminUserInUsersCollection();

        onSnapshot(collection(db, "users"), (snapshot) => {
          allUsersList = [];
          snapshot.forEach(docSnap => {
            allUsersList.push({ id: docSnap.id, ...docSnap.data() });
          });
          if (allUsersList.length === 0) {
            window.ensureAdminUserInUsersCollection();
          }
          renderUsersTable();
        }, (err) => {
          console.warn("Users snapshot notice:", err);
          tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
        });
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">ไม่สามารถอ่านข้อมูลผู้ใช้: ${err.message}</td></tr>`;
      }
    };

    // Helper to evaluate user online status and last active timestamp
    function getUserOnlineStatusInfo(u) {
      const isCurrentAuth = Boolean(currentAuthUser && (
        (currentAuthUser.uid && (currentAuthUser.uid === u.id || currentAuthUser.uid === u.uid)) ||
        (currentAuthUser.email && u.email && currentAuthUser.email.toLowerCase() === u.email.toLowerCase())
      ));

      let latestLog = null;
      if (Array.isArray(userLoginLogs) && userLoginLogs.length > 0) {
        const userLogs = userLoginLogs.filter(l => 
          (u.email && l.userEmail && l.userEmail.toLowerCase() === u.email.toLowerCase()) ||
          (l.userId && (l.userId === u.id || l.userId === u.uid))
        );
        if (userLogs.length > 0) {
          userLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          latestLog = userLogs[0];
        }
      }

      let isOnline = false;
      if (isCurrentAuth) {
        isOnline = true;
      } else if (typeof u.isOnline === 'boolean') {
        isOnline = u.isOnline;
      } else if (u.status === 'Online' || u.status === 'Offline') {
        isOnline = (u.status === 'Online');
      } else if (latestLog) {
        isOnline = (latestLog.status === 'Online');
      }

      let timeVal = 0;
      if (u.lastActiveAt) {
        timeVal = new Date(u.lastActiveAt).getTime();
      } else if (u.lastLoginAt) {
        timeVal = new Date(u.lastLoginAt).getTime();
      } else if (latestLog && latestLog.timestamp) {
        timeVal = new Date(latestLog.timestamp).getTime();
      } else if (u.updatedAt) {
        timeVal = new Date(u.updatedAt).getTime();
      }

      if (isNaN(timeVal)) timeVal = 0;

      return { isOnline, timeVal, latestLog };
    }

    // Render Users Table
    window.renderUsersTable = function renderUsersTable() {
      const tbody = document.getElementById('usersTableBody');
      const countBadge = document.getElementById('userSearchResultCount');
      if (!tbody) return;

      if (allUsersList.length === 0) {
        if (countBadge) countBadge.textContent = 'แสดง 0 รายการ';
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีผู้ใช้งานลงทะเบียนในระบบ (users collection)</td></tr>`;
        return;
      }

      const searchQuery = (document.getElementById('userSearchInput')?.value || '').trim().toLowerCase();
      const roleFilter = document.getElementById('userRoleFilterSelect')?.value || 'ALL';

      const filteredList = allUsersList.filter(u => {
        const uRole = u.role || 'WORKER';
        if (roleFilter !== 'ALL' && uRole !== roleFilter) return false;

        if (searchQuery) {
          const name = (u.displayName || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const uid = (u.id || '').toLowerCase();
          const statusInfo = getUserOnlineStatusInfo(u);
          const statusStr = statusInfo.isOnline ? 'online' : 'offline';
          return name.includes(searchQuery) || email.includes(searchQuery) || uid.includes(searchQuery) || statusStr.includes(searchQuery);
        }
        return true;
      });

      // Sort: Online users first, then by most recently active/online timestamp descending
      filteredList.sort((a, b) => {
        const infoA = getUserOnlineStatusInfo(a);
        const infoB = getUserOnlineStatusInfo(b);

        // 1. Online status (Online first)
        if (infoA.isOnline && !infoB.isOnline) return -1;
        if (!infoA.isOnline && infoB.isOnline) return 1;

        // 2. Timestamp (newest active/online first)
        if (infoB.timeVal !== infoA.timeVal) {
          return infoB.timeVal - infoA.timeVal;
        }

        // 3. Alphabetical tie-breaker
        const nameA = a.displayName || a.email || '';
        const nameB = b.displayName || b.email || '';
        return nameA.localeCompare(nameB, 'th');
      });

      if (countBadge) {
        countBadge.textContent = `แสดง ${filteredList.length} / ${allUsersList.length} รายการ`;
      }

      if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-search me-1 text-warning"></i> ไม่พบรายชื่อผู้ใช้งานที่ตรงตามเงื่อนไขการค้นหา/กรอง</td></tr>`;
        return;
      }

      tbody.innerHTML = filteredList.map(u => {
        const uRole = u.role || 'WORKER';
        const img = u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
        const { isOnline, timeVal } = getUserOnlineStatusInfo(u);

        const onlineBadge = isOnline
          ? `<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-2.5 py-1.5 fw-bold fs-8 d-inline-flex align-items-center gap-1.5"><i class="bi bi-circle-fill text-success" style="font-size: 7px;"></i> Online</span>`
          : `<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2.5 py-1.5 fw-bold fs-8 d-inline-flex align-items-center gap-1.5"><i class="bi bi-circle-fill text-danger" style="font-size: 7px;"></i> Offline</span>`;

        let timeSubtitle = '';
        if (timeVal > 0 && typeof formatThaiBuddhistDateAndTime === 'function') {
          const formatted = formatThaiBuddhistDateAndTime(new Date(timeVal).toISOString());
          if (formatted && formatted.time24 && formatted.time24 !== '-') {
            timeSubtitle = `<small class="text-muted d-block font-monospace mt-0.5" style="font-size: 0.7rem !important;"><i class="bi bi-clock me-0.5"></i>${formatted.time24}</small>`;
          }
        }

        const safeName = typeof escapeHtml === 'function' ? escapeHtml(u.displayName || 'ผู้ใช้') : (u.displayName || 'ผู้ใช้');
        const safeEmail = typeof escapeHtml === 'function' ? escapeHtml(u.email || '-') : (u.email || '-');

        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <img src="${img}" class="rounded-circle" style="width: 32px; height: 32px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'" />
                <div>
                  <span class="fw-bold text-dark d-block">${safeName}</span>
                  <small class="text-muted font-monospace fs-8">UID: ${u.id.substring(0, 10)}...</small>
                </div>
              </div>
            </td>
            <td class="text-muted fs-8">${safeEmail}</td>
            <td class="text-center">
              ${onlineBadge}
              ${timeSubtitle}
            </td>
            <td class="text-center">
              <select id="userRoleSelect_${u.id}" class="form-select form-select-sm fw-semibold">
                <option value="ADMIN" ${uRole === 'ADMIN' ? 'selected' : ''}>🔴 ผู้ดูแลระบบ</option>
                <option value="MANAGER" ${uRole === 'MANAGER' ? 'selected' : ''}>🔵 เจ้าหน้าที่</option>
                <option value="WORKER" ${uRole === 'WORKER' ? 'selected' : ''}>🟢 พนักงาน</option>
              </select>
            </td>
            <td class="text-end pe-3">
              <button class="btn btn-sm btn-outline-success rounded-pill px-3 fw-semibold" onclick="updateFirestoreUserRole('${u.id}')">
                <i class="bi bi-check-lg me-1"></i> บันทึก
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Update User Role in Firestore
    window.updateFirestoreUserRole = async function(userId) {
      const selectElem = document.getElementById(`userRoleSelect_${userId}`);
      if (!selectElem || !db) return;
      const newRole = selectElem.value;
      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          role: newRole,
          updatedAt: new Date().toISOString()
        });
        showToast(`อัปเดตสิทธิ์ผู้ใช้เป็น ${newRole} เรียบร้อยแล้ว`);
        if (currentAuthUser && currentAuthUser.uid === userId) {
          setRole(newRole);
        }
      } catch (err) {
        showToast(`อัปเดตสิทธิ์ไม่สำเร็จ: ${err.message}`);
      }
    };

    const DEFAULT_EQUIPMENT_IMAGE = "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80";

    // Initial Data Generators
    function generateInitialEmployees() {
      const emps = [];
      const staffNames = [
        "สมชาย ใจดี", "นภา หัตถกรรม", "วิชัย การจัดการ", "สุดา สวนเกษตร", 
        "กิตติพงษ์ อำนวยการ", "พิมลพรรณ บัญชีสวน", "ธนพล ทรัพยากร", 
        "จิราพร ตรวจสอบ", "อนุรักษ์ โลจิสติกส์", "พรทิพย์ สารสนเทศ"
      ];
      staffNames.forEach((name, idx) => {
        const code = `SF-${String(idx + 1).padStart(2, '0')}`;
        emps.push({
          id: code,
          code: code,
          name: name,
          role: 'STAFF',
          department: 'แผนกงานธุรการ',
          phone: `081-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
          photoUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`
        });
      });

      const workerFirstNames = [
        "สุชาติ", "สมบูรณ์", "บุญมี", "วีระ", "ประเสริฐ", "สมพงษ์", "อุดม", "เฉลิม", "ปรีชา", "อำนาจ",
        "สุรินทร์", "สมเกียรติ", "สุวรรณ", "กิตติ", "มานพ", "สมศักดิ์", "วิเชียร", "สมชาย", "ธงชัย", "สนั่น",
        "มะลิ", "พิกุล", "กุหลาบ", "บัวงาม", "สายชล", "ดวงพร", "สุนีย์", "ทองคำ", "ดวงใจ", "วันเพ็ญ",
        "จันทรา", "สมพร", "ปราณี", "พรนภา", "วาสนา", "บุญช่วย", "สมใจ", "สุนิสา", "สายฝน", "รุ่งนภา",
        "กานต์", "จักรพรรดิ์", "ชานนท์", "ณรงค์", "ทศพล", "นพดล", "ปองพล", "พงศธร", "ภูวดล", "ยศกร",
        "รักษ์", "วรวุฒิ", "ศุภชัย", "สิริชัย", "อนันต์", "อภิสิทธิ์", "อมร", "อรุณ", "อานนท์", "เอกชัย"
      ];

      workerFirstNames.forEach((name, idx) => {
        const deptChoices = [
          "แผนกงานทดลอง",
          "แผนกทีมกุหลาบ",
          "แผนกทีมเจดีย์/แปลง G",
          "แผนกทีมแปลง A-B",
          "แผนกทีมแปลง E/P11",
          "แผนกทีมถนนธรรมชัย/เฟื้องฟ้า/ผสมดิน",
          "แผนกทีมไม้ดอกหลังวิหารคดคอร์ 13-20(ปอ)"
        ];
        const code = `WK-${String(idx + 1).padStart(2, '0')}`;
        emps.push({
          id: code,
          code: code,
          name: `${name} การเกษตร`,
          role: 'WORKER',
          department: deptChoices[idx % deptChoices.length],
          phone: `089-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
          photoUrl: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80`
        });
      });

      return emps;
    }

    function generateInitialEquipment() {
      return [
        {
          id: 'eq-001',
          code: 'CT-001',
          name: 'กรรไกรตัดแต่งกิ่งด้ามส้ม',
          category: 'เครื่องมือตัดแต่ง',
          quantity: 25,
          borrowedCount: 3,
          unit: 'อัน',
          location: 'โรงเก็บ A - ชั้น 1',
          imageUrl: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?w=600&auto=format&fit=crop&q=80',
          description: 'ใบมีดสแตนเลส คมกริบ เหมาะสำหรับตัดแต่งกิ่งกุหลาบและไม้ดอกประดับ'
        },
        {
          id: 'eq-002',
          code: 'IR-001',
          name: 'สายยางรดน้ำพร้อมหัวฉีดปรับระดับ (20 เมตร)',
          category: 'ระบบรดน้ำ',
          quantity: 15,
          borrowedCount: 5,
          unit: 'ม้วน',
          location: 'โรงเก็บ B - ล็อก 2',
          imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a80?w=600&auto=format&fit=crop&q=80',
          description: 'สายยางเหนียวพิเศษทนแดด ไม่พับหักง่าย พร้อมหัวฉีด 7 ระดับ'
        },
        {
          id: 'eq-003',
          code: 'SL-001',
          name: 'รถเข็นดินและอุปกรณ์สวน 2 ล้อ',
          category: 'อุปกรณ์เตรียมดิน',
          quantity: 8,
          borrowedCount: 2,
          unit: 'คัน',
          location: 'อาคารเครื่องจักร 1',
          imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
          description: 'โครงเหล็กหนา รับน้ำหนักได้สูงสุด 150 กก. เหมาะขนปุ๋ยและกระถาง'
        },
        {
          id: 'eq-004',
          code: 'IR-002',
          name: 'บัวรดน้ำพลาสติกทรงยาว 10 ลิตร',
          category: 'ระบบรดน้ำ',
          quantity: 30,
          borrowedCount: 4,
          unit: 'ใบ',
          location: 'โรงเก็บ A - ชั้น 2',
          imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&auto=format&fit=crop&q=80',
          description: 'ฝักบัวฝอน้ำละเอียด ถนอมหน้าดินและกล้าไม้ดอกเล็ก'
        },
        {
          id: 'eq-005',
          code: 'SF-001',
          name: 'ถุงมือการเกษตรกันหนามอย่างหนา',
          category: 'อุปกรณ์เซฟตี้และทั่วไป',
          quantity: 50,
          borrowedCount: 12,
          unit: 'คู่',
          location: 'ตู้เซฟตี้ 1',
          imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format&fit=crop&q=80',
          description: 'เคลือบยางไนไตรล์ ป้องกันกิ่งกุหลาบหนามแหลมและสารเคมี'
        },
        {
          id: 'eq-006',
          code: 'SL-002',
          name: 'จอบขุดและจอบถากเหล็กแท้',
          category: 'อุปกรณ์เตรียมดิน',
          quantity: 12,
          borrowedCount: 1,
          unit: 'เล่ม',
          location: 'คลังอุปกรณ์หนัก',
          imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
          description: 'ด้ามไม้เนื้อแข็ง เหนียว ทนทาน สำหรับพรวนดินและขุดย้ายกระถางใหญ่'
        },
        {
          id: 'eq-007',
          code: 'FT-001',
          name: 'เครื่องพ่นยาและพ่นปุ๋ยแบตเตอรี่ 20 ลิตร',
          category: 'สารบำรุงและปุ๋ย',
          quantity: 2,
          borrowedCount: 1,
          unit: 'เครื่อง',
          location: 'อาคารเคมีเกษตร',
          imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a80?w=600&auto=format&fit=crop&q=80',
          description: 'แรงดันสูง ละอองละเอียด เหมาะสำหรับฉีดพ่นปุ๋ยชีวภาพและยากันเชื้อรา'
        },
        {
          id: 'eq-008',
          code: 'CT-002',
          name: 'เลื่อยตัดแต่งกิ่งไม้ด้ามสไลด์ 3 เมตร',
          category: 'เครื่องมือตัดแต่ง',
          quantity: 1,
          borrowedCount: 0,
          unit: 'เล่ม',
          location: 'โรงเก็บ A - ชั้น 1',
          imageUrl: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?w=600&auto=format&fit=crop&q=80',
          description: 'ปรับความยาวได้ ตัดกิ่งไม้สูงโดยไม่ต้องปีนบันได ปลอดภัยสูง'
        },
        {
          id: 'eq-009',
          code: 'SL-003',
          name: 'เสียมขุดดินด้ามสแตนเลส',
          category: 'อุปกรณ์เตรียมดิน',
          quantity: 18,
          borrowedCount: 2,
          unit: 'เล่ม',
          location: 'คลังอุปกรณ์หนัก',
          imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
          description: 'เสียมขุดดินขนาดกลาง ปลายคม น้ำหนักเบา ขุดหลุมปลูกต้นไม้และพรวนดินได้สะดวก'
        },
        {
          id: 'eq-010',
          code: 'IR-003',
          name: 'สปรินเกอร์หมุน 360 องศารอบทิศทาง',
          category: 'ระบบรดน้ำ',
          quantity: 40,
          borrowedCount: 6,
          unit: 'ตัว',
          location: 'โรงเก็บ B - ล็อก 1',
          imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a80?w=600&auto=format&fit=crop&q=80',
          description: 'รัศมีกระจายน้ำกว้าง 10-12 เมตร แรงดันสม่ำเสมอ เหมาะสำหรับแปลงเพาะชำใหญ่'
        },
        {
          id: 'eq-011',
          code: 'SL-004',
          name: 'ช้อนพรวนดินและส้อมพรวนขนาดเล็ก',
          category: 'อุปกรณ์เตรียมดิน',
          quantity: 35,
          borrowedCount: 8,
          unit: 'ชุด',
          location: 'โรงเก็บ A - ชั้น 2',
          imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
          description: 'ชุดคู่พรวนดินสำหรับไม้กระถางและถาดเพาะชำ ด้ามจับกระชับมือ'
        },
        {
          id: 'eq-012',
          code: 'SF-002',
          name: 'เครื่องตัดหญ้าสะพายบ่า 4 จังหวะ',
          category: 'อุปกรณ์เซฟตี้และทั่วไป',
          quantity: 5,
          borrowedCount: 2,
          unit: 'เครื่อง',
          location: 'อาคารเครื่องจักร 2',
          imageUrl: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=600&auto=format&fit=crop&q=80',
          description: 'ประหยัดน้ำมัน เสียงเบา สตาร์ทติดง่าย เหมาะสำหรับตัดหญ้าและวัชพืชรอบแปลง'
        },
        {
          id: 'eq-013',
          code: 'PT-001',
          name: 'กระถางพลาสติกทรงสูง 12 นิ้ว (สีขาว)',
          category: 'ภาชนะและบรรจุภัณฑ์',
          quantity: 100,
          borrowedCount: 15,
          unit: 'ใบ',
          location: 'คลังวัสดุเพาะชำ',
          imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&auto=format&fit=crop&q=80',
          description: 'กระถางพลาสติกหนาคุณภาพสูง มีรูระบายน้ำดี เหมาะสำหรับเพาะปลูกไม้ประดับ'
        },
        {
          id: 'eq-014',
          code: 'SF-003',
          name: 'รองเท้าบูทยางกันน้ำทรงสูง',
          category: 'อุปกรณ์เซฟตี้และทั่วไป',
          quantity: 20,
          borrowedCount: 4,
          unit: 'คู่',
          location: 'ตู้เซฟตี้ 2',
          imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop&q=80',
          description: 'ยางพาราแท้กันลื่น ทนทาน ป้องกันน้ำ โคลน และสัตว์เลื้อยคลานในแปลงเกษตร'
        },
        {
          id: 'eq-015',
          code: 'IR-004',
          name: 'กระบอกฉีดน้ำแรงดันมือ 2 ลิตร (ฟ็อกกี้)',
          category: 'ระบบรดน้ำ',
          quantity: 22,
          borrowedCount: 3,
          unit: 'ใบ',
          location: 'โรงเก็บ A - ชั้น 3',
          imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&auto=format&fit=crop&q=80',
          description: 'หัวฉีดทองเหลืองปรับละอองละเอียด เหมาะสำหรับฉีดพ่นฮอร์โมนพืชทางใบ'
        },
        {
          id: 'eq-016',
          code: 'PT-002',
          name: 'ถาดเพาะกล้าพลาสติก 104 ช่อง',
          category: 'ภาชนะและบรรจุภัณฑ์',
          quantity: 80,
          borrowedCount: 10,
          unit: 'ถาด',
          location: 'เรือนกระจก 1',
          imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&auto=format&fit=crop&q=80',
          description: 'ถาดเพาะเมล็ดพันธุ์พลาสติกดำเหนียว ถอดต้นกล้าออกง่าย รากไม่เสียหาย'
        },
        {
          id: 'eq-017',
          code: 'FT-002',
          name: 'ปุ๋ยอินทรีย์ชีวภาพอัดเม็ด (กระสอบ 25 กก.)',
          category: 'สารบำรุงและปุ๋ย',
          quantity: 45,
          borrowedCount: 5,
          unit: 'กระสอบ',
          location: 'คลังปุ๋ยและสารบำรุง',
          imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=600&auto=format&fit=crop&q=80',
          description: 'สูตรบำรุงดินและราก อุดมด้วยอินทรียวัตถุ ปลอดสารเคมี เพิ่มความสมบูรณ์ให้พืช'
        },
        {
          id: 'eq-018',
          code: 'SL-005',
          name: 'พลั่วตักดินด้ามเหล็กหนา',
          category: 'อุปกรณ์เตรียมดิน',
          quantity: 14,
          borrowedCount: 3,
          unit: 'เล่ม',
          location: 'คลังอุปกรณ์หนัก',
          imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
          description: 'ใบพลั่วเหล็กกล้าทนทานสูง สำหรับตักปุ๋ย ตักผสมดิน และเคลื่อนย้ายวัสดุปลูก'
        },
        {
          id: 'eq-019',
          code: 'PT-003',
          name: 'ตะกร้าเก็บเกี่ยวผลผลิตพลาสติกหนา',
          category: 'ภาชนะและบรรจุภัณฑ์',
          quantity: 30,
          borrowedCount: 5,
          unit: 'ใบ',
          location: 'โรงเก็บ B - ชั้น 1',
          imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&auto=format&fit=crop&q=80',
          description: 'ตะกร้าโปร่งระบายอากาศดี ทนทาน ซ้อนเก็บได้ สะดวกย้ายดอกไม้และผลผลิต'
        },
        {
          id: 'eq-020',
          code: 'CT-003',
          name: 'กรรไกรดักหนีบตัดใบและดอกไม้แห้ง',
          category: 'เครื่องมือตัดแต่ง',
          quantity: 20,
          borrowedCount: 2,
          unit: 'อัน',
          location: 'โรงเก็บ A - ชั้น 1',
          imageUrl: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?w=600&auto=format&fit=crop&q=80',
          description: 'ปากหนีบปลายแหลม น้ำหนักเบา ตัดแต่งกลีบดอกไม้และใบแห้งอย่างประณีต'
        }
      ];
    }

    function generateInitialAttendance() {
      const todayStr = new Date().toLocaleDateString('th-TH');
      return [
        {
          id: 'att-01',
          employeeId: 'WK-01',
          employeeName: 'สุชาติ การเกษตร',
          status: 'เข้างาน',
          time: '07:45 น.',
          date: todayStr,
          note: 'เข้างานแปลงกุหลาบ A'
        },
        {
          id: 'att-02',
          employeeId: 'WK-02',
          employeeName: 'สมบูรณ์ การเกษตร',
          status: 'เข้างาน',
          time: '07:50 น.',
          date: todayStr,
          note: 'เตรียมอุปกรณ์เรือนกระจก'
        },
        {
          id: 'att-03',
          employeeId: 'WK-03',
          employeeName: 'บุญมี การเกษตร',
          status: 'ลาป่วย',
          time: '08:00 น.',
          date: todayStr,
          note: 'ไข้หวัด มีใบรับรองแพทย์'
        }
      ];
    }

    // LocalStorage Helper Functions - Disabled database entity caching to ensure Cloud Firestore is single source of truth
    function saveToLocalStorage() {
      try {
        localStorage.removeItem('flora_employees');
        localStorage.removeItem('flora_equipment');
        localStorage.removeItem('flora_transactions');
        localStorage.removeItem('flora_attendance');
        localStorage.removeItem('flora_categories');
        if (departmentsList && Array.isArray(departmentsList) && departmentsList.length > 0) {
          localStorage.setItem('flora_departments', JSON.stringify(departmentsList));
        }
        if (locationsList && Array.isArray(locationsList) && locationsList.length > 0) {
          localStorage.setItem('flora_locations', JSON.stringify(locationsList));
        }
      } catch (e) {
        console.warn("LocalStorage cleanup notice:", e);
      }
    }

    function loadFromLocalStorage() {
      try {
        saveToLocalStorage();
        employeeList = [];
        equipmentList = [];
        transactionHistory = [];
        attendanceLogs = [];
        categoriesList = [...defaultCategoriesList];
        const savedDepts = localStorage.getItem('flora_departments');
        if (savedDepts) {
          try {
            departmentsList = JSON.parse(savedDepts);
          } catch(e) {
            departmentsList = [...defaultDepartmentsList];
          }
        } else {
          departmentsList = [...defaultDepartmentsList];
        }

        const savedLocs = localStorage.getItem('flora_locations');
        if (savedLocs) {
          try {
            locationsList = JSON.parse(savedLocs);
          } catch(e) {
            locationsList = [...defaultLocationsList];
          }
        } else {
          locationsList = [...defaultLocationsList];
        }

        const deptMap = {
          "เจ้าหน้าที่สำนักงาน (Staff)": "แผนกงานธุรการ",
          "แผนกเรือนกระจกและเพาะชำ": "แผนกงานทดลอง",
          "แผนกตกแต่งและตัดแต่งกิ่ง": "แผนกทีมเจดีย์/แปลง G",
          "แผนกระบบน้ำและบำรุงดิน": "แผนกทีมถนนธรรมชัย/เฟื้องฟ้า/ผสมดิน",
          "สวนกุหลาบและไม้ดอก": "แผนกทีมกุหลาบ",
          "สวนไม้ผลและไม้ยืนต้น": "แผนกทีมไม้ดอกหลังวิหารคดคอร์ 13-20(ปอ)",
          "แผนกดูแลไม้ดอก (Rose & Tulip)": "แผนกทีมกุหลาบ",
          "แผนกไม้ประดับใบ (Indoor Flora)": "แผนกงานทดลอง"
        };

        const oldDepts = Object.keys(deptMap);
        departmentsList = (departmentsList || []).map(d => deptMap[d] || d);
        departmentsList = Array.from(new Set(departmentsList));
        if (departmentsList.length === 0 || departmentsList.some(d => oldDepts.includes(d))) {
          departmentsList = [...defaultDepartmentsList];
        }

        (employeeList || []).forEach(emp => {
          if (deptMap[emp.department]) {
            emp.department = deptMap[emp.department];
          }
        });
      } catch (e) {
        console.warn("LocalStorage load error:", e);
      }
    }

    // DOM Ready
    async function initApp() {
      loadFromLocalStorage();

      const dateElem = document.getElementById('todayDateSpan');
      if (dateElem) {
        dateElem.textContent = `ประจำวันที่ ${new Date().toLocaleDateString('th-TH')}`;
      }

      renderCategoryDropdowns();
      populateDepartmentDropdowns();
      populateLocationDropdowns();
      populateEmployeeDropdowns();
      populateEquipmentDropdown();
      populateQuickScanDropdown();

      renderCatalogGrid();
      renderStaffTable();
      renderHistoryTable();
      if (typeof renderAuditLogsTable === 'function') renderAuditLogsTable();
      renderEmployeeDirectory();
      renderAttendanceTable();

      updateStats();
      if (typeof window.handleQuickLogin === 'function') {
        window.handleQuickLogin('ADMIN', 'ผู้ดูแลระบบ (Admin)', 'jaru072@gmail.com');
      } else {
        setRole('ADMIN');
      }
      if (typeof window.hideMandatoryLoginScreen === 'function') {
        window.hideMandatoryLoginScreen();
      }
      if (typeof toggleTransTypeUI === 'function') toggleTransTypeUI();

      if (isFirebaseReady) setupFirestoreListeners();
      setupEventListeners();
    }

    // initApp will be invoked at the end of the script after all functions are loaded


    window.switchNavTab = function(tabId) {
      if (currentRole === 'WORKER' && (tabId === 'employees-tab' || tabId === 'manage-tab' || tabId === 'history-tab')) {
        showToast("⚠️ พนักงาน (Worker) ไม่มีสิทธิ์เข้าถึงเมนูนี้");
        return;
      }
      const tabElem = document.getElementById(tabId);
      if (tabElem) {
        const bsTab = new bootstrap.Tab(tabElem);
        bsTab.show();
      }
    };

    function updateGearMenuActiveState(activeTabId) {
      const mapping = {
        'catalog-tab': { itemId: 'gear-item-catalog', label: 'คลังอุปกรณ์', icon: 'bi-grid-fill' },
        'transaction-tab': { itemId: 'gear-item-transaction', label: 'บันทึก เบิก-จ่าย-ยืม-คืน', icon: 'bi-pencil-square' },
        'attendance-tab': { itemId: 'gear-item-attendance', label: 'ลงเวลาเข้า-ออก/การลา', icon: 'bi-clock-history' },
        'employees-tab': { itemId: 'gear-item-employees', label: 'รายชื่อบุคลากร', icon: 'bi-person-lines-fill' },
        'manage-tab': { itemId: 'gear-item-manage', label: 'จัดการคลังอุปกรณ์', icon: 'bi-tools' },
        'history-tab': { itemId: 'gear-item-history', label: 'ประวัติทำรายการ', icon: 'bi-card-checklist' }
      };

      const info = mapping[activeTabId];
      if (!info) return;

      document.querySelectorAll('[id^="gear-item-"]').forEach(item => item.classList.remove('active'));

      const gearItem = document.getElementById(info.itemId);
      if (gearItem) gearItem.classList.add('active');

      const labelElem = document.getElementById('activeGearMenuLabel');
      if (labelElem) labelElem.textContent = info.label;

      const titleElem = document.getElementById('currentSectionTitle');
      if (titleElem) titleElem.textContent = info.label;

      const iconElem = document.getElementById('currentSectionIcon');
      if (iconElem) {
        iconElem.className = `bi ${info.icon}`;
      }

      const btnCatLowStock = document.getElementById('btnFilterLowStockCatalog');
      if (btnCatLowStock) {
        if (activeTabId === 'catalog-tab') {
          if (typeof renderCatalogGrid === 'function') renderCatalogGrid();
        } else {
          btnCatLowStock.classList.add('d-none');
          btnCatLowStock.classList.remove('d-inline-flex');
        }
      }
    }

    function setupEventListeners() {
      // Tab change listeners
      document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', (e) => {
          updateGearMenuActiveState(e.target.id);
          if (e.target.id === 'auth-roles-tab') {
            loadUsersTableFromFirestore();
          } else if (e.target.id === 'history-tab') {
            renderHistoryTable();
          }
        });
      });

      // Search & Filters
      document.getElementById('catalogSearchInput')?.addEventListener('input', renderCatalogGrid);
      document.getElementById('catalogCategorySelect')?.addEventListener('change', renderCatalogGrid);
      document.getElementById('catalogStatusSelect')?.addEventListener('change', renderCatalogGrid);
      document.getElementById('staffSearchInput')?.addEventListener('input', renderStaffTable);
      document.getElementById('staffCategorySelect')?.addEventListener('change', renderStaffTable);
      document.getElementById('userSearchInput')?.addEventListener('input', renderUsersTable);
      document.getElementById('userRoleFilterSelect')?.addEventListener('change', renderUsersTable);
      document.getElementById('empSearchInput')?.addEventListener('input', renderEmployeeDirectory);
      document.getElementById('empSortSelect')?.addEventListener('change', renderEmployeeDirectory);
      document.getElementById('historySearchInput')?.addEventListener('input', renderHistoryTable);
      document.getElementById('historyFilterType')?.addEventListener('change', renderHistoryTable);

      // Forms
      document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
      const equipFormElem = document.getElementById('addEquipmentForm');
      if (equipFormElem) {
        equipFormElem.addEventListener('submit', handleSaveEquipment);
        equipFormElem.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
          }
        });
      }
      document.getElementById('addEmployeeForm')?.addEventListener('submit', handleSaveEmployee);
      document.getElementById('attendanceForm')?.addEventListener('submit', handleAttendanceSubmit);

      const equipCatSelect = document.getElementById('equipCategorySelect');
      if (equipCatSelect) {
        equipCatSelect.addEventListener('change', () => {
          if (typeof updateEquipmentCodeForCategory === 'function') {
            updateEquipmentCodeForCategory();
          }
        });
      }

      // Auth Forms & Buttons
      const loginForm = document.getElementById('emailLoginForm');
      if (loginForm) loginForm.addEventListener('submit', handleEmailLogin);

      const regForm = document.getElementById('emailRegisterForm');
      if (regForm) regForm.addEventListener('submit', handleEmailRegister);

      const btnGoogle = document.getElementById('btnGoogleSignIn');
      if (btnGoogle) btnGoogle.addEventListener('click', handleGoogleSignIn);

      const btnGoogleReg = document.getElementById('btnGoogleSignInReg');
      if (btnGoogleReg) btnGoogleReg.addEventListener('click', handleGoogleSignIn);

      // Initialize Backup Drop Zone Drag and Drop
      if (typeof initBackupDropZone === 'function') {
        initBackupDropZone();
      }

      const btnUpdateProf = document.getElementById('btnUpdateProfile');
      if (btnUpdateProf) btnUpdateProf.addEventListener('click', handleUpdateUserProfile);

      const btnSignOutElem = document.getElementById('btnSignOut');
      if (btnSignOutElem) btnSignOutElem.addEventListener('click', handleSignOut);

      const btnApplyDemo = document.getElementById('btnApplyDemoRole');
      if (btnApplyDemo) btnApplyDemo.addEventListener('click', applyDemoRoleChoice);

      // Quick QR confirmation
      document.getElementById('btnConfirmQrScan')?.addEventListener('click', handleQuickQrScanConfirm);

      // Prevent Worker from opening Auth & Profile Modal
      const userAuthModalElem = document.getElementById('userAuthModal');
      if (userAuthModalElem) {
        userAuthModalElem.addEventListener('show.bs.modal', function(e) {
          if (currentRole === 'WORKER') {
            e.preventDefault();
            if (typeof showToast === 'function') {
              showToast('⚠️ พนักงาน (Worker) ไม่มีสิทธิ์เข้าถึงระบบตรวจสอบสิทธิ์และโปรไฟล์ผู้ใช้');
            }
          }
        });
      }
    }

    function setRole(role) {
      currentRole = role;
      const roleBadge = document.getElementById('roleBannerBadge');
      const roleDesc = document.getElementById('roleBannerDesc');
      const navText = document.getElementById('currentRoleText');
      const navIcon = document.getElementById('currentRoleIcon');
      const workerNotice = document.getElementById('workerCatalogNotice');

      const roleConfig = {
        'ADMIN': {
          badgeClass: "badge bg-danger fs-7 px-3 py-2 rounded-pill shadow-sm",
          badgeHtml: '<i class="bi bi-shield-lock-fill me-1"></i> ผู้ดูแลระบบ',
          desc: "(สิทธิ์เต็มรูปแบบ: จัดการอุปกรณ์ พนักงาน หมวดหมู่ และสิทธิ์ผู้ใช้ทั้งหมด)",
          navText: `ผู้ดูแลระบบ`,
          navIcon: "bi bi-shield-lock-fill me-2 text-danger"
        },
        'MANAGER': {
          badgeClass: "badge bg-primary fs-7 px-3 py-2 rounded-pill shadow-sm",
          badgeHtml: '<i class="bi bi-briefcase-fill me-1"></i> เจ้าหน้าที่',
          desc: "(สิทธิ์ระดับบริหาร: จัดการอุปกรณ์ หมวดหมู่ อนุมัติการเบิก-ยืม และดูรายงาน)",
          navText: `เจ้าหน้าที่`,
          navIcon: "bi bi-briefcase-fill me-2 text-primary"
        },
        'WORKER': {
          badgeClass: "badge bg-success fs-7 px-3 py-2 rounded-pill shadow-sm",
          badgeHtml: '<i class="bi bi-person-fill me-1"></i> พนักงานทำเกษตร',
          desc: "(สิทธิ์เบิก-จ่าย-ยืม-คืน, สแกน QR, ลงเวลาทำงาน และดูคลังอุปกรณ์)",
          navText: `พนักงาน`,
          navIcon: "bi bi-person-badge me-2 text-success"
        },
        'STAFF': {
          badgeClass: "badge bg-primary fs-7 px-3 py-2 rounded-pill shadow-sm",
          badgeHtml: '<i class="bi bi-briefcase-fill me-1"></i> เจ้าหน้าที่สำนักงาน',
          desc: "(สิทธิ์จัดการคลังอุปกรณ์ พนักงาน และดูประวัติทำรายการ)",
          navText: `เจ้าหน้าที่`,
          navIcon: "bi bi-briefcase-fill me-2 text-primary"
        }
      };

      const cfg = roleConfig[role] || roleConfig['WORKER'];

      if (roleBadge) {
        roleBadge.className = cfg.badgeClass;
        roleBadge.innerHTML = cfg.badgeHtml;
      }
      if (roleDesc) roleDesc.textContent = cfg.desc;
      
      if (currentAuthUser) {
        if (navText) navText.textContent = `${currentAuthUser.displayName || currentUserProfile?.displayName || 'ผู้ใช้'}: ${cfg.navText}`;
      } else {
        if (navText) navText.textContent = `สิทธิ์: ${cfg.navText}`;
      }
      
      if (navIcon) navIcon.className = cfg.navIcon;

      if (role === 'WORKER') {
        if (workerNotice) workerNotice.classList.remove('d-none');
        document.querySelectorAll('.staff-only-element').forEach(el => el.classList.add('d-none'));

        const activeTab = document.querySelector('#mainTab .nav-link.active');
        if (activeTab && (activeTab.id === 'employees-tab' || activeTab.id === 'manage-tab' || activeTab.id === 'history-tab')) {
          switchNavTab('catalog-tab');
        }
      } else {
        if (workerNotice) workerNotice.classList.add('d-none');
        document.querySelectorAll('.staff-only-element').forEach(el => el.classList.remove('d-none'));
      }

      if (role === 'ADMIN') {
        document.querySelectorAll('.admin-only-element').forEach(el => el.classList.remove('d-none'));
      } else {
        document.querySelectorAll('.admin-only-element').forEach(el => el.classList.add('d-none'));
      }

      if (typeof window.updateAuthUI === 'function') {
        window.updateAuthUI();
      }

      if (typeof window.updateDbEditorMenuVisibility === 'function') {
        window.updateDbEditorMenuVisibility();
      }

      renderCatalogGrid();
      renderEmployeeDirectory();
      renderStaffTable();
      renderHistoryTable();
    }

    // Live Camera Module & Capture Helpers
    let cameraStream = null;
    let cameraTarget = 'EQUIPMENT';
    let cameraFacingMode = 'environment';
    let currentCapturedBlob = null;

    window.triggerMobileCamera = function(inputId) {
      const elem = document.getElementById(inputId);
      if (elem) elem.click();
    };

    window.openLiveCameraModal = async function(target) {
      cameraTarget = target;
      currentCapturedBlob = null;

      const modalTitle = document.getElementById('cameraModalTitle');
      if (modalTitle) {
        modalTitle.textContent = target === 'EMPLOYEE' ? 'ถ่ายภาพพนักงานด้วยกล้องสด' : 'ถ่ายภาพอุปกรณ์ด้วยกล้องสด';
      }

      const smallLabel = document.querySelector('label[for="camCompressSmall"]');
      const mediumLabel = document.querySelector('label[for="camCompressMedium"]');
      const largeLabel = document.querySelector('label[for="camCompressLarge"]');

      if (target === 'EMPLOYEE') {
        if (smallLabel) smallLabel.textContent = '🟢 เล็ก (1000px)';
        if (mediumLabel) mediumLabel.textContent = '🔵 กลาง (1600px) ⭐ Default';
        if (largeLabel) largeLabel.textContent = '🟣 ใหญ่ (2400px)';
      } else {
        if (smallLabel) smallLabel.textContent = '🟢 เล็ก (600px)';
        if (mediumLabel) mediumLabel.textContent = '🔵 กลาง (800px) ⭐ Default';
        if (largeLabel) largeLabel.textContent = '🟣 ใหญ่ (1200px)';
      }

      const videoElem = document.getElementById('cameraVideo');
      const snapshotPreview = document.getElementById('cameraSnapshotPreview');
      const errMsg = document.getElementById('cameraErrorMessage');
      const spinner = document.getElementById('cameraLoadingSpinner');

      if (videoElem) videoElem.classList.remove('d-none');
      if (snapshotPreview) snapshotPreview.classList.add('d-none');
      if (errMsg) errMsg.classList.add('d-none');
      if (spinner) spinner.classList.remove('d-none');

      document.getElementById('btnSnapPhoto').classList.remove('d-none');
      document.getElementById('btnRetakePhoto').classList.add('d-none');
      document.getElementById('btnUseCapturedPhoto').classList.add('d-none');

      const modalElem = document.getElementById('cameraCaptureModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();

      await startCameraStream();
    };

    async function startCameraStream() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }

      const videoElem = document.getElementById('cameraVideo');
      const spinner = document.getElementById('cameraLoadingSpinner');
      const errMsg = document.getElementById('cameraErrorMessage');

      try {
        const constraints = {
          video: {
            facingMode: cameraFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoElem) {
          videoElem.srcObject = cameraStream;
          await videoElem.play();
        }
        if (spinner) spinner.classList.add('d-none');
      } catch (err) {
        console.warn("Camera stream access notice:", err);
        if (spinner) spinner.classList.add('d-none');
        if (errMsg) errMsg.classList.remove('d-none');
      }
    }

    window.switchCameraFacingMode = async function() {
      cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
      const spinner = document.getElementById('cameraLoadingSpinner');
      if (spinner) spinner.classList.remove('d-none');
      await startCameraStream();
    };

    window.takeCameraSnapshot = async function() {
      const videoElem = document.getElementById('cameraVideo');
      const canvasElem = document.getElementById('cameraCanvas');
      const snapshotPreview = document.getElementById('cameraSnapshotPreview');

      if (!videoElem || !videoElem.videoWidth) {
        alert("กล้องยังไม่พร้อมใช้งาน");
        return;
      }

      canvasElem.width = videoElem.videoWidth;
      canvasElem.height = videoElem.videoHeight;

      const ctx = canvasElem.getContext('2d');
      ctx.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);

      const presetKey = document.querySelector('input[name="cameraCompressPreset"]:checked')?.value || 'MEDIUM';

      canvasElem.toBlob(async (rawBlob) => {
        if (!rawBlob) return;
        
        // Compress image snapshot based on preset
        const presetType = (cameraTarget === 'EMPLOYEE') ? 'EMPLOYEE' : 'EQUIPMENT';
        const compressedRes = await compressImageFileOrBlob(rawBlob, presetKey, presetType);
        currentCapturedBlob = compressedRes.blob;

        if (snapshotPreview) {
          snapshotPreview.src = compressedRes.dataUrl;
          snapshotPreview.classList.remove('d-none');
        }
        videoElem.classList.add('d-none');

        // Show compression stats badge
        const badgeElem = document.getElementById('cameraCompressStatsBadge');
        if (badgeElem) {
          badgeElem.innerHTML = `<i class="bi bi-file-zip-fill me-1"></i> บีบอัดภาพ (${compressedRes.presetName}): ${compressedRes.compressedSizeFormatted} (${compressedRes.width}x${compressedRes.height}px)`;
          badgeElem.classList.remove('d-none');
        }

        document.getElementById('btnSnapPhoto').classList.add('d-none');
        document.getElementById('btnRetakePhoto').classList.remove('d-none');
        document.getElementById('btnUseCapturedPhoto').classList.remove('d-none');
      }, 'image/jpeg', 0.95);
    };

    window.retakeCameraPhoto = function() {
      currentCapturedBlob = null;
      const videoElem = document.getElementById('cameraVideo');
      const snapshotPreview = document.getElementById('cameraSnapshotPreview');
      const badgeElem = document.getElementById('cameraCompressStatsBadge');

      if (videoElem) videoElem.classList.remove('d-none');
      if (snapshotPreview) snapshotPreview.classList.add('d-none');
      if (badgeElem) badgeElem.classList.add('d-none');

      document.getElementById('btnSnapPhoto').classList.remove('d-none');
      document.getElementById('btnRetakePhoto').classList.add('d-none');
      document.getElementById('btnUseCapturedPhoto').classList.add('d-none');
    };

    window.confirmUseCapturedPhoto = function() {
      if (!currentCapturedBlob) return;

      const file = new File([currentCapturedBlob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const container = new DataTransfer();
      container.items.add(file);

      if (cameraTarget === 'EMPLOYEE') {
        const input = document.getElementById('empPhotoFileInput');
        if (input) {
          input.files = container.files;
          previewSelectedImage(input, 'empPhotoPreview', 'empPhotoPreviewBox', 'empCompressPreset');
        }
      } else {
        const input = document.getElementById('equipImageFileInput');
        if (input) {
          input.files = container.files;
          previewSelectedImage(input, 'equipImgPreview', 'equipImgPreviewBox', 'equipCompressPreset');
        }
      }

      window.closeLiveCamera();
      showToast("📸 ถ่ายและบีบอัดภาพถ่ายเรียบร้อยแล้ว พร้อมอัปโหลด!");
    };

    window.closeLiveCamera = function() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      const badgeElem = document.getElementById('cameraCompressStatsBadge');
      if (badgeElem) badgeElem.classList.add('d-none');

      const modalElem = document.getElementById('cameraCaptureModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();
    };

    // Global Storage Image Optimization Settings
    window.storageImageOptimizationSettings = {
      enabled: true,
      format: 'webp', // 'webp' | 'jpeg'
      presetKey: 'MEDIUM', // SMALL, MEDIUM, LARGE
      maxFileSizeKB: 350,
      quality: 0.82
    };

    try {
      const savedOpt = localStorage.getItem('flora_image_optimization_settings');
      if (savedOpt) {
        window.storageImageOptimizationSettings = { ...window.storageImageOptimizationSettings, ...JSON.parse(savedOpt) };
      }
    } catch (e) {}

    window.openImageOptimizerModal = function() {
      if (typeof window.canAccessDatabaseEditor === 'function' && !window.canAccessDatabaseEditor()) {
        if (typeof showToast === 'function') showToast("⚠️ เฉพาะผู้ดูแลระบบ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์เข้าถึง ตั้งค่าบีบอัดรูปภาพ");
        else alert("⚠️ เฉพาะผู้ดูแลระบบ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์เข้าถึง ตั้งค่าบีบอัดรูปภาพ");
        return;
      }

      const modalElem = document.getElementById('imageOptimizationModal');
      if (!modalElem) return;

      const s = window.storageImageOptimizationSettings || {};
      const chk = document.getElementById('optToggleEnabled');
      const fmt = document.getElementById('optFormatSelect');
      const preset = document.getElementById('optPresetSelect');
      const maxKb = document.getElementById('optMaxFileSizeInput');

      if (chk) chk.checked = s.enabled !== false;
      if (fmt) fmt.value = s.format || 'webp';
      if (preset) preset.value = s.presetKey || 'MEDIUM';
      if (maxKb) maxKb.value = s.maxFileSizeKB || 350;

      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    // Image Compression Presets & Compressor Utility
    const EQUIPMENT_COMPRESSION_PRESETS = {
      SMALL: { name: 'เล็ก (600px)', maxWidth: 600, quality: 0.78 },
      MEDIUM: { name: 'กลาง (800px)', maxWidth: 800, quality: 0.85 },
      LARGE: { name: 'ใหญ่ (1200px)', maxWidth: 1200, quality: 0.90 }
    };

    const EMPLOYEE_COMPRESSION_PRESETS = {
      SMALL: { name: 'เล็ก (1000px)', maxWidth: 1000, quality: 0.78 },
      MEDIUM: { name: 'กลาง (1600px)', maxWidth: 1600, quality: 0.85 },
      LARGE: { name: 'ใหญ่ (2400px)', maxWidth: 2400, quality: 0.90 }
    };

    const IMAGE_COMPRESSION_PRESETS = EQUIPMENT_COMPRESSION_PRESETS;

    async function autoOptimizeAndResizeImage(fileOrBlob, options = {}) {
      if (!fileOrBlob) return null;

      const settings = {
        ...window.storageImageOptimizationSettings,
        ...options
      };

      if (!settings.enabled && !options.force) {
        const origSize = fileOrBlob.size || 0;
        const origSizeStr = origSize ? (origSize / 1024).toFixed(1) + ' KB' : 'N/A';
        return {
          file: fileOrBlob,
          blob: fileOrBlob,
          dataUrl: '',
          originalSize: origSize,
          compressedSize: origSize,
          originalSizeFormatted: origSizeStr,
          compressedSizeFormatted: origSizeStr,
          savedBytes: 0,
          savedPercent: 0,
          format: fileOrBlob.type || 'image/jpeg',
          extension: 'jpg',
          presetKey: options.presetKey || 'MEDIUM',
          presetName: 'ไม่บีบอัด (Original)'
        };
      }

      const presetType = options.presetType || 'EQUIPMENT';
      const presetKey = options.presetKey || settings.presetKey || 'MEDIUM';
      const presetsMap = (presetType === 'EMPLOYEE') ? EMPLOYEE_COMPRESSION_PRESETS : EQUIPMENT_COMPRESSION_PRESETS;
      const config = presetsMap[presetKey] || presetsMap.MEDIUM;

      const maxDimension = options.maxWidth || config.maxWidth || 800;
      const targetFormat = options.format || settings.format || 'webp';

      let mimeType = 'image/jpeg';
      let fileExt = 'jpg';
      if (targetFormat === 'webp') {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        if (testCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
          mimeType = 'image/webp';
          fileExt = 'webp';
        }
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            let initialQuality = options.quality || settings.quality || config.quality || 0.82;
            const targetMaxBytes = (settings.maxFileSizeKB || 350) * 1024;

            const compressWithQuality = (q) => {
              canvas.toBlob((blob) => {
                if (!blob) {
                  resolve({
                    file: fileOrBlob,
                    blob: fileOrBlob,
                    dataUrl: event.target.result,
                    originalSize: fileOrBlob.size || 0,
                    compressedSize: fileOrBlob.size || 0,
                    originalSizeFormatted: 'N/A',
                    compressedSizeFormatted: 'N/A',
                    savedBytes: 0,
                    savedPercent: 0,
                    format: mimeType,
                    extension: fileExt,
                    presetKey: presetKey,
                    presetName: config.name
                  });
                  return;
                }

                if (blob.size > targetMaxBytes && q > 0.45 && !options.skipDynamic) {
                  compressWithQuality(Math.max(0.40, q - 0.12));
                  return;
                }

                const rawName = fileOrBlob.name || `image_${Date.now()}`;
                const baseName = rawName.substring(0, rawName.lastIndexOf('.')) || rawName;
                const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
                const compressedFileName = `${safeName}.${fileExt}`;

                const compressedFile = new File([blob], compressedFileName, { type: mimeType });
                const origSize = fileOrBlob.size || blob.size;
                const newSize = blob.size;
                const savedBytes = Math.max(0, origSize - newSize);
                const savedPct = origSize > 0 ? Math.max(0, Math.round((savedBytes / origSize) * 100)) : 0;

                const origFormatted = origSize >= 1024 * 1024 ? (origSize / (1024 * 1024)).toFixed(2) + ' MB' : (origSize / 1024).toFixed(1) + ' KB';
                const newFormatted = newSize >= 1024 * 1024 ? (newSize / (1024 * 1024)).toFixed(2) + ' MB' : (newSize / 1024).toFixed(1) + ' KB';

                resolve({
                  file: compressedFile,
                  blob: blob,
                  dataUrl: canvas.toDataURL(mimeType, q),
                  originalSize: origSize,
                  compressedSize: newSize,
                  originalSizeFormatted: origFormatted,
                  compressedSizeFormatted: newFormatted,
                  savedBytes: savedBytes,
                  savedPercent: savedPct,
                  width: width,
                  height: height,
                  format: mimeType,
                  extension: fileExt,
                  presetKey: presetKey,
                  presetName: config.name,
                  qualityUsed: q
                });
              }, mimeType, q);
            };

            compressWithQuality(initialQuality);
          };
          img.onerror = () => resolve({ file: fileOrBlob, blob: fileOrBlob, dataUrl: event.target.result, originalSize: fileOrBlob.size||0, compressedSize: fileOrBlob.size||0, savedBytes: 0, savedPercent: 0, extension: 'jpg' });
          img.src = event.target.result;
        };
        reader.onerror = () => resolve({ file: fileOrBlob, blob: fileOrBlob, dataUrl: '', originalSize: 0, compressedSize: 0, savedBytes: 0, savedPercent: 0, extension: 'jpg' });
        reader.readAsDataURL(fileOrBlob);
      });
    }
    window.autoOptimizeAndResizeImage = autoOptimizeAndResizeImage;

    async function compressImageFileOrBlob(fileOrBlob, presetKey = 'MEDIUM', presetType = 'EQUIPMENT') {
      return await autoOptimizeAndResizeImage(fileOrBlob, { presetKey, presetType });
    }

    window.previewSelectedImage = async function(input, imgElementId, boxElementId, presetRadioName = null) {
      if (input.files && input.files[0]) {
        const rawFile = input.files[0];
        let presetKey = 'MEDIUM';

        if (presetRadioName) {
          const checkedRadio = document.querySelector(`input[name="${presetRadioName}"]:checked`);
          if (checkedRadio) presetKey = checkedRadio.value;
        }

        if (input.id === 'empPhotoFileInput' || input.id === 'empPhotoCameraInput') {
          const urlInput = document.getElementById('empPhotoUrlInput');
          if (urlInput) urlInput.value = '';
        }

        const presetType = (presetRadioName === 'empCompressPreset' || input.id === 'empPhotoFileInput' || input.id === 'empPhotoCameraInput') ? 'EMPLOYEE' : 'EQUIPMENT';

        const res = await compressImageFileOrBlob(rawFile, presetKey, presetType);

        const img = document.getElementById(imgElementId);
        const box = document.getElementById(boxElementId);
        if (img) img.src = res.dataUrl;
        if (box) box.classList.remove('d-none');

        // Replace input file with compressed file using DataTransfer
        if (res.file) {
          const dt = new DataTransfer();
          dt.items.add(res.file);
          input.files = dt.files;
        }

        // Show compressed size badge inside preview box if available
        if (box) {
          const infoBadge = box.querySelector('.compress-info-badge');
          if (infoBadge) {
            const fmtName = res.extension ? res.extension.toUpperCase() : 'WEBP';
            infoBadge.innerHTML = `<i class="bi bi-lightning-charge-fill text-warning me-1"></i> ย่อภาพ (${res.presetName} ${fmtName}): ${res.compressedSizeFormatted} <span class="badge bg-success bg-opacity-25 text-success ms-1">-${res.savedPercent}%</span>`;
            infoBadge.classList.remove('d-none');
          }
        }
      }
    };

    window.handleEmpPhotoUrlInput = function(val) {
      const img = document.getElementById('empPhotoPreview');
      const box = document.getElementById('empPhotoPreviewBox');
      const fileInput = document.getElementById('empPhotoFileInput');
      const cameraInput = document.getElementById('empPhotoCameraInput');

      if (fileInput) fileInput.value = '';
      if (cameraInput) cameraInput.value = '';

      if (val && val.trim()) {
        if (img) img.src = val.trim();
        if (box) box.classList.remove('d-none');
      } else {
        if (box) box.classList.add('d-none');
      }
    };

    window.recompressSelectedImage = function(inputId, imgElementId, boxElementId, presetRadioName) {
      const input = document.getElementById(inputId);
      if (input && input.files && input.files.length > 0) {
        previewSelectedImage(input, imgElementId, boxElementId, presetRadioName);
      }
    };

    // Backup & Restore module loaded from backup_restore.js

    // ==================== IMAGE DIAGNOSTIC & REPAIR MODULE ====================
    let imageDiagnosticData = {
      tested: false,
      total: 0,
      valid: 0,
      broken: 0,
      base64: 0,
      noImage: 0,
      filter: 'ALL',
      items: []
    };

    window.filterDiagResults = function(filter) {
      imageDiagnosticData.filter = filter;
      ['All', 'Broken', 'Base64', 'Valid'].forEach(f => {
        const btn = document.getElementById(`diagFilter${f}Btn`);
        if (btn) {
          if (f.toUpperCase() === filter) {
            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-light');
          } else {
            btn.classList.remove('active', 'btn-primary');
            btn.classList.add('btn-light');
          }
        }
      });
      renderDiagnosticTable();
    };

    window.runImageDiagnostic = async function() {
      const progressContainer = document.getElementById('diagnosticProgressContainer');
      const progressBar = document.getElementById('diagnosticProgressBar');
      const progressText = document.getElementById('diagnosticProgressText');
      const progressPercent = document.getElementById('diagnosticProgressPercent');
      const btnRepairAll = document.getElementById('btnRepairAllImages');

      if (progressContainer) progressContainer.classList.remove('d-none');

      const itemsToTest = [];

      // Equipment items
      (equipmentList || []).forEach(eq => {
        if (eq) {
          itemsToTest.push({
            id: eq.id,
            code: eq.code || eq.id || 'N/A',
            name: eq.name || 'ไม่มีชื่ออุปกรณ์',
            category: eq.category || 'ทั่วไป',
            imageUrl: eq.imageUrl || '',
            itemType: 'EQUIPMENT',
            rawRef: eq
          });
        }
      });

      // Employee items
      (employeeList || []).forEach(emp => {
        if (emp && emp.photoUrl) {
          itemsToTest.push({
            id: emp.id,
            code: emp.code || emp.id || 'EMP',
            name: `${emp.prefix || ''}${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'พนักงาน',
            category: emp.department || 'บุคลากร',
            imageUrl: emp.photoUrl || '',
            itemType: 'EMPLOYEE',
            rawRef: emp
          });
        }
      });

      imageDiagnosticData.tested = true;
      imageDiagnosticData.total = itemsToTest.length;
      imageDiagnosticData.valid = 0;
      imageDiagnosticData.broken = 0;
      imageDiagnosticData.base64 = 0;
      imageDiagnosticData.noImage = 0;
      imageDiagnosticData.items = [];

      showToast(`🔍 กำลังเริ่มตรวจวินิจฉัยรูปภาพทั้งหมด (${itemsToTest.length} รายการ)...`);

      for (let i = 0; i < itemsToTest.length; i++) {
        const item = itemsToTest[i];
        const pct = Math.round(((i + 1) / itemsToTest.length) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressText) progressText.textContent = `กำลังตรวจสอบ [${i + 1}/${itemsToTest.length}]: ${item.name}`;

        let status = 'VALID';
        let statusText = 'ลิงก์เข้าถึงรูปภาพใน Firebase Storage/URL ได้ถูกต้อง';

        if (!item.imageUrl || item.imageUrl.trim() === '') {
          status = 'NO_IMAGE';
          statusText = 'ไม่มีรูปภาพในระบบ';
          imageDiagnosticData.noImage++;
        } else if (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:')) {
          status = 'BASE64';
          statusText = 'ข้อมูลรูปภาพแบบ Base64 (พร้อมอัปโหลดขึ้น Storage)';
          imageDiagnosticData.base64++;
        } else {
          const isValid = await testImageUrlAccessibility(item.imageUrl);
          if (isValid) {
            status = 'VALID';
            statusText = 'ลิงก์ถูกต้องใน Firebase Storage/URL';
            imageDiagnosticData.valid++;
          } else {
            status = 'BROKEN';
            statusText = 'ลิงก์เสีย / ไม่พบไฟล์ใน Firebase Storage (404/Error)';
            imageDiagnosticData.broken++;
          }
        }

        imageDiagnosticData.items.push({
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          imageUrl: item.imageUrl,
          itemType: item.itemType,
          status: status,
          statusText: statusText,
          rawRef: item.rawRef
        });
      }

      if (progressText) progressText.textContent = `✅ ตรวจสอบเสร็จสิ้นทั้งหมด ${itemsToTest.length} รายการ`;
      setTimeout(() => {
        if (progressContainer) progressContainer.classList.add('d-none');
      }, 1500);

      const elTotal = document.getElementById('diagStatTotal');
      const elValid = document.getElementById('diagStatValid');
      const elBroken = document.getElementById('diagStatBroken');
      const elBase64 = document.getElementById('diagStatBase64');

      if (elTotal) elTotal.textContent = `${imageDiagnosticData.total} รายการ`;
      if (elValid) elValid.textContent = `${imageDiagnosticData.valid} รายการ`;
      if (elBroken) elBroken.textContent = `${imageDiagnosticData.broken} รายการ`;
      if (elBase64) elBase64.textContent = `${imageDiagnosticData.base64} รายการ`;

      if (btnRepairAll) {
        btnRepairAll.disabled = (imageDiagnosticData.broken === 0 && imageDiagnosticData.base64 === 0);
      }

      renderDiagnosticTable();
      showToast(`🎉 ตรวจวินิจฉัยเสร็จสิ้น: สมบูรณ์ ${imageDiagnosticData.valid}, ลิงก์เสีย ${imageDiagnosticData.broken}, Base64/ภายนอก ${imageDiagnosticData.base64}`);
    };

    async function testImageUrlAccessibility(url) {
      if (!url) return false;

      // 1. Firebase Storage ref test if initialized
      if (isFirebaseReady && storage && typeof url === 'string' && (url.includes('firebasestorage') || url.includes('storage.googleapis.com') || url.startsWith('gs://'))) {
        try {
          let storagePath = url;
          if (url.includes('/o/')) {
            storagePath = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
          } else if (url.startsWith('gs://')) {
            storagePath = url.replace(/^gs:\/\/[^\/]+\//, '');
          }
          const stRef = ref(storage, storagePath);
          await getDownloadURL(stRef);
          return true;
        } catch (stErr) {
          console.warn("Storage check notice:", stErr);
        }
      }

      // 2. Fetch HEAD test
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return true;
      } catch (e) {}

      // 3. Fallback HTML Image load test
      return new Promise((resolve) => {
        const img = new Image();
        let timer = setTimeout(() => {
          img.src = "";
          resolve(false);
        }, 5000);

        img.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        img.src = url;
      });
    }

    window.renderDiagnosticTable = function() {
      const tbody = document.getElementById('diagnosticTableBody');
      const searchInput = document.getElementById('diagSearchInput');
      const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

      if (!tbody) return;

      if (!imageDiagnosticData.tested) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-muted">
              <i class="bi bi-info-circle fs-3 text-info d-block mb-2"></i>
              กดปุ่ม <strong class="text-info">"เริ่มตรวจวินิจฉัยรูปภาพ"</strong> เพื่อเริ่มการตรวจสอบลิงก์รูปภาพทั้งหมดในระบบ
            </td>
          </tr>
        `;
        return;
      }

      let filtered = imageDiagnosticData.items.filter(item => {
        if (imageDiagnosticData.filter === 'BROKEN' && item.status !== 'BROKEN') return false;
        if (imageDiagnosticData.filter === 'BASE64' && item.status !== 'BASE64') return false;
        if (imageDiagnosticData.filter === 'VALID' && item.status !== 'VALID') return false;

        if (query) {
          const matchName = item.name.toLowerCase().includes(query);
          const matchCode = item.code.toLowerCase().includes(query);
          const matchCat = item.category.toLowerCase().includes(query);
          return matchName || matchCode || matchCat;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-muted">
              <i class="bi bi-check2-circle fs-3 text-success d-block mb-2"></i>
              ไม่พบรายการที่ตรงกับเงื่อนไขการกรอง
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      filtered.forEach(item => {
        let badgeHtml = '';
        let thumbHtml = '';

        if (item.status === 'VALID') {
          badgeHtml = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1"><i class="bi bi-check-circle-fill me-1"></i>สมบูรณ์ (Storage)</span>`;
          thumbHtml = `<img src="${item.imageUrl}" class="rounded-3 border style-object-cover" style="width: 44px; height: 44px;" onerror="this.src='https://via.placeholder.com/44?text=ERR'" />`;
        } else if (item.status === 'BROKEN') {
          badgeHtml = `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2 py-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>ลิงก์เสีย / ไม่พบไฟล์</span>`;
          thumbHtml = `<div class="bg-danger bg-opacity-10 text-danger rounded-3 d-flex align-items-center justify-content-center border border-danger border-opacity-25" style="width: 44px; height: 44px;"><i class="bi bi-image-fill fs-5"></i></div>`;
        } else if (item.status === 'BASE64') {
          badgeHtml = `<span class="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-25 rounded-pill px-2 py-1"><i class="bi bi-file-earmark-code me-1"></i>Base64 (ยังไม่ได้ซิงก์)</span>`;
          thumbHtml = `<img src="${item.imageUrl}" class="rounded-3 border style-object-cover" style="width: 44px; height: 44px;" />`;
        } else {
          badgeHtml = `<span class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-2 py-1"><i class="bi bi-dash-circle me-1"></i>ไม่มีรูปภาพ</span>`;
          thumbHtml = `<div class="bg-light text-secondary rounded-3 d-flex align-items-center justify-content-center border" style="width: 44px; height: 44px;"><i class="bi bi-card-image fs-5"></i></div>`;
        }

        const shortUrl = item.imageUrl ? (item.imageUrl.length > 30 ? item.imageUrl.substring(0, 30) + '...' : item.imageUrl) : '-';

        html += `
          <tr>
            <td class="ps-3">${thumbHtml}</td>
            <td>
              <div class="fw-bold text-dark">${item.name}</div>
              <div class="text-muted fs-8">รหัส: <code>${item.code}</code> <span class="badge bg-light text-dark border ms-1">${item.itemType === 'EQUIPMENT' ? 'อุปกรณ์' : 'พนักงาน'}</span></div>
            </td>
            <td><span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">${item.category}</span></td>
            <td>
              <div class="mb-1">${badgeHtml}</div>
              <div class="text-muted fs-8 font-monospace text-truncate style-max-w-200" title="${item.imageUrl}">${shortUrl}</div>
            </td>
            <td class="text-end pe-3">
              <div class="d-flex align-items-center justify-content-end gap-1">
                ${item.status !== 'NO_IMAGE' ? `
                  <button class="btn btn-sm btn-outline-success rounded-pill fs-8 px-2" onclick="repairSingleItem('${item.id}', '${item.itemType}')" title="ซ่อมแซมและอัปโหลดเข้า Firebase Storage">
                    <i class="bi bi-wrench me-1"></i>ซ่อมแซม
                  </button>
                ` : ''}
                <label class="btn btn-sm btn-outline-primary rounded-pill fs-8 px-2 mb-0" title="อัปโหลดรูปภาพใหม่ทดแทน">
                  <i class="bi bi-upload me-1"></i>เปลี่ยนรูป
                  <input type="file" accept="image/*" class="d-none" onchange="uploadReplacementImage(event, '${item.id}', '${item.itemType}')">
                </label>
                ${item.status === 'BROKEN' ? `
                  <button class="btn btn-sm btn-outline-danger rounded-pill fs-8 px-2" onclick="clearBrokenImageLink('${item.id}', '${item.itemType}')" title="ล้างลิงก์เสีย">
                    <i class="bi bi-trash"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    };

    // Single item repair
    window.repairSingleItem = async function(id, itemType) {
      const list = itemType === 'EQUIPMENT' ? equipmentList : employeeList;
      const item = (list || []).find(x => x && String(x.id) === String(id));
      if (!item) return;

      const imgField = itemType === 'EQUIPMENT' ? 'imageUrl' : 'photoUrl';
      const currentImg = item[imgField] || item.imageBase64 || item.photoBase64;

      if (!currentImg) {
        alert("⚠️ รายการนี้ไม่มีข้อมูลรูปภาพสำหรับการซ่อมแซม กรุณาใช้ปุ่ม 'เปลี่ยนรูป' เพื่อเลือกไฟล์รูปภาพใหม่");
        return;
      }

      showToast(`🛠️ กำลังซ่อมแซมและอัปโหลดรูปภาพสำหรับ ${item.name || item.code || id}...`);

      const folder = itemType === 'EQUIPMENT' ? "equipment_images" : "employee_photos";
      const safeCode = (item.code || item.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
      const newUrl = await uploadBase64OrUrlToFirebaseStorage(currentImg, folder, `${safeCode}.jpeg`, true);

      if (newUrl) {
        item[imgField] = newUrl;
        if (isFirebaseReady && db && item.id) {
          try {
            const collName = itemType === 'EQUIPMENT' ? "equipment" : "employees";
            await setDoc(doc(db, collName, item.id), item, { merge: true });
          } catch(e) {}
        }
        saveToLocalStorage();
        renderCatalogGrid();
        renderEmployeeDirectory();
        showToast("🎉 ซ่อมแซมและอัปโหลดรูปภาพขึ้น Firebase Storage เรียบร้อยแล้ว!");
        await runImageDiagnostic();
      } else {
        alert("⚠️ ไม่สามารถซ่อมแซมรูปภาพได้ กรุณาอัปโหลดรูปภาพใหม่ผ่านปุ่ม 'เปลี่ยนรูป'");
      }
    };

    // Upload new image replacement file
    window.uploadReplacementImage = async function(event, id, itemType) {
      const file = event.target.files[0];
      if (!file) return;

      const list = itemType === 'EQUIPMENT' ? equipmentList : employeeList;
      const item = (list || []).find(x => x && String(x.id) === String(id));
      if (!item) return;

      showToast("⏳ กำลังอ่านไฟล์และอัปโหลดรูปภาพใหม่ไปยัง Firebase Storage...");

      try {
        const imgField = itemType === 'EQUIPMENT' ? 'imageUrl' : 'photoUrl';
        const oldUrl = item[imgField];
        if (oldUrl && (oldUrl.includes('firebasestorage') || oldUrl.includes('storage.googleapis.com') || oldUrl.startsWith('gs://'))) {
          await deleteImageFromFirebaseStorage(oldUrl);
        }

        const b64 = await blobToBase64(file);
        const folder = itemType === 'EQUIPMENT' ? "equipment_images" : "employee_photos";
        const safeCode = (item.code || item.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
        const downloadUrl = await uploadBase64OrUrlToFirebaseStorage(b64, folder, `${safeCode}.jpeg`, true);

        item[imgField] = downloadUrl;

        if (isFirebaseReady && db && item.id) {
          const collName = itemType === 'EQUIPMENT' ? "equipment" : "employees";
          await setDoc(doc(db, collName, item.id), item, { merge: true });
        }

        saveToLocalStorage();
        renderCatalogGrid();
        renderEmployeeDirectory();
        showToast("🎉 เปลี่ยนรูปภาพใหม่และอัปโหลดเข้า Firebase Storage สำเร็จ!");
        await runImageDiagnostic();
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการเปลี่ยนรูปภาพ: " + err.message);
      }
    };

    // Clear broken link
    window.clearBrokenImageLink = async function(id, itemType) {
      const ok = await window.showConfirmDialog({
        title: "ล้างลิงก์รูปภาพ",
        message: "ต้องการล้างลิงก์รูปภาพที่เสียรายการนี้ออกหรือไม่?",
        type: "warning",
        confirmText: "ล้างลิงก์"
      });
      if (!ok) return;

      const list = itemType === 'EQUIPMENT' ? equipmentList : employeeList;
      const item = (list || []).find(x => x && String(x.id) === String(id));
      if (!item) return;

      const imgField = itemType === 'EQUIPMENT' ? 'imageUrl' : 'photoUrl';
      item[imgField] = '';

      if (isFirebaseReady && db && item.id) {
        try {
          const collName = itemType === 'EQUIPMENT' ? "equipment" : "employees";
          await setDoc(doc(db, collName, item.id), item, { merge: true });
        } catch(e) {}
      }

      saveToLocalStorage();
      renderCatalogGrid();
      renderEmployeeDirectory();
      showToast("ล้างลิงก์รูปภาพเรียบร้อยแล้ว");
      await runImageDiagnostic();
    };

    // Repair all broken images
    window.repairAllBrokenImages = async function() {
      if (!isFirebaseReady || !storage) {
        showToast("⚠️ Firebase Storage ยังไม่พร้อมใช้งาน");
        return;
      }

      const brokenAndBase64Items = imageDiagnosticData.items.filter(x => x.status === 'BROKEN' || x.status === 'BASE64');
      if (brokenAndBase64Items.length === 0) {
        showToast("🎉 รูปภาพทั้งหมดอยู่ในสถานะสมบูรณ์แล้ว");
        return;
      }

      const ok = await window.showConfirmDialog({
        title: "ซ่อมแซมรูปภาพ",
        message: `ต้องการซ่อมและอัปโหลดรูปภาพ ${brokenAndBase64Items.length} รายการ ขึ้น Firebase Storage หรือไม่?`,
        type: "primary",
        icon: "bi-wrench-adjustable-circle",
        confirmText: "ซ่อมแซมรูป"
      });
      if (!ok) return;

      showToast(`🛠️ กำลังซ่อมแซมและอัปโหลดรูปภาพ ${brokenAndBase64Items.length} รายการไปยัง Firebase Storage...`);
      let repairedCount = 0;

      for (const diagItem of brokenAndBase64Items) {
        const item = diagItem.rawRef;
        if (!item) continue;

        const imgField = diagItem.itemType === 'EQUIPMENT' ? 'imageUrl' : 'photoUrl';
        const rawImg = item[imgField] || item.imageBase64 || item.photoBase64;

        if (rawImg) {
          const folder = diagItem.itemType === 'EQUIPMENT' ? "equipment_images" : "employee_photos";
          const safeCode = (item.code || item.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
          const newUrl = await uploadBase64OrUrlToFirebaseStorage(rawImg, folder, `${safeCode}.jpg`, true);

          if (newUrl && newUrl !== item[imgField]) {
            item[imgField] = newUrl;
            repairedCount++;
            if (isFirebaseReady && db && item.id) {
              try {
                const collName = diagItem.itemType === 'EQUIPMENT' ? "equipment" : "employees";
                await setDoc(doc(db, collName, item.id), item, { merge: true });
              } catch(e) {}
            }
          }
        }
      }

      saveToLocalStorage();
      renderCatalogGrid();
      renderEmployeeDirectory();

      alert(`🎉 ซ่อมแซมและอัปโหลดรูปภาพขึ้น Firebase Storage สำเร็จทั้งหมด ${repairedCount} รายการ!`);
      showToast(`🎉 ซ่อมแซมรูปภาพสำเร็จ ${repairedCount} รายการ`);
      await runImageDiagnostic();
    };

    // Upload batch device images directly to Firebase Storage and auto-link to equipment or employees
    window.uploadBatchDeviceImagesToFirebaseStorage = async function(event) {
      const files = event.target.files ? Array.from(event.target.files) : [];
      if (!files || files.length === 0) return;

      updateBackupProgress(5, "กำลังเริ่มอัปโหลดรูปภาพขึ้น Server...", `เตรียมอัปโหลดไฟล์รูปภาพทั้งหมด ${files.length} ไฟล์`, true, "bg-info");
      showToast(`⏳ กำลังประมวลผลและอัปโหลดรูปภาพ ${files.length} ไฟล์ลงใน Firebase Storage...`);

      let uploadedCount = 0;
      let matchedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const p = 5 + Math.round(((i + 1) / files.length) * 90);
        updateBackupProgress(p, "กำลังอัปโหลดรูปภาพขึ้น Server...", `อัปโหลดไฟล์ (${i+1}/${files.length}): ${file.name}`, true, "bg-info");

        if (!file || !file.type || !file.type.startsWith('image/')) continue;

        const rawFileName = file.name;
        const nameWithoutExt = rawFileName.substring(0, rawFileName.lastIndexOf('.')) || rawFileName;
        const cleanName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '_');

        let matchedItem = null;
        let itemType = null;

        // 1. Try matching equipment
        for (const eq of (equipmentList || [])) {
          if (!eq) continue;
          const eqCode = String(eq.code || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
          const eqId = String(eq.id || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
          const eqName = String(eq.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');

          if ((eqCode && (cleanName === eqCode || cleanName.includes(eqCode) || cleanName.endsWith(`_${eqCode}`) || cleanName.startsWith(`equipment_${eqCode}`))) ||
              (eqId && (cleanName === eqId || cleanName.includes(eqId))) ||
              (eqName && (cleanName === eqName || cleanName.includes(eqName)))) {
            matchedItem = eq;
            itemType = 'EQUIPMENT';
            break;
          }
        }

        // 2. Try matching employee if not found in equipment
        if (!matchedItem) {
          for (const emp of (employeeList || [])) {
            if (!emp) continue;
            const empCode = String(emp.code || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const empId = String(emp.id || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const empName = String(emp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');

            if ((empCode && (cleanName === empCode || cleanName.includes(empCode) || cleanName.endsWith(`_${empCode}`) || cleanName.startsWith(`employee_${empCode}`))) ||
                (empId && (cleanName === empId || cleanName.includes(empId))) ||
                (empName && (cleanName === empName || cleanName.includes(empName)))) {
              matchedItem = emp;
              itemType = 'EMPLOYEE';
              break;
            }
          }
        }

        // 3. Fallback: If no direct code/name match, assign to item currently missing or having broken image link
        if (!matchedItem) {
          const brokenEquip = (equipmentList || []).find(e => e && (!e.imageUrl || e.imageUrl.includes('via.placeholder') || (typeof imageDiagnosticData !== 'undefined' && imageDiagnosticData.items && imageDiagnosticData.items.some(d => d.id === e.id && d.status === 'BROKEN'))));
          if (brokenEquip) {
            matchedItem = brokenEquip;
            itemType = 'EQUIPMENT';
          } else {
            const brokenEmp = (employeeList || []).find(e => e && (!e.photoUrl || e.photoUrl.includes('via.placeholder') || (typeof imageDiagnosticData !== 'undefined' && imageDiagnosticData.items && imageDiagnosticData.items.some(d => d.id === e.id && d.status === 'BROKEN'))));
            if (brokenEmp) {
              matchedItem = brokenEmp;
              itemType = 'EMPLOYEE';
            }
          }
        }

        try {
          const folder = (itemType === 'EMPLOYEE') ? "employee_photos" : "equipment_images";
          const safeCode = matchedItem ? (matchedItem.code || matchedItem.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_') : 'device_img';
          const defaultFileName = `${safeCode}.jpeg`;

          // ลบเฉพาะรูปภาพเก่าบน Firebase Storage ที่มีรหัสตรงกัน (เช่น SF-01 หรือ FG-001) ออกก่อน ป้องกันรูปภาพค้าง
          if (isFirebaseReady && storage) {
            if (matchedItem) {
              const oldImgUrl = (itemType === 'EMPLOYEE') ? matchedItem.photoUrl : matchedItem.imageUrl;
              if (oldImgUrl && typeof oldImgUrl === 'string' && (oldImgUrl.includes('firebasestorage') || oldImgUrl.includes('storage.googleapis.com') || oldImgUrl.startsWith('gs://'))) {
                console.log(`[Firebase Delete] ลบรูปภาพเก่าของรายการ ${matchedItem.code || matchedItem.id}:`, oldImgUrl);
                await deleteImageFromFirebaseStorage(oldImgUrl);
              }
            }
            if (safeCode && safeCode !== 'item' && safeCode !== 'device_img') {
              try {
                await deleteImageFromFirebaseStorage(`${folder}/${safeCode}.jpg`);
                await deleteImageFromFirebaseStorage(`${folder}/${safeCode}.jpeg`);
                await deleteImageFromFirebaseStorage(`${folder}/${safeCode}.png`);
              } catch (e) {}
            }
          }

          let downloadUrl = null;
          if (isFirebaseReady && storage) {
            try {
              downloadUrl = await uploadFileToFirebaseStorage(file, folder, 'MEDIUM', defaultFileName);
            } catch (uErr) {
              const b64 = await blobToBase64(file);
              downloadUrl = await uploadBase64OrUrlToFirebaseStorage(b64, folder, defaultFileName, true);
            }
          } else {
            const b64 = await blobToBase64(file);
            downloadUrl = b64;
          }

          if (downloadUrl) {
            uploadedCount++;
            if (matchedItem) {
              matchedCount++;
              const imgField = (itemType === 'EMPLOYEE') ? 'photoUrl' : 'imageUrl';
              matchedItem[imgField] = downloadUrl;

              if (isFirebaseReady && db && matchedItem.id) {
                try {
                  const collName = (itemType === 'EMPLOYEE') ? "employees" : "equipment";
                  await setDoc(doc(db, collName, matchedItem.id), matchedItem, { merge: true });
                } catch (e) {}
              }
            }
          }
        } catch (err) {
          console.warn("Upload batch image error:", file.name, err);
        }
      }

      saveToLocalStorage();
      renderCatalogGrid();
      renderEmployeeDirectory();
      if (typeof runImageDiagnostic === 'function') {
        await runImageDiagnostic();
      }

      updateBackupProgress(100, "อัปโหลดรูปภาพสำเร็จ 100%", `อัปโหลด ${uploadedCount} รูปภาพ (จับคู่ ${matchedCount} รายการ) เรียบร้อยแล้ว`, true, "bg-success");

      alert(`🎉 อัปโหลดไฟล์รูปภาพลง Firebase Storage สำเร็จแล้ว ${uploadedCount} รูปภาพ!\n(จับคู่และเชื่อมโยงข้อมูลอุปกรณ์/พนักงานสำเร็จ ${matchedCount} รายการ)`);
      showToast(`🎉 อัปโหลดสำเร็จ ${uploadedCount} รูปภาพ (จับคู่ ${matchedCount} รายการ)`);

      if (event.target) event.target.value = '';
    };

    // Firebase Storage Upload Helpers
    async function uploadFileToFirebaseStorage(file, folderName = "equipment_images", presetKey = 'MEDIUM', customFileName = null) {
      if (!isFirebaseReady || !storage) {
        throw new Error("Firebase Storage ยังไม่พร้อมใช้งาน");
      }
      let targetFile = file;
      let optStats = null;
      try {
        const presetType = (folderName === 'employee_photos') ? 'EMPLOYEE' : 'EQUIPMENT';
        optStats = await autoOptimizeAndResizeImage(file, { presetKey, presetType });
        if (optStats && optStats.file) {
          targetFile = optStats.file;
        }
      } catch (cErr) {
        console.warn("Auto compression notice before storage upload:", cErr);
      }

      let fileName = '';
      const ext = (optStats && optStats.extension) ? optStats.extension : 'webp';

      if (customFileName) {
        const cleanName = customFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const baseName = cleanName.replace(/\.(jpeg|jpg|png|webp)$/i, '');
        fileName = `${baseName}.${ext}`;
      } else {
        const safeName = targetFile.name ? targetFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.(jpeg|jpg|png|webp)$/i, '') : 'image';
        fileName = `${Date.now()}_${safeName}.${ext}`;
      }

      const storageRef = ref(storage, `${folderName}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, targetFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      if (optStats && optStats.savedPercent > 0) {
        console.log(`⚡ Auto Resized & Optimized before uploading (${folderName}/${fileName}): ${optStats.originalSizeFormatted} -> ${optStats.compressedSizeFormatted} (Saved ${optStats.savedPercent}%)`);
      }

      return downloadUrl;
    }

    async function uploadImageBlobToFirebaseStorage(imageUrl, folderName = "equipment_images", defaultName = "item.jpeg", presetKey = 'MEDIUM') {
      if (!imageUrl) return imageUrl;
      if (imageUrl.startsWith('data:image')) return imageUrl;

      if (isFirebaseReady && storage) {
        try {
          const res = await fetch(imageUrl);
          const rawBlob = await res.blob();
          const presetType = (folderName === 'employee_photos') ? 'EMPLOYEE' : 'EQUIPMENT';
          const optStats = await autoOptimizeAndResizeImage(rawBlob, { presetKey, presetType });
          const targetBlob = (optStats && optStats.blob) ? optStats.blob : rawBlob;
          const ext = (optStats && optStats.extension) ? optStats.extension : 'webp';

          const cleanName = defaultName ? defaultName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'item';
          const baseName = cleanName.replace(/\.(jpeg|jpg|png|webp)$/i, '');
          const fileName = `${baseName}.${ext}`;

          const storageRef = ref(storage, `${folderName}/${fileName}`);
          const snapshot = await uploadBytes(storageRef, targetBlob);
          const downloadUrl = await getDownloadURL(snapshot.ref);

          if (optStats && optStats.savedPercent > 0) {
            console.log(`⚡ Proxy Storage Upload Optimized (${folderName}/${fileName}): ${optStats.originalSizeFormatted} -> ${optStats.compressedSizeFormatted} (Saved ${optStats.savedPercent}%)`);
          }
          return downloadUrl;
        } catch (err) {
          console.warn("Proxy to Firebase Storage notice:", err.message);
        }
      }

      // Fallback: If local blob URL, convert to compressed base64 so other devices can load it
      if (imageUrl.startsWith('blob:')) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          return await compressImageToBase64(blob, 800, 0.8);
        } catch (e) {
          return imageUrl;
        }
      }

      return imageUrl;
    }

    function compressImageToBase64(fileOrBlob, maxWidth = 500, quality = 0.8) {
      return new Promise((resolve) => {
        if (!fileOrBlob) {
          resolve('');
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = () => resolve(e.target.result || '');
          img.src = e.target.result;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(fileOrBlob);
      });
    }

    window.getCategoryPrefix = function(categoryName) {
      if (!categoryName) return 'EQ';
      if (typeof categoriesList !== 'undefined' && Array.isArray(categoriesList)) {
        const cat = categoriesList.find(c => c.name === categoryName);
        if (cat && cat.prefix) return cat.prefix.toUpperCase();
      }
      const name = String(categoryName).trim();
      if (name.includes('ตัดแต่ง')) return 'CT';
      if (name.includes('รดน้ำ') || name.includes('สปรินเกอร์')) return 'IR';
      if (name.includes('เตรียมดิน') || name.includes('จอบ') || name.includes('เสียม') || name.includes('พรวน')) return 'SL';
      if (name.includes('ปุ๋ย') || name.includes('สารบำรุง') || name.includes('ดูแลพืช') || name.includes('เคมี')) return 'FT';
      if (name.includes('ภาชนะ') || name.includes('บรรจุภัณฑ์') || name.includes('กระถาง')) return 'PT';
      if (name.includes('เซฟตี้') || name.includes('ทั่วไป')) return 'SF';
      if (name.includes('เครื่องจักร')) return 'MC';
      return 'EQ';
    };

    window.fixEquipmentCodesToMatchCategories = async function(silent = false) {
      if (typeof currentRole !== 'undefined' && currentRole !== 'ADMIN') {
        if (!silent) showToast("⚠️ เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ปรับแก้ไขรหัสอุปกรณ์");
        return;
      }

      if (!silent) {
        const isConfirmed = await window.showConfirmDialog({
          title: "ปรับรหัสอุปกรณ์ตามหมวดหมู่",
          message: "การปรับรหัสอาจทำให้รูปภาพคลาดเคลื่อน ต้องการดำเนินการต่อหรือไม่?",
          type: "warning",
          icon: "bi-exclamation-triangle-fill",
          confirmText: "ยืนยันปรับรหัส"
        });
        if (!isConfirmed) return;
      }

      if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
        if (!silent) showToast("ไม่มีรายการอุปกรณ์ในระบบ");
        return;
      }

      let updateCount = 0;

      // Group equipment items by category prefix
      const groupedByPrefix = {};

      equipmentList.forEach((item, index) => {
        if (!item) return;
        const prefix = getCategoryPrefix(item.category || '');
        if (!groupedByPrefix[prefix]) {
          groupedByPrefix[prefix] = [];
        }
        groupedByPrefix[prefix].push({ item, originalIndex: index });
      });

      // For each prefix group, sort and re-assign continuous sequence starting from 001
      for (const prefix in groupedByPrefix) {
        const group = groupedByPrefix[prefix];

        // Sort items: items that already have numeric suffix for this prefix come first in order of their number,
        // followed by items without matching prefix or generic codes
        group.sort((a, b) => {
          const codeA = a.item.code ? String(a.item.code).trim().toUpperCase() : '';
          const codeB = b.item.code ? String(b.item.code).trim().toUpperCase() : '';

          const matchA = codeA.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
          const matchB = codeB.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));

          const numA = matchA ? parseInt(matchA[1], 10) : null;
          const numB = matchB ? parseInt(matchB[1], 10) : null;

          if (numA !== null && numB !== null) {
            return numA - numB;
          }
          if (numA !== null) return -1;
          if (numB !== null) return 1;

          return a.originalIndex - b.originalIndex;
        });

        // Re-assign continuous sequence starting from 001 (e.g. CT-001, CT-002, ...)
        for (let i = 0; i < group.length; i++) {
          const item = group[i].item;
          const newCode = `${prefix}-${String(i + 1).padStart(3, '0')}`;
          const oldCode = item.code;
          const oldId = item.id;

          if (oldCode !== newCode || oldId !== newCode) {
            item.code = newCode;
            item.id = newCode;
            item.updatedAt = new Date().toISOString();
            updateCount++;

            // Update transaction history if it references the old code or item id
            if (Array.isArray(transactionHistory) && oldCode) {
              transactionHistory.forEach(tx => {
                if (tx && (tx.equipmentCode === oldCode || tx.equipmentId === oldId)) {
                  tx.equipmentCode = newCode;
                  tx.equipmentId = newCode;
                }
              });
            }

            if (isFirebaseReady && db) {
              try {
                if (oldId && oldId !== newCode) {
                  await deleteDoc(doc(db, "equipment", oldId));
                }
                if (oldCode && oldCode !== newCode && oldCode !== oldId) {
                  await deleteDoc(doc(db, "equipment", oldCode));
                }
                await setDoc(doc(db, "equipment", newCode), item, { merge: true });
              } catch (dbErr) {
                console.warn("Firestore equipment code fix notice:", dbErr);
              }
            }
          }
        }
      }

      if (updateCount > 0) {
        saveToLocalStorage();
        if (typeof renderCatalogGrid === 'function') renderCatalogGrid();
        if (typeof renderStaffTable === 'function') renderStaffTable();
        if (typeof populateEquipmentDropdown === 'function') populateEquipmentDropdown();
        if (typeof populateQuickScanDropdown === 'function') populateQuickScanDropdown();
        if (typeof renderDbEditorTable === 'function') renderDbEditorTable();
        if (typeof updateStats === 'function') updateStats();

        if (!silent) {
          showToast(`⚡ ปรับแก้ไขเรียงรหัสอุปกรณ์เริ่มต้นตั้งแต่ 001 ตามหมวดหมู่เรียบร้อยแล้ว (${updateCount} รายการ)`);
        }
      } else if (!silent) {
        showToast("รหัสอุปกรณ์ทุกรายการเรียงลำดับเริ่มต้นตั้งแต่ 001 ถูกต้องตามหมวดหมู่อยู่แล้ว");
      }
    };

    window.generateNextEquipmentCode = function(categoryName) {
      if (!categoryName) return 'EQ-001';
      const prefix = getCategoryPrefix(categoryName);
      let maxNum = 0;
      (equipmentList || []).forEach(item => {
        if (item && item.code) {
          const codeStr = String(item.code).trim();
          const match = codeStr.match(new RegExp(`^${prefix}-?(\\d+)$`, 'i'));
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      });
      const nextNum = maxNum + 1;
      return `${prefix}-${String(nextNum).padStart(3, '0')}`;
    };

    window.updateEquipmentCodeForCategory = function() {
      const editId = document.getElementById('editEquipId')?.value;
      if (!editId) {
        const catSelect = document.getElementById('equipCategorySelect');
        let selectedCat = catSelect ? catSelect.value : '';
        if (!selectedCat && catSelect && catSelect.options.length > 1) {
          catSelect.selectedIndex = 1;
          selectedCat = catSelect.value;
        }
        const codeInput = document.getElementById('equipCodeInput');
        if (codeInput) {
          if (selectedCat) {
            codeInput.value = generateNextEquipmentCode(selectedCat);
          } else {
            codeInput.value = '';
          }
        }
      }
    };

    // Save Equipment
    async function handleSaveEquipment(e) {
      e.preventDefault();

      const nameThai = document.getElementById('equipNameThai').value.trim();
      const category = document.getElementById('equipCategorySelect').value;
      const editId = document.getElementById('editEquipId').value;
      let code = document.getElementById('equipCodeInput').value.trim();
      
      const expectedPrefix = getCategoryPrefix(category);
      if (!editId || !code || !code.toUpperCase().startsWith(expectedPrefix + '-')) {
        code = generateNextEquipmentCode(category);
      }
      const qty = parseInt(document.getElementById('equipQtyInput').value) || 0;
      const minQtyVal = parseInt(document.getElementById('equipMinQtyInput')?.value);
      const minQty = !isNaN(minQtyVal) ? minQtyVal : 3;
      const unit = document.getElementById('equipUnitInput').value.trim() || 'อัน';
      const location = document.getElementById('equipLocationInput').value.trim() || 'โรงเก็บอุปกรณ์';
      const manualUrl = document.getElementById('equipManualImgUrl').value.trim();
      const desc = document.getElementById('equipDescInput').value.trim();
      const fileInput = document.getElementById('equipImageFileInput');
      const cameraInput = document.getElementById('equipImageCameraInput');

      const selectedEquipFile = (fileInput && fileInput.files && fileInput.files.length > 0)
        ? fileInput.files[0]
        : ((cameraInput && cameraInput.files && cameraInput.files.length > 0) ? cameraInput.files[0] : null);

      const overlay = document.getElementById('autoSearchLoadingOverlay');
      const stepTitle = document.getElementById('loadingStepTitle');
      const stepDetail = document.getElementById('loadingStepDetail');

      overlay.classList.remove('d-none');

      try {
        let finalImageUrl = '';
        const safeEquipCode = (code || 'equipment').replace(/[^a-zA-Z0-9_-]/g, '_');
        const equipFileName = `${safeEquipCode}.jpeg`;

        if (selectedEquipFile) {
          const presetKey = document.querySelector('input[name="equipCompressPreset"]:checked')?.value || 'MEDIUM';
          if (stepTitle) stepTitle.textContent = "กำลังอัปโหลดและบีบอัดรูปภาพไปยัง Firebase Storage...";
          if (stepDetail) stepDetail.textContent = `ระบบกำลังบีบอัดไฟล์รูปภาพเป็นขนาด ${presetKey === 'SMALL' ? 'เล็ก' : (presetKey === 'LARGE' ? 'ใหญ่' : 'กลาง')} และจัดเก็บเข้า Storage ในชื่อ ${equipFileName}...`;
          try {
            finalImageUrl = await uploadFileToFirebaseStorage(selectedEquipFile, "equipment_images", presetKey, equipFileName);
          } catch (stErr) {
            console.warn("Firebase Storage upload failed for equipment, using base64 fallback:", stErr);
            finalImageUrl = await compressImageToBase64(selectedEquipFile, presetKey === 'SMALL' ? 600 : (presetKey === 'LARGE' ? 1200 : 800), 0.85);
          }
        } else if (manualUrl) {
          if (stepTitle) stepTitle.textContent = "กำลังบันทึกข้อมูลอุปกรณ์...";
          if (stepDetail) stepDetail.textContent = "ระบบกำลังประมวลผลข้อมูลและรูปภาพ...";
          finalImageUrl = await uploadImageBlobToFirebaseStorage(manualUrl, "equipment_images", equipFileName);
        } else {
          if (editId) {
            const existing = equipmentList.find(x => x.id === editId);
            finalImageUrl = existing && existing.imageUrl ? existing.imageUrl : DEFAULT_EQUIPMENT_IMAGE;
          } else {
            finalImageUrl = DEFAULT_EQUIPMENT_IMAGE;
          }
        }

        // Ensure finalImageUrl is portable and not a device-local blob URL
        if (finalImageUrl && finalImageUrl.startsWith('blob:')) {
          try {
            const res = await fetch(finalImageUrl);
            const blob = await res.blob();
            finalImageUrl = await compressImageToBase64(blob, 800, 0.8);
          } catch (blobErr) {
            console.warn("Failed to convert blob URL to base64:", blobErr);
          }
        }

        let borrowed = 0;
        let createdTime = new Date().toISOString();
        if (editId) {
          const existing = equipmentList.find(x => x.id === editId || x.code === editId);
          if (existing) {
            if (existing.borrowedCount !== undefined) borrowed = existing.borrowedCount;
            if (existing.createdAt) createdTime = existing.createdAt;
          }
        }

        const docId = code || editId || ('eq-' + String(Date.now()).slice(-5));

        const equipmentItem = {
          id: docId,
          code: code,
          name: nameThai,
          category: category,
          quantity: qty,
          minQuantity: minQty,
          borrowedCount: borrowed,
          unit: unit,
          location: location,
          imageUrl: finalImageUrl,
          description: desc,
          createdAt: createdTime,
          updatedAt: new Date().toISOString()
        };

        // If updating and editId was different from the new docId (e.g. old ID was eq-12345 or code changed), delete old doc from Firestore
        if (isFirebaseReady && db && editId && editId !== docId) {
          try {
            await deleteDoc(doc(db, "equipment", editId));
          } catch(delErr) {
            console.warn("Delete old equipment doc notice:", delErr);
          }
        }

        // Always save locally first to ensure memory and localStorage contain full inventory
        saveLocalEquipment(equipmentItem, editId);

        if (isFirebaseReady && db) {
          try {
            await setDoc(doc(db, "equipment", docId), equipmentItem, { merge: true });
          } catch (dbErr) {
            console.warn("Firestore save fallback notice:", dbErr);
          }
        }

        saveToLocalStorage();

        await delay(300);
        overlay.classList.add('d-none');

        const modalElem = document.getElementById('addEquipmentModal');
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();

        if (typeof logAuditAction === 'function') {
          const actionType = editId ? 'แก้ไข' : 'เพิ่ม';
          const detailsText = editId 
            ? `แก้ไขข้อมูลอุปกรณ์ "${nameThai}" [${code}] (หมวดหมู่: ${category}, จำนวน: ${qty} ${unit})`
            : `เพิ่มอุปกรณ์ใหม่ "${nameThai}" [${code}] (หมวดหมู่: ${category}, จำนวน: ${qty} ${unit})`;
          logAuditAction('อุปกรณ์', actionType, detailsText, docId);
        }

        showToast(`บันทึกอุปกรณ์ "${nameThai}" เรียบร้อยแล้ว (ซิงก์ภาพอัตโนมัติ)!`);
        renderCatalogGrid();
        renderStaffTable();
        populateEquipmentDropdown();
        populateQuickScanDropdown();
        updateStats();

      } catch (err) {
        overlay.classList.add('d-none');
        alert(" เกิดข้อผิดพลาดในการอัปโหลดรูป/บันทึก: " + err.message);
      }
    }

    function saveLocalEquipment(item, editId) {
      if (item.code) {
        item.id = item.code;
      }
      if (editId) {
        const idx = equipmentList.findIndex(x => x.id === editId || x.code === editId || (item.code && x.code === item.code));
        if (idx !== -1) equipmentList[idx] = { ...equipmentList[idx], ...item, id: item.code || item.id };
        else equipmentList.unshift(item);
      } else {
        if (!item.id) item.id = item.code || ('eq-' + String(Date.now()).slice(-5));
        const existingIdx = equipmentList.findIndex(x => x.id === item.id || (item.code && x.code === item.code));
        if (existingIdx !== -1) equipmentList[existingIdx] = item;
        else equipmentList.unshift(item);
      }
      saveToLocalStorage();
    }

    // Save Employee
    async function handleSaveEmployee(e) {
      e.preventDefault();
      const editId = document.getElementById('editEmpIdHidden').value;
      const name = document.getElementById('empNameInput').value.trim();
      const nickname = document.getElementById('empNicknameInput') ? document.getElementById('empNicknameInput').value.trim() : '';
      const roleElem = document.getElementById('empRoleSelect');
      let role = roleElem ? roleElem.value : 'WORKER';
      if (!roleElem && editId) {
        const existing = employeeList.find(x => x.id === editId);
        if (existing && existing.role) role = existing.role;
      }
      const deptSelect = document.getElementById('empDeptSelect');
      const dept = (deptSelect && deptSelect.value) ? deptSelect.value.trim() : (document.getElementById('empDeptInput')?.value.trim() || '');
      if (!dept) {
        alert("กรุณาเลือกแผนก");
        return;
      }
      const positionSelect = document.getElementById('empPositionSelect');
      const position = positionSelect ? positionSelect.value : '';
      const details = document.getElementById('empDetailsInput') ? document.getElementById('empDetailsInput').value.trim() : '';
      const phone = document.getElementById('empPhoneInput').value.trim() || '081-000-0000';
      const photoUrlInput = document.getElementById('empPhotoUrlInput').value.trim();
      const fileInput = document.getElementById('empPhotoFileInput');
      const cameraInput = document.getElementById('empPhotoCameraInput');

      const selectedEmpFile = (fileInput && fileInput.files && fileInput.files.length > 0)
        ? fileInput.files[0]
        : ((cameraInput && cameraInput.files && cameraInput.files.length > 0) ? cameraInput.files[0] : null);

      const code = document.getElementById('empCodeInput').value.trim() || (editId || `${role === 'STAFF' ? 'SF' : 'WK'}-${String(employeeList.length + 1).padStart(2, '0')}`);
      const docId = editId || code;
      const safeEmpCode = (code || docId || 'employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      const empFileName = `${safeEmpCode}.jpeg`;

      let finalPhotoUrl = '';
      const existingEmp = editId ? employeeList.find(x => x.id === editId) : null;
      const oldPhotoUrl = existingEmp ? existingEmp.photoUrl : null;

      const empPreset = document.querySelector('input[name="empCompressPreset"]:checked')?.value || 'MEDIUM';

      try {
        if (selectedEmpFile) {
          showToast(`กำลังอัปโหลดรูปถ่ายพนักงานชื่อไฟล์ ${empFileName}...`);
          try {
            finalPhotoUrl = await uploadFileToFirebaseStorage(selectedEmpFile, "employee_photos", empPreset, empFileName);
          } catch (stErr) {
            console.warn("Firebase Storage upload failed, converting to Base64:", stErr);
            const targetDim = empPreset === 'SMALL' ? 1000 : (empPreset === 'LARGE' ? 2400 : 1600);
            finalPhotoUrl = await compressImageToBase64(selectedEmpFile, targetDim, 0.85);
          }
        } else if (photoUrlInput) {
          if (photoUrlInput.startsWith('data:') || photoUrlInput.startsWith('http://') || photoUrlInput.startsWith('https://')) {
            finalPhotoUrl = photoUrlInput;
          } else if (photoUrlInput.startsWith('blob:')) {
            try {
              finalPhotoUrl = await uploadImageBlobToFirebaseStorage(photoUrlInput, "employee_photos", empFileName);
            } catch (bErr) {
              const res = await fetch(photoUrlInput);
              const blob = await res.blob();
              const targetDim = empPreset === 'SMALL' ? 1000 : (empPreset === 'LARGE' ? 2400 : 1600);
              finalPhotoUrl = await compressImageToBase64(blob, targetDim, 0.85);
            }
          } else {
            finalPhotoUrl = photoUrlInput;
          }
        } else if (existingEmp && existingEmp.photoUrl) {
          finalPhotoUrl = existingEmp.photoUrl;
        } else {
          finalPhotoUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`;
        }
      } catch (err) {
        console.warn("Storage upload fallback:", err);
        finalPhotoUrl = photoUrlInput || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`;
      }

      // Ensure finalPhotoUrl is portable and not a device-local blob URL
      if (finalPhotoUrl && finalPhotoUrl.startsWith('blob:')) {
        try {
          const res = await fetch(finalPhotoUrl);
          const blob = await res.blob();
          const targetDim = empPreset === 'SMALL' ? 1000 : (empPreset === 'LARGE' ? 2400 : 1600);
          finalPhotoUrl = await compressImageToBase64(blob, targetDim, 0.85);
        } catch (blobErr) {
          console.warn("Failed to convert employee blob photo to base64:", blobErr);
        }
      }

      // Automatically delete old photo from Firebase Storage if replaced by a new photo
      if (oldPhotoUrl && oldPhotoUrl !== finalPhotoUrl) {
        deleteImageFromFirebaseStorage(oldPhotoUrl);
      }

      const empData = {
        id: docId,
        code: code,
        name: name,
        nickname: nickname,
        role: role,
        department: dept,
        position: position,
        details: details,
        phone: phone,
        photoUrl: finalPhotoUrl,
        updatedAt: new Date().toISOString()
      };

      if (editId) {
        const idx = employeeList.findIndex(x => x.id === editId);
        if (idx !== -1) employeeList[idx] = empData;
      } else {
        const existingIdx = employeeList.findIndex(x => x.id === docId);
        if (existingIdx !== -1) {
          employeeList[existingIdx] = empData;
        } else {
          employeeList.unshift(empData);
        }
      }

      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          await setDoc(doc(db, "employees", docId), empData, { merge: true });
        } catch(e){
          console.warn("Firestore employee save error:", e);
        }
      }

      const modalElem = document.getElementById('addEmployeeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      if (typeof logAuditAction === 'function') {
        const actionType = editId ? 'แก้ไข' : 'เพิ่ม';
        const detailsText = editId 
          ? `แก้ไขข้อมูลบุคลากร "${name}" [${code || docId}] (แผนก: ${dept}, ตำแหน่ง: ${position || '-'})`
          : `เพิ่มบุคลากรใหม่ "${name}" [${code || docId}] (แผนก: ${dept}, ตำแหน่ง: ${position || '-'})`;
        logAuditAction('บุคลากร', actionType, detailsText, docId);
      }

      showToast(`บันทึกข้อมูลพนักงาน "${name}" เรียบร้อยแล้ว (ซิงก์เรียลไทม์)`);
      renderEmployeeDirectory();
      populateEmployeeDropdowns();
      renderStaffTable();
      updateStats();
    }

    // Attendance Submission
    function handleAttendanceSubmit(e) {
      e.preventDefault();
      const empId = document.getElementById('attEmpSelect')?.value;
      const status = document.querySelector('input[name="attStatus"]:checked')?.value || 'เข้างาน';
      const note = document.getElementById('attNote')?.value.trim() || '';

      if (!empId) {
        alert("กรุณาเลือกพนักงาน");
        return;
      }

      const emp = employeeList.find(x => x.id === empId);
      if (!emp) {
        alert("ไม่พบข้อมูลพนักงาน");
        return;
      }

      const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      const todayStr = new Date().toLocaleDateString('th-TH');

      const logEntry = {
        id: 'att-' + String(Date.now()).slice(-6),
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.code || emp.id,
        department: emp.department || 'ไม่ระบุ',
        status: status,
        time: timeStr,
        date: todayStr,
        note: note || '-',
        timestamp: new Date().toISOString()
      };

      attendanceLogs.unshift(logEntry);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        addDoc(collection(db, "attendance"), logEntry).catch(() => {});
      }

      showToast(`🟢 บันทึกเวลา "${status}" ของคุณ${emp.name} เรียบร้อยแล้ว`);
      document.getElementById('attendanceForm')?.reset();
      renderAttendanceTable();
      updateStats();
    }

    // ==========================================
    // MULTI-ITEM TRANSACTION CART ENGINE
    // ==========================================
    let selectedTransItems = [];

    window.addCurrentEquipToCart = function() {
      const equipSelect = document.getElementById('equipSelect');
      const equipId = equipSelect ? equipSelect.value : '';
      const qtyInput = document.getElementById('transQty');
      const qty = parseInt(qtyInput ? qtyInput.value : '1') || 1;

      if (!equipId) {
        alert("⚠️ กรุณาเลือกอุปกรณ์การเกษตรที่ต้องการเพิ่มเข้าเอกสารก่อน");
        return;
      }

      if (qty <= 0) {
        alert("⚠️ กรุณาระบุจำนวนอย่างน้อย 1 ชิ้น");
        return;
      }

      const item = equipmentList.find(x => x.id === equipId);
      if (!item) {
        alert("❌ ไม่พบข้อมูลอุปกรณ์ที่เลือก");
        return;
      }

      const type = document.querySelector('input[name="transType"]:checked')?.value || 'เบิกจ่าย';

      // Check current quantity already in cart
      const existingInCart = selectedTransItems.find(x => x.id === equipId);
      const currentCartQty = existingInCart ? existingInCart.qty : 0;
      const totalRequestedQty = currentCartQty + qty;

      if (type === 'เบิกจ่าย' || type === 'ยืมอุปกรณ์') {
        if (totalRequestedQty > item.quantity) {
          alert(`❌ ยอดคงเหลือไม่พอกรณี${type}: "${item.name}" (คงเหลือในสต๊อก: ${item.quantity} ${item.unit || 'ชิ้น'}, ในเอกสารแล้ว: ${currentCartQty} ${item.unit || 'ชิ้น'}, ต้องการเพิ่มอีก: ${qty} ${item.unit || 'ชิ้น'})`);
          return;
        }
      }

      if (existingInCart) {
        existingInCart.qty = totalRequestedQty;
      } else {
        selectedTransItems.push({
          id: item.id,
          name: item.name,
          code: item.code || item.id,
          qty: qty,
          unit: item.unit || 'ชิ้น',
          maxStock: item.quantity,
          imageUrl: item.imageUrl || '',
          location: item.location || ''
        });
      }

      renderTransCartList();
      showToast(`➕ เพิ่ม "${item.name}" (${qty} ${item.unit || 'ชิ้น'}) เข้าเอกสารเรียบร้อยแล้ว`);
    };

    window.updateCartItemQty = function(equipId, delta) {
      const item = selectedTransItems.find(x => x.id === equipId);
      if (!item) return;

      const type = document.querySelector('input[name="transType"]:checked')?.value || 'เบิกจ่าย';
      const equipObj = equipmentList.find(x => x.id === equipId);
      const newQty = item.qty + delta;

      if (newQty <= 0) {
        window.removeCartItem(equipId);
        return;
      }

      if ((type === 'เบิกจ่าย' || type === 'ยืมอุปกรณ์') && equipObj) {
        if (newQty > equipObj.quantity) {
          alert(`❌ ไม่สามารถเพิ่มจำนวนเกินสต๊อกที่มีได้ (${equipObj.quantity} ${item.unit || 'ชิ้น'})`);
          return;
        }
      }

      item.qty = newQty;
      renderTransCartList();
    };

    window.setCartItemQtyExact = function(equipId, val) {
      const item = selectedTransItems.find(x => x.id === equipId);
      if (!item) return;

      let parsed = parseInt(val);
      if (isNaN(parsed) || parsed <= 0) {
        window.removeCartItem(equipId);
        return;
      }

      const type = document.querySelector('input[name="transType"]:checked')?.value || 'เบิกจ่าย';
      const equipObj = equipmentList.find(x => x.id === equipId);

      if ((type === 'เบิกจ่าย' || type === 'ยืมอุปกรณ์') && equipObj) {
        if (parsed > equipObj.quantity) {
          alert(`❌ ยอดในสต๊อกมีเพียง ${equipObj.quantity} ${item.unit || 'ชิ้น'}`);
          parsed = equipObj.quantity;
        }
      }

      item.qty = parsed;
      renderTransCartList();
    };

    window.removeCartItem = function(equipId) {
      selectedTransItems = selectedTransItems.filter(x => x.id !== equipId);
      renderTransCartList();
      showToast('🗑️ ลบรายการอุปกรณ์ออกจากเอกสารแล้ว');
    };

    window.clearTransCart = function() {
      selectedTransItems = [];
      renderTransCartList();
    };

    window.renderTransCartList = function() {
      const container = document.getElementById('selectedTransCartItemsList');
      const badge = document.getElementById('cartCountBadge');
      if (badge) badge.textContent = `${selectedTransItems.length} รายการ`;

      if (!container) return;

      if (selectedTransItems.length === 0) {
        container.innerHTML = `
          <div class="text-center py-3 px-2 text-muted bg-light rounded-3 border border-dashed fs-8">
            <i class="bi bi-info-circle-fill text-success fs-6 d-block mb-1"></i>
            <div>ยังไม่มีรายการอุปกรณ์ในเอกสารใบนี้</div>
            <small class="text-secondary">เลือกอุปกรณ์และจำนวน ด้านบน แล้วกดปุ่ม "เพิ่มเข้าเอกสาร" หรือใช้สแกนบาร์โค้ด</small>
          </div>
        `;
        return;
      }

      const activeType = document.querySelector('input[name="transType"]:checked')?.value || 'เบิกจ่าย';
      let typeBadge = '';
      if (activeType === 'ยืมอุปกรณ์') {
        typeBadge = '<span class="badge bg-warning text-dark px-2 py-1"><i class="bi bi-arrow-repeat me-1"></i>ยืมอุปกรณ์</span>';
      } else if (activeType === 'คืนอุปกรณ์') {
        typeBadge = '<span class="badge bg-info text-dark px-2 py-1"><i class="bi bi-box-arrow-in-down me-1"></i>คืนอุปกรณ์</span>';
      } else {
        typeBadge = '<span class="badge bg-danger px-2 py-1"><i class="bi bi-box-arrow-up me-1"></i>เบิกจ่าย</span>';
      }

      let totalQtySum = 0;
      let html = `
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-2 border rounded-3 overflow-hidden fs-7 bg-white">
            <thead class="table-success text-dark">
              <tr>
                <th style="width: 35px;" class="text-center">#</th>
                <th>อุปกรณ์ / รหัส</th>
                <th class="text-center" style="width: 140px;">เบิก-จ่าย-ยืม-คืน</th>
                <th class="text-center" style="width: 130px;">จำนวนที่ทำรายการ</th>
                <th class="text-end" style="width: 100px;">สต๊อกปัจจุบัน</th>
                <th class="text-center" style="width: 45px;">ลบ</th>
              </tr>
            </thead>
            <tbody>
      `;

      selectedTransItems.forEach((item, index) => {
        totalQtySum += item.qty;
        const equipObj = equipmentList.find(x => x.id === item.id);
        const currentStock = equipObj ? equipObj.quantity : item.maxStock;

        html += `
          <tr>
            <td class="text-center fw-bold text-muted fs-8">${index + 1}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <img src="${item.imageUrl || DEFAULT_EQUIPMENT_IMAGE}" class="rounded-2 border" style="width: 36px; height: 36px; object-fit: cover;" onerror="this.src='${DEFAULT_EQUIPMENT_IMAGE}'" />
                <div>
                  <div class="fw-bold text-dark mb-0">${item.name}</div>
                  <span class="badge bg-dark font-monospace fs-8 me-1">${item.code}</span>
                  <small class="text-muted"><i class="bi bi-geo-alt me-0.5"></i>${item.location || '-'}</small>
                </div>
              </div>
            </td>
            <td class="text-center">
              ${typeBadge}
            </td>
            <td class="text-center">
              <div class="input-group input-group-sm justify-content-center" style="max-width: 120px; margin: 0 auto;">
                <button class="btn btn-outline-secondary px-2" type="button" onclick="updateCartItemQty('${item.id}', -1)">-</button>
                <input type="number" class="form-control text-center fw-bold px-1" value="${item.qty}" min="1" max="${currentStock}" onchange="setCartItemQtyExact('${item.id}', this.value)">
                <button class="btn btn-outline-secondary px-2" type="button" onclick="updateCartItemQty('${item.id}', 1)">+</button>
              </div>
            </td>
            <td class="text-end">
              <span class="fw-semibold text-secondary">${currentStock} ${item.unit}</span>
            </td>
            <td class="text-center">
              <button type="button" class="btn btn-link text-danger p-0 border-0" onclick="removeCartItem('${item.id}')" title="ลบรายการนี้">
                <i class="bi bi-trash-fill fs-6"></i>
              </button>
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-between align-items-center bg-success bg-opacity-10 p-2 rounded-3 border border-success border-opacity-25 fs-8">
          <span class="fw-bold text-success"><i class="bi bi-check-all me-1"></i>สรุปรายการในเอกสาร:</span>
          <span class="fw-bold text-dark">${selectedTransItems.length} ชนิด (รวมทั้งสิ้น <span class="text-success fs-7">${totalQtySum}</span> ชิ้น)</span>
        </div>
      `;

      container.innerHTML = html;
    };

    // Transaction Submit (Supports Multi-Item Documents & Firestore Sync Verification)
    async function handleTransactionSubmit(e) {
      e.preventDefault();

      const type = document.querySelector('input[name="transType"]:checked').value;
      const empId = document.getElementById('empSelect').value;
      const location = document.getElementById('transLocation').value.trim() || 'สวนไม้ดอกไม้ประดับ';
      const note = document.getElementById('transNote').value.trim();

      if (!empId) {
        alert("กรุณาเลือกรายชื่อพนักงานผู้ทำรายการ");
        return;
      }

      const emp = employeeList.find(x => x.id === empId);
      if (!emp) {
        alert("ไม่พบข้อมูลพนักงานที่เลือก");
        return;
      }

      let itemsToProcess = [];

      if (selectedTransItems && selectedTransItems.length > 0) {
        itemsToProcess = selectedTransItems.map(i => {
          const equip = equipmentList.find(e => e.id === (i.id || i.equipmentId));
          return {
            equipmentId: i.id || i.equipmentId,
            equipmentName: i.name || i.equipmentName || (equip ? equip.name : 'อุปกรณ์การเกษตร'),
            equipmentCode: i.code || i.equipmentCode || (equip ? equip.code : (i.id || 'EQUIP')),
            quantity: parseInt(i.qty !== undefined ? i.qty : i.quantity) || 1,
            unit: i.unit || (equip ? equip.unit : 'ชิ้น'),
            imageUrl: i.imageUrl || (equip ? equip.imageUrl : ''),
            location: i.location || (equip ? equip.location : '') || location
          };
        });
      } else {
        const equipId = document.getElementById('equipSelect').value;
        const qty = parseInt(document.getElementById('transQty').value) || 1;
        if (!equipId) {
          alert("กรุณาเลือกอุปกรณ์การเกษตรอย่างน้อย 1 รายการเพื่อทำรายการ");
          return;
        }
        const item = equipmentList.find(x => x.id === equipId);
        if (!item) {
          alert("ไม่พบอุปกรณ์ที่เลือก");
          return;
        }
        itemsToProcess = [{
          equipmentId: item.id,
          equipmentName: item.name,
          equipmentCode: item.code || item.id,
          quantity: qty,
          unit: item.unit || 'ชิ้น',
          imageUrl: item.imageUrl || '',
          location: item.location || location
        }];
      }

      // Check stock for all items
      if (type === 'เบิกจ่าย' || type === 'ยืมอุปกรณ์') {
        for (const it of itemsToProcess) {
          const equipObj = equipmentList.find(x => x.id === it.equipmentId);
          if (!equipObj || equipObj.quantity < it.quantity) {
            alert(`❌ ยอดคงเหลือไม่พอสำหรับทำรายการ: "${it.equipmentName}" (คงเหลือปัจจุบัน: ${equipObj ? equipObj.quantity : 0} ${it.unit}, ต้องการ: ${it.quantity} ${it.unit})`);
            return;
          }
        }
      }

      // Process inventory stock changes
      itemsToProcess.forEach(it => {
        const equipObj = equipmentList.find(x => x.id === it.equipmentId);
        if (equipObj) {
          if (type === 'เบิกจ่าย') {
            equipObj.quantity -= it.quantity;
          } else if (type === 'ยืมอุปกรณ์') {
            equipObj.quantity -= it.quantity;
            equipObj.borrowedCount = (equipObj.borrowedCount || 0) + it.quantity;
          } else if (type === 'คืนอุปกรณ์') {
            equipObj.quantity += it.quantity;
            equipObj.borrowedCount = Math.max(0, (equipObj.borrowedCount || 0) - it.quantity);
          } else if (type === 'รับเข้าสต๊อก (ขาเข้า)' || type === 'รับเข้าสต๊อก') {
            equipObj.quantity += it.quantity;
          }

          if (isFirebaseReady && db && equipObj.id) {
            setDoc(doc(db, "equipment", equipObj.id), equipObj, { merge: true }).catch(err => {
              console.warn("Firestore update equipment stock error:", err);
            });
          }
        }
      });

      let dueDateVal = null;
      let dueDateStr = null;
      if (type === 'ยืมอุปกรณ์') {
        if (window.transDueDatePicker && window.transDueDatePicker.selectedDates.length > 0) {
          const dObj = window.transDueDatePicker.selectedDates[0];
          dueDateVal = dObj.getTime();
          const day = String(dObj.getDate()).padStart(2, '0');
          const month = String(dObj.getMonth() + 1).padStart(2, '0');
          const yearBE = dObj.getFullYear() + 543;
          const hours = String(dObj.getHours()).padStart(2, '0');
          const mins = String(dObj.getMinutes()).padStart(2, '0');
          dueDateStr = `${day}/${month}/${yearBE} เวลา ${hours}:${mins} น.`;
        } else {
          const dueDateInput = document.getElementById('transDueDate')?.value;
          if (dueDateInput) {
            const dObj = new Date(dueDateInput);
            if (!isNaN(dObj.getTime())) {
              dueDateVal = dObj.getTime();
              const day = String(dObj.getDate()).padStart(2, '0');
              const month = String(dObj.getMonth() + 1).padStart(2, '0');
              const yearBE = dObj.getFullYear() + 543;
              const hours = String(dObj.getHours()).padStart(2, '0');
              const mins = String(dObj.getMinutes()).padStart(2, '0');
              dueDateStr = `${day}/${month}/${yearBE} เวลา ${hours}:${mins} น.`;
            }
          }
        }
        if (!dueDateStr) {
          const defaultD = new Date();
          defaultD.setDate(defaultD.getDate() + 3);
          defaultD.setHours(17, 0, 0, 0);
          dueDateVal = defaultD.getTime();
          const day = String(defaultD.getDate()).padStart(2, '0');
          const month = String(defaultD.getMonth() + 1).padStart(2, '0');
          const yearBE = defaultD.getFullYear() + 543;
          dueDateStr = `${day}/${month}/${yearBE} เวลา 17:00 น.`;
        }
      }

      const now = new Date();
      const docNo = 'DOC-' + String(Date.now()).slice(-6);
      const newTx = {
        id: 'tx-' + String(Date.now()).slice(-6),
        docNo: docNo,
        type: type,
        employeeId: emp.id,
        employeeName: `${emp.name} (${emp.department || 'แผนกทั่วไป'})`,
        employeeCode: emp.code || emp.id,
        employeeDepartment: emp.department || 'แผนกทั่วไป',
        items: itemsToProcess.map(i => ({
          equipmentId: i.equipmentId,
          equipmentName: i.equipmentName,
          equipmentCode: i.equipmentCode,
          quantity: i.quantity,
          unit: i.unit,
          imageUrl: i.imageUrl || '',
          location: i.location || ''
        })),
        // Fallback properties for single item backwards compatibility:
        equipmentId: itemsToProcess[0].equipmentId,
        equipmentName: itemsToProcess.length === 1 
          ? `${itemsToProcess[0].equipmentName} [${itemsToProcess[0].equipmentCode}]` 
          : `${itemsToProcess.length} รายการ (${itemsToProcess.map(x => `${x.equipmentName} x${x.quantity}`).join(', ')})`,
        quantity: itemsToProcess.reduce((sum, x) => sum + x.quantity, 0),
        unit: itemsToProcess.length === 1 ? itemsToProcess[0].unit : 'รายการ',
        location: location,
        note: note,
        dueDate: dueDateVal,
        dueDateStr: dueDateStr,
        rawTimestamp: now.getTime(),
        timestamp: now.toLocaleString('th-TH')
      };

      transactionHistory.unshift(newTx);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          await setDoc(doc(db, "transactions", newTx.id), newTx, { merge: true });
        } catch (err) {
          console.warn("Firestore add transaction error:", err);
        }
      }

      if (typeof logAuditAction === 'function') {
        const itemNames = itemsToProcess.map(x => x.equipmentName).join(', ');
        logAuditAction('ประวัติรายการ', 'เพิ่ม', `ทำรายการ${type} (${itemsToProcess.reduce((s, x) => s + x.quantity, 0)} ชิ้น): ${itemNames} ให้คุณ ${emp ? emp.name : ''}`, newTx.id);
      }

      showToast(`✅ บันทึกเอกสาร${type} (${itemsToProcess.length} รายการ) เรียบร้อยแล้ว`);

      // Check if user requested transaction voucher document (Default: false)
      const requireVoucher = document.getElementById('transRequireVoucherDoc')?.checked || false;

      // Reset form & cart
      clearTransCart();
      document.getElementById('transactionForm')?.reset();
      if (typeof toggleTransTypeUI === 'function') toggleTransTypeUI();
      const stockInfo = document.getElementById('equipStockInfo');
      if (stockInfo) stockInfo.innerHTML = '';
      const previewBox = document.getElementById('equipSelectPreviewBox');
      if (previewBox) previewBox.classList.add('d-none');

      renderCatalogGrid();
      renderStaffTable();
      renderHistoryTable();
      populateEquipmentDropdown();
      populateQuickScanDropdown();
      updateStats();

      // Trigger automatic background Firestore sync verification
      if (typeof validateFirestoreHistorySync === 'function') {
        validateFirestoreHistorySync(false);
      }

      // Exit from "บันทึก เบิก-จ่าย-ยืม-คืน" screen immediately
      if (typeof switchNavTab === 'function') {
        switchNavTab('catalog-tab');
      }

      // Open transaction voucher print modal ONLY if explicitly checked
      if (requireVoucher && typeof openPrintTransactionVoucherModal === 'function') {
        openPrintTransactionVoucherModal(newTx.id);
      }
    }

    // ==================== FIRESTORE DATA VALIDATION FUNCTIONS ====================
    window.validateFirestoreHistorySync = async function(showModal = false) {
      const badgeContainer = document.getElementById('firestoreValidationBadge');
      if (!isFirebaseReady || !db) {
        if (badgeContainer) {
          badgeContainer.innerHTML = `
            <div class="alert alert-info py-2 px-3 mb-0 fs-8 d-flex align-items-center justify-content-between rounded-3 border-0 shadow-sm bg-white border border-info border-opacity-25">
              <span><i class="bi bi-hdd-fill me-1 text-primary"></i> <strong>โหมด Local Storage:</strong> ข้อมูลประวัติบันทึกในเบราว์เซอร์แล้ว (${transactionHistory.length} รายการ)</span>
              <span class="badge bg-secondary">Local Storage</span>
            </div>
          `;
        }
        if (showModal) {
          showToast("ℹ️ ระบบกำลังทำงานแบบ Local Storage (ข้อมูลถูกบันทึกในอุปกรณ์แล้ว)");
        }
        return { success: true, mode: 'local' };
      }

      try {
        if (badgeContainer) {
          badgeContainer.innerHTML = `
            <div class="alert alert-light py-2 px-3 mb-0 fs-8 d-flex align-items-center gap-2 rounded-3 border shadow-sm">
              <div class="spinner-border spinner-border-sm text-success" role="status"></div>
              <span>กำลังตรวจสอบความถูกต้องของข้อมูลระหว่าง Cloud Firestore และ History Log บน UI...</span>
            </div>
          `;
        }

        const snapshot = await getDocs(collection(db, "transactions"));
        const fsDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        let matchCount = 0;
        let mismatchCount = 0;
        let missingInFs = 0;
        let detailsLog = [];

        transactionHistory.forEach(localTx => {
          const fsTx = fsDocs.find(d => d.id === localTx.id || (d.docNo && localTx.docNo && d.docNo === localTx.docNo));
          if (!fsTx) {
            missingInFs++;
            detailsLog.push({ id: localTx.docNo || localTx.id, status: 'MISSING', msg: `ไม่พบเอกสาร ${localTx.docNo || localTx.id} บน Firestore` });
          } else {
            const localItems = localTx.items || [];
            const fsItems = fsTx.items || [];
            let isItemsMatch = true;

            if (localItems.length !== fsItems.length) {
              isItemsMatch = false;
            } else {
              for (let i = 0; i < localItems.length; i++) {
                const lIt = localItems[i];
                const fIt = fsItems[i];
                if (
                  (lIt.equipmentId || lIt.id) !== (fIt.equipmentId || fIt.id) ||
                  (lIt.quantity !== undefined ? lIt.quantity : lIt.qty) !== (fIt.quantity !== undefined ? fIt.quantity : fIt.qty)
                ) {
                  isItemsMatch = false;
                  break;
                }
              }
            }

            if (isItemsMatch && localTx.type === fsTx.type) {
              matchCount++;
              detailsLog.push({ id: localTx.docNo || localTx.id, status: 'MATCH', msg: `เอกสาร ${localTx.docNo || localTx.id} ข้อมูลตรงกันครบถ้วน (${localItems.length} รายการอุปกรณ์)` });
            } else {
              mismatchCount++;
              detailsLog.push({ id: localTx.docNo || localTx.id, status: 'MISMATCH', msg: `เอกสาร ${localTx.docNo || localTx.id} รายละเอียดบางรายการไม่ตรงกัน` });
            }
          }
        });

        const is100PercentValid = (mismatchCount === 0 && missingInFs === 0 && transactionHistory.length <= fsDocs.length);

        if (badgeContainer) {
          if (is100PercentValid) {
            badgeContainer.innerHTML = `
              <div class="alert alert-success py-2 px-3 mb-0 fs-8 d-flex align-items-center justify-content-between rounded-3 border-0 shadow-sm">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-shield-check-fill fs-5 text-success"></i>
                  <span><strong>ยืนยันการตรวจสอบ (Validation Success):</strong> ข้อมูลใน Firestore ตรงกับ History Log บน UI 100% (ตรวจสอบครบ ${matchCount}/${transactionHistory.length} เอกสาร)</span>
                </div>
                <button type="button" class="btn btn-sm btn-success rounded-pill px-3 py-1 fs-8 fw-bold shadow-sm" onclick="showValidationResultDetailsModal(${matchCount}, ${fsDocs.length}, ${mismatchCount}, ${missingInFs})">
                  <i class="bi bi-file-earmark-check-fill me-1"></i>ดูรายงานการตรวจสอบ
                </button>
              </div>
            `;
          } else {
            badgeContainer.innerHTML = `
              <div class="alert alert-warning py-2 px-3 mb-0 fs-8 d-flex align-items-center justify-content-between rounded-3 border-0 shadow-sm">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
                  <span><strong>พบข้อมูลต่างกัน:</strong> UI มี ${transactionHistory.length} รายการ | Firestore มี ${fsDocs.length} รายการ (ตรงกัน ${matchCount} รายการ)</span>
                </div>
                <button type="button" class="btn btn-sm btn-dark rounded-pill px-3 py-1 fs-8 fw-bold shadow-sm" onclick="showValidationResultDetailsModal(${matchCount}, ${fsDocs.length}, ${mismatchCount}, ${missingInFs})">
                  <i class="bi bi-list-check me-1"></i>ดูรายละเอียดความต่าง
                </button>
              </div>
            `;
          }
        }

        if (showModal) {
          showValidationResultDetailsModal(matchCount, fsDocs.length, mismatchCount, missingInFs, detailsLog);
        }

        return { success: is100PercentValid, matchCount, totalFs: fsDocs.length, totalUi: transactionHistory.length };
      } catch (err) {
        console.warn("Firestore validation exception:", err);
        if (badgeContainer) {
          badgeContainer.innerHTML = `
            <div class="alert alert-danger py-2 px-3 mb-0 fs-8 rounded-3 border-0 shadow-sm">
              ❌ เกิดข้อผิดพลาดในการตรวจสอบ Firestore: ${err.message}
            </div>
          `;
        }
      }
    };

    window.showValidationResultDetailsModal = function(matchCount, totalFsCount, mismatchCount, missingInFsCount, detailsList = []) {
      const modalBody = document.getElementById('firestoreValidationModalBody');
      const modalHeader = document.getElementById('firestoreValidationModalHeader');
      if (!modalBody) return;

      const totalUiCount = transactionHistory.length;
      const isOk = (mismatchCount === 0 && missingInFsCount === 0 && totalUiCount <= totalFsCount);

      if (modalHeader) {
        modalHeader.className = `modal-header ${isOk ? 'bg-success' : 'bg-warning text-dark'} text-white p-3`;
      }

      let detailsTableHtml = '';
      if (detailsList && detailsList.length > 0) {
        detailsTableHtml = `
          <div class="mt-3">
            <h6 class="fw-bold fs-7 mb-2 text-dark"><i class="bi bi-list-nested me-1"></i>รายการตรวจสอบประวัติรายเอกสาร (${detailsList.length} รายการ):</h6>
            <div class="table-responsive rounded-3 border bg-white" style="max-height: 250px;">
              <table class="table table-sm table-hover align-middle mb-0 fs-8">
                <thead class="bg-light">
                  <tr>
                    <th class="ps-3">เลขที่เอกสาร/ID</th>
                    <th>สถานะซิงก์</th>
                    <th>รายละเอียดการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  ${detailsList.map(item => `
                    <tr>
                      <td class="ps-3 font-monospace fw-bold text-secondary">${item.id}</td>
                      <td>
                        ${item.status === 'MATCH' ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>ตรงกัน</span>' : ''}
                        ${item.status === 'MISMATCH' ? '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>ไม่ตรงกัน</span>' : ''}
                        ${item.status === 'MISSING' ? '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>ไม่พบใน FS</span>' : ''}
                      </td>
                      <td class="text-muted">${item.msg}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      modalBody.innerHTML = `
        <div class="p-3 bg-white rounded-3 border mb-3 shadow-sm">
          <div class="d-flex align-items-center gap-3 mb-3 pb-2 border-bottom">
            <div class="p-3 rounded-circle ${isOk ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'} fs-2">
              <i class="bi ${isOk ? 'bi-shield-check' : 'bi-exclamation-triangle-fill'}"></i>
            </div>
            <div>
              <h5 class="fw-bold ${isOk ? 'text-success' : 'text-dark'} mb-1">
                ${isOk ? '✅ ข้อมูลใน Firestore ตรงกับ History Log บน UI 100%' : '⚠️ ผลการตรวจสอบพบรายการต่างกัน'}
              </h5>
              <p class="text-muted fs-8 mb-0">
                ${isOk 
                  ? 'เอกสารบันทึกเบิก-จ่าย-ยืม-คืน อุปกรณ์ทุกรายการ รวมถึงเอกสารเบิกยืมหลายชนิด ได้ถูกจัดเก็บลง Firestore Collections "transactions" และซิงก์ตรงกับ UI สมบูรณ์' 
                  : 'พบข้อแตกต่างระหว่างฐานข้อมูล Cloud Firestore และรายการประวัติที่แสดงบนหน้าจอ'}
              </p>
            </div>
          </div>

          <div class="row g-2 text-center fs-8">
            <div class="col-6 col-md-3">
              <div class="p-2 rounded-3 bg-light border">
                <div class="text-muted">ประวัติบน UI</div>
                <div class="fw-bold fs-5 text-dark">${totalUiCount}</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="p-2 rounded-3 bg-light border">
                <div class="text-muted">ใน Firestore</div>
                <div class="fw-bold fs-5 text-primary">${totalFsCount}</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="p-2 rounded-3 bg-light border">
                <div class="text-muted">ตรงกันสมบูรณ์</div>
                <div class="fw-bold fs-5 text-success">${matchCount}</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="p-2 rounded-3 bg-light border">
                <div class="text-muted">ไม่สมบูรณ์/ขาด</div>
                <div class="fw-bold fs-5 ${mismatchCount + missingInFsCount > 0 ? 'text-danger' : 'text-muted'}">${mismatchCount + missingInFsCount}</div>
              </div>
            </div>
          </div>
        </div>

        ${detailsTableHtml}
      `;

      const modalElem = document.getElementById('firestoreValidationModal');
      if (modalElem) {
        const modalInst = bootstrap.Modal.getOrCreateInstance(modalElem);
        modalInst.show();
      }
    };

    // Pagination States for Catalog & History
    let catalogCurrentPage = 1;
    let catalogPageSize = 12;
    let historyCurrentPage = 1;
    let historyPageSize = 15;

    window.changeCatalogPageSize = function(size) {
      catalogPageSize = size === 'ALL' ? 'ALL' : parseInt(size, 10);
      catalogCurrentPage = 1;
      renderCatalogGrid();
    };

    window.goToCatalogPage = function(page) {
      catalogCurrentPage = page;
      renderCatalogGrid();
      document.getElementById('catalogGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.clearCatalogSearch = function() {
      const input = document.getElementById('catalogSearchInput');
      if (input) {
        input.value = '';
        renderCatalogGrid();
      }
    };

    window.toggleLowStockFilterCatalog = function() {
      if (typeof switchNavTab === 'function') {
        switchNavTab('catalog-tab');
      }
      const select = document.getElementById('catalogStatusSelect');
      if (!select) return;
      if (select.value === 'LOW_STOCK') {
        select.value = 'ALL';
        if (typeof showToast === 'function') showToast('📦 แสดงอุปกรณ์ทุกสถานะคงเหลือ');
      } else {
        select.value = 'LOW_STOCK';
        if (typeof showToast === 'function') showToast('🚨 กรองแสดงเฉพาะรายการอุปกรณ์ที่มีสต๊อกต่ำกว่าขั้นต่ำ');
      }
      renderCatalogGrid();
    };

    window.toggleLowStockFilterStaff = function() {
      const select = document.getElementById('staffStockSelect');
      if (!select) return;
      if (select.value === 'LOW_STOCK') {
        select.value = 'ALL';
        if (typeof showToast === 'function') showToast('📦 แสดงอุปกรณ์ทุกระดับสต๊อก');
      } else {
        select.value = 'LOW_STOCK';
        if (typeof showToast === 'function') showToast('🚨 กรองแสดงเฉพาะรายการอุปกรณ์ที่มีสต๊อกต่ำกว่าขั้นต่ำ');
      }
      renderStaffTable();
    };

    function highlightSearchText(text, rawQuery) {
      if (text === null || text === undefined) return '';
      const str = String(text);
      if (!rawQuery || typeof rawQuery !== 'string') {
        return typeof escapeHtml === 'function' ? escapeHtml(str) : str;
      }

      const trimmedQuery = rawQuery.trim();
      if (!trimmedQuery) {
        return typeof escapeHtml === 'function' ? escapeHtml(str) : str;
      }

      try {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return str.split(regex).map(part => {
          if (part.toLowerCase() === trimmedQuery.toLowerCase()) {
            return `<mark class="bg-warning text-dark rounded-1 px-1 py-0 fw-bold shadow-2xs">${typeof escapeHtml === 'function' ? escapeHtml(part) : part}</mark>`;
          }
          return typeof escapeHtml === 'function' ? escapeHtml(part) : part;
        }).join('');
      } catch (e) {
        return typeof escapeHtml === 'function' ? escapeHtml(str) : str;
      }
    }

    // Render Helpers
    window.renderCatalogGrid = function renderCatalogGrid() {
      const container = document.getElementById('catalogGrid');
      const emptyState = document.getElementById('catalogEmptyState');
      const rawSearchInput = document.getElementById('catalogSearchInput')?.value || '';
      const searchQuery = rawSearchInput.toLowerCase().trim();
      const selectedCat = document.getElementById('catalogCategorySelect')?.value || 'ALL';
      const selectedStatus = document.getElementById('catalogStatusSelect')?.value || 'ALL';

      // Update Low Stock Count Badge & Active Button State for Catalog (only show when quantity < minQuantity)
      const lowStockTotal = equipmentList.filter(item => {
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        return (Number(item.quantity) || 0) < minQty;
      }).length;
      const catBadgeElem = document.getElementById('catalogLowStockBadgeCount');
      if (catBadgeElem) catBadgeElem.textContent = lowStockTotal;
      const btnCatLowStock = document.getElementById('btnFilterLowStockCatalog');
      const btnCatLowStockText = document.getElementById('btnCatalogLowStockText');
      if (btnCatLowStock) {
        if (lowStockTotal > 0) {
          btnCatLowStock.classList.remove('d-none');
          btnCatLowStock.classList.add('d-inline-flex');
          if (selectedStatus === 'LOW_STOCK') {
            btnCatLowStock.classList.add('btn-low-stock-active');
            if (btnCatLowStockText) btnCatLowStockText.textContent = 'แสดงสต๊อกทั้งหมด';
          } else {
            btnCatLowStock.classList.remove('btn-low-stock-active');
            if (btnCatLowStockText) btnCatLowStockText.textContent = 'แสดงสต๊อกต่ำ';
          }
        } else {
          btnCatLowStock.classList.add('d-none');
          btnCatLowStock.classList.remove('d-inline-flex', 'btn-low-stock-active');
          if (btnCatLowStockText) btnCatLowStockText.textContent = 'แสดงสต๊อกต่ำ';
          if (selectedStatus === 'LOW_STOCK') {
            const catStatusSelect = document.getElementById('catalogStatusSelect');
            if (catStatusSelect) catStatusSelect.value = 'ALL';
          }
        }
      }

      let filtered = equipmentList.filter(item => {
        const nameStr = String(item.name || '').toLowerCase();
        const codeStr = String(item.code || '').toLowerCase();
        const catStr = String(item.category || '').toLowerCase();
        const locStr = String(item.location || '').toLowerCase();
        const descStr = String(item.description || '').toLowerCase();
        const idStr = String(item.id || '').toLowerCase();

        const matchesQuery = !searchQuery || 
          nameStr.includes(searchQuery) ||
          codeStr.includes(searchQuery) ||
          catStr.includes(searchQuery) ||
          locStr.includes(searchQuery) ||
          descStr.includes(searchQuery) ||
          idStr.includes(searchQuery);

        const matchesCategory = selectedCat === 'ALL' || item.category === selectedCat;

        let matchesStatus = true;
        if (selectedStatus === 'AVAILABLE') matchesStatus = item.quantity > 0;
        else if (selectedStatus === 'BORROWED') matchesStatus = (item.borrowedCount || 0) > 0;
        else if (selectedStatus === 'OVERDUE') {
          const overdueList = typeof calculateOverdueBorrowings === 'function' ? calculateOverdueBorrowings(window.currentOverdueThresholdDays || 3) : [];
          const overdueEquipIds = new Set(overdueList.map(o => o.equipmentId || o.equipmentCode || o.equipmentName));
          matchesStatus = overdueEquipIds.has(item.id) || overdueEquipIds.has(item.code) || overdueEquipIds.has(item.name);
        }
        else if (selectedStatus === 'LOW_STOCK') {
          const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
          matchesStatus = (Number(item.quantity) || 0) < minQty;
        }

        return matchesQuery && matchesCategory && matchesStatus;
      });

      // Sort equipment items by equipment code in natural order (e.g. EQ-01, EQ-02, WK-01, etc.)
      filtered.sort((a, b) => {
        const codeA = (a.code || a.id || '').toString();
        const codeB = (b.code || b.id || '').toString();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('d-none');
        document.getElementById('catalogPaginationContainer')?.classList.add('d-none');
        return;
      }

      emptyState.classList.add('d-none');

      // Pagination Calculation
      const totalItems = filtered.length;
      let totalPages = 1;
      let itemsToRender = filtered;

      if (catalogPageSize !== 'ALL') {
        totalPages = Math.ceil(totalItems / catalogPageSize) || 1;
        if (catalogCurrentPage > totalPages) catalogCurrentPage = totalPages;
        if (catalogCurrentPage < 1) catalogCurrentPage = 1;

        const startIdx = (catalogCurrentPage - 1) * catalogPageSize;
        const endIdx = startIdx + catalogPageSize;
        itemsToRender = filtered.slice(startIdx, endIdx);
      } else {
        catalogCurrentPage = 1;
      }

      let html = '';
      itemsToRender.forEach(item => {
        let statusBadge = '';
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const curQty = Number(item.quantity) || 0;
        if (curQty < minQty) {
          statusBadge = `<span class="badge bg-danger badge-status text-white pulse-danger-badge"><i class="bi bi-bell-fill me-1"></i> เตือน! สต๊อกต่ำกว่าขั้นต่ำ (${curQty} / ขั้นต่ำ ${minQty} ${item.unit})</span>`;
        } else if (curQty === minQty || curQty <= minQty + 2) {
          statusBadge = `<span class="badge bg-warning bg-opacity-90 badge-status text-dark"><i class="bi bi-exclamation-triangle-fill me-1"></i> สต๊อกใกล้ขั้นต่ำ (${curQty} / ขั้นต่ำ ${minQty} ${item.unit})</span>`;
        } else {
          statusBadge = `<span class="badge bg-success bg-opacity-90 badge-status text-white"><i class="bi bi-check-circle-fill me-1"></i> พร้อมใช้งาน (${curQty} ${item.unit})</span>`;
        }

        const isWorker = currentRole === 'WORKER';
        const isStaff = currentRole === 'STAFF' || currentRole === 'ADMIN' || currentRole === 'MANAGER';

        const highlightedName = highlightSearchText(item.name, rawSearchInput);
        const highlightedCode = highlightSearchText(item.code, rawSearchInput);

        html += `
          <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div class="equipment-card">
              <div class="equipment-img-container position-relative" onclick="openEquipmentTransactionHistoryModal('${item.id}')" title="คลิกรูปภาพเพื่อดูประวัติการทำรายการอุปกรณ์ (${escapeHtml(item.name)})">
                <img src="${item.imageUrl}" loading="lazy" class="equipment-img" alt="${escapeHtml(item.name)}" onerror="this.src='${DEFAULT_EQUIPMENT_IMAGE}'" />
                <span class="badge-code">${highlightedCode}</span>
                ${isStaff ? `
                  <button type="button" class="btn btn-dark bg-opacity-80 text-white position-absolute top-0 end-0 m-2 rounded-pill fs-8 shadow-sm border-0 py-1 px-2.5 d-inline-flex align-items-center gap-1" style="z-index: 5;" onclick="event.stopPropagation(); openEquipmentPopupMenu('${item.id}')" title="คลิกเพื่อเปิดเมนูจัดการ (Popup Menu)">
                    <i class="bi bi-sliders text-success"></i> เมนู
                  </button>
                ` : ''}
                <div class="equipment-img-overlay-hint">
                  <span class="badge bg-dark bg-opacity-90 text-white rounded-pill px-3 py-1.5 fs-8 shadow">
                    <i class="bi bi-clock-history me-1 text-info"></i> ดูประวัติ
                  </span>
                </div>
                ${statusBadge}
              </div>

              <div class="card-body p-3 d-flex flex-column justify-content-between">
                <div>
                  <div class="text-success fs-7 fw-semibold mb-1">${escapeHtml(item.category || '')}</div>
                  <h6 class="fw-bold text-dark mb-2 text-truncate" title="${escapeHtml(item.name || '')}">${highlightedName}</h6>
                  <p class="text-secondary fs-7 mb-3 text-truncate-2" style="min-height: 2.4rem;">
                    ${item.description ? escapeHtml(item.description) : 'ไม่มีรายละเอียดสเปกเพิ่มเติม'}
                  </p>
                </div>

                <div>
                  <div class="d-flex justify-content-between align-items-center mb-2 bg-light p-2 rounded-3 fs-7">
                    <div><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${escapeHtml(item.location || 'คลังกลาง')}</div>
                    ${(item.borrowedCount || 0) > 0 ? `
                      <button type="button" class="btn btn-xs btn-outline-warning text-dark fw-bold rounded-pill px-2 py-0.5 shadow-sm d-inline-flex align-items-center gap-1" onclick="showEquipmentBorrowersModal('${item.id}')" title="กดดูรายชื่อผู้ยืมอุปกรณ์นี้">
                        <i class="bi bi-people-fill text-warning"></i> ถูกยืม: ${item.borrowedCount} ${item.unit} <span class="badge bg-dark text-white rounded-pill ms-0.5" style="font-size: 8px; padding: 2px 4px;">ดูผู้ยืม</span>
                      </button>
                    ` : `
                      <div class="text-secondary fs-8 fw-semibold">ถูกยืม: 0 ${escapeHtml(item.unit || '')}</div>
                    `}
                  </div>

                  ${isStaff ? `
                    <div class="d-grid gap-1.5">
                      <button class="btn btn-outline-success btn-sm rounded-pill fw-semibold" onclick="quickSelectTransaction('${item.id}')">
                        <i class="bi bi-pencil-square me-1"></i> เบิก / ยืม ชิ้นนี้
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
      renderCatalogPagination(totalItems, totalPages);
    }

    function renderCatalogPagination(totalItems, totalPages) {
      const pagContainer = document.getElementById('catalogPaginationContainer');
      const infoSpan = document.getElementById('catalogPaginationInfo');
      const navUl = document.getElementById('catalogPaginationNav');

      if (!pagContainer || !infoSpan || !navUl) return;

      if (totalItems <= 0) {
        pagContainer.classList.add('d-none');
        return;
      }

      pagContainer.classList.remove('d-none');

      let startItem = 1;
      let endItem = totalItems;
      if (catalogPageSize !== 'ALL') {
        startItem = (catalogCurrentPage - 1) * catalogPageSize + 1;
        endItem = Math.min(catalogCurrentPage * catalogPageSize, totalItems);
      }

      infoSpan.textContent = `แสดง ${startItem} - ${endItem} จากทั้งหมด ${totalItems} รายการ`;

      if (catalogPageSize === 'ALL' || totalPages <= 1) {
        navUl.innerHTML = '';
        return;
      }

      let navHtml = '';

      const prevDisabled = catalogCurrentPage === 1 ? 'disabled' : '';
      navHtml += `
        <li class="page-item ${prevDisabled}">
          <button class="page-link text-success" onclick="goToCatalogPage(${catalogCurrentPage - 1})" aria-label="Previous">
            <i class="bi bi-chevron-left"></i>
          </button>
        </li>
      `;

      let startPage = Math.max(1, catalogCurrentPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);
      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }

      if (startPage > 1) {
        navHtml += `<li class="page-item"><button class="page-link text-success" onclick="goToCatalogPage(1)">1</button></li>`;
        if (startPage > 2) navHtml += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
      }

      for (let p = startPage; p <= endPage; p++) {
        const activeClass = (p === catalogCurrentPage) ? 'active bg-success border-success text-white fw-bold' : 'text-success';
        navHtml += `<li class="page-item"><button class="page-link ${activeClass}" onclick="goToCatalogPage(${p})">${p}</button></li>`;
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) navHtml += `<li class="page-item disabled"><span class="page-link border-0 text-muted">...</span></li>`;
        navHtml += `<li class="page-item"><button class="page-link text-success" onclick="goToCatalogPage(${totalPages})">${totalPages}</button></li>`;
      }

      const nextDisabled = catalogCurrentPage === totalPages ? 'disabled' : '';
      navHtml += `
        <li class="page-item ${nextDisabled}">
          <button class="page-link text-success" onclick="goToCatalogPage(${catalogCurrentPage + 1})" aria-label="Next">
            <i class="bi bi-chevron-right"></i>
          </button>
        </li>
      `;

      navUl.innerHTML = navHtml;
    }

    // Personnel Bulk Selection State
    let selectedEmpIds = new Set();
    let empViewMode = 'table'; // 'table' or 'card'

    window.setEmpViewMode = function(mode) {
      empViewMode = mode;
      const btnTable = document.getElementById('btnEmpTableView');
      const btnCard = document.getElementById('btnEmpCardView');

      if (btnTable && btnCard) {
        if (mode === 'table') {
          btnTable.classList.add('active', 'btn-light', 'shadow-2xs');
          btnTable.classList.remove('text-muted');
          btnCard.classList.remove('active', 'btn-light', 'shadow-2xs');
          btnCard.classList.add('text-muted');
        } else {
          btnCard.classList.add('active', 'btn-light', 'shadow-2xs');
          btnCard.classList.remove('text-muted');
          btnTable.classList.remove('active', 'btn-light', 'shadow-2xs');
          btnTable.classList.add('text-muted');
        }
      }

      renderEmployeeDirectory();
    };

    window.clearEmpSearch = function() {
      const input = document.getElementById('empSearchInput');
      if (input) {
        input.value = '';
        renderEmployeeDirectory();
      }
    };

    window.toggleEmployeeSelection = function(empId, isChecked) {
      if (isChecked) {
        selectedEmpIds.add(empId);
      } else {
        selectedEmpIds.delete(empId);
      }
      updateEmpBulkActionBar();
      renderEmployeeDirectory();
    };

    window.toggleSelectAllEmployees = function(isChecked) {
      const queryInput = document.getElementById('empSearchInput');
      const query = queryInput ? queryInput.value.toLowerCase().trim() : '';

      let currentFiltered = employeeList.filter(emp => {
        const nick = (emp.nickname || '').toLowerCase();
        const empCode = (emp.code || emp.id || '').toLowerCase();
        return !query || (emp.name && emp.name.toLowerCase().includes(query)) || nick.includes(query) || empCode.includes(query) || (emp.department && emp.department.toLowerCase().includes(query));
      });

      if (isChecked) {
        currentFiltered.forEach(emp => selectedEmpIds.add(emp.id));
      } else {
        currentFiltered.forEach(emp => selectedEmpIds.delete(emp.id));
      }

      updateEmpBulkActionBar();
      renderEmployeeDirectory();
    };

    window.clearEmployeeSelections = function() {
      selectedEmpIds.clear();
      const mainCheck = document.getElementById('selectAllEmpCheckbox');
      if (mainCheck) mainCheck.checked = false;
      updateEmpBulkActionBar();
      renderEmployeeDirectory();
    };

    window.updateEmpBulkActionBar = function() {
      const bar = document.getElementById('empBulkActionBar');
      const countText = document.getElementById('empSelectedCountText');

      if (selectedEmpIds.size > 0) {
        if (bar) bar.classList.remove('d-none');
        if (countText) countText.textContent = selectedEmpIds.size;
      } else {
        if (bar) bar.classList.add('d-none');
        const mainCheck = document.getElementById('selectAllEmpCheckbox');
        if (mainCheck) mainCheck.checked = false;
      }
    };

    function renderEmployeeDirectory() {
      const cardsContainer = document.getElementById('employeeCardsContainer');
      const tableContainer = document.getElementById('employeeTableContainer');
      const tableBody = document.getElementById('employeeTableBody');
      const queryInput = document.getElementById('empSearchInput');
      const query = queryInput ? queryInput.value.toLowerCase().trim() : '';
      const sortSelect = document.getElementById('empSortSelect');
      const sortVal = sortSelect ? sortSelect.value : 'id';

      let filtered = employeeList.filter(emp => {
        const nick = (emp.nickname || '').toLowerCase();
        const empCode = (emp.code || emp.id || '').toLowerCase();
        return !query || (emp.name && emp.name.toLowerCase().includes(query)) || nick.includes(query) || empCode.includes(query) || (emp.department && emp.department.toLowerCase().includes(query)) || (emp.details && emp.details.toLowerCase().includes(query));
      });

      function getEmpCodeStr(emp) {
        if (!emp) return '';
        return String(emp.code || emp.employeeCode || emp.empCode || emp.id || emp.employeeId || '').trim();
      }
      function getEmpNameStr(emp) {
        if (!emp) return '';
        return String(emp.name || '').trim();
      }
      function getEmpDeptStr(emp) {
        if (!emp) return '';
        return String(emp.department || '').trim();
      }

      function compareCodes(a, b) {
        const codeA = getEmpCodeStr(a);
        const codeB = getEmpCodeStr(b);
        if (!codeA && !codeB) return 0;
        if (!codeA) return 1;
        if (!codeB) return -1;
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      }

      function compareNames(a, b) {
        const nameA = getEmpNameStr(a);
        const nameB = getEmpNameStr(b);
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
      }

      function compareDepts(a, b) {
        const deptA = getEmpDeptStr(a);
        const deptB = getEmpDeptStr(b);
        if (!deptA && !deptB) return 0;
        if (!deptA) return 1;
        if (!deptB) return -1;
        return deptA.localeCompare(deptB, 'th', { sensitivity: 'base' });
      }

      filtered.sort((a, b) => {
        if (sortVal === 'name') {
          const comp = compareNames(a, b);
          if (comp !== 0) return comp;
          return compareCodes(a, b);
        } else if (sortVal === 'department') {
          const comp = compareDepts(a, b);
          if (comp !== 0) return comp;
          const codeComp = compareCodes(a, b);
          if (codeComp !== 0) return codeComp;
          return compareNames(a, b);
        } else {
          const comp = compareCodes(a, b);
          if (comp !== 0) return comp;
          return compareNames(a, b);
        }
      });

      // Update Select All checkbox status
      const selectAllCheck = document.getElementById('selectAllEmpCheckbox');
      if (selectAllCheck) {
        if (filtered.length > 0) {
          const allSelected = filtered.every(e => selectedEmpIds.has(e.id));
          selectAllCheck.checked = allSelected;
        } else {
          selectAllCheck.checked = false;
        }
      }

      // Handle View Mode Toggle Visibility
      if (empViewMode === 'table') {
        if (tableContainer) tableContainer.classList.remove('d-none');
        if (cardsContainer) cardsContainer.classList.add('d-none');
      } else {
        if (tableContainer) tableContainer.classList.add('d-none');
        if (cardsContainer) cardsContainer.classList.remove('d-none');
      }

      // 1. Render Table Rows
      if (tableBody) {
        if (filtered.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="8" class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 text-secondary opacity-50 d-block mb-2"></i>
                <div>ไม่พบข้อมูลบุคลากรตามคำค้นหาที่ระบุ</div>
              </td>
            </tr>
          `;
        } else {
          let tableHtml = '';
          filtered.forEach(emp => {
            const isChecked = selectedEmpIds.has(emp.id);
            const deptName = emp.department ? (emp.department.startsWith('แผนก') ? emp.department : 'แผนก' + emp.department) : 'ไม่ระบุแผนก';
            const displayName = formatEmpName(emp);
            const empCodeDisplay = emp.code || emp.id;
            const posDisplay = emp.details || emp.position || '-';

            tableHtml += `
              <tr class="${isChecked ? 'table-primary bg-opacity-10' : ''}">
                <td class="ps-3">
                  <input type="checkbox" class="form-check-input emp-select-checkbox cursor-pointer" value="${emp.id}" ${isChecked ? 'checked' : ''} onchange="toggleEmployeeSelection('${emp.id}', this.checked)">
                </td>
                <td>
                  <img src="${emp.photoUrl}" class="avatar-circle border" style="width: 38px; height: 38px; object-fit: cover;" alt="${typeof escapeHtml === 'function' ? escapeHtml(emp.name || '') : (emp.name || '')}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'" />
                </td>
                <td>
                  <span class="badge bg-dark font-monospace px-2 py-1 fs-8">${typeof escapeHtml === 'function' ? escapeHtml(empCodeDisplay) : empCodeDisplay}</span>
                </td>
                <td>
                  <div class="fw-bold text-dark">${typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName}</div>
                </td>
                <td>
                  <span class="badge bg-success bg-opacity-10 text-success border border-success-subtle fw-semibold px-2 py-1 fs-8"><i class="bi bi-building me-1"></i>${typeof escapeHtml === 'function' ? escapeHtml(deptName) : deptName}</span>
                </td>
                <td>
                  <span class="text-secondary fs-8">${typeof escapeHtml === 'function' ? escapeHtml(posDisplay) : posDisplay}</span>
                </td>
                <td>
                  <span class="text-muted font-monospace fs-8"><i class="bi bi-telephone me-1 text-secondary"></i>${typeof escapeHtml === 'function' ? escapeHtml(emp.phone || '-') : (emp.phone || '-')}</span>
                </td>
                <td class="text-center">
                  <div class="d-flex align-items-center justify-content-center gap-1">
                    <button class="btn btn-outline-success btn-xs rounded-pill px-2 py-0.5 fs-8 fw-semibold" title="สั่งพิมพ์บัตรประจำตัว" onclick="openPrintEmployeeBadgeModal('${emp.id}')">
                      <i class="bi bi-person-badge"></i> พิมพ์
                    </button>
                    <button class="btn btn-outline-info btn-xs rounded-pill px-2 py-0.5 fs-8 fw-semibold" title="ดูประวัติการเบิก-ยืม" onclick="openEmployeeBorrowHistoryModal('${emp.id}')">
                      <i class="bi bi-clock-history"></i> ประวัติ
                    </button>
                    <button class="btn btn-outline-primary btn-xs rounded-pill px-2 py-0.5 fs-8" title="แก้ไขข้อมูล" onclick="openEditEmployeeModal('${emp.id}')">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-xs rounded-pill px-2 py-0.5 fs-8" title="ลบ" onclick="deleteEmployee('${emp.id}')">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
          tableBody.innerHTML = tableHtml;
        }
      }

      // 2. Render Card View
      if (cardsContainer) {
        if (filtered.length === 0) {
          cardsContainer.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
              <i class="bi bi-people fs-1 text-secondary opacity-50 d-block mb-2"></i>
              <div>ไม่พบข้อมูลบุคลากรตามคำค้นหาที่ระบุ</div>
            </div>
          `;
        } else {
          let cardHtml = '';
          filtered.forEach(emp => {
            const isChecked = selectedEmpIds.has(emp.id);
            const deptName = emp.department ? (emp.department.startsWith('แผนก') ? emp.department : 'แผนก' + emp.department) : 'ไม่ระบุแผนก';
            const displayName = formatEmpName(emp);
            const empCodeDisplay = emp.code || emp.id;

            cardHtml += `
              <div class="col-12 col-md-6 col-lg-4">
                <div class="employee-card p-3 d-flex align-items-center justify-content-between gap-2 border ${isChecked ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : ''}" style="position: relative;">
                  <div class="position-absolute top-0 start-0 m-2">
                    <input type="checkbox" class="form-check-input cursor-pointer" value="${emp.id}" ${isChecked ? 'checked' : ''} onchange="toggleEmployeeSelection('${emp.id}', this.checked)" title="เลือกบุคลากร">
                  </div>
                  <div class="d-flex align-items-center gap-3 ms-4">
                    <img src="${emp.photoUrl}" class="avatar-circle border" alt="${typeof escapeHtml === 'function' ? escapeHtml(emp.name || '') : (emp.name || '')}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'" />
                    <div>
                      <div class="fw-bold text-dark mb-1 fs-6">${typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName}</div>
                      <div class="fs-7 text-success fw-bold mb-1"><i class="bi bi-building me-1"></i>[${typeof escapeHtml === 'function' ? escapeHtml(empCodeDisplay) : empCodeDisplay}] ${typeof escapeHtml === 'function' ? escapeHtml(deptName) : deptName}</div>
                      ${emp.details ? `<div class="fs-8 text-secondary text-truncate" style="max-width: 180px;" title="${typeof escapeHtml === 'function' ? escapeHtml(emp.details) : emp.details}"><i class="bi bi-card-text me-1"></i> ${typeof escapeHtml === 'function' ? escapeHtml(emp.details) : emp.details}</div>` : ''}
                      <div class="fs-8 text-muted"><i class="bi bi-telephone me-1"></i> ${typeof escapeHtml === 'function' ? escapeHtml(emp.phone || '-') : (emp.phone || '-')}</div>
                    </div>
                  </div>
                  
                  <div class="d-flex flex-column gap-1">
                    <button class="btn btn-outline-success btn-sm rounded-pill fs-7 fw-semibold" title="สั่งพิมพ์บัตรประจำตัวรายบุคคล" onclick="openPrintEmployeeBadgeModal('${emp.id}')">
                      <i class="bi bi-person-badge me-1"></i> พิมพ์
                    </button>
                    <button class="btn btn-outline-info btn-sm rounded-pill fs-7 fw-semibold" title="ดูประวัติการเบิก-ยืม" onclick="openEmployeeBorrowHistoryModal('${emp.id}')">
                      <i class="bi bi-clock-history me-1"></i> ประวัติฯ
                    </button>
                    <button class="btn btn-outline-primary btn-sm rounded-pill fs-7" title="แก้ไขข้อมูลพนักงาน" onclick="openEditEmployeeModal('${emp.id}')">
                      <i class="bi bi-pencil-square me-1"></i> แก้ไข
                    </button>
                    <button class="btn btn-outline-danger btn-sm rounded-pill fs-7" title="ลบรายชื่อพนักงาน" onclick="deleteEmployee('${emp.id}')">
                      <i class="bi bi-trash me-1"></i> ลบ
                    </button>
                  </div>
                </div>
              </div>
            `;
          });
          cardsContainer.innerHTML = cardHtml;
        }
      }

      updateEmpBulkActionBar();
    }
    window.renderEmployeeDirectory = renderEmployeeDirectory;

    // --- BULK UPDATE EMPLOYEES LOGIC ---
    window.openBulkUpdateEmpModal = function() {
      if (selectedEmpIds.size === 0) {
        showToast("⚠️ กรุณาเลือกบุคลากรอย่างน้อย 1 รายการเพื่อทำรายการแบบกลุ่ม");
        return;
      }

      const countText = document.getElementById('bulkEmpSelectedCountText');
      if (countText) countText.textContent = selectedEmpIds.size;

      const summaryContainer = document.getElementById('bulkEmpItemsSummary');
      if (summaryContainer) {
        let summaryHtml = '';
        selectedEmpIds.forEach(empId => {
          const emp = employeeList.find(x => x.id === empId);
          if (emp) {
            const name = formatEmpName(emp);
            const dept = emp.department || 'ไม่ระบุ';
            const safeName = typeof escapeHtml === 'function' ? escapeHtml(name) : name;
            const safeDept = typeof escapeHtml === 'function' ? escapeHtml(dept) : dept;
            summaryHtml += `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle py-1 px-2.5 rounded-pill fs-8"><i class="bi bi-person-fill me-1"></i>${safeName} <small class="text-muted">(${safeDept})</small></span>`;
          }
        });
        summaryContainer.innerHTML = summaryHtml || '<span class="text-muted fs-8">ไม่มีรายการ</span>';
      }

      // Populate Department Dropdown in Modal
      const deptSelect = document.getElementById('bulkEmpDeptSelect');
      if (deptSelect) {
        deptSelect.innerHTML = '<option value="">-- เลือกแผนกที่ต้องการเปลี่ยน --</option>';
        if (typeof departmentsList !== 'undefined' && Array.isArray(departmentsList)) {
          departmentsList.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            deptSelect.appendChild(opt);
          });
        }
        const customOpt = document.createElement('option');
        customOpt.value = 'CUSTOM';
        customOpt.textContent = '➕ กำหนดชื่อแผนกใหม่...';
        deptSelect.appendChild(customOpt);
      }

      // Reset form states
      const chkDept = document.getElementById('chkUpdateEmpDept');
      const chkPos = document.getElementById('chkUpdateEmpPos');
      if (chkDept) chkDept.checked = false;
      if (chkPos) chkPos.checked = false;

      const posSelect = document.getElementById('bulkEmpPosSelect');
      if (posSelect) posSelect.value = '';
      const customDeptInput = document.getElementById('bulkEmpCustomDeptInput');
      if (customDeptInput) customDeptInput.value = '';

      window.toggleBulkEmpDeptField(false);
      window.toggleBulkEmpPosField(false);

      const modalElem = document.getElementById('bulkUpdateEmpModal');
      if (modalElem && typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modalElem);
        bsModal.show();
      }
    };

    window.toggleBulkEmpDeptField = function(enabled) {
      const container = document.getElementById('bulkEmpDeptContainer');
      if (container) {
        if (enabled) container.classList.remove('d-none');
        else container.classList.add('d-none');
      }
    };

    window.toggleBulkEmpCustomDeptInput = function(val) {
      const customInput = document.getElementById('bulkEmpCustomDeptInput');
      if (customInput) {
        if (val === 'CUSTOM') customInput.classList.remove('d-none');
        else customInput.classList.add('d-none');
      }
    };

    window.toggleBulkEmpPosField = function(enabled) {
      const container = document.getElementById('bulkEmpPosContainer');
      if (container) {
        if (enabled) container.classList.remove('d-none');
        else container.classList.add('d-none');
      }
    };

    window.executeBulkUpdateEmployees = async function() {
      if (selectedEmpIds.size === 0) {
        showToast("⚠️ กรุณาเลือกบุคลากรอย่างน้อย 1 รายการ");
        return;
      }

      const updateDeptChecked = document.getElementById('chkUpdateEmpDept')?.checked;
      const updatePosChecked = document.getElementById('chkUpdateEmpPos')?.checked;

      if (!updateDeptChecked && !updatePosChecked) {
        showToast("⚠️ กรุณาเปิดใช้งานอย่างน้อย 1 หัวข้อที่ต้องการอัปเดต (แผนก หรือ ตำแหน่ง)");
        return;
      }

      let newDept = null;
      if (updateDeptChecked) {
        const deptSelectVal = document.getElementById('bulkEmpDeptSelect')?.value;
        if (deptSelectVal === 'CUSTOM') {
          newDept = (document.getElementById('bulkEmpCustomDeptInput')?.value || '').trim();
        } else {
          newDept = deptSelectVal;
        }

        if (!newDept) {
          showToast("⚠️ กรุณาระบุชื่อแผนกที่ต้องการอัปเดต");
          return;
        }
      }

      let newPos = null;
      if (updatePosChecked) {
        newPos = (document.getElementById('bulkEmpPosSelect')?.value || document.getElementById('bulkEmpPosInput')?.value || '').trim();
        if (!newPos) {
          showToast("⚠️ กรุณาเลือกตำแหน่งที่ต้องการอัปเดต");
          return;
        }
      }

      let updatedCount = 0;
      const promises = [];

      for (const empId of selectedEmpIds) {
        const emp = employeeList.find(x => x.id === empId);
        if (emp) {
          const updateData = {};
          if (updateDeptChecked && newDept) {
            emp.department = newDept;
            updateData.department = newDept;
          }
          if (updatePosChecked && newPos) {
            emp.details = newPos;
            emp.position = newPos;
            updateData.details = newPos;
            updateData.position = newPos;
          }

          updatedCount++;

          if (isFirebaseReady && db) {
            try {
              promises.push(updateDoc(doc(db, "employees", emp.id), updateData));
            } catch (err) {
              console.warn("Firestore bulk employee update error:", err);
            }
          }
        }
      }

      if (promises.length > 0) {
        try {
          await Promise.all(promises);
        } catch (err) {
          console.warn("Bulk update employees promise error:", err);
        }
      }

      saveToLocalStorage();

      if (typeof logAuditAction === 'function') {
        const changesText = [
          newDept ? `แผนก -> "${newDept}"` : '',
          newPos ? `ตำแหน่ง -> "${newPos}"` : ''
        ].filter(Boolean).join(' และ ');
        logAuditAction('บุคลากร', 'แก้ไขแบบกลุ่ม', `อัปเดตข้อมูลบุคลากร ${updatedCount} คน: ${changesText}`, 'BULK_UPDATE');
      }

      showToast(`⚡ อัปเดตข้อมูลบุคลากรเรียบร้อยแล้วจำนวน ${updatedCount} คน`);

      // Close Modal
      const modalElem = document.getElementById('bulkUpdateEmpModal');
      if (modalElem && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getInstance(modalElem);
        if (bsModal) bsModal.hide();
      }

      clearEmployeeSelections();
      populateEmployeeDropdowns();
      if (typeof populateDepartmentDropdowns === 'function') populateDepartmentDropdowns();
      renderEmployeeDirectory();
    };

    window.executeBulkDeleteEmployees = async function() {
      if (selectedEmpIds.size === 0) return;

      const ok = await window.showConfirmDialog({
        title: "ลบข้อมูลบุคลากร",
        message: `ต้องการลบข้อมูลบุคลากรที่เลือกจำนวน ${selectedEmpIds.size} คน ใช่หรือไม่?`,
        type: "danger",
        confirmText: `ลบ ${selectedEmpIds.size} คน`
      });
      if (!ok) return;

      let deletedCount = 0;
      const deleteIds = Array.from(selectedEmpIds);

      for (const empId of deleteIds) {
        const idx = employeeList.findIndex(x => x.id === empId);
        if (idx !== -1) {
          employeeList.splice(idx, 1);
          deletedCount++;

          if (isFirebaseReady && db) {
            try {
              await deleteDoc(doc(db, "employees", empId));
            } catch (err) {
              console.warn("Firestore bulk employee delete error:", err);
            }
          }
        }
      }

      saveToLocalStorage();

      if (typeof logAuditAction === 'function') {
        logAuditAction('บุคลากร', 'ลบแบบกลุ่ม', `ลบข้อมูลบุคลากรจำนวน ${deletedCount} คน`, 'BULK_DELETE');
      }

      showToast(`🗑️ ลบข้อมูลบุคลากรเรียบร้อยแล้วจำนวน ${deletedCount} คน`);
      clearEmployeeSelections();
      populateEmployeeDropdowns();
      renderEmployeeDirectory();
    };

    window.executeBulkPrintBadges = function() {
      if (selectedEmpIds.size === 0) return;
      openPrintEmployeeBadgeModal('ALL');
    };

    function renderAttendanceTable() {
      const tbody = document.getElementById('attendanceTableBody');
      let attIn = 0, attOut = 0, attSick = 0, attLeave = 0;

      let html = '';
      attendanceLogs.forEach(log => {
        let badge = '';
        if (log.status === 'เข้างาน') {
          badge = '<span class="badge bg-success">🟢 เข้างาน</span>';
          attIn++;
        } else if (log.status === 'เลิกงาน') {
          badge = '<span class="badge bg-danger">🔴 เลิกงาน</span>';
          attOut++;
        } else if (log.status === 'ลาป่วย') {
          badge = '<span class="badge bg-purple" style="background-color: #6f42c1;">🟣 ลาป่วย</span>';
          attSick++;
        } else {
          badge = '<span class="badge bg-warning text-dark">🟡 ลาหยุด/ลากิจ</span>';
          attLeave++;
        }

        html += `
          <tr>
            <td class="fw-bold">${log.time}</td>
            <td class="fw-semibold">${log.employeeName}</td>
            <td>${badge}</td>
            <td class="text-muted fs-8">${log.note}</td>
          </tr>
        `;
      });

      tbody.innerHTML = html || `<tr><td colspan="4" class="text-center py-3 text-muted">ยังไม่มีบันทึกเวลาทำงานวันนี้</td></tr>`;

      document.getElementById('statAttIn').textContent = attIn;
      document.getElementById('statAttOut').textContent = attOut;
      document.getElementById('statAttSick').textContent = attSick;
      document.getElementById('statAttLeave').textContent = attLeave;
    }

    let staffSortField = 'code';
    let staffSortAsc = true;
    let staffStockFilterMode = 'ALL';

    window.toggleStaffSort = function(field) {
      if (staffSortField === field) {
        staffSortAsc = !staffSortAsc;
      } else {
        staffSortField = field;
        staffSortAsc = true;
      }
      renderStaffTable();
    };

    window.filterStaffLowStockOnly = function() {
      if (typeof switchNavTab === 'function') {
        switchNavTab('manage-tab');
      } else {
        const staffTabBtn = document.getElementById('manage-tab');
        if (staffTabBtn) staffTabBtn.click();
      }
      if (staffStockFilterMode === 'LOW_STOCK') {
        staffStockFilterMode = 'ALL';
        if (typeof showToast === 'function') {
          showToast('📦 แสดงรายการอุปกรณ์ทุกระดับสต๊อกเรียบร้อยแล้ว');
        }
      } else {
        staffStockFilterMode = 'LOW_STOCK';
        if (typeof showToast === 'function') {
          showToast('🚨 กรองแสดงเฉพาะรายการอุปกรณ์ที่มีสต๊อกต่ำกว่าขั้นต่ำเรียบร้อยแล้ว');
        }
      }
      renderStaffTable();
    };

    window.toggleLowStockFilterStaff = function() {
      if (staffStockFilterMode === 'LOW_STOCK') {
        staffStockFilterMode = 'ALL';
        if (typeof showToast === 'function') showToast('📦 แสดงอุปกรณ์ทุกระดับสต๊อก');
      } else {
        staffStockFilterMode = 'LOW_STOCK';
        if (typeof showToast === 'function') showToast('🚨 กรองแสดงเฉพาะรายการอุปกรณ์ที่มีสต๊อกต่ำกว่าขั้นต่ำ');
      }
      renderStaffTable();
    };

    window.resetStaffStockFilter = function() {
      staffStockFilterMode = 'ALL';
      renderStaffTable();
      if (typeof showToast === 'function') {
        showToast('📦 แสดงรายการอุปกรณ์ทุกระดับสต๊อกเรียบร้อยแล้ว');
      }
    };

    window.clearStaffSearch = function() {
      const input = document.getElementById('staffSearchInput');
      if (input) input.value = '';
      const catSelect = document.getElementById('staffCategorySelect');
      if (catSelect) catSelect.value = 'ALL';
      staffStockFilterMode = 'ALL';
      renderStaffTable();
    };

    window.filterStaffTableWithScannedItem = function() {
      if (!activeScannedItemId) return;
      const item = equipmentList.find(x => x.id === activeScannedItemId);
      if (!item) return;

      const input = document.getElementById('staffSearchInput');
      if (input) {
        input.value = item.code || item.name;
      }
      renderStaffTable();

      stopHtml5Scanner();
      const modalElem = document.getElementById('barcodeQrScannerModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      const staffTabBtn = document.getElementById('gear-item-manage');
      if (staffTabBtn) staffTabBtn.click();

      showToast(`🔍 ค้นหาอุปกรณ์ "${item.name}" ในตารางเรียบร้อยแล้ว`);
    };

    window.renderStaffTable = function renderStaffTable() {
      const tbody = document.getElementById('staffInventoryTableBody');
      const bannerContainer = document.getElementById('lowStockAlertBanner');
      const navBadge = document.getElementById('manageLowStockBadge');
      if (!tbody) return;

      const lowStockItems = equipmentList.filter(item => {
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        return (Number(item.quantity) || 0) < minQty;
      });
      const currentStockFilter = staffStockFilterMode;

      // Update Low Stock Count Badge & Active Button State for Staff Table
      const staffLowStockBadge = document.getElementById('staffLowStockBadgeCount');
      if (staffLowStockBadge) staffLowStockBadge.textContent = lowStockItems.length;
      const btnStaffLowStock = document.getElementById('btnFilterLowStockStaff');
      const btnStaffLowStockText = document.getElementById('btnStaffLowStockText');
      if (btnStaffLowStock) {
        if (lowStockItems.length > 0) {
          btnStaffLowStock.classList.remove('d-none');
          btnStaffLowStock.classList.add('d-inline-flex');
          if (currentStockFilter === 'LOW_STOCK') {
            btnStaffLowStock.classList.add('btn-low-stock-active');
            if (btnStaffLowStockText) btnStaffLowStockText.textContent = 'แสดงสต๊อกทั้งหมด';
          } else {
            btnStaffLowStock.classList.remove('btn-low-stock-active');
            if (btnStaffLowStockText) btnStaffLowStockText.textContent = 'แสดงสต๊อกต่ำ';
          }
        } else {
          btnStaffLowStock.classList.add('d-none');
          btnStaffLowStock.classList.remove('d-inline-flex', 'btn-low-stock-active');
          if (btnStaffLowStockText) btnStaffLowStockText.textContent = 'แสดงสต๊อกต่ำ';
          if (currentStockFilter === 'LOW_STOCK') {
            staffStockFilterMode = 'ALL';
          }
        }
      }

      if (bannerContainer) {
        bannerContainer.innerHTML = '';
      }

      // Render Badge on Navigation Tab
      if (navBadge) {
        if (lowStockItems.length > 0) {
          navBadge.innerHTML = `<span class="badge bg-danger rounded-pill pulse-danger-badge ms-1 fs-8 cursor-pointer" onclick="event.stopPropagation(); filterStaffLowStockOnly();" title="คลิกเพื่อกรองเฉพาะรายการสต๊อกต่ำ"><i class="bi bi-bell-fill me-1"></i>${lowStockItems.length}</span>`;
        } else {
          navBadge.innerHTML = '';
        }
      }

      // Populate Category Dropdown for Staff Filter if needed
      const staffCatSelect = document.getElementById('staffCategorySelect');
      if (staffCatSelect && staffCatSelect.options.length <= 1) {
        if (typeof renderCategoryDropdowns === 'function') {
          renderCategoryDropdowns();
        }
      }

      // Filter Logic
      const searchQuery = (document.getElementById('staffSearchInput')?.value || '').toLowerCase().trim();
      const selectedCat = document.getElementById('staffCategorySelect')?.value || 'ALL';
      const selectedStockStatus = staffStockFilterMode;

      let filtered = equipmentList.filter(item => {
        const nameStr = String(item.name || '').toLowerCase();
        const codeStr = String(item.code || '').toLowerCase();
        const catStr = String(item.category || '').toLowerCase();
        const locStr = String(item.location || '').toLowerCase();
        const descStr = String(item.description || '').toLowerCase();
        const idStr = String(item.id || '').toLowerCase();
        const unitStr = String(item.unit || '').toLowerCase();

        const matchesQuery = !searchQuery ||
          nameStr.includes(searchQuery) ||
          codeStr.includes(searchQuery) ||
          catStr.includes(searchQuery) ||
          locStr.includes(searchQuery) ||
          descStr.includes(searchQuery) ||
          idStr.includes(searchQuery) ||
          unitStr.includes(searchQuery);

        const matchesCategory = selectedCat === 'ALL' || item.category === selectedCat;

        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const isLowStock = (Number(item.quantity) || 0) < minQty;

        let matchesStock = true;
        if (selectedStockStatus === 'LOW_STOCK') {
          matchesStock = isLowStock;
        } else if (selectedStockStatus === 'NORMAL') {
          matchesStock = !isLowStock;
        }

        return matchesQuery && matchesCategory && matchesStock;
      });

      // Sorting Logic
      filtered.sort((a, b) => {
        let valA = '', valB = '';
        if (staffSortField === 'code') {
          valA = (a.code || a.id || '').toString();
          valB = (b.code || b.id || '').toString();
          return staffSortAsc 
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        } else if (staffSortField === 'name') {
          valA = a.name || '';
          valB = b.name || '';
          return staffSortAsc ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
        } else if (staffSortField === 'category') {
          valA = a.category || '';
          valB = b.category || '';
          return staffSortAsc ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
        } else if (staffSortField === 'quantity') {
          const numA = Number(a.quantity || 0);
          const numB = Number(b.quantity || 0);
          return staffSortAsc ? numA - numB : numB - numA;
        } else if (staffSortField === 'borrowed') {
          const numA = Number(a.borrowedCount || 0);
          const numB = Number(b.borrowedCount || 0);
          return staffSortAsc ? numA - numB : numB - numA;
        } else if (staffSortField === 'location') {
          valA = a.location || '';
          valB = b.location || '';
          return staffSortAsc ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
        }
        return 0;
      });

      // Update Total Count Badge
      const countBadge = document.getElementById('staffTotalCountBadge');
      if (countBadge) {
        if (selectedStockStatus === 'LOW_STOCK') {
          countBadge.className = "badge bg-danger text-white rounded-pill px-3 py-2 fs-8 flex-shrink-0 pulse-danger-badge";
          countBadge.innerHTML = `<i class="bi bi-bell-fill me-1"></i> สต๊อกต่ำ ${filtered.length} / ${equipmentList.length} รายการ`;
        } else {
          countBadge.className = "badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2 fs-8 flex-shrink-0";
          countBadge.textContent = `แสดง ${filtered.length} / จาก ${equipmentList.length} รายการ`;
        }
      }

      // Update Sort Header Icons
      ['code', 'name', 'category', 'quantity', 'borrowed', 'location'].forEach(f => {
        const iconElem = document.getElementById(`sortIcon-${f}`);
        if (iconElem) {
          if (f === staffSortField) {
            const isNum = (f === 'quantity' || f === 'borrowed');
            const iconClass = isNum 
              ? (staffSortAsc ? 'bi-sort-numeric-down text-success fw-bold' : 'bi-sort-numeric-down-alt text-success fw-bold')
              : (staffSortAsc ? 'bi-sort-alpha-down text-success fw-bold' : 'bi-sort-alpha-down-alt text-success fw-bold');
            iconElem.innerHTML = `<i class="bi ${iconClass}"></i>`;
          } else {
            iconElem.innerHTML = `<i class="bi bi-arrow-down-up text-muted opacity-50"></i>`;
          }
        }
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center py-5 text-muted">
              <i class="bi bi-search display-6 text-secondary d-block mb-2"></i>
              <div class="fw-bold">${selectedStockStatus === 'LOW_STOCK' ? '🎉 ไม่มีรายการอุปกรณ์ใดที่สต๊อกต่ำกว่าขั้นต่ำในขณะนี้' : 'ไม่พบรายการอุปกรณ์การเกษตรที่ตรงกับคำค้นหา'}</div>
              <small class="text-secondary">${searchQuery ? `คำค้นหา: "${searchQuery}"` : ''} ${selectedCat !== 'ALL' ? `หมวดหมู่: "${selectedCat}"` : ''} ${selectedStockStatus === 'LOW_STOCK' ? '(กรองเฉพาะสต๊อกต่ำกว่าขั้นต่ำ)' : ''}</small>
              <div class="mt-2">
                <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="resetStaffStockFilter(); clearStaffSearch();">
                  <i class="bi bi-arrow-counterclockwise me-1"></i> ล้างการกรองข้อมูลทั้งหมด
                </button>
              </div>
            </td>
          </tr>
        `;
        if (typeof updateStaffBulkActionBar === 'function') updateStaffBulkActionBar();
        return;
      }

      let html = '';
      const isStaff = currentRole === 'STAFF' || currentRole === 'ADMIN' || currentRole === 'MANAGER';

      filtered.forEach(item => {
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const curQty = Number(item.quantity) || 0;
        const isLowStock = curQty < minQty;
        const rowClass = isLowStock ? 'low-stock-row' : '';
        const isChecked = window.selectedStaffItemIds && window.selectedStaffItemIds.has(item.id);

        let stockBadge = '';
        if (isLowStock) {
          stockBadge = `<span class="badge bg-danger text-white pulse-danger-badge fs-7 px-3 py-1.5"><i class="bi bi-exclamation-triangle-fill me-1"></i> ${curQty} ${item.unit} (ต่ำกว่าขั้นต่ำ < ${minQty})</span>`;
        } else if (curQty === minQty || curQty <= minQty + 2) {
          stockBadge = `<span class="badge bg-warning text-dark fs-7 px-2.5 py-1.5"><i class="bi bi-exclamation-circle-fill me-1"></i> ${curQty} ${item.unit} (ใกล้ขั้นต่ำ ${minQty})</span>`;
        } else {
          stockBadge = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 fs-7 px-2.5 py-1.5">${curQty} ${item.unit} (ขั้นต่ำ ${minQty})</span>`;
        }

        html += `
          <tr class="${rowClass}">
            <td class="ps-3 text-center" style="width: 45px;">
              <input type="checkbox" class="form-check-input staff-item-checkbox cursor-pointer" value="${item.id}" ${isChecked ? 'checked' : ''} onchange="toggleStaffItemSelect('${item.id}', this.checked)" onclick="event.stopPropagation()" />
            </td>
            <td class="ps-2" style="width: 70px;">
              <div class="position-relative ${isStaff ? 'cursor-pointer' : ''} d-inline-block" ${isStaff ? `onclick="openEquipmentPopupMenu('${item.id}')" title="คลิกรูปภาพเพื่อเปิดเมนู (Popup Menu)"` : ''}>
                <img src="${item.imageUrl}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" onerror="this.src='${DEFAULT_EQUIPMENT_IMAGE}'" />
                ${isStaff ? `
                  <span class="position-absolute bottom-0 end-0 bg-dark text-white rounded-circle p-1 d-flex align-items-center justify-content-center shadow-sm" style="width: 18px; height: 18px; font-size: 10px;">
                    <i class="bi bi-three-dots"></i>
                  </span>
                ` : ''}
              </div>
            </td>
            <td>
              <span class="badge bg-dark font-monospace mb-1">${item.code}</span>
            </td>
            <td>
              <div class="fw-bold text-dark d-flex align-items-center gap-1 ${isStaff ? 'cursor-pointer' : ''}" ${isStaff ? `onclick="openEquipmentPopupMenu('${item.id}')"` : ''}>
                ${item.name}
                ${isLowStock ? '<span class="badge bg-danger rounded-pill pulse-danger-badge fs-8 ms-1"><i class="bi bi-bell-fill me-1"></i>เตือน! สต๊อกต่ำ</span>' : ''}
              </div>
              <small class="text-muted fs-7">${item.description ? item.description.substring(0, 45) + '...' : '-'}</small>
            </td>
            <td><span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">${item.category}</span></td>
            <td class="text-center">
              ${stockBadge}
            </td>
            <td class="text-center">
              ${(item.borrowedCount || 0) > 0 ? `
                <button type="button" class="btn btn-sm btn-outline-warning text-dark fw-bold rounded-pill px-2.5 py-1 shadow-sm d-inline-flex align-items-center gap-1" onclick="showEquipmentBorrowersModal('${item.id}')" title="กดดูรายชื่อผู้ยืมอุปกรณ์นี้">
                  <i class="bi bi-people-fill text-warning"></i> ${item.borrowedCount} ${item.unit} <span class="badge bg-dark text-white rounded-pill ms-0.5" style="font-size: 8px;">ดูผู้ยืม</span>
                </button>
              ` : `
                <span class="text-muted fs-8">0 ${item.unit}</span>
              `}
            </td>
            <td class="fs-7 text-secondary"><i class="bi bi-geo-alt me-1 text-danger"></i>${item.location || 'คลังกลาง'}</td>
            <td class="text-end pe-3">
              ${isStaff ? `
                <button class="btn btn-sm btn-outline-success rounded-pill fw-semibold px-2.5 py-1 d-inline-flex align-items-center gap-1" onclick="openEquipmentPopupMenu('${item.id}')" title="เปิดเมนูจัดการรายการอุปกรณ์">
                  <i class="bi bi-sliders text-success"></i> เมนู
                </button>
              ` : `
                <span class="text-muted fs-8">-</span>
              `}
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
      if (typeof updateStaffBulkActionBar === 'function') updateStaffBulkActionBar();
    }

    // ==========================================
    // MULTI-SELECT & BULK ACTIONS LOGIC
    // ==========================================
    window.selectedStaffItemIds = window.selectedStaffItemIds || new Set();

    window.toggleStaffItemSelect = function(itemId, isChecked) {
      if (isChecked) {
        window.selectedStaffItemIds.add(itemId);
      } else {
        window.selectedStaffItemIds.delete(itemId);
      }
      window.updateStaffBulkActionBar();
    };

    window.toggleSelectAllStaffItems = function(checkboxElem) {
      const isChecked = checkboxElem ? checkboxElem.checked : false;
      const tbody = document.getElementById('staffInventoryTableBody');
      if (!tbody) return;
      const rowCheckboxes = tbody.querySelectorAll('.staff-item-checkbox');
      rowCheckboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) {
          window.selectedStaffItemIds.add(cb.value);
        } else {
          window.selectedStaffItemIds.delete(cb.value);
        }
      });
      window.updateStaffBulkActionBar();
    };

    window.clearStaffItemSelections = function() {
      window.selectedStaffItemIds.clear();
      const selectAll = document.getElementById('selectAllStaffItems');
      if (selectAll) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
      }
      const tbody = document.getElementById('staffInventoryTableBody');
      if (tbody) {
        tbody.querySelectorAll('.staff-item-checkbox').forEach(cb => cb.checked = false);
      }
      window.updateStaffBulkActionBar();
    };

    window.updateStaffBulkActionBar = function() {
      const bar = document.getElementById('staffBulkActionBar');
      const countSpan = document.getElementById('staffSelectedCountText');
      const selectAllHeader = document.getElementById('selectAllStaffItems');
      const tbody = document.getElementById('staffInventoryTableBody');

      const selectedCount = window.selectedStaffItemIds ? window.selectedStaffItemIds.size : 0;

      if (countSpan) countSpan.textContent = selectedCount;

      if (bar) {
        if (selectedCount > 0) {
          bar.classList.remove('d-none');
        } else {
          bar.classList.add('d-none');
        }
      }

      if (tbody && selectAllHeader) {
        const visibleCheckboxes = Array.from(tbody.querySelectorAll('.staff-item-checkbox'));
        if (visibleCheckboxes.length > 0) {
          const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
          if (checkedCount === visibleCheckboxes.length) {
            selectAllHeader.checked = true;
            selectAllHeader.indeterminate = false;
          } else if (checkedCount > 0) {
            selectAllHeader.checked = false;
            selectAllHeader.indeterminate = true;
          } else {
            selectAllHeader.checked = false;
            selectAllHeader.indeterminate = false;
          }
        } else {
          selectAllHeader.checked = false;
          selectAllHeader.indeterminate = false;
        }
      }
    };

    // --- BULK UPDATE LOCATION ---
    window.openBulkUpdateLocationModal = function() {
      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      if (selectedIds.length === 0) {
        showToast('⚠️ กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการเพื่อดำเนินการ');
        return;
      }

      const selectedItems = equipmentList.filter(item => window.selectedStaffItemIds.has(item.id));

      const countElem = document.getElementById('bulkLocSelectedCountText');
      if (countElem) countElem.textContent = selectedItems.length;

      const summaryContainer = document.getElementById('bulkLocItemsSummary');
      if (summaryContainer) {
        summaryContainer.innerHTML = selectedItems.map(item => `
          <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill fs-8">
            [${item.code}] ${item.name} <small class="text-muted">(${item.location || 'คลังกลาง'})</small>
          </span>
        `).join('');
      }

      const locSelect = document.getElementById('bulkLocationSelect');
      if (locSelect) {
        locSelect.innerHTML = '<option value="">-- เลือกสถานที่เก็บ --</option>';
        const locations = Array.from(new Set(equipmentList.map(x => x.location).filter(Boolean)));
        if (!locations.includes('คลังกลาง')) locations.unshift('คลังกลาง');
        locations.forEach(loc => {
          const opt = document.createElement('option');
          opt.value = loc;
          opt.textContent = `📍 ${loc}`;
          locSelect.appendChild(opt);
        });
        const customOpt = document.createElement('option');
        customOpt.value = 'CUSTOM';
        customOpt.textContent = '➕ ระบุสถานที่เก็บใหม่เพิ่มเติม...';
        locSelect.appendChild(customOpt);
      }

      const customInput = document.getElementById('bulkLocationCustomInput');
      if (customInput) {
        customInput.value = '';
        customInput.classList.add('d-none');
      }

      const modalElem = document.getElementById('bulkUpdateLocationModal');
      if (modalElem) new bootstrap.Modal(modalElem).show();
    };

    window.toggleBulkCustomLocationInput = function(val) {
      const customInput = document.getElementById('bulkLocationCustomInput');
      if (customInput) {
        if (val === 'CUSTOM') customInput.classList.remove('d-none');
        else customInput.classList.add('d-none');
      }
    };

    window.executeBulkUpdateLocation = async function() {
      const selectElem = document.getElementById('bulkLocationSelect');
      let targetLoc = selectElem ? selectElem.value : '';
      if (targetLoc === 'CUSTOM') {
        targetLoc = (document.getElementById('bulkLocationCustomInput')?.value || '').trim();
      }

      if (!targetLoc) {
        alert('กรุณาระบุสถานที่เก็บที่ต้องการอัปเดต');
        return;
      }

      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      let updatedCount = 0;

      for (const id of selectedIds) {
        const item = equipmentList.find(x => x.id === id);
        if (item) {
          item.location = targetLoc;
          updatedCount++;
          if (isFirebaseReady && db) {
            try {
              await setDoc(doc(db, "equipment", id), item, { merge: true });
            } catch (e) {
              console.error("Error updating location in Firestore:", e);
            }
          }
        }
      }

      saveToLocalStorage();
      if (typeof logAuditAction === 'function') {
        logAuditAction('BULK_UPDATE_LOCATION', currentUser ? currentUser.displayName || currentUser.email : 'Staff', `อัปเดตสถานที่เก็บ ${updatedCount} รายการ เป็น "${targetLoc}"`);
      }

      const modalElem = document.getElementById('bulkUpdateLocationModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      renderStaffTable();
      showToast(`📍 อัปเดตสถานที่เก็บ ${updatedCount} รายการ เป็น "${targetLoc}" เรียบร้อยแล้ว!`);
    };

    // --- BULK ADD TO PRINT QUEUE / PRINT LABELS ---
    window.openBulkAddToPrintQueueModal = function() {
      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      if (selectedIds.length === 0) {
        showToast('⚠️ กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการเพื่อพิมพ์ฉลาก');
        return;
      }

      openPrintLabelModal('SELECTED');
      showToast(`🖨️ เพิ่มอุปกรณ์ ${selectedIds.length} รายการ ลงในคิวพิมพ์ฉลาก QR/Barcode เรียบร้อยแล้ว`);
    };

    // --- BULK UPDATE CATEGORY ---
    window.openBulkUpdateCategoryModal = function() {
      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      if (selectedIds.length === 0) {
        showToast('⚠️ กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการ');
        return;
      }

      const selectedItems = equipmentList.filter(item => window.selectedStaffItemIds.has(item.id));

      const countElem = document.getElementById('bulkCatSelectedCountText');
      if (countElem) countElem.textContent = selectedItems.length;

      const summaryContainer = document.getElementById('bulkCatItemsSummary');
      if (summaryContainer) {
        summaryContainer.innerHTML = selectedItems.map(item => `
          <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill fs-8">
            [${item.code}] ${item.name} <small class="text-muted">(${item.category})</small>
          </span>
        `).join('');
      }

      const catSelect = document.getElementById('bulkCategorySelect');
      if (catSelect) {
        catSelect.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
        const categories = window.categoriesList || Array.from(new Set(equipmentList.map(x => x.category).filter(Boolean)));
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = `📂 ${cat}`;
          catSelect.appendChild(opt);
        });
      }

      const modalElem = document.getElementById('bulkUpdateCategoryModal');
      if (modalElem) new bootstrap.Modal(modalElem).show();
    };

    window.executeBulkUpdateCategory = async function() {
      const catSelect = document.getElementById('bulkCategorySelect');
      const targetCategory = catSelect ? catSelect.value : '';

      if (!targetCategory) {
        alert('กรุณาเลือกหมวดหมู่ใหม่ที่ต้องการอัปเดต');
        return;
      }

      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      let updatedCount = 0;

      for (const id of selectedIds) {
        const item = equipmentList.find(x => x.id === id);
        if (item) {
          item.category = targetCategory;
          updatedCount++;
          if (isFirebaseReady && db) {
            try {
              await setDoc(doc(db, "equipment", id), item, { merge: true });
            } catch (e) {
              console.error("Error updating category in Firestore:", e);
            }
          }
        }
      }

      saveToLocalStorage();
      if (typeof logAuditAction === 'function') {
        logAuditAction('BULK_UPDATE_CATEGORY', currentUser ? currentUser.displayName || currentUser.email : 'Staff', `เปลี่ยนหมวดหมู่อุปกรณ์ ${updatedCount} รายการ เป็น "${targetCategory}"`);
      }

      const modalElem = document.getElementById('bulkUpdateCategoryModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      renderStaffTable();
      showToast(`📂 เปลี่ยนหมวดหมู่อุปกรณ์ ${updatedCount} รายการ เป็น "${targetCategory}" เรียบร้อยแล้ว!`);
    };

    // --- BULK RESTOCK ---
    window.openBulkRestockModal = function() {
      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      if (selectedIds.length === 0) {
        showToast('⚠️ กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการ');
        return;
      }

      const selectedItems = equipmentList.filter(item => window.selectedStaffItemIds.has(item.id));

      const countElem = document.getElementById('bulkRestockSelectedCountText');
      if (countElem) countElem.textContent = selectedItems.length;

      const summaryContainer = document.getElementById('bulkRestockItemsSummary');
      if (summaryContainer) {
        summaryContainer.innerHTML = selectedItems.map(item => `
          <span class="badge bg-warning bg-opacity-10 text-dark border border-warning rounded-pill fs-8">
            [${item.code}] ${item.name} <small class="fw-bold">(${item.quantity} ${item.unit})</small>
          </span>
        `).join('');
      }

      const qtyInput = document.getElementById('bulkRestockQtyInput');
      if (qtyInput) qtyInput.value = 5;

      const modalElem = document.getElementById('bulkRestockModal');
      if (modalElem) new bootstrap.Modal(modalElem).show();
    };

    window.executeBulkRestock = async function() {
      const qtyInput = document.getElementById('bulkRestockQtyInput');
      const addQty = parseInt(qtyInput ? qtyInput.value : 0) || 0;
      const noteInput = document.getElementById('bulkRestockNoteInput');
      const restockNote = (noteInput ? noteInput.value : '').trim() || 'เติมสต๊อกแบบกลุ่ม (Bulk Restock)';

      if (addQty <= 0) {
        alert('กรุณาระบุจำนวนสต๊อกที่ต้องการเพิ่มมากกว่า 0');
        return;
      }

      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      let updatedCount = 0;

      for (const id of selectedIds) {
        const item = equipmentList.find(x => x.id === id);
        if (item) {
          item.quantity = (Number(item.quantity) || 0) + addQty;
          updatedCount++;

          // Log transaction
          const newTx = {
            id: 'tx-' + String(Date.now()).slice(-6) + '-' + Math.floor(Math.random()*100),
            type: 'เติมสต๊อก',
            employeeId: currentUser ? currentUser.uid : 'STAFF',
            employeeName: currentUser ? (currentUser.displayName || currentUser.email) : 'พนักงานคลัง',
            equipmentId: item.id,
            equipmentName: `${item.name} [${item.code}]`,
            quantity: addQty,
            unit: item.unit || 'ชิ้น',
            location: item.location || 'คลังกลาง',
            note: restockNote,
            rawTimestamp: Date.now(),
            timestamp: new Date().toLocaleString('th-TH')
          };
          transactionHistory.unshift(newTx);

          if (isFirebaseReady && db) {
            try {
              await setDoc(doc(db, "equipment", id), item, { merge: true });
              await addDoc(collection(db, "transactions"), newTx);
            } catch (e) {
              console.error("Error restocking in Firestore:", e);
            }
          }
        }
      }

      saveToLocalStorage();
      if (typeof logAuditAction === 'function') {
        logAuditAction('BULK_RESTOCK', currentUser ? currentUser.displayName || currentUser.email : 'Staff', `เติมสต๊อกอุปกรณ์ ${updatedCount} รายการ รายการละ +${addQty}`);
      }

      const modalElem = document.getElementById('bulkRestockModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      renderStaffTable();
      if (typeof renderHistoryTable === 'function') renderHistoryTable();
      showToast(`⚡ เติมสต๊อกอุปกรณ์ ${updatedCount} รายการ รายการละ +${addQty} เรียบร้อยแล้ว!`);
    };

    // --- BULK DELETE ---
    window.executeBulkDeleteItems = async function() {
      const selectedIds = Array.from(window.selectedStaffItemIds || []);
      if (selectedIds.length === 0) {
        showToast('⚠️ กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการ');
        return;
      }

      const confirmed = await window.showConfirmDialog({
        title: "ลบอุปกรณ์ที่เลือก",
        message: `ต้องการลบอุปกรณ์ที่เลือกทั้งหมด ${selectedIds.length} รายการ ใช่หรือไม่?`,
        type: "danger",
        confirmText: `ลบ ${selectedIds.length} รายการ`
      });
      if (!confirmed) return;

      let deletedCount = 0;
      for (const id of selectedIds) {
        const idx = equipmentList.findIndex(x => x.id === id);
        if (idx >= 0) {
          const item = equipmentList[idx];
          equipmentList.splice(idx, 1);
          deletedCount++;

          if (isFirebaseReady && db) {
            try {
              await deleteDoc(doc(db, "equipment", id));
            } catch (e) {
              console.error("Error deleting item in Firestore:", e);
            }
          }
        }
      }

      window.selectedStaffItemIds.clear();
      saveToLocalStorage();
      if (typeof logAuditAction === 'function') {
        logAuditAction('BULK_DELETE', currentUser ? currentUser.displayName || currentUser.email : 'Staff', `ลบอุปกรณ์คลังแบบกลุ่ม ${deletedCount} รายการ`);
      }

      renderStaffTable();
      showToast(`🗑️ ลบรายการอุปกรณ์ที่เลือก ${deletedCount} รายการ เรียบร้อยแล้ว`);
    };

    window.clearAllHistoryLog = async function() {
      if (currentRole !== 'ADMIN') {
        showToast("⚠️ เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ลบประวัติการทำรายการ");
        return;
      }

      if (!transactionHistory || transactionHistory.length === 0) {
        showToast("ℹ️ ไม่พบประวัติการทำรายการในระบบ");
        return;
      }

      const totalCount = transactionHistory.length;

      const ok = await window.showConfirmDialog({
        title: "ลบประวัติทั้งหมด",
        message: `ต้องการลบประวัติการทำรายการทั้งหมด (${totalCount} รายการ) ใช่หรือไม่?`,
        type: "danger",
        confirmText: "ลบประวัติทั้งหมด"
      });
      if (!ok) return;

      // Delete from Firestore if database is ready
      if (isFirebaseReady && db) {
        try {
          const snapshot = await getDocs(collection(db, "transactions"));
          const deletePromises = [];
          snapshot.forEach(docSnap => {
            deletePromises.push(deleteDoc(doc(db, "transactions", docSnap.id)));
          });
          await Promise.all(deletePromises);
        } catch (err) {
          console.warn("Firestore delete transactions warning:", err);
        }
      }

      // Clear local memory & storage
      transactionHistory = [];
      saveToLocalStorage();

      if (typeof logAuditAction === 'function') {
        logAuditAction('ประวัติรายการ', 'ลบ', `ลบประวัติการเบิก/ยืม/คืน/รับเข้า ทั้งหมดจำนวน ${totalCount} รายการ`, 'ALL_HISTORY');
      }

      // Refresh UI
      renderHistoryTable();
      if (typeof updateStats === 'function') updateStats();

      showToast(`🗑️ ลบประวัติการทำรายการทั้งหมดจำนวน ${totalCount} รายการเรียบร้อยแล้ว`);
    };

    window.clearHistorySearch = function() {
      const input = document.getElementById('historySearchInput');
      if (input) input.value = '';
      const filterType = document.getElementById('historyFilterType');
      if (filterType) filterType.value = 'ALL';
      renderHistoryTable();
    };

    // Global Timestamp Parser for robust Date-Time sorting (Year-Month-Day + Hour-Min-Sec)
    window.getRecordTimestampMs = function getRecordTimestampMs(item) {
      if (!item) return 0;
      if (typeof item.rawTimestamp === 'number' && !isNaN(item.rawTimestamp) && item.rawTimestamp > 0) {
        return item.rawTimestamp;
      }
      if (typeof item.timestamp === 'number' && !isNaN(item.timestamp) && item.timestamp > 0) {
        return item.timestamp;
      }

      if (item.timestamp && typeof item.timestamp === 'string') {
        const str = item.timestamp.trim();
        let parsed = Date.parse(str);
        if (!isNaN(parsed) && parsed > 0) return parsed;

        const cleanStr = str.replace(/[,]/g, ' ');
        const parts = cleanStr.split(/\s+/).filter(Boolean);
        if (parts.length >= 1) {
          let dateStr = parts[0];
          let timeStr = parts[1] || '00:00:00';

          let d = 1, m = 0, y = 1970;
          if (dateStr.includes('/')) {
            const dmy = dateStr.split('/');
            if (dmy.length === 3) {
              d = parseInt(dmy[0], 10) || 1;
              m = (parseInt(dmy[1], 10) || 1) - 1;
              y = parseInt(dmy[2], 10) || 1970;
              if (y > 2400) y -= 543;
            }
          } else if (dateStr.includes('-')) {
            const ymd = dateStr.split('-');
            if (ymd.length === 3) {
              y = parseInt(ymd[0], 10) || 1970;
              m = (parseInt(ymd[1], 10) || 1) - 1;
              d = parseInt(ymd[2], 10) || 1;
              if (y > 2400) y -= 543;
            }
          }

          let hh = 0, mm = 0, ss = 0;
          if (timeStr.includes(':')) {
            const hms = timeStr.split(':');
            hh = parseInt(hms[0], 10) || 0;
            mm = parseInt(hms[1], 10) || 0;
            ss = parseInt(hms[2], 10) || 0;
          }

          const dt = new Date(y, m, d, hh, mm, ss);
          const t = dt.getTime();
          if (!isNaN(t) && t > 0) return t;
        }
      }

      if (item.docNo) {
        const num = parseInt(String(item.docNo).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0) return num;
      }
      if (item.id) {
        const num = parseInt(String(item.id).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0) return num;
      }
      return 0;
    };

    // History Table Sorting & Pagination State
    let historySortColumn = 'timestamp';
    let historySortDirection = 'desc'; // ค่าเริ่มต้น: วัน-เวลา จากมากไปหาน้อย

    window.setHistorySort = function setHistorySort(col) {
      if (historySortColumn === col) {
        historySortDirection = (historySortDirection === 'asc') ? 'desc' : 'asc';
      } else {
        historySortColumn = col;
        if (col === 'timestamp' || col === 'quantity') {
          historySortDirection = 'desc';
        } else {
          historySortDirection = 'asc';
        }
      }
      historyCurrentPage = 1;
      renderHistoryTable();
    };

    window.changeHistoryPage = function(page) {
      historyCurrentPage = page;
      renderHistoryTable();
    };

    window.changeHistoryPageSize = function(val) {
      historyPageSize = val;
      historyCurrentPage = 1;
      renderHistoryTable();
    };

    window.updateDailyTransactionSummary = function updateDailyTransactionSummary() {
      const container = document.getElementById('dailyTransactionSummaryContainer');
      if (!container) return;

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDate = now.getDate();

      let issueCount = 0;
      let borrowCount = 0;
      let returnCount = 0;
      let receiveCount = 0;
      let totalToday = 0;

      const txs = Array.isArray(window.transactionHistory) ? window.transactionHistory : [];

      txs.forEach(tx => {
        if (!tx) return;
        const ms = typeof window.getRecordTimestampMs === 'function' ? window.getRecordTimestampMs(tx) : 0;
        if (ms <= 0) return;

        const txDate = new Date(ms);
        if (isNaN(txDate.getTime())) return;

        if (txDate.getFullYear() === todayYear &&
            txDate.getMonth() === todayMonth &&
            txDate.getDate() === todayDate) {

          totalToday++;
          const type = (tx.type || '').trim();

          if (type === 'เบิกจ่าย' || type === 'เบิก' || type.toLowerCase().includes('issue')) {
            issueCount++;
          } else if (type === 'ยืมอุปกรณ์' || type === 'ยืม' || type.toLowerCase().includes('borrow')) {
            borrowCount++;
          } else if (type === 'คืนอุปกรณ์' || type === 'คืน' || type.toLowerCase().includes('return')) {
            returnCount++;
          } else if (type.includes('รับเข้า') || type.includes('เติม') || type.toLowerCase().includes('receive')) {
            receiveCount++;
          } else {
            if (type.includes('เบิก')) issueCount++;
            else if (type.includes('ยืม')) borrowCount++;
            else if (type.includes('คืน')) returnCount++;
            else receiveCount++;
          }
        }
      });

      const thaiDateStr = now.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      container.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white border-start border-4 border-primary">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-2.5">
              <div class="bg-primary-subtle text-primary p-2 rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 42px; height: 42px;">
                <i class="bi bi-calendar2-check-fill fs-5"></i>
              </div>
              <div>
                <h6 class="fw-bold mb-0 text-dark">สรุปรายการวันนี้</h6>
                <span class="text-muted fs-8"><i class="bi bi-clock-history me-1"></i>ประจำวันที่ ${thaiDateStr}</span>
              </div>
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 ms-auto">
              <div class="bg-danger-subtle text-danger border border-danger-subtle rounded-3 px-3 py-1.5 text-center shadow-2xs" style="min-width: 100px;">
                <div class="fs-9 text-uppercase fw-bold text-muted mb-0"><i class="bi bi-arrow-up-right-circle me-1 text-danger"></i>เบิก</div>
                <div class="fs-5 fw-extrabold text-danger mb-0">${issueCount} <span class="fs-9 text-muted font-normal">รายการ</span></div>
              </div>

              <div class="bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-3 px-3 py-1.5 text-center shadow-2xs" style="min-width: 100px;">
                <div class="fs-9 text-uppercase fw-bold text-muted mb-0"><i class="bi bi-box-arrow-up-right me-1 text-warning-emphasis"></i>ยืม</div>
                <div class="fs-5 fw-extrabold text-dark mb-0">${borrowCount} <span class="fs-9 text-muted font-normal">รายการ</span></div>
              </div>

              <div class="bg-info-subtle text-info-emphasis border border-info-subtle rounded-3 px-3 py-1.5 text-center shadow-2xs" style="min-width: 100px;">
                <div class="fs-9 text-uppercase fw-bold text-muted mb-0"><i class="bi bi-box-arrow-in-down-left me-1 text-info-emphasis"></i>คืน</div>
                <div class="fs-5 fw-extrabold text-primary mb-0">${returnCount} <span class="fs-9 text-muted font-normal">รายการ</span></div>
              </div>

              <div class="bg-success-subtle text-success border border-success-subtle rounded-3 px-3 py-1.5 text-center shadow-2xs" style="min-width: 100px;">
                <div class="fs-9 text-uppercase fw-bold text-muted mb-0"><i class="bi bi-plus-circle me-1 text-success"></i>รับเข้า</div>
                <div class="fs-5 fw-extrabold text-success mb-0">${receiveCount} <span class="fs-9 text-muted font-normal">รายการ</span></div>
              </div>

              <div class="bg-primary text-white rounded-3 px-3 py-1.5 text-center shadow-sm" style="min-width: 105px;">
                <div class="fs-9 text-uppercase fw-bold text-white-70 mb-0"><i class="bi bi-hash me-1"></i>รวมวันนี้</div>
                <div class="fs-5 fw-extrabold text-white mb-0">${totalToday} <span class="fs-9 text-white-70 font-normal">รายการ</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    window.renderHistoryTable = function renderHistoryTable() {
      const tbody = document.getElementById('historyTableBody');
      const filterType = document.getElementById('historyFilterType')?.value || 'ALL';
      const searchQuery = (document.getElementById('historySearchInput')?.value || '').toLowerCase().trim();

      // Update Daily Summary Overview Card
      if (typeof window.updateDailyTransactionSummary === 'function') {
        window.updateDailyTransactionSummary();
      }

      if (!tbody) return;

      // Update sort header icons
      ['timestamp', 'type', 'employee', 'equipment', 'quantity', 'location'].forEach(col => {
        const iconElem = document.getElementById(`sort-icon-history-${col}`);
        if (iconElem) {
          if (historySortColumn === col) {
            if (historySortDirection === 'asc') {
              iconElem.innerHTML = `<i class="bi bi-arrow-up-short text-success fw-bold fs-6"></i>`;
            } else {
              iconElem.innerHTML = `<i class="bi bi-arrow-down-short text-primary fw-bold fs-6"></i>`;
            }
          } else {
            iconElem.innerHTML = `<i class="bi bi-arrow-down-up text-muted fs-8 opacity-50"></i>`;
          }
        }
      });

      let filtered = transactionHistory.filter(tx => {
        if (!tx) return false;

        // Filter by Transaction Type
        let matchesType = (filterType === 'ALL');
        if (!matchesType) {
          if (filterType === 'รับเข้าสต๊อก (ขาเข้า)' || filterType === 'รับเข้าสต๊อก') {
            matchesType = tx.type === 'รับเข้าสต๊อก (ขาเข้า)' || tx.type === 'รับเข้าสต๊อก' || tx.type === 'เติมสต๊อกด่วน';
          } else {
            matchesType = (tx.type === filterType);
          }
        }
        if (!matchesType) return false;

        // Filter by Search Query
        if (!searchQuery) return true;

        // Collect all searchable strings from this transaction
        const fieldsToSearch = [
          tx.id,
          tx.docNo,
          tx.type,
          tx.employeeId,
          tx.employeeName,
          tx.employeeCode,
          tx.equipmentId,
          tx.equipmentName,
          tx.equipmentCode,
          tx.location,
          tx.note,
          tx.timestamp,
          tx.unit,
          tx.quantity !== undefined ? String(tx.quantity) : ''
        ];

        if (Array.isArray(tx.items)) {
          tx.items.forEach(i => {
            if (i) {
              fieldsToSearch.push(i.equipmentName, i.equipmentCode, i.equipmentId, i.unit, String(i.quantity));
            }
          });
        }

        const combinedText = fieldsToSearch.filter(Boolean).join(' ').toLowerCase();

        // Support space-separated multi-word queries
        const words = searchQuery.split(/\s+/).filter(Boolean);
        return words.every(word => combinedText.includes(word));
      });

      // Sort filtered records (Default: timestamp desc)
      const dir = historySortDirection === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        if (historySortColumn === 'timestamp') {
          const timeA = getRecordTimestampMs(a);
          const timeB = getRecordTimestampMs(b);
          return dir * (timeA - timeB);
        } else if (historySortColumn === 'type') {
          return dir * (a.type || '').localeCompare(b.type || '', 'th');
        } else if (historySortColumn === 'employee') {
          return dir * (a.employeeName || '').localeCompare(b.employeeName || '', 'th');
        } else if (historySortColumn === 'equipment') {
          const equipA = (a.items && a.items.length > 0 ? a.items.map(i => i.equipmentName).join(', ') : a.equipmentName) || '';
          const equipB = (b.items && b.items.length > 0 ? b.items.map(i => i.equipmentName).join(', ') : b.equipmentName) || '';
          return dir * equipA.localeCompare(equipB, 'th');
        } else if (historySortColumn === 'quantity') {
          const qtyA = Number(a.quantity !== undefined ? a.quantity : (a.items && a.items.length > 0 ? a.items.reduce((s,i) => s + (i.quantity||0), 0) : 0));
          const qtyB = Number(b.quantity !== undefined ? b.quantity : (b.items && b.items.length > 0 ? b.items.reduce((s,i) => s + (i.quantity||0), 0) : 0));
          return dir * (qtyA - qtyB);
        } else if (historySortColumn === 'location') {
          const locA = (a.location || '') + ' ' + (a.note || '');
          const locB = (b.location || '') + ' ' + (b.note || '');
          return dir * locA.localeCompare(locB, 'th');
        }
        return 0;
      });

      const totalItems = filtered.length;

      if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบประวัติการทำรายการที่ตรงกับคำค้นหา</td></tr>`;
        const pagInfo = document.getElementById('historyPaginationInfo');
        if (pagInfo) pagInfo.textContent = 'แสดง 0 - 0 จาก 0 รายการ';
        const pagNav = document.getElementById('historyPaginationNav');
        if (pagNav) pagNav.innerHTML = '';
        return;
      }

      // Pagination
      let pageSize = historyPageSize === 'ALL' ? totalItems : (parseInt(historyPageSize, 10) || 15);
      const totalPages = Math.ceil(totalItems / pageSize);

      if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
      if (historyCurrentPage < 1) historyCurrentPage = 1;

      const startIndex = (historyCurrentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);
      const pageTxs = filtered.slice(startIndex, endIndex);

      let html = '';
      pageTxs.forEach(tx => {
        let typeBadge = '';
        if (tx.type === 'เบิกจ่าย') {
          typeBadge = '<span class="badge bg-danger"><i class="bi bi-box-arrow-up me-1"></i> เบิกจ่าย</span>';
        } else if (tx.type === 'ยืมอุปกรณ์') {
          typeBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-arrow-repeat me-1"></i> ยืมอุปกรณ์</span>';
        } else if (tx.type === 'คืนอุปกรณ์') {
          typeBadge = '<span class="badge bg-info text-dark"><i class="bi bi-box-arrow-in-down me-1"></i> คืนอุปกรณ์</span>';
        } else if (tx.type === 'รับเข้าสต๊อก (ขาเข้า)' || tx.type === 'รับเข้าสต๊อก' || tx.type === 'เติมสต๊อกด่วน') {
          typeBadge = '<span class="badge bg-success"><i class="bi bi-box-arrow-in-down-left me-1"></i> รับเข้าสต๊อก</span>';
        } else {
          typeBadge = `<span class="badge bg-secondary">${tx.type}</span>`;
        }

        let itemsDisplay = '';
        if (tx.items && Array.isArray(tx.items) && tx.items.length > 1) {
          itemsDisplay = `
            <div class="fw-bold text-success"><i class="bi bi-boxes me-1"></i>${tx.items.length} รายการอุปกรณ์ในเอกสาร</div>
            <div class="d-flex flex-wrap gap-1 mt-1">
              ${tx.items.map(i => `<span class="badge bg-light text-dark border font-monospace fs-8">📦 ${i.equipmentName} (${i.quantity} ${i.unit})</span>`).join('')}
            </div>
          `;
        } else if (tx.items && Array.isArray(tx.items) && tx.items.length === 1) {
          itemsDisplay = `<span class="fw-bold text-success">${tx.items[0].equipmentName} [${tx.items[0].equipmentCode}]</span>`;
        } else {
          itemsDisplay = `<span class="fw-bold text-success">${tx.equipmentName || '-'}</span>`;
        }

        html += `
          <tr>
            <td class="ps-3 fs-7 text-secondary">
              <div>${tx.timestamp}</div>
              <small class="text-muted font-monospace fs-8"><i class="bi bi-receipt me-1"></i>${tx.docNo || tx.id}</small>
            </td>
            <td>${typeBadge}</td>
            <td class="fw-semibold text-dark">${tx.employeeName || '-'}</td>
            <td>${itemsDisplay}</td>
            <td class="text-center fw-bold fs-6">${tx.quantity !== undefined ? tx.quantity : '-'} ${tx.unit || 'ชิ้น'}</td>
            <td class="fs-7 text-muted">
              <div><i class="bi bi-geo-alt me-1 text-danger"></i> ${tx.location || '-'}</div>
              ${tx.note ? `<div><i class="bi bi-chat-left-text me-1"></i> ${tx.note}</div>` : ''}
            </td>
            <td class="text-end pe-3">
              <div class="d-flex align-items-center justify-content-end gap-1">
                <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-2 py-0.5 fs-8 fw-semibold" onclick="openPrintTransactionVoucherModal('${tx.id}')" title="พิมพ์เอกสาร">
                  <i class="bi bi-printer-fill me-1"></i>พิมพ์
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-2 py-0.5 fs-8 fw-semibold" onclick="deleteDbRecord('transactions', '${tx.id}')" title="ลบรายการประวัตินี้">
                  <i class="bi bi-trash3-fill me-1"></i>ลบ
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;

      // Update History Pagination info & buttons
      const pagInfo = document.getElementById('historyPaginationInfo');
      if (pagInfo) {
        pagInfo.textContent = `แสดง ${startIndex + 1} - ${endIndex} จาก ${totalItems} รายการ`;
      }

      const pagNav = document.getElementById('historyPaginationNav');
      if (pagNav) {
        if (historyPageSize === 'ALL' || totalPages <= 1) {
          pagNav.innerHTML = '';
        } else {
          let navHtml = `
            <li class="page-item ${historyCurrentPage === 1 ? 'disabled' : ''}">
              <button class="page-link rounded-start-pill" onclick="changeHistoryPage(${historyCurrentPage - 1})">ก่อนหน้า</button>
            </li>
          `;

          for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= historyCurrentPage - 2 && p <= historyCurrentPage + 2)) {
              navHtml += `
                <li class="page-item ${p === historyCurrentPage ? 'active' : ''}">
                  <button class="page-link" onclick="changeHistoryPage(${p})">${p}</button>
                </li>
              `;
            } else if (p === historyCurrentPage - 3 || p === historyCurrentPage + 3) {
              navHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
          }

          navHtml += `
            <li class="page-item ${historyCurrentPage === totalPages ? 'disabled' : ''}">
              <button class="page-link rounded-end-pill" onclick="changeHistoryPage(${historyCurrentPage + 1})">ถัดไป</button>
            </li>
          `;
          pagNav.innerHTML = navHtml;
        }
      }
    };

    // ==========================================
    // AUDIT LOGS MANAGEMENT (ประวัติเพิ่ม แก้ไข ลบ)
    // ==========================================
    let auditLogCurrentPage = 1;
    let auditLogPageSize = 15;
    let auditLogSortColumn = 'timestamp';
    let auditLogSortDirection = 'desc'; // ค่าเริ่มต้น: วัน-เวลา จากมากไปหาน้อย

    window.isThammaSrithongAdmin = function() {
      if (typeof window.canAccessDatabaseEditor === 'function') {
        return window.canAccessDatabaseEditor();
      }
      if (typeof currentRole !== 'undefined' && currentRole !== 'ADMIN') return false;
      const displayName = ((typeof currentAuthUser !== 'undefined' && currentAuthUser?.displayName) || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.displayName) || '').trim();
      const email = ((typeof currentAuthUser !== 'undefined' && currentAuthUser?.email) || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.email) || '').trim().toLowerCase();

      if (displayName) {
        const lowerName = displayName.toLowerCase();
        const isThamma = lowerName.includes('thamma') || lowerName.includes('srithong') || lowerName.includes('ธรรมะ') || lowerName.includes('ศรีทอง');
        const isGeneric = lowerName === 'ผู้ใช้งาน' || lowerName === 'ผู้ดูแลระบบ' || lowerName === 'ผู้ใช้';
        if (!isThamma && !isGeneric) return false;
      }

      if (email && email !== 'jaru072@gmail.com') {
        const lowerName = displayName.toLowerCase();
        const isThamma = lowerName.includes('thamma') || lowerName.includes('srithong') || lowerName.includes('ธรรมะ') || lowerName.includes('ศรีทอง');
        if (!isThamma) return false;
      }

      return true;
    };

    window.setAuditLogSort = function setAuditLogSort(col) {
      if (auditLogSortColumn === col) {
        auditLogSortDirection = (auditLogSortDirection === 'asc') ? 'desc' : 'asc';
      } else {
        auditLogSortColumn = col;
        if (col === 'timestamp') {
          auditLogSortDirection = 'desc';
        } else {
          auditLogSortDirection = 'asc';
        }
      }
      auditLogCurrentPage = 1;
      renderAuditLogsTable();
    };

    window.logAuditAction = async function logAuditAction(moduleName, actionType, detailsText, recordId = '') {
      try {
        const userEmail = currentAuthUser?.email || currentUserProfile?.email || 'jaru072@gmail.com';
        const userName = currentAuthUser?.displayName || currentUserProfile?.displayName || userEmail.split('@')[0] || 'เจ้าหน้าที่';
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        const fullTimestamp = `${dateStr} ${timeStr}`;
        const logId = 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const logEntry = {
          id: logId,
          timestamp: fullTimestamp,
          rawTimestamp: Date.now(),
          userEmail: userEmail,
          userName: userName,
          module: moduleName, // 'บุคลากร', 'อุปกรณ์', 'หมวดหมู่', 'แผนก/สวน', 'ระบบ'
          action: actionType, // 'เพิ่ม', 'แก้ไข', 'ลบ'
          details: detailsText,
          recordId: String(recordId || '')
        };

        if (!Array.isArray(auditLogs)) auditLogs = [];
        auditLogs.unshift(logEntry);

        if (typeof window.renderAuditLogsTable === 'function') {
          window.renderAuditLogsTable();
        }

        if (isFirebaseReady && db) {
          try {
            await setDoc(doc(db, "audit_logs", logId), logEntry);
          } catch (e) {
            console.warn("Firestore audit_log save error:", e);
          }
        }
      } catch (err) {
        console.warn("Failed to log audit action:", err);
      }
    };

    window.renderAuditLogsTable = function renderAuditLogsTable() {
      const tbody = document.getElementById('auditLogTableBody');
      const searchInput = (document.getElementById('auditLogSearchInput')?.value || '').toLowerCase().trim();
      const moduleFilter = document.getElementById('auditLogModuleSelect')?.value || 'ALL';
      const actionFilter = document.getElementById('auditLogActionSelect')?.value || 'ALL';

      if (!tbody) return;

      const isThamma = window.isThammaSrithongAdmin();

      const clearAuditWrapper = document.getElementById('clearAllAuditLogsBtnWrapper');
      if (clearAuditWrapper) {
        if (isThamma) {
          clearAuditWrapper.classList.remove('d-none');
        } else {
          clearAuditWrapper.classList.add('d-none');
        }
      }

      const actionHeader = document.getElementById('auditLogActionHeader');
      if (actionHeader) {
        if (isThamma) {
          actionHeader.classList.remove('d-none');
        } else {
          actionHeader.classList.add('d-none');
        }
      }

      // Update sort header icons
      ['timestamp', 'userEmail', 'module', 'action', 'details'].forEach(col => {
        const iconElem = document.getElementById(`sort-icon-audit-${col}`);
        if (iconElem) {
          if (auditLogSortColumn === col) {
            if (auditLogSortDirection === 'asc') {
              iconElem.innerHTML = `<i class="bi bi-arrow-up-short text-success fw-bold fs-6"></i>`;
            } else {
              iconElem.innerHTML = `<i class="bi bi-arrow-down-short text-primary fw-bold fs-6"></i>`;
            }
          } else {
            iconElem.innerHTML = `<i class="bi bi-arrow-down-up text-muted fs-8 opacity-50"></i>`;
          }
        }
      });

      let filtered = (auditLogs || []).filter(log => {
        if (!log) return false;

        // Module filter
        if (moduleFilter !== 'ALL' && log.module !== moduleFilter) {
          return false;
        }

        // Action filter
        if (actionFilter !== 'ALL' && log.action !== actionFilter) {
          return false;
        }

        // Search query
        if (!searchInput) return true;

        const searchable = [
          log.id,
          log.timestamp,
          log.userEmail,
          log.userName,
          log.module,
          log.action,
          log.details,
          log.recordId
        ].map(s => String(s || '').toLowerCase());

        return searchable.some(str => str.includes(searchInput));
      });

      // Sort filtered logs according to selected column and direction (Default: timestamp desc)
      const dir = auditLogSortDirection === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        if (auditLogSortColumn === 'timestamp') {
          const timeA = getRecordTimestampMs(a);
          const timeB = getRecordTimestampMs(b);
          return dir * (timeA - timeB);
        } else if (auditLogSortColumn === 'userEmail') {
          return dir * (a.userEmail || '').localeCompare(b.userEmail || '', 'th');
        } else if (auditLogSortColumn === 'module') {
          return dir * (a.module || '').localeCompare(b.module || '', 'th');
        } else if (auditLogSortColumn === 'action') {
          return dir * (a.action || '').localeCompare(b.action || '', 'th');
        } else if (auditLogSortColumn === 'details') {
          return dir * (a.details || '').localeCompare(b.details || '', 'th');
        }
        return 0;
      });

      const totalItems = filtered.length;

      if (totalItems === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="${isThamma ? 6 : 5}" class="text-center py-5 text-muted">
              <i class="bi bi-journal-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
              <p class="mb-0 fw-semibold">ไม่พบประวัติการเปลี่ยนแปลงข้อมูล</p>
              <small class="text-black-50">ลองเปลี่ยนคำค้นหา หรือเลือกประเภทโมดูลอื่นๆ</small>
            </td>
          </tr>
        `;
        const pagInfo = document.getElementById('auditLogPaginationInfo');
        if (pagInfo) pagInfo.textContent = 'แสดง 0 - 0 จาก 0 รายการ';
        const pagNav = document.getElementById('auditLogPaginationNav');
        if (pagNav) pagNav.innerHTML = '';
        return;
      }

      // Pagination
      let pageSize = auditLogPageSize === 'ALL' ? totalItems : (parseInt(auditLogPageSize, 10) || 15);
      const totalPages = Math.ceil(totalItems / pageSize);

      if (auditLogCurrentPage > totalPages) auditLogCurrentPage = totalPages;
      if (auditLogCurrentPage < 1) auditLogCurrentPage = 1;

      const startIndex = (auditLogCurrentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);
      const pageLogs = filtered.slice(startIndex, endIndex);

      let html = '';
      pageLogs.forEach(log => {
        let actionBadge = '';
        if (log.action === 'เพิ่ม') {
          actionBadge = `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fs-8"><i class="bi bi-plus-circle-fill me-1"></i>เพิ่ม</span>`;
        } else if (log.action === 'แก้ไข') {
          actionBadge = `<span class="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-2.5 py-1 fs-8"><i class="bi bi-pencil-square me-1"></i>แก้ไข</span>`;
        } else if (log.action === 'ลบ') {
          actionBadge = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 fs-8"><i class="bi bi-trash3-fill me-1"></i>ลบ</span>`;
        } else {
          actionBadge = `<span class="badge bg-secondary-subtle text-secondary border rounded-pill px-2.5 py-1 fs-8">${log.action || '-'}</span>`;
        }

        let moduleBadge = `<span class="badge bg-light text-dark border rounded-pill px-2.5 py-1 fs-8">${log.module || 'ทั่วไป'}</span>`;

        html += `
          <tr>
            <td class="ps-3 text-nowrap">
              <span class="badge bg-light text-dark border fs-8 fw-normal"><i class="bi bi-clock me-1 text-primary"></i>${log.timestamp || '-'}</span>
            </td>
            <td>
              <div class="fw-bold text-dark fs-8 text-break"><i class="bi bi-envelope-at me-1 text-secondary"></i>${log.userEmail || '-'}</div>
              <div class="text-muted fs-8">${log.userName || ''}</div>
            </td>
            <td>${moduleBadge}</td>
            <td class="text-center">${actionBadge}</td>
            <td>
              <div class="fw-semibold text-dark fs-7 text-wrap">${log.details || '-'}</div>
              ${log.recordId ? `<div class="fs-8 text-muted mt-0.5"><i class="bi bi-tag me-1"></i>ID: ${log.recordId}</div>` : ''}
            </td>
            ${isThamma ? `
            <td class="text-end pe-3">
              <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" title="ลบรายการนี้" onclick="deleteSingleAuditLog('${log.id}')">
                <i class="bi bi-trash3"></i>
              </button>
            </td>` : ''}
          </tr>
        `;
      });

      tbody.innerHTML = html;

      // Update Pagination info & buttons
      const pagInfo = document.getElementById('auditLogPaginationInfo');
      if (pagInfo) {
        pagInfo.textContent = `แสดง ${startIndex + 1} - ${endIndex} จาก ${totalItems} รายการ`;
      }

      const pagNav = document.getElementById('auditLogPaginationNav');
      if (pagNav) {
        if (auditLogPageSize === 'ALL' || totalPages <= 1) {
          pagNav.innerHTML = '';
        } else {
          let navHtml = `
            <li class="page-item ${auditLogCurrentPage === 1 ? 'disabled' : ''}">
              <button class="page-link rounded-start-pill" onclick="changeAuditLogPage(${auditLogCurrentPage - 1})">ก่อนหน้า</button>
            </li>
          `;

          for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= auditLogCurrentPage - 2 && p <= auditLogCurrentPage + 2)) {
              navHtml += `
                <li class="page-item ${p === auditLogCurrentPage ? 'active' : ''}">
                  <button class="page-link" onclick="changeAuditLogPage(${p})">${p}</button>
                </li>
              `;
            } else if (p === auditLogCurrentPage - 3 || p === auditLogCurrentPage + 3) {
              navHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
          }

          navHtml += `
            <li class="page-item ${auditLogCurrentPage === totalPages ? 'disabled' : ''}">
              <button class="page-link rounded-end-pill" onclick="changeAuditLogPage(${auditLogCurrentPage + 1})">ถัดไป</button>
            </li>
          `;
          pagNav.innerHTML = navHtml;
        }
      }
    };

    window.changeAuditLogPage = function(page) {
      auditLogCurrentPage = page;
      renderAuditLogsTable();
    };

    window.changeAuditLogPageSize = function(val) {
      auditLogPageSize = val;
      auditLogCurrentPage = 1;
      renderAuditLogsTable();
    };

    window.clearAuditLogSearch = function() {
      const search = document.getElementById('auditLogSearchInput');
      if (search) search.value = '';
      const mod = document.getElementById('auditLogModuleSelect');
      if (mod) mod.value = 'ALL';
      const act = document.getElementById('auditLogActionSelect');
      if (act) act.value = 'ALL';
      auditLogCurrentPage = 1;
      renderAuditLogsTable();
    };

    window.deleteSingleAuditLog = async function(logId) {
      if (!logId) return;
      if (!window.isThammaSrithongAdmin()) {
        showToast("⚠️ เฉพาะ Thamma Srithong (ผู้ดูแลระบบ) เท่านั้นที่มีสิทธิ์ลบประวัติการเปลี่ยนแปลง");
        return;
      }
      const ok = await window.showConfirmDialog({
        title: "ลบประวัติการเปลี่ยนแปลง",
        message: "ต้องการลบประวัติการเปลี่ยนแปลงรายการนี้ใช่หรือไม่?",
        type: "danger",
        confirmText: "ลบรายการ"
      });
      if (ok) {
        auditLogs = auditLogs.filter(x => x.id !== logId);
        renderAuditLogsTable();
        if (isFirebaseReady && db) {
          try {
            await deleteDoc(doc(db, "audit_logs", logId));
          } catch(e) {
            console.warn("Delete single audit log err:", e);
          }
        }
        showToast("ลบประวัติการเปลี่ยนแปลงเรียบร้อยแล้ว");
      }
    };

    window.clearAllAuditLogs = async function() {
      if (!window.isThammaSrithongAdmin()) {
        showToast("⚠️ เฉพาะ Thamma Srithong (ผู้ดูแลระบบ) เท่านั้นที่มีสิทธิ์ลบประวัติการเปลี่ยนแปลงทั้งหมด");
        return;
      }
      if (!auditLogs || auditLogs.length === 0) {
        showToast("ไม่มีประวัติการเปลี่ยนแปลงให้ลบ");
        return;
      }
      const ok = await window.showConfirmDialog({
        title: "ลบประวัติทั้งหมด",
        message: `ต้องการลบประวัติการเปลี่ยนแปลงทั้งหมด ${auditLogs.length} รายการ ใช่หรือไม่?`,
        type: "danger",
        confirmText: "ลบทั้งหมด"
      });
      if (ok) {
        const total = auditLogs.length;
        auditLogs = [];
        renderAuditLogsTable();
        if (isFirebaseReady && db) {
          try {
            const snap = await getDocs(collection(db, "audit_logs"));
            snap.forEach(async (dDoc) => {
              await deleteDoc(dDoc.ref);
            });
          } catch(e) {
            console.warn("Clear audit logs err:", e);
          }
        }
        showToast(`ลบประวัติการเปลี่ยนแปลงทั้งหมด ${total} รายการเรียบร้อยแล้ว`);
      }
    };

    window.exportAuditLogsToCSV = function() {
      if (!auditLogs || auditLogs.length === 0) {
        showToast("ไม่มีข้อมูลประวัติการเปลี่ยนแปลงสำหรับส่งออก CSV");
        return;
      }

      let csvContent = "\uFEFF"; // UTF-8 BOM
      csvContent += "ลำดับ,วัน-เวลา,อีเมลผู้ทำรายการ,ชื่อผู้ทำรายการ,โมดูล,การกระทำ,รายละเอียด,IDอ้างอิง\n";

      auditLogs.forEach((log, index) => {
        const row = [
          index + 1,
          `"${(log.timestamp || '').replace(/"/g, '""')}"`,
          `"${(log.userEmail || '').replace(/"/g, '""')}"`,
          `"${(log.userName || '').replace(/"/g, '""')}"`,
          `"${(log.module || '').replace(/"/g, '""')}"`,
          `"${(log.action || '').replace(/"/g, '""')}"`,
          `"${(log.details || '').replace(/"/g, '""')}"`,
          `"${(log.recordId || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Audit_Logs_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("ส่งออกไฟล์ CSV ประวัติการเปลี่ยนแปลงสำเร็จ!");
    };

    // ==================== USER ONLINE / OFFLINE LOGS LOGIC ====================
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    window.formatThaiBuddhistDateAndTime = function(isoStr) {
      if (!isoStr) return { dateBE: '-', time24: '-', yearBE: 0, rawDate: null };
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return { dateBE: '-', time24: '-', yearBE: 0, rawDate: null };

      const day = d.getDate();
      const monthNamesThaiShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const monthStr = monthNamesThaiShort[d.getMonth()];
      const yearBE = d.getFullYear() + 543;

      const dateBE = `${day} ${monthStr} ${yearBE}`;

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      const time24 = `${hours}:${minutes}:${seconds} น.`;

      return { dateBE, time24, yearBE, rawDate: d };
    };

    window.recordUserLoginStatus = async function(status, userObj = null) {
      try {
        const user = userObj || currentAuthUser || currentUserProfile;
        if (!user) return;

        const email = (user.email || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.email) || '').trim();
        let name = (user.displayName || user.name || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.displayName) || '').trim();
        if (!name && email) {
          name = email.split('@')[0];
        }
        if (!email && !name) return;

        const nowIso = new Date().toISOString();
        const logId = 'login_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const logEntry = {
          id: logId,
          timestamp: nowIso,
          status: status, // 'Online' or 'Offline'
          userName: name || 'ผู้ใช้งาน',
          userEmail: email || 'N/A',
          userId: user.uid || user.id || 'guest'
        };

        if (!Array.isArray(userLoginLogs)) userLoginLogs = [];

        // Avoid recording exact duplicate within 3 seconds for same email and same status
        const recentDup = userLoginLogs.find(x => x.userEmail === email && x.status === status && Math.abs(new Date(nowIso) - new Date(x.timestamp)) < 3000);
        if (recentDup) return;

        userLoginLogs.unshift(logEntry);

        if (typeof window.renderUserLoginLogsTable === 'function') {
          window.renderUserLoginLogsTable();
        }

        if (isFirebaseReady && db) {
          try {
            await setDoc(doc(db, "user_login_logs", logId), logEntry);
            const targetUid = user.uid || user.id;
            if (targetUid && targetUid !== 'guest') {
              const uRef = doc(db, "users", targetUid);
              await setDoc(uRef, {
                isOnline: (status === 'Online'),
                status: status,
                lastActiveAt: nowIso,
                ...(status === 'Online' ? { lastLoginAt: nowIso } : {})
              }, { merge: true });
            }
          } catch (e) {
            console.warn("Firestore user_login_logs / user status save notice:", e);
          }
        }
      } catch (err) {
        console.warn("Error recording user login status:", err);
      }
    };

    window.setUserLoginSort = function(col) {
      if (userLoginSortColumn === col) {
        userLoginSortDirection = userLoginSortDirection === 'desc' ? 'asc' : 'desc';
      } else {
        userLoginSortColumn = col;
        userLoginSortDirection = 'desc'; // Default to descending (มากไปหาน้อย)
      }
      userLoginPage = 1;
      renderUserLoginLogsTable();
    };

    window.setUserLoginPageSize = function(size) {
      userLoginPageSize = parseInt(size, 10) || 25;
      userLoginPage = 1;
      renderUserLoginLogsTable();
    };

    window.clearUserLoginSearch = function() {
      const input = document.getElementById('userLoginSearchInput');
      if (input) input.value = '';
      const filter = document.getElementById('userLoginStatusFilter');
      if (filter) filter.value = 'ALL';
      userLoginPage = 1;
      renderUserLoginLogsTable();
    };

    window.calculateSessionDurations = function(logs) {
      if (!Array.isArray(logs) || logs.length === 0) return {};

      // Sort chronologically ascending (oldest to newest)
      const sorted = [...logs].sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

      const userMap = {};
      sorted.forEach(log => {
        const emailKey = (log.userEmail || log.userName || 'unknown').toLowerCase().trim();
        if (!userMap[emailKey]) userMap[emailKey] = [];
        userMap[emailKey].push(log);
      });

      const durationMap = {};
      const nowMs = Date.now();

      Object.keys(userMap).forEach(emailKey => {
        const userLogs = userMap[emailKey];
        let pendingOnlineLog = null;

        userLogs.forEach(log => {
          const logTime = new Date(log.timestamp || 0).getTime();
          const status = (log.status || '').toLowerCase().trim();

          if (status === 'online') {
            pendingOnlineLog = log;
            const diffMs = Math.max(0, nowMs - logTime);
            const totalMins = Math.floor(diffMs / 60000);
            durationMap[log.id] = {
              minutes: totalMins,
              diffMs: diffMs,
              text: totalMins < 1 ? '< 1 นาที (กำลังใช้งาน)' : `${totalMins} นาที (กำลังใช้งาน)`,
              isLive: true
            };
          } else if (status === 'offline') {
            if (pendingOnlineLog) {
              const onlineTime = new Date(pendingOnlineLog.timestamp || 0).getTime();
              const diffMs = Math.max(0, logTime - onlineTime);
              const totalMins = Math.floor(diffMs / 60000);

              let formattedText = '';
              if (totalMins < 1) {
                const secs = Math.round(diffMs / 1000);
                formattedText = `${secs} วินาที (< 1 นาที)`;
              } else if (totalMins < 60) {
                formattedText = `${totalMins} นาที`;
              } else {
                const hrs = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                formattedText = `${hrs} ชม. ${mins} นาที (${totalMins} นาที)`;
              }

              const durObj = {
                minutes: totalMins,
                diffMs: diffMs,
                text: formattedText,
                isLive: false
              };

              durationMap[log.id] = durObj;
              durationMap[pendingOnlineLog.id] = durObj;

              pendingOnlineLog = null;
            } else {
              durationMap[log.id] = {
                minutes: 0,
                diffMs: 0,
                text: '-',
                isLive: false
              };
            }
          }
        });
      });

      return durationMap;
    };

    window.renderUserLoginLogsTable = function() {
      const tbody = document.getElementById('userLoginLogsTableBody');
      if (!tbody) return;

      const searchInput = (document.getElementById('userLoginSearchInput')?.value || '').trim().toLowerCase();
      const statusFilter = document.getElementById('userLoginStatusFilter')?.value || 'ALL';

      // Pre-calculate session durations for all logs
      const durationMap = window.calculateSessionDurations(userLoginLogs || []);

      // Update sort icons in table header
      ['status', 'date', 'time', 'userName', 'userEmail', 'duration'].forEach(col => {
        const iconElem = document.getElementById(`sort-icon-userlogin-${col}`);
        if (iconElem) {
          if (userLoginSortColumn === col || (userLoginSortColumn === 'timestamp' && col === 'date')) {
            if (userLoginSortDirection === 'asc') {
              iconElem.innerHTML = `<i class="bi bi-arrow-up-short text-success fw-bold fs-6"></i>`;
            } else {
              iconElem.innerHTML = `<i class="bi bi-arrow-down-short text-primary fw-bold fs-6"></i>`;
            }
          } else {
            iconElem.innerHTML = `<i class="bi bi-arrow-down-up text-muted fs-8 opacity-50"></i>`;
          }
        }
      });

      let filtered = (userLoginLogs || []).filter(log => {
        if (!log) return false;

        // Status filter
        if (statusFilter !== 'ALL' && log.status !== statusFilter) {
          return false;
        }

        // Search query
        if (searchInput) {
          const name = (log.userName || '').toLowerCase();
          const email = (log.userEmail || '').toLowerCase();
          const status = (log.status || '').toLowerCase();
          const formatted = formatThaiBuddhistDateAndTime(log.timestamp);
          const dateStr = (formatted.dateBE || '').toLowerCase();
          const timeStr = (formatted.time24 || '').toLowerCase();
          const durText = (durationMap[log.id]?.text || '').toLowerCase();

          return name.includes(searchInput) || 
                 email.includes(searchInput) || 
                 status.includes(searchInput) || 
                 dateStr.includes(searchInput) || 
                 timeStr.includes(searchInput) ||
                 durText.includes(searchInput);
        }

        return true;
      });

      // Sorting logic (รองรับการเรียง มากไปหาน้อย / น้อยไปมาก)
      filtered.sort((a, b) => {
        let result = 0;
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();

        if (userLoginSortColumn === 'status') {
          result = (a.status || '').localeCompare(b.status || '', 'th');
        } else if (userLoginSortColumn === 'date' || userLoginSortColumn === 'timestamp') {
          result = timeA - timeB;
        } else if (userLoginSortColumn === 'time') {
          const dateA = new Date(a.timestamp || 0);
          const dateB = new Date(b.timestamp || 0);
          const secsA = dateA.getHours() * 3600 + dateA.getMinutes() * 60 + dateA.getSeconds();
          const secsB = dateB.getHours() * 3600 + dateB.getMinutes() * 60 + dateB.getSeconds();
          result = secsA - secsB;
        } else if (userLoginSortColumn === 'userName') {
          result = (a.userName || '').localeCompare(b.userName || '', 'th');
        } else if (userLoginSortColumn === 'userEmail') {
          result = (a.userEmail || '').localeCompare(b.userEmail || '');
        } else if (userLoginSortColumn === 'duration') {
          const durA = durationMap[a.id]?.diffMs || 0;
          const durB = durationMap[b.id]?.diffMs || 0;
          result = durA - durB;
        }

        if (result === 0) {
          result = timeA - timeB; // Tie-breaker by timestamp
        }

        return userLoginSortDirection === 'desc' ? -result : result;
      });

      // Pagination calculation
      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / userLoginPageSize) || 1;
      if (userLoginPage > totalPages) userLoginPage = totalPages;
      if (userLoginPage < 1) userLoginPage = 1;

      const startIndex = (userLoginPage - 1) * userLoginPageSize;
      const endIndex = Math.min(startIndex + userLoginPageSize, totalItems);
      const pageItems = filtered.slice(startIndex, endIndex);

      // Update counters
      const totalEl = document.getElementById('userLoginTotalItems');
      const startEl = document.getElementById('userLoginStartItem');
      const endEl = document.getElementById('userLoginEndItem');
      if (totalEl) totalEl.textContent = totalItems.toLocaleString('th-TH');
      if (startEl) startEl.textContent = totalItems > 0 ? (startIndex + 1).toLocaleString('th-TH') : '0';
      if (endEl) endEl.textContent = endIndex.toLocaleString('th-TH');

      if (pageItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-5 text-muted">
              <i class="bi bi-person-badge-clock fs-1 d-block mb-2 text-secondary opacity-50"></i>
              <span class="fw-semibold">ไม่พบประวัติการเข้า-ออกจากระบบ (User Online/Offline)</span>
            </td>
          </tr>
        `;
        renderUserLoginPagination(0, 1);
        return;
      }

      const isSuperAdmin = typeof window.canAccessDatabaseEditor === 'function' ? window.canAccessDatabaseEditor() : false;

      tbody.innerHTML = pageItems.map((log) => {
        const { dateBE, time24 } = formatThaiBuddhistDateAndTime(log.timestamp);
        const isOnline = log.status === 'Online';
        const badgeHtml = isOnline
          ? '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-2.5 py-1.5 fw-bold fs-8 d-inline-flex align-items-center gap-1.5"><i class="bi bi-circle-fill text-success fs-9"></i> Online</span>'
          : '<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2.5 py-1.5 fw-bold fs-8 d-inline-flex align-items-center gap-1.5"><i class="bi bi-circle-fill text-danger fs-9"></i> Offline</span>';

        const durInfo = durationMap[log.id] || { text: '-', isLive: false };

        return `
          <tr>
            <td class="ps-3 py-3">
              ${badgeHtml}
            </td>
            <td class="py-3 fw-semibold text-dark fs-8">
              <i class="bi bi-calendar3 text-muted me-1.5"></i>${dateBE}
            </td>
            <td class="py-3 fw-bold text-primary fs-8">
              <i class="bi bi-clock me-1.5"></i>${time24}
            </td>
            <td class="py-3 fw-semibold text-dark fs-8">
              <i class="bi bi-person-circle text-secondary me-1.5"></i>${escapeHtml(log.userName || 'ผู้ใช้งาน')}
            </td>
            <td class="py-3 fs-8">
              <span class="text-secondary fw-semibold"><code>${escapeHtml(log.userEmail || 'N/A')}</code></span>
            </td>
            <td class="py-3 fs-8 fw-semibold text-dark">
              ${durInfo.isLive ? 
                `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1.5"><i class="bi bi-stopwatch me-1"></i>${escapeHtml(durInfo.text)}</span>` : 
                (durInfo.text && durInfo.text !== '-' ? 
                  `<span class="badge bg-light text-dark border border-secondary-subtle rounded-pill px-2.5 py-1.5"><i class="bi bi-hourglass-split me-1 text-primary"></i>${escapeHtml(durInfo.text)}</span>` : 
                  `<span class="text-muted fs-8">-</span>`
                )
              }
            </td>
            <td class="text-center py-3 super-admin-only-element ${isSuperAdmin ? '' : 'd-none'}">
              <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="deleteSingleUserLoginLog('${log.id}')" title="ลบประวัติ">
                <i class="bi bi-trash3"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      renderUserLoginPagination(totalPages, userLoginPage);
    };

    function renderUserLoginPagination(totalPages, currentPage) {
      const nav = document.getElementById('userLoginPaginationNav');
      if (!nav) return;

      if (totalPages <= 1) {
        nav.innerHTML = '';
        return;
      }

      let html = '';
      html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <button class="page-link rounded-circle border-0 me-1" onclick="changeUserLoginPage(${currentPage - 1})" aria-label="Previous">
            <i class="bi bi-chevron-left fs-8"></i>
          </button>
        </li>
      `;

      for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
          html += `
            <li class="page-item ${p === currentPage ? 'active' : ''}">
              <button class="page-link rounded-pill border-0 me-1 fw-bold fs-8" onclick="changeUserLoginPage(${p})">${p}</button>
            </li>
          `;
        } else if (p === currentPage - 2 || p === currentPage + 2) {
          html += `<li class="page-item disabled"><span class="page-link border-0 me-1">...</span></li>`;
        }
      }

      html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <button class="page-link rounded-circle border-0" onclick="changeUserLoginPage(${currentPage + 1})" aria-label="Next">
            <i class="bi bi-chevron-right fs-8"></i>
          </button>
        </li>
      `;

      nav.innerHTML = html;
    }

    window.changeUserLoginPage = function(page) {
      userLoginPage = page;
      renderUserLoginLogsTable();
    };

    window.deleteSingleUserLoginLog = async function(logId) {
      if (!logId) return;
      if (!window.canAccessDatabaseEditor()) {
        showToast("⚠️ เฉพาะ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์ลบประวัติ");
        return;
      }
      const ok = await window.showConfirmDialog({
        title: "ลบประวัติการใช้งาน",
        message: "ต้องการลบประวัติการใช้งานรายการนี้ใช่หรือไม่?",
        type: "danger",
        confirmText: "ลบประวัติ"
      });
      if (ok) {
        userLoginLogs = userLoginLogs.filter(x => x.id !== logId);
        renderUserLoginLogsTable();
        if (isFirebaseReady && db) {
          try {
            await deleteDoc(doc(db, "user_login_logs", logId));
          } catch(e) {
            console.warn("Delete single user_login_log err:", e);
          }
        }
        showToast("ลบประวัติ Login เรียบร้อยแล้ว");
      }
    };

    window.clearAllUserLoginLogs = async function() {
      if (!window.canAccessDatabaseEditor()) {
        showToast("⚠️ เฉพาะ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์ลบประวัติ Login ทั้งหมด");
        return;
      }
      if (!userLoginLogs || userLoginLogs.length === 0) {
        showToast("ไม่มีประวัติ Login ให้ลบ");
        return;
      }
      const ok = await window.showConfirmDialog({
        title: "ลบประวัติทั้งหมด",
        message: `ต้องการลบประวัติการเข้า-ออกระบบทั้งหมด ${userLoginLogs.length} รายการ ใช่หรือไม่?`,
        type: "danger",
        confirmText: "ลบทั้งหมด"
      });
      if (ok) {
        const total = userLoginLogs.length;
        userLoginLogs = [];
        renderUserLoginLogsTable();
        if (isFirebaseReady && db) {
          try {
            const snap = await getDocs(collection(db, "user_login_logs"));
            snap.forEach(async (dDoc) => {
              await deleteDoc(dDoc.ref);
            });
          } catch(e) {
            console.warn("Clear user login logs err:", e);
          }
        }
        showToast(`ลบประวัติ Login ทั้งหมด ${total} รายการเรียบร้อยแล้ว`);
      }
    };

    window.exportUserLoginLogsToCSV = function() {
      if (!userLoginLogs || userLoginLogs.length === 0) {
        showToast("ไม่มีข้อมูลประวัติ Login สำหรับส่งออก CSV");
        return;
      }

      const durationMap = window.calculateSessionDurations ? window.calculateSessionDurations(userLoginLogs) : {};

      let csvContent = "\uFEFF"; // UTF-8 BOM
      csvContent += "ลำดับ,สถานะ,วัน/เดือน/ปี (พ.ศ.),เวลา (24 ชม.),ชื่อผู้ใช้,Email,ระยะเวลาใช้งาน,Timestamp_ISO\n";

      userLoginLogs.forEach((log, index) => {
        const { dateBE, time24 } = formatThaiBuddhistDateAndTime(log.timestamp);
        const durText = durationMap[log.id]?.text || '-';
        const row = [
          index + 1,
          `"${(log.status || '').replace(/"/g, '""')}"`,
          `"${(dateBE || '').replace(/"/g, '""')}"`,
          `"${(time24 || '').replace(/"/g, '""')}"`,
          `"${(log.userName || '').replace(/"/g, '""')}"`,
          `"${(log.userEmail || '').replace(/"/g, '""')}"`,
          `"${(durText || '').replace(/"/g, '""')}"`,
          `"${(log.timestamp || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `User_Online_Offline_Logs_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("ส่งออก CSV ประวัติ Login เรียบร้อยแล้ว");
    };

    // Populate Select Dropdowns
    function populateEmployeeDropdowns() {
      const attSearch = document.getElementById('attEmpSearchInput');
      const attQ = attSearch ? attSearch.value : '';
      filterAttendanceEmployeeSelect(attQ);

      const transSearch = document.getElementById('transEmpSearchInput');
      const transQ = transSearch ? transSearch.value : '';
      filterTransEmployeeSelect(transQ);

      const select3 = document.getElementById('mandEmpSelect');
      if (select3) {
        select3.innerHTML = '<option value="">-- กรุณาเลือกพนักงาน --</option>';
        const sorted = [...employeeList].sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'th'));
        sorted.forEach(emp => {
          const opt = document.createElement('option');
          opt.value = emp.id;
          opt.textContent = `${formatEmpName(emp)} [${emp.id}] - ${emp.department}`;
          select3.appendChild(opt);
        });
      }

      populateQuickScanEmpDropdown();
    }

    // ==========================================
    // ATTENDANCE EMPLOYEE SEARCH & FILTER (เรียงตามชื่อ)
    // ==========================================
    window.filterAttendanceEmployeeSelect = function(query) {
      const searchInput = document.getElementById('attEmpSearchInput');
      const q = (query !== undefined ? query : (searchInput ? searchInput.value : '')).toLowerCase().trim();
      const select = document.getElementById('attEmpSelect');
      if (!select) return;

      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกพนักงาน --</option>';

      // Filter matching employees
      const filtered = employeeList.filter(emp => {
        if (!q) return true;
        return (emp.name && emp.name.toLowerCase().includes(q)) ||
               (emp.nickname && emp.nickname.toLowerCase().includes(q)) ||
               (emp.id && emp.id.toLowerCase().includes(q)) ||
               (emp.department && emp.department.toLowerCase().includes(q)) ||
               (emp.position && emp.position.toLowerCase().includes(q));
      });

      // Sort alphabetically by Thai name (เรียงตามชื่อ)
      filtered.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'th'));

      filtered.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        const posBadge = emp.position ? ` (${emp.position})` : '';
        opt.textContent = `👤 ${formatEmpName(emp)} [${emp.id}] - ${emp.department}${posBadge}`;
        if (currentVal && currentVal === emp.id) opt.selected = true;
        select.appendChild(opt);
      });

      // Auto-select if 1 match found during typing
      if (filtered.length === 1 && q.length > 0) {
        select.value = filtered[0].id;
      }
    };

    window.clearAttendanceEmpSearch = function() {
      const input = document.getElementById('attEmpSearchInput');
      if (input) input.value = '';
      filterAttendanceEmployeeSelect('');
    };

    // ==========================================
    // TRANSACTION EMPLOYEE SEARCH & FILTER (เรียงตามชื่อ)
    // ==========================================
    window.filterTransEmployeeSelect = function(query) {
      const searchInput = document.getElementById('transEmpSearchInput');
      const q = (query !== undefined ? query : (searchInput ? searchInput.value : '')).toLowerCase().trim();
      const select = document.getElementById('empSelect');
      if (!select) return;

      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกรายชื่อพนักงาน --</option>';

      const filtered = employeeList.filter(emp => {
        if (!q) return true;
        return (emp.name && emp.name.toLowerCase().includes(q)) ||
               (emp.nickname && emp.nickname.toLowerCase().includes(q)) ||
               (emp.id && emp.id.toLowerCase().includes(q)) ||
               (emp.department && emp.department.toLowerCase().includes(q)) ||
               (emp.position && emp.position.toLowerCase().includes(q));
      });

      filtered.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'th'));

      filtered.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        const posBadge = emp.position ? ` (${emp.position})` : '';
        opt.textContent = `👤 ${formatEmpName(emp)} [${emp.id}] - ${emp.department}${posBadge}`;
        if (currentVal && currentVal === emp.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q.length > 0) {
        select.value = filtered[0].id;
      }
    };

    window.clearTransEmpSearch = function() {
      const input = document.getElementById('transEmpSearchInput');
      if (input) input.value = '';
      filterTransEmployeeSelect('');
    };

    window.populateQuickScanEmpDropdown = function() {
      const select = document.getElementById('quickScanEmpSelect');
      if (!select) return;

      select.innerHTML = '<option value="">-- เลือกจากรายชื่อพนักงานทั้งหมด --</option>';
      employeeList.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `🪪 [${emp.id}] ${formatEmpName(emp)} (${emp.department || 'ทั่วไป'})`;
        select.appendChild(opt);
      });
    };

    function populateEquipmentDropdown() {
      const searchInput = document.getElementById('equipSearchInput');
      const q = searchInput ? searchInput.value : '';
      filterEquipSelectDropdown(q);
    }

    function populateQuickScanDropdown() {
      const searchInput = document.getElementById('quickScanSearchInput');
      const q = searchInput ? searchInput.value : '';
      filterQuickScanDropdown(q);
    }

    // ==========================================
    // EQUIPMENT SELECT SEARCH & FILTER FUNCTIONS
    // ==========================================
    window.filterEquipSelectDropdown = function(query) {
      const select = document.getElementById('equipSelect');
      if (!select) return;
      const q = (query || '').trim().toLowerCase();
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกอุปกรณ์การเกษตร --</option>';

      const filtered = equipmentList.filter(item => {
        if (!q) return true;
        return (item.name && item.name.toLowerCase().includes(q)) ||
               (item.code && item.code.toLowerCase().includes(q)) ||
               (item.category && item.category.toLowerCase().includes(q)) ||
               (item.location && item.location.toLowerCase().includes(q));
      });

      filtered.sort((a, b) => {
        const codeA = (a.code || a.id || '').toString();
        const codeB = (b.code || b.id || '').toString();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });

      filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.code}] ${item.name} (คงเหลือ: ${item.quantity} ${item.unit})`;
        if (currentVal && currentVal === item.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q.length > 0) {
        select.value = filtered[0].id;
      }
      updateEquipSelectPreview();
    };

    window.clearEquipSearch = function() {
      const input = document.getElementById('equipSearchInput');
      if (input) input.value = '';
      filterEquipSelectDropdown('');
    };

    window.filterQuickScanDropdown = function(query) {
      const select = document.getElementById('quickScanSelect');
      if (!select) return;
      const q = (query || '').trim().toLowerCase();
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกอุปกรณ์การเกษตร --</option>';

      const filtered = equipmentList.filter(item => {
        if (!q) return true;
        return (item.name && item.name.toLowerCase().includes(q)) ||
               (item.code && item.code.toLowerCase().includes(q)) ||
               (item.category && item.category.toLowerCase().includes(q));
      });

      filtered.sort((a, b) => {
        const codeA = (a.code || a.id || '').toString();
        const codeB = (b.code || b.id || '').toString();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });

      filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.code}] ${item.name} - คงเหลือ: ${item.quantity} ${item.unit}`;
        if (currentVal && currentVal === item.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q.length > 0) {
        select.value = filtered[0].id;
      }
    };

    window.clearQuickScanSearch = function() {
      const input = document.getElementById('quickScanSearchInput');
      if (input) input.value = '';
      filterQuickScanDropdown('');
    };

    window.filterLabelItemSelectDropdown = function(query) {
      const select = document.getElementById('labelItemSelect');
      if (!select) return;
      const q = (query || '').trim().toLowerCase();
      const currentVal = select.value;
      select.innerHTML = '<option value="ALL">📦 ทุกรายการในคลังอุปกรณ์</option>';

      const filtered = equipmentList.filter(item => {
        if (!q) return true;
        return (item.name && item.name.toLowerCase().includes(q)) ||
               (item.code && item.code.toLowerCase().includes(q)) ||
               (item.category && item.category.toLowerCase().includes(q));
      });

      filtered.sort((a, b) => {
        const codeA = (a.code || a.id || '').toString();
        const codeB = (b.code || b.id || '').toString();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });

      filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.code}] ${item.name} (${item.category})`;
        if (currentVal && currentVal === item.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q.length > 0) {
        select.value = filtered[0].id;
      }
      if (typeof renderPrintableLabelsPreview === 'function') {
        renderPrintableLabelsPreview();
      }
    };

    window.clearLabelItemSearch = function() {
      const input = document.getElementById('labelItemSearchInput');
      if (input) input.value = '';
      filterLabelItemSelectDropdown('');
    };

    window.filterRestockEquipDropdown = function(query) {
      const select = document.getElementById('restockEquipSelect');
      if (!select) return;
      const q = (query || '').trim().toLowerCase();
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกอุปกรณ์การเกษตร --</option>';

      const filtered = equipmentList.filter(item => {
        if (!q) return true;
        return (item.name && item.name.toLowerCase().includes(q)) ||
               (item.code && item.code.toLowerCase().includes(q)) ||
               (item.category && item.category.toLowerCase().includes(q));
      });

      filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.code}] ${item.name} - สต๊อกปัจจุบัน: ${item.quantity} ${item.unit}`;
        if (currentVal && currentVal === item.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q.length > 0) {
        select.value = filtered[0].id;
      }
      if (typeof updateRestockEquipPreviewInfo === 'function') {
        updateRestockEquipPreviewInfo();
      }
    };

    window.clearRestockEquipSearch = function() {
      const input = document.getElementById('restockEquipSearchInput');
      if (input) input.value = '';
      filterRestockEquipDropdown('');
    };

    window.updateEquipSelectPreview = function() {
      const select = document.getElementById('equipSelect');
      if (!select) return;

      const equipId = select.value;
      const previewBox = document.getElementById('equipSelectPreviewBox');
      const infoSpan = document.getElementById('equipStockInfo');
      const unitSpan = document.getElementById('transUnitSpan');

      if (!equipId) {
        if (previewBox) previewBox.classList.add('d-none');
        if (infoSpan) infoSpan.innerHTML = '';
        return;
      }

      const item = equipmentList.find(x => x.id === equipId);
      if (!item) {
        if (previewBox) previewBox.classList.add('d-none');
        return;
      }

      if (unitSpan) unitSpan.textContent = item.unit || 'ชิ้น';
      if (infoSpan) {
        infoSpan.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i>อุปกรณ์: <strong>${item.name}</strong> | คงเหลือ: <span class="fw-bold text-success">${item.quantity} ${item.unit}</span> | สถานที่: ${item.location || 'คลังกลาง'}`;
      }

      if (previewBox) {
        previewBox.classList.remove('d-none');
        const imgElem = document.getElementById('equipPreviewImg');
        if (imgElem) imgElem.src = item.imageUrl || DEFAULT_EQUIPMENT_IMAGE;

        const codeBadge = document.getElementById('equipPreviewCodeBadge');
        if (codeBadge) codeBadge.textContent = item.code;

        const catBadge = document.getElementById('equipPreviewCatBadge');
        if (catBadge) catBadge.textContent = item.category;

        const nameText = document.getElementById('equipPreviewNameText');
        if (nameText) nameText.textContent = item.name;

        const locText = document.getElementById('equipPreviewLocText');
        if (locText) locText.textContent = item.location || 'คลังกลาง';

        const stockElem = document.getElementById('equipPreviewStockText');
        if (stockElem) {
          stockElem.textContent = `${item.quantity} ${item.unit}`;
          if (item.quantity <= 3) {
            stockElem.className = "fs-4 fw-bold text-danger mb-0";
          } else {
            stockElem.className = "fs-4 fw-bold text-success mb-0";
          }
        }
      }
    };

    window.quickSelectTransaction = function(equipId) {
      if (!equipId) return;

      const item = equipmentList.find(x => x.id === equipId);

      // Populate / sync equipment dropdowns
      const select = document.getElementById('equipSelect');
      if (select) {
        const equipSearch = document.getElementById('equipSearchInput');
        if (equipSearch) equipSearch.value = item ? item.name : '';
        filterEquipSelectDropdown(item ? item.name : '');
        select.value = equipId;
        updateEquipSelectPreview();
      }

      const quickScan = document.getElementById('quickScanSelect');
      if (quickScan) {
        filterQuickScanDropdown(item ? item.name : '');
        quickScan.value = equipId;
      }

      const restockSelect = document.getElementById('restockEquipSelect');
      if (restockSelect) {
        filterRestockEquipDropdown(item ? item.name : '');
        restockSelect.value = equipId;
        if (typeof updateRestockEquipPreviewInfo === 'function') updateRestockEquipPreviewInfo();
      }

      const labelSelect = document.getElementById('labelItemSelect');
      if (labelSelect) {
        filterLabelItemSelectDropdown(item ? item.name : '');
        labelSelect.value = equipId;
        if (typeof renderPrintableLabelsPreview === 'function') renderPrintableLabelsPreview();
      }

      // Switch to transaction tab
      const tabBtn = document.getElementById('transaction-tab');
      if (tabBtn) {
        const bsTab = new bootstrap.Tab(tabBtn);
        bsTab.show();
      }

      if (item) {
        showToast(`📷 สแกน/เลือกอุปกรณ์ "${item.name}" [${item.code}] เรียบร้อยแล้ว! (คงเหลือ: ${item.quantity} ${item.unit})`);
      }

      // Scroll smoothly to equipment select field
      setTimeout(() => {
        const fieldContainer = document.getElementById('equipSelect');
        if (fieldContainer) {
          fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldContainer.focus();
        }
      }, 200);
    };

    function updateStats() {
      const total = equipmentList.length;
      let inStock = 0, borrowed = 0, lowStock = 0;

      equipmentList.forEach(item => {
        inStock += item.quantity;
        borrowed += (item.borrowedCount || 0);
        const minQty = item.minQuantity !== undefined ? item.minQuantity : 3;
        if (item.quantity <= minQty) lowStock++;
      });

      const totalItemsElem = document.getElementById('statTotalItems');
      const inStockElem = document.getElementById('statInStock');
      const borrowedElem = document.getElementById('statBorrowed');
      const totalEmpElem = document.getElementById('statTotalEmp');

      if (totalItemsElem) totalItemsElem.textContent = total;
      if (inStockElem) inStockElem.textContent = inStock;
      if (borrowedElem) borrowedElem.textContent = borrowed;
      if (totalEmpElem) totalEmpElem.textContent = employeeList.length;

      // Update Overdue Alerts
      if (typeof calculateOverdueBorrowings === 'function') {
        const overdueList = calculateOverdueBorrowings(window.currentOverdueThresholdDays || 3);
        const overdueCount = overdueList.length;

        const overdueBadge = document.getElementById('statOverdueBadge');
        const overdueCountElem = document.getElementById('statOverdueCount');
        if (overdueBadge && overdueCountElem) {
          if (overdueCount > 0) {
            overdueBadge.classList.remove('d-none');
            overdueCountElem.textContent = overdueCount;
          } else {
            overdueBadge.classList.add('d-none');
          }
        }

        const btnHeaderOverdue = document.getElementById('btnHeaderOverdue');
        const headerBadge = document.getElementById('headerOverdueBadge');
        if (btnHeaderOverdue) {
          if (overdueCount > 0) {
            btnHeaderOverdue.classList.remove('d-none');
            btnHeaderOverdue.classList.add('d-flex');
            btnHeaderOverdue.classList.add('btn-overdue-blink');
          } else {
            btnHeaderOverdue.classList.add('d-none');
            btnHeaderOverdue.classList.remove('d-flex');
            btnHeaderOverdue.classList.remove('btn-overdue-blink');
          }
        }
        if (headerBadge) {
          if (overdueCount > 0) {
            headerBadge.classList.remove('d-none');
            headerBadge.textContent = overdueCount;
          } else {
            headerBadge.classList.add('d-none');
          }
        }

        const overdueBanner = document.getElementById('overdueAlertBanner');
        const overdueBannerCount = document.getElementById('overdueBannerCount');
        if (overdueBanner && overdueBannerCount) {
          if (overdueCount > 0) {
            overdueBanner.classList.remove('d-none');
            overdueBanner.classList.add('d-flex');
            overdueBannerCount.textContent = overdueCount;
          } else {
            overdueBanner.classList.add('d-none');
            overdueBanner.classList.remove('d-flex');
          }
        }
      }
    }

    window.toggleSummaryStats = function() {
      const row = document.getElementById('summaryStatsCardsRow');
      if (!row) return;

      const isHidden = row.classList.contains('d-none');
      if (isHidden) {
        row.classList.remove('d-none');
      } else {
        row.classList.add('d-none');
      }

      const newIsHidden = row.classList.contains('d-none');

      // Update Top Toggle Button
      const topText = document.getElementById('toggleSummaryStatsText');
      const topIcon = document.getElementById('toggleSummaryStatsIcon');
      if (topText) topText.textContent = newIsHidden ? 'แสดงสรุปข้อมูล' : 'ซ่อนสรุปข้อมูล';
      if (topIcon) topIcon.className = newIsHidden ? 'bi bi-eye-fill text-primary' : 'bi bi-eye-slash-fill text-danger';

      // Update Header Toggle Button
      const hdrText = document.getElementById('hdrToggleStatsText');
      const hdrIcon = document.getElementById('hdrToggleStatsIcon');
      if (hdrText) hdrText.textContent = newIsHidden ? 'แสดงสรุปข้อมูล' : 'ซ่อนสรุปข้อมูล';
      if (hdrIcon) hdrIcon.className = newIsHidden ? 'bi bi-eye-fill text-primary' : 'bi bi-eye-slash-fill text-danger';
    };

    // Modal Action Windows
    let currentSingleModalEmpId = null;

    window.getBadgeTitleText = function(emp) {
      if (!emp) return 'บัตรพนักงาน';
      const pos = (emp.position || '').trim();
      if (pos === 'พระภิกษุ') return 'บัตรพระภิกษุ';
      if (pos === 'เจ้าหน้าที่ธุรการ' || pos === 'ธุรการ') return 'บัตรเจ้าหน้าที่ธุรการ';
      if (pos === 'นักวิชาการ' || pos === 'วิชาการ') return 'บัตรนักวิชาการ';
      if (pos === 'พนักงาน') return 'บัตรพนักงาน';
      if (pos) {
        if (pos.startsWith('บัตร')) return pos;
        return 'บัตร' + pos;
      }
      if (emp.role === 'STAFF') return 'บัตรเจ้าหน้าที่ธุรการ';
      return 'บัตรพนักงาน';
    };

    window.openEmployeeBadgeModal = function(empId) {
      const emp = employeeList.find(x => x.id === empId);
      if (!emp) return;

      currentSingleModalEmpId = emp.id;
      document.getElementById('badgeName').textContent = emp.name;
      const badgeRole = document.getElementById('badgeRole');
      if (badgeRole) badgeRole.style.display = 'none';

      const badgeSubTitle = document.getElementById('badgeSubTitle');
      if (badgeSubTitle) {
        badgeSubTitle.textContent = getBadgeTitleText(emp);
      }

      const deptName = emp.department ? (emp.department.startsWith('แผนก') ? emp.department : 'แผนก' + emp.department) : 'ไม่ระบุแผนก';
      const badgeDept = document.getElementById('badgeDept');
      if (badgeDept) {
        badgeDept.className = "text-success fs-7 mb-1 font-semibold fw-bold";
        badgeDept.textContent = `[${emp.id}] ${deptName}`;
      }
      const badgePos = document.getElementById('badgePos');
      if (badgePos) badgePos.style.display = 'none';
      const badgeDetails = document.getElementById('badgeDetails');
      if (badgeDetails) badgeDetails.textContent = emp.details ? `📝 ${emp.details}` : '';
      document.getElementById('badgePhone').textContent = emp.phone ? `📞 ${emp.phone}` : '';
      document.getElementById('badgePhoto').src = emp.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
      document.getElementById('badgeCodeText').textContent = `ID: ${emp.id}`;

      const qrData = `EMPLOYEE:${emp.id}`;
      const badgeQrImg = document.getElementById('badgeQrImg');
      if (badgeQrImg) {
        badgeQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
      }

      if (typeof QRCode === 'object' && QRCode.toDataURL) {
        try {
          QRCode.toDataURL(qrData, { width: 180, margin: 1 }, function(err, url) {
            if (!err && url && badgeQrImg) badgeQrImg.src = url;
          });
        } catch(e){}
      }

      const qrCanvas = document.getElementById('badgeQrCanvas');
      if (qrCanvas && typeof QRCode === 'object' && QRCode.toCanvas) {
        try {
          QRCode.toCanvas(qrCanvas, qrData, { width: 130, margin: 1 });
        } catch(e){}
      }

      const modal = new bootstrap.Modal(document.getElementById('employeeBadgeModal'));
      modal.show();
    };

    window.openPrintEmployeeBadgeModalFromSingleModal = function() {
      const modalElem = document.getElementById('employeeBadgeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      if (currentSingleModalEmpId) {
        openPrintEmployeeBadgeModal(currentSingleModalEmpId);
      } else {
        openPrintEmployeeBadgeModal('ALL');
      }
    };

    // ==========================================
    // INDIVIDUAL EMPLOYEE BORROWING & ISSUE HISTORY
    // ==========================================
    let currentEmpHistoryId = null;

    window.openEmployeeBorrowHistoryModal = function(empId) {
      if (!empId) return;
      const emp = employeeList.find(x => x.id === empId);
      if (!emp) return;

      currentEmpHistoryId = emp.id;

      // Populate Header Info
      const avatar = document.getElementById('empHistAvatar');
      if (avatar) avatar.src = emp.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

      const nameElem = document.getElementById('empHistName');
      if (nameElem) nameElem.textContent = emp.name;

      const codeElem = document.getElementById('empHistCodeBadge');
      if (codeElem) codeElem.textContent = `รหัส: ${emp.id}`;

      const isStaff = emp.role === 'STAFF';
      const roleElem = document.getElementById('empHistRoleBadge');
      if (roleElem) {
        roleElem.textContent = isStaff ? 'เจ้าหน้าที่สำนักงาน (Staff)' : 'พนักงานทำเกษตร (Worker)';
        roleElem.className = `badge ${isStaff ? 'bg-primary' : 'bg-success'} fs-8`;
      }

      const deptElem = document.getElementById('empHistDept');
      if (deptElem) deptElem.textContent = emp.department || 'แผนกทั่วไป';

      const posElem = document.getElementById('empHistPos');
      if (posElem) posElem.textContent = emp.position || '-';

      const phoneElem = document.getElementById('empHistPhone');
      if (phoneElem) phoneElem.textContent = emp.phone || '-';

      // Reset filters
      const searchInput = document.getElementById('empHistSearchInput');
      if (searchInput) searchInput.value = '';

      const typeFilter = document.getElementById('empHistTypeFilter');
      if (typeFilter) typeFilter.value = 'ALL';

      // Render Statistics & History Table
      renderEmployeeHistoryModalTable();

      const modalElem = document.getElementById('employeeBorrowHistoryModal');
      const modal = new bootstrap.Modal(modalElem);
      modal.show();
    };

    window.openEmployeeBorrowHistoryModalFromScanner = function() {
      if (typeof activeScannedEmpId !== 'undefined' && activeScannedEmpId) {
        stopEmpQrScanner();
        const modalElem = document.getElementById('scanEmpBadgeModal');
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();

        openEmployeeBorrowHistoryModal(activeScannedEmpId);
      }
    };

    window.openEmployeeBorrowHistoryModalFromSingleModal = function() {
      const modalElem = document.getElementById('employeeBadgeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      if (currentSingleModalEmpId) {
        openEmployeeBorrowHistoryModal(currentSingleModalEmpId);
      }
    };

    window.renderEmployeeHistoryModalTable = function() {
      if (!currentEmpHistoryId) return;
      const emp = employeeList.find(x => x.id === currentEmpHistoryId);
      if (!emp) return;

      const searchQ = (document.getElementById('empHistSearchInput')?.value || '').toLowerCase().trim();
      const selectedType = document.getElementById('empHistTypeFilter')?.value || 'ALL';

      // Filter transactionHistory for this employee
      const empTxs = transactionHistory.filter(tx => {
        if (!tx) return false;
        const matchesEmp = (tx.employeeId === emp.id) || 
                           (tx.employeeName && (tx.employeeName.includes(emp.name) || tx.employeeName.includes(emp.id)));
        return matchesEmp;
      });

      // Calculate Statistics
      let countWithdraw = 0;
      let countBorrow = 0;
      let countReturn = 0;

      empTxs.forEach(tx => {
        if (tx.type === 'เบิกจ่าย') countWithdraw++;
        else if (tx.type === 'ยืมอุปกรณ์') countBorrow++;
        else if (tx.type === 'คืนอุปกรณ์') countReturn++;
      });

      const wElem = document.getElementById('empHistStatWithdraw');
      if (wElem) wElem.textContent = countWithdraw;

      const bElem = document.getElementById('empHistStatBorrow');
      if (bElem) bElem.textContent = countBorrow;

      const rElem = document.getElementById('empHistStatReturn');
      if (rElem) rElem.textContent = countReturn;

      const tElem = document.getElementById('empHistStatTotal');
      if (tElem) tElem.textContent = empTxs.length;

      // Filter by type & search query
      const filtered = empTxs.filter(tx => {
        const matchesType = selectedType === 'ALL' || tx.type === selectedType;
        const matchesSearch = !searchQ || 
          (tx.equipmentName && tx.equipmentName.toLowerCase().includes(searchQ)) ||
          (tx.location && tx.location.toLowerCase().includes(searchQ)) ||
          (tx.note && tx.note.toLowerCase().includes(searchQ));
        return matchesType && matchesSearch;
      });

      // Update Count Badge
      const countBadge = document.getElementById('empHistCountBadge');
      if (countBadge) countBadge.textContent = `พบ ${filtered.length} จาก ${empTxs.length} รายการ`;

      const tbody = document.getElementById('empHistTableBody');
      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-6 text-secondary d-block mb-2"></i>
              <div class="fw-bold">ยังไม่มีประวัติการทำรายการเบิก-ยืมอุปกรณ์สำหรับพนักงานท่านนี้</div>
              <small class="text-secondary">${searchQ ? `คำค้นหา: "${searchQ}"` : 'พนักงานท่านนี้ยังไม่ได้ทำรายการเบิกจ่าย ยืม หรือคืนอุปกรณ์ในระบบ'}</small>
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      filtered.forEach(tx => {
        let typeBadge = '';
        if (tx.type === 'เบิกจ่าย') {
          typeBadge = '<span class="badge bg-danger"><i class="bi bi-box-arrow-up me-1"></i> เบิกจ่าย</span>';
        } else if (tx.type === 'ยืมอุปกรณ์') {
          typeBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-arrow-repeat me-1"></i> ยืมอุปกรณ์</span>';
        } else if (tx.type === 'คืนอุปกรณ์') {
          typeBadge = '<span class="badge bg-info text-dark"><i class="bi bi-box-arrow-in-down me-1"></i> คืนอุปกรณ์</span>';
        } else {
          typeBadge = `<span class="badge bg-secondary">${tx.type}</span>`;
        }

        let equipCol = '';
        if (tx.items && Array.isArray(tx.items) && tx.items.length > 1) {
          equipCol = `
            <div class="fw-bold text-success"><i class="bi bi-boxes me-1"></i>${tx.items.length} รายการอุปกรณ์ในเอกสาร</div>
            <div class="d-flex flex-wrap gap-1 mt-1">
              ${tx.items.map(i => `<span class="badge bg-light text-dark border font-monospace fs-8">📦 ${i.equipmentName} (${i.quantity} ${i.unit})</span>`).join('')}
            </div>
          `;
        } else if (tx.items && Array.isArray(tx.items) && tx.items.length === 1) {
          equipCol = `<span class="fw-bold text-success">${tx.items[0].equipmentName} [${tx.items[0].equipmentCode}]</span>`;
        } else {
          equipCol = `<span class="fw-bold text-success">${tx.equipmentName || '-'}</span>`;
        }

        html += `
          <tr>
            <td class="fs-8 text-secondary font-monospace">
              <div><i class="bi bi-clock me-1"></i>${tx.timestamp || '-'}</div>
              <small class="text-muted fs-8">${tx.docNo || tx.id}</small>
            </td>
            <td>${typeBadge}</td>
            <td>${equipCol}</td>
            <td class="text-center fw-bold fs-6">${tx.quantity} ${tx.unit || 'ชิ้น'}</td>
            <td class="fs-8 text-muted">
              <div><i class="bi bi-geo-alt me-1 text-danger"></i>${tx.location || '-'}</div>
              ${tx.note ? `<div class="text-dark"><i class="bi bi-chat-left-text me-1"></i>${tx.note}</div>` : ''}
              <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-2 py-0.5 fs-8 mt-1 fw-semibold" onclick="openPrintTransactionVoucherModal('${tx.id}')">
                <i class="bi bi-printer-fill me-1"></i> พิมพ์เอกสาร
              </button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    };

    // Voucher Print Modal Functions
    let activeVoucherTxId = null;

    window.formatDueDateForReceipt = function(tx) {
      if (!tx) return '-';
      if (tx.dueDateStr) return tx.dueDateStr;
      if (tx.dueDate) {
        const d = new Date(tx.dueDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const yearBE = d.getFullYear() + 543;
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${yearBE} เวลา ${hours}:${mins} น.`;
      }
      return 'ตามกำหนดมาตรฐาน (3 วัน)';
    };

    window.openPrintTransactionVoucherModal = function(txId) {
      if (!txId) return;
      const tx = transactionHistory.find(x => x.id === txId);
      if (!tx) return;

      activeVoucherTxId = tx.id;

      const paper = document.getElementById('transactionVoucherPaper');
      if (!paper) return;

      let typeBadgeClass = 'bg-danger';
      if (tx.type === 'ยืมอุปกรณ์') typeBadgeClass = 'bg-warning text-dark';
      else if (tx.type === 'คืนอุปกรณ์') typeBadgeClass = 'bg-info text-dark';
      else if (tx.type && tx.type.includes('รับเข้า')) typeBadgeClass = 'bg-success';

      let itemsTableHtml = '';
      if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach((it, idx) => {
          itemsTableHtml += `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-monospace fw-bold text-secondary">${it.equipmentCode || '-'}</td>
              <td class="fw-bold text-dark">${it.equipmentName}</td>
              <td class="text-center fw-bold fs-6 text-success">${it.quantity}</td>
              <td class="text-center text-muted">${it.unit || 'ชิ้น'}</td>
            </tr>
          `;
        });
      } else {
        itemsTableHtml = `
          <tr>
            <td class="text-center">1</td>
            <td class="font-monospace fw-bold text-secondary">-</td>
            <td class="fw-bold text-dark">${tx.equipmentName}</td>
            <td class="text-center fw-bold fs-6 text-success">${tx.quantity}</td>
            <td class="text-center text-muted">${tx.unit || 'ชิ้น'}</td>
          </tr>
        `;
      }

      paper.innerHTML = `
        <div class="border-bottom pb-3 mb-3 d-flex justify-content-between align-items-center">
          <div>
            <h4 class="fw-bold text-success mb-1"><i class="bi bi-flower2 me-2"></i>ฟาร์มพืชสวน & คลังอุปกรณ์การเกษตร</h4>
            <div class="fs-8 text-secondary">เอกสารหลักฐานการทำรายการเบิก-จ่าย-ยืม-คืนอุปกรณ์การเกษตร</div>
          </div>
          <div class="text-end">
            <span class="badge ${typeBadgeClass} fs-6 px-3 py-1.5 fw-bold mb-1">${tx.type}</span>
            <div class="font-monospace fs-7 text-dark fw-bold">เลขที่เอกสาร: ${tx.docNo || tx.id}</div>
            <div class="fs-8 text-muted">วันที่-เวลา: ${tx.timestamp}</div>
          </div>
        </div>

        <div class="row g-2 mb-3 bg-light p-3 rounded-3 fs-7 border">
          <div class="col-12 col-md-6">
            <span class="text-muted"><i class="bi bi-person-fill me-1"></i>ผู้ทำรายการ:</span> <strong class="text-dark">${tx.employeeName}</strong>
          </div>
          <div class="col-12 col-md-6">
            <span class="text-muted"><i class="bi bi-geo-alt-fill me-1 text-danger"></i>แปลงเกษตร/สถานที่:</span> <strong class="text-dark">${tx.location || '-'}</strong>
          </div>
          ${(tx.type === 'ยืมอุปกรณ์' || tx.dueDateStr || tx.dueDate) ? `
            <div class="col-12 mt-1 border-top pt-2 d-flex align-items-center justify-content-between flex-wrap">
              <div>
                <span class="text-danger fw-bold"><i class="bi bi-calendar-event-fill me-1 text-warning"></i>กำหนดวัน/เวลาที่ต้องส่งคืนอุปกรณ์:</span> 
                <strong class="text-dark bg-warning bg-opacity-25 px-2.5 py-1 rounded-2 border border-warning fs-7 ms-1">
                  ${formatDueDateForReceipt(tx)}
                </strong>
              </div>
              <span class="badge bg-warning text-dark fs-8 mt-1 mt-md-0"><i class="bi bi-bell-fill me-1"></i>คืน ณ คลังอุปกรณ์</span>
            </div>
          ` : ''}
          ${tx.note ? `<div class="col-12 mt-1 border-top pt-2"><span class="text-muted"><i class="bi bi-chat-left-text me-1"></i>หมายเหตุ:</span> <span class="text-dark">${tx.note}</span></div>` : ''}
        </div>

        <h6 class="fw-bold text-dark mb-2"><i class="bi bi-list-check me-1 text-success"></i> รายการอุปกรณ์ในเอกสารใบนี้ (${tx.items ? tx.items.length : 1} รายการ):</h6>
        <table class="table table-bordered align-middle fs-7 mb-4">
          <thead class="table-success text-dark">
            <tr>
              <th class="text-center" style="width: 50px;">ลำดับ</th>
              <th style="width: 120px;">รหัสอุปกรณ์</th>
              <th>รายการอุปกรณ์</th>
              <th class="text-center" style="width: 90px;">จำนวน</th>
              <th class="text-center" style="width: 80px;">หน่วยนับ</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableHtml}
          </tbody>
        </table>

        <div class="row text-center mt-5 pt-3 fs-8">
          <div class="col-6">
            <div class="border-bottom pb-2 mb-1" style="width: 70%; margin: 0 auto;"></div>
            <div>ลงชื่อ..........................................................</div>
            <div class="fw-bold text-dark mt-1">(${tx.employeeName ? tx.employeeName.split(' ')[0] : 'ผู้ทำรายการ'})</div>
            <div class="text-muted">ผู้เบิก / ผู้ยืมอุปกรณ์</div>
          </div>
          <div class="col-6">
            <div class="border-bottom pb-2 mb-1" style="width: 70%; margin: 0 auto;"></div>
            <div>ลงชื่อ..........................................................</div>
            <div class="fw-bold text-dark mt-1">(เจ้าหน้าที่ผู้จ่าย / ผู้อนุมัติ)</div>
            <div class="text-muted">ผู้ส่งมอบ / ผู้อนุมัติ</div>
          </div>
        </div>
      `;

      const modalElem = document.getElementById('printableTransactionVoucherModal');
      const modal = new bootstrap.Modal(modalElem);
      modal.show();
    };

    window.printTransactionVoucher = function() {
      const paper = document.getElementById('transactionVoucherPaper');
      const sheet = document.getElementById('printableTransactionVoucherSheet');
      if (!paper || !sheet) return;

      sheet.innerHTML = paper.innerHTML;
      window.print();
    };

    window.printEmployeeHistoryReport = function() {
      if (!currentEmpHistoryId) return;
      const emp = employeeList.find(x => x.id === currentEmpHistoryId);
      if (!emp) return;

      const empTxs = transactionHistory.filter(tx => {
        if (!tx) return false;
        return (tx.employeeId === emp.id) || 
               (tx.employeeName && (tx.employeeName.includes(emp.name) || tx.employeeName.includes(emp.id)));
      });

      let countWithdraw = 0, countBorrow = 0, countReturn = 0;
      empTxs.forEach(tx => {
        if (tx.type === 'เบิกจ่าย') countWithdraw++;
        else if (tx.type === 'ยืมอุปกรณ์') countBorrow++;
        else if (tx.type === 'คืนอุปกรณ์') countReturn++;
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตให้เปิด Pop-up");
        return;
      }

      let rowsHtml = '';
      empTxs.forEach((tx, idx) => {
        rowsHtml += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${tx.timestamp || '-'}</td>
            <td><strong>${tx.type}</strong></td>
            <td><strong>${tx.equipmentName}</strong></td>
            <td style="text-align: center;"><strong>${tx.quantity} ${tx.unit || 'ชิ้น'}</strong></td>
            <td>${tx.location || '-'}</td>
            <td>${tx.note || '-'}</td>
          </tr>
        `;
      });

      const docHtml = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>รายงานประวัติการเบิก-ยืมอุปกรณ์ - คุณ${emp.name}</title>
          <style>
            body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #333; }
            h2, h4 { margin: 0 0 10px 0; }
            .header-box { border-bottom: 2px solid #2e7d32; padding-bottom: 12px; margin-bottom: 20px; }
            .emp-info { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #2e7d32; }
            .summary-box { display: flex; gap: 20px; margin-bottom: 20px; }
            .summary-card { flex: 1; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
            th { background-color: #e8f5e9; color: #1b5e20; }
            .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2e7d32; color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">🖨️ สั่งพิมพ์เอกสาร</button>
          </div>

          <div class="header-box">
            <h2>โครงการทุ่งสวรรค์ ตะวันฉาย (Flora Garden)</h2>
            <h4>รายงานประวัติการเบิก-ยืม-คืน อุปกรณ์การเกษตรรายบุคคล</h4>
            <small>พิมพ์รายงานเมื่อ: ${new Date().toLocaleString('th-TH')}</small>
          </div>

          <div class="emp-info">
            <strong>ชื่อ-นามสกุล พนักงาน:</strong> ${emp.name} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>รหัสประจำตัว:</strong> ${emp.id}<br>
            <strong>แผนก / สวน:</strong> ${emp.department || 'ทั่วไป'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>ตำแหน่ง:</strong> ${emp.position || '-'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>เบอร์โทรศัพท์:</strong> ${emp.phone || '-'}
          </div>

          <div class="summary-box">
            <div class="summary-card">
              <small>เบิกจ่ายทั้งหมด</small>
              <h3 style="color: #d32f2f; margin: 5px 0;">${countWithdraw} ครั้ง</h3>
            </div>
            <div class="summary-card">
              <small>ยืมอุปกรณ์ทั้งหมด</small>
              <h3 style="color: #f57c00; margin: 5px 0;">${countBorrow} ครั้ง</h3>
            </div>
            <div class="summary-card">
              <small>คืนอุปกรณ์ทั้งหมด</small>
              <h3 style="color: #0288d1; margin: 5px 0;">${countReturn} ครั้ง</h3>
            </div>
            <div class="summary-card">
              <small>รายการทำธุรกรรมรวม</small>
              <h3 style="color: #2e7d32; margin: 5px 0;">${empTxs.length} รายการ</h3>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="width: 140px;">วัน-เวลา</th>
                <th style="width: 100px;">ประเภท</th>
                <th>อุปกรณ์การเกษตร</th>
                <th style="width: 80px; text-align: center;">จำนวน</th>
                <th>สถานที่</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align: center;">ไม่พบประวัติทำรายการ</td></tr>'}
            </tbody>
          </table>

          <div class="footer-sign">
            <div>
              <p>ลงชื่อ......................................................</p>
              <p>( ${emp.name} )<br>ผู้ขอเบิก/ยืม</p>
            </div>
            <div>
              <p>ลงชื่อ......................................................</p>
              <p>( ...................................................... )<br>ผู้ดูแลคลังอุปกรณ์ / ผู้อนุมัติ</p>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(docHtml);
      printWindow.document.close();
    };

    // ==========================================
    // EXPORT INVENTORY STATUS REPORT LOGIC (ส่งออกรายงานสถานะคลัง)
    // ==========================================
    window.formatDateDDMMYYYY = function(dateStr) {
      if (!dateStr) return '';
      const str = String(dateStr).trim();
      let day, month, year;

      if (str.includes('-')) {
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }
      } else if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          let p1 = parseInt(parts[0], 10);
          let p2 = parseInt(parts[1], 10);
          let p3 = parseInt(parts[2], 10);
          if (p1 <= 12 && p2 > 12) {
            day = p2;
            month = p1;
            year = p3;
          } else {
            day = p1;
            month = p2;
            year = p3;
          }
        }
      }

      if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          day = d.getDate();
          month = d.getMonth() + 1;
          year = d.getFullYear();
        } else {
          return str;
        }
      }

      // Convert AD year (e.g. 2026) to Thai Buddhist Era year (พ.ศ.) (e.g. 2569) if year < 2400
      const beYear = (year < 2400) ? (year + 543) : year;
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');

      return `${dayStr}/${monthStr}/${beYear}`;
    };

    window.triggerReportDatePicker = function(type) {
      const elemId = (type === 'START') ? 'reportStartDate' : 'reportEndDate';
      const elem = document.getElementById(elemId);
      if (elem) {
        if (typeof elem.showPicker === 'function') {
          try { elem.showPicker(); } catch (e) { elem.click(); }
        } else {
          elem.click();
        }
      }
    };

    window.handleReportDateNativeChange = function(type) {
      const nativeElem = document.getElementById(type === 'START' ? 'reportStartDate' : 'reportEndDate');
      const textElem = document.getElementById(type === 'START' ? 'reportStartDateText' : 'reportEndDateText');
      if (nativeElem && textElem && nativeElem.value) {
        textElem.value = formatDateDDMMYYYY(nativeElem.value);
      } else if (textElem && (!nativeElem || !nativeElem.value)) {
        textElem.value = '';
      }
      updateInventoryReportPreview();
    };

    window.handleReportDateTextChange = function(type) {
      const nativeElem = document.getElementById(type === 'START' ? 'reportStartDate' : 'reportEndDate');
      const textElem = document.getElementById(type === 'START' ? 'reportStartDateText' : 'reportEndDateText');
      if (!textElem) return;

      const raw = textElem.value.trim();
      if (!raw) {
        if (nativeElem) nativeElem.value = '';
        updateInventoryReportPreview();
        return;
      }

      let day, month, year;
      if (raw.includes('/')) {
        const parts = raw.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      } else if (raw.includes('-')) {
        const parts = raw.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
          }
        }
      }

      if (day && month && year && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const adYear = (year > 2400) ? (year - 543) : year;
        const yStr = String(adYear);
        const mStr = String(month).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const isoDateStr = `${yStr}-${mStr}-${dStr}`;

        if (nativeElem) nativeElem.value = isoDateStr;
        textElem.value = formatDateDDMMYYYY(isoDateStr);
      }
      updateInventoryReportPreview();
    };

    window.openExportInventoryReportModal = function() {
      const startInput = document.getElementById('reportStartDate');
      const endInput = document.getElementById('reportEndDate');
      const startTextInput = document.getElementById('reportStartDateText');
      const endTextInput = document.getElementById('reportEndDateText');
      const catSelect = document.getElementById('reportCategorySelect');
      
      const now = new Date();
      const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      if (startInput && !startInput.value) startInput.value = firstDayStr;
      if (endInput && !endInput.value) endInput.value = todayStr;

      if (startTextInput && startInput) startTextInput.value = formatDateDDMMYYYY(startInput.value);
      if (endTextInput && endInput) endTextInput.value = formatDateDDMMYYYY(endInput.value);

      // Populate Categories Dropdown
      if (catSelect) {
        let catHtml = '<option value="ALL">📦 ทุกหมวดหมู่</option>';
        if (Array.isArray(categoriesList) && categoriesList.length > 0) {
          categoriesList.forEach(c => {
            const iconStr = c.icon ? c.icon + ' ' : '';
            catHtml += `<option value="${c.name}">${iconStr}${c.name}</option>`;
          });
        }
        catSelect.innerHTML = catHtml;
      }

      updateInventoryReportPreview();

      const modalElem = document.getElementById('exportInventoryReportModal');
      if (modalElem) {
        const modal = new bootstrap.Modal(modalElem);
        modal.show();
      }
    };

    window.setReportDatePreset = function(preset) {
      const startInput = document.getElementById('reportStartDate');
      const endInput = document.getElementById('reportEndDate');
      const startTextInput = document.getElementById('reportStartDateText');
      const endTextInput = document.getElementById('reportEndDateText');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (preset === 'TODAY') {
        if (startInput) startInput.value = todayStr;
        if (endInput) endInput.value = todayStr;
      } else if (preset === '7_DAYS') {
        const prev7 = new Date();
        prev7.setDate(now.getDate() - 6);
        if (startInput) startInput.value = prev7.toISOString().split('T')[0];
        if (endInput) endInput.value = todayStr;
      } else if (preset === 'THIS_MONTH') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
        if (endInput) endInput.value = todayStr;
      } else if (preset === 'ALL') {
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';
      }

      if (startTextInput) startTextInput.value = startInput && startInput.value ? formatDateDDMMYYYY(startInput.value) : '';
      if (endTextInput) endTextInput.value = endInput && endInput.value ? formatDateDDMMYYYY(endInput.value) : '';

      updateInventoryReportPreview();
    };

    window.getFilteredReportItems = function() {
      const startDate = document.getElementById('reportStartDate')?.value || '';
      const endDate = document.getElementById('reportEndDate')?.value || '';
      const cat = document.getElementById('reportCategorySelect')?.value || 'ALL';
      const stockStatus = document.getElementById('reportStockStatusSelect')?.value || 'ALL';

      let items = [...equipmentList];

      // Category filter
      if (cat !== 'ALL') {
        items = items.filter(x => x.category === cat);
      }

      // Stock status filter
      if (stockStatus === 'LOW_STOCK') {
        items = items.filter(x => (x.quantity || 0) <= (x.minQuantity !== undefined ? x.minQuantity : 3));
      } else if (stockStatus === 'NORMAL') {
        items = items.filter(x => (x.quantity || 0) > (x.minQuantity !== undefined ? x.minQuantity : 3));
      } else if (stockStatus === 'OUT_OF_STOCK') {
        items = items.filter(x => (x.quantity || 0) <= 0);
      }

      // Date range filter
      if (startDate || endDate) {
        const sTime = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
        const eTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

        // Collect item IDs that had transaction activity in date range
        const activeItemIdsInTx = new Set();
        if (Array.isArray(transactionHistory)) {
          transactionHistory.forEach(tx => {
            if (!tx || !tx.timestamp) return;
            const txTime = new Date(tx.timestamp).getTime();
            if (!isNaN(txTime) && txTime >= sTime && txTime <= eTime) {
              if (tx.equipmentId) activeItemIdsInTx.add(tx.equipmentId);
              if (tx.items && Array.isArray(tx.items)) {
                tx.items.forEach(it => { if (it.equipmentId) activeItemIdsInTx.add(it.equipmentId); });
              }
            }
          });
        }

        const dateFiltered = items.filter(x => {
          if (activeItemIdsInTx.has(x.id) || activeItemIdsInTx.has(x.code)) return true;
          let itemDateStr = x.lastUpdated || x.updatedAt || x.createdAt || '';
          if (!itemDateStr) return true; // Keep if no date recorded to avoid empty list
          const itemTime = new Date(itemDateStr).getTime();
          if (isNaN(itemTime)) return true;
          return itemTime >= sTime && itemTime <= eTime;
        });

        if (dateFiltered.length > 0) {
          items = dateFiltered;
        }
      }

      return items;
    };

    window.updateInventoryReportPreview = function() {
      const items = getFilteredReportItems();
      const startDate = document.getElementById('reportStartDate')?.value || '';
      const endDate = document.getElementById('reportEndDate')?.value || '';

      const formattedStart = formatDateDDMMYYYY(startDate);
      const formattedEnd = formatDateDDMMYYYY(endDate);

      const startFormattedElem = document.getElementById('reportStartDateFormatted');
      const endFormattedElem = document.getElementById('reportEndDateFormatted');
      if (startFormattedElem) startFormattedElem.textContent = startDate ? `📅 รูปแบบ วัน/เดือน/ปี: ${formattedStart}` : '';
      if (endFormattedElem) endFormattedElem.textContent = endDate ? `📅 รูปแบบ วัน/เดือน/ปี: ${formattedEnd}` : '';

      const totalItems = items.length;
      let totalQty = 0;
      let lowStockCount = 0;
      let totalValueSum = 0;

      items.forEach(item => {
        const qty = Number(item.quantity || 0);
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const price = Number(item.price || item.unitPrice || 0);

        totalQty += qty;
        if (qty <= minQty) lowStockCount++;
        totalValueSum += (qty * price);
      });

      // Update counters
      const elemTotalItems = document.getElementById('reportTotalItemsCount');
      const elemTotalQty = document.getElementById('reportTotalQuantityCount');
      const elemLowStock = document.getElementById('reportLowStockCount');
      const elemTotalVal = document.getElementById('reportTotalValueSum');
      const elemFilteredCount = document.getElementById('reportFilteredCount');
      const elemDateRangeText = document.getElementById('reportDateRangeText');

      if (elemTotalItems) elemTotalItems.textContent = totalItems.toLocaleString('th-TH');
      if (elemTotalQty) elemTotalQty.textContent = totalQty.toLocaleString('th-TH');
      if (elemLowStock) elemLowStock.textContent = lowStockCount.toLocaleString('th-TH');
      if (elemTotalVal) elemTotalVal.textContent = '฿' + totalValueSum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (elemFilteredCount) elemFilteredCount.textContent = totalItems;

      if (elemDateRangeText) {
        if (startDate && endDate) {
          elemDateRangeText.textContent = `ช่วงวันที่: ${formattedStart} ถึง ${formattedEnd}`;
        } else if (startDate) {
          elemDateRangeText.textContent = `ตั้งแต่: ${formattedStart}`;
        } else if (endDate) {
          elemDateRangeText.textContent = `ถึงวันที่: ${formattedEnd}`;
        } else {
          elemDateRangeText.textContent = `ช่วงวันที่: ข้อมูลทั้งหมด`;
        }
      }

      // Populate preview table
      const tbody = document.getElementById('reportPreviewTableBody');
      if (!tbody) return;

      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">ไม่พบรายการอุปกรณ์ตามเงื่อนไขที่เลือก</td></tr>`;
        return;
      }

      let rowsHtml = '';
      items.forEach(item => {
        const qty = Number(item.quantity || 0);
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const price = Number(item.price || item.unitPrice || 0);
        const isLow = qty <= minQty;
        const isZero = qty <= 0;

        let statusBadge = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2">ปกติ</span>`;
        if (isZero) {
          statusBadge = `<span class="badge bg-danger text-white rounded-pill px-2">หมดสต๊อก</span>`;
        } else if (isLow) {
          statusBadge = `<span class="badge bg-warning text-dark rounded-pill px-2">ต่ำกว่าขั้นต่ำ</span>`;
        }

        rowsHtml += `
          <tr>
            <td class="ps-3 fw-bold text-dark">${item.code || item.id || '-'}</td>
            <td class="fw-semibold text-dark">${item.name || '-'}</td>
            <td><span class="badge bg-light text-dark border fs-8">${item.category || '-'}</span></td>
            <td class="text-secondary">${item.location || '-'}</td>
            <td class="text-center text-muted">${minQty}</td>
            <td class="text-center fw-bold ${isLow ? 'text-danger' : 'text-success'}">${qty} ${item.unit || 'ชิ้น'}</td>
            <td class="text-end fw-mono">฿${price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td class="text-center pe-3">${statusBadge}</td>
          </tr>
        `;
      });

      tbody.innerHTML = rowsHtml;
    };

    window.exportInventoryReportToCSV = function() {
      const items = getFilteredReportItems();
      if (!items || items.length === 0) {
        if (typeof showToast === 'function') showToast("⚠️ ไม่พบรายการอุปกรณ์ที่จะส่งออก");
        return;
      }

      const startDate = document.getElementById('reportStartDate')?.value || '';
      const endDate = document.getElementById('reportEndDate')?.value || '';
      const formattedStart = formatDateDDMMYYYY(startDate);
      const formattedEnd = formatDateDDMMYYYY(endDate);
      const dateRangeStr = (startDate && endDate) ? `${formattedStart.replace(/\//g, '-')}_to_${formattedEnd.replace(/\//g, '-')}` : 'all_dates';

      let csv = '\uFEFF'; // UTF-8 BOM for Excel / Google Sheets
      csv += `"รายงานสรุปสถานะคลังอุปกรณ์การเกษตร - Flora Garden"\n`;
      csv += `"วันที่ออกรายงาน:","${new Date().toLocaleString('th-TH')}"\n`;
      csv += `"ช่วงเวลาข้อมูล:","${formattedStart || 'ทั้งหมด'} ถึง ${formattedEnd || 'ทั้งหมด'}"\n`;
      csv += `"จำนวนรายการทั้งหมด:","${items.length}"\n\n`;

      // Header row
      csv += `"ลำดับ","รหัสอุปกรณ์","ชื่ออุปกรณ์","หมวดหมู่","สถานที่เก็บ","สต๊อกขั้นต่ำ","คงเหลือ","หน่วยนับ","ราคาต่อหน่วย (บาท)","มูลค่ารวม (บาท)","สถานะสต๊อก"\n`;

      let totalUnits = 0;
      let totalValSum = 0;

      items.forEach((item, index) => {
        const qty = Number(item.quantity || 0);
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const price = Number(item.price || item.unitPrice || 0);
        const rowVal = qty * price;

        totalUnits += qty;
        totalValSum += rowVal;

        let statusStr = "ปกติ";
        if (qty <= 0) statusStr = "สินค้าหมด";
        else if (qty <= minQty) statusStr = "สต๊อกต่ำกว่าขั้นต่ำ";

        const cleanName = (item.name || '').replace(/"/g, '""');
        const cleanCat = (item.category || '').replace(/"/g, '""');
        const cleanLoc = (item.location || '').replace(/"/g, '""');
        const cleanUnit = (item.unit || 'ชิ้น').replace(/"/g, '""');

        csv += `"${index + 1}","${item.code || item.id || ''}","${cleanName}","${cleanCat}","${cleanLoc}","${minQty}","${qty}","${cleanUnit}","${price.toFixed(2)}","${rowVal.toFixed(2)}","${statusStr}"\n`;
      });

      // Total row
      csv += `\n"","","","","รวมทั้งหมด","","${totalUnits}","","","${totalValSum.toFixed(2)}",""\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `flora_garden_inventory_report_${dateRangeStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (typeof showToast === 'function') showToast("📊 ส่งออกไฟล์ CSV สำหรับ Excel / Google Sheets เรียบร้อยแล้ว!");
    };

    window.exportInventoryReportToPDF = function() {
      const items = getFilteredReportItems();
      if (!items || items.length === 0) {
        if (typeof showToast === 'function') showToast("⚠️ ไม่พบรายการอุปกรณ์ที่จะส่งออก");
        return;
      }

      const startDate = document.getElementById('reportStartDate')?.value || '';
      const endDate = document.getElementById('reportEndDate')?.value || '';
      const formattedStart = formatDateDDMMYYYY(startDate);
      const formattedEnd = formatDateDDMMYYYY(endDate);
      const cat = document.getElementById('reportCategorySelect')?.value || 'ALL';

      let totalQty = 0;
      let lowStockCount = 0;
      let totalValueSum = 0;

      let rowsHtml = '';
      items.forEach((item, index) => {
        const qty = Number(item.quantity || 0);
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        const price = Number(item.price || item.unitPrice || 0);
        const rowVal = qty * price;

        totalQty += qty;
        if (qty <= minQty) lowStockCount++;
        totalValueSum += rowVal;

        let statusText = "ปกติ";
        let statusStyle = "color: #2e7d32; font-weight: bold;";
        if (qty <= 0) {
          statusText = "สินค้าหมด";
          statusStyle = "color: #c62828; font-weight: bold;";
        } else if (qty <= minQty) {
          statusText = "ต่ำกว่าขั้นต่ำ";
          statusStyle = "color: #ef6c00; font-weight: bold;";
        }

        rowsHtml += `
          <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px;">${index + 1}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; font-weight: bold;">${item.code || item.id || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${item.name || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${item.category || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${item.location || '-'}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px;">${minQty}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; font-weight: bold;">${qty} ${item.unit || 'ชิ้น'}</td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 6px;">฿${price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 6px; font-weight: bold;">฿${rowVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; ${statusStyle}">${statusText}</td>
          </tr>
        `;
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("⚠️ เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตให้เปิด Pop-up");
        return;
      }

      const todayThai = new Date().toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const dateRangeDisplay = (startDate && endDate)
        ? `${formattedStart} ถึง ${formattedEnd}`
        : (startDate ? `ตั้งแต่ ${formattedStart}` : (endDate ? `ถึงวันที่ ${formattedEnd}` : 'ข้อมูลทั้งหมดล่าสุด'));

      const docHtml = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>รายงานสรุปสถานะคลังอุปกรณ์การเกษตร - Flora Garden</title>
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Prompt', sans-serif; padding: 25px; color: #333; line-height: 1.4; background: #fff; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2e7d32; padding-bottom: 15px; margin-bottom: 20px; }
            .company-name { color: #2e7d32; font-size: 22px; font-weight: 700; margin: 0; }
            .report-title { font-size: 18px; font-weight: 600; color: #1b5e20; margin-top: 4px; }
            .meta-info { font-size: 13px; color: #555; text-align: right; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; }
            .card-box { flex: 1; background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 12px; text-align: center; }
            .card-title { font-size: 12px; color: #388e3c; font-weight: 600; }
            .card-value { font-size: 18px; font-weight: 700; color: #1b5e20; margin: 4px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background-color: #2e7d32; color: #ffffff; border: 1px solid #1b5e20; padding: 8px; text-align: left; }
            .footer-summary { margin-top: 20px; padding: 12px; background: #e8f5e9; border-radius: 6px; font-weight: 600; display: flex; justify-content: space-between; font-size: 13px; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
            .sign-box { width: 40%; }
            .sign-line { border-bottom: 1px dashed #666; margin-top: 40px; margin-bottom: 8px; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2e7d32; color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; font-family: 'Prompt', sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
              🖨️ พิมพ์เอกสาร / บันทึกเป็น PDF
            </button>
          </div>

          <div class="header-container">
            <div>
              <h1 class="company-name">🌿 บริษัท โฟลร่า การ์เด้น จำกัด (Flora Garden)</h1>
              <div class="report-title">รายงานสรุปสถานะคลังอุปกรณ์การเกษตร (Inventory Status Report)</div>
            </div>
            <div class="meta-info">
              <div><strong>วันที่ออกรายงาน:</strong> ${todayThai}</div>
              <div><strong>ช่วงวันที่กำหนด:</strong> ${dateRangeDisplay}</div>
              <div><strong>หมวดหมู่:</strong> ${cat === 'ALL' ? 'ทุกหมวดหมู่' : cat}</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card-box">
              <div class="card-title">จำนวนรายการอุปกรณ์</div>
              <div class="card-value">${items.length} รายการ</div>
            </div>
            <div class="card-box">
              <div class="card-title">ปริมาณคงเหลือรวม</div>
              <div class="card-value">${totalQty.toLocaleString('th-TH')} ชิ้น/หน่วย</div>
            </div>
            <div class="card-box" style="background: #fff3e0; border-color: #ffe0b2;">
              <div class="card-title" style="color: #e65100;">สต๊อกต่ำกว่าขั้นต่ำ</div>
              <div class="card-value" style="color: #c62828;">${lowStockCount} รายการ</div>
            </div>
            <div class="card-box" style="background: #e3f2fd; border-color: #bbdefb;">
              <div class="card-title" style="color: #1565c0;">มูลค่าสินค้ารวมประมาณการ</div>
              <div class="card-value" style="color: #0d47a1;">฿${totalValueSum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="width: 80px; text-align: center;">รหัสสินค้า</th>
                <th>ชื่ออุปกรณ์</th>
                <th>หมวดหมู่</th>
                <th>สถานที่จัดเก็บ</th>
                <th style="width: 50px; text-align: center;">ขั้นต่ำ</th>
                <th style="width: 70px; text-align: center;">คงเหลือ</th>
                <th style="width: 90px; text-align: right;">ราคา/หน่วย</th>
                <th style="width: 100px; text-align: right;">มูลค่ารวม</th>
                <th style="width: 85px; text-align: center;">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-summary">
            <span>สรุปรวมทั้งหมด: ${items.length} รายการ</span>
            <span>ปริมาณรวม: ${totalQty.toLocaleString('th-TH')} ชิ้น</span>
            <span>มูลค่ารวมทั้งสิ้น: ฿${totalValueSum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
          </div>

          <div class="signature-section">
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>( ...................................................... )</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">ผู้รายงาน / เจ้าหน้าที่คลังอุปกรณ์</div>
              <div style="font-size: 12px; color: #666;">วันที่ ........ / ........ / ................</div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>( ...................................................... )</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">ผู้อนุมัติ / ผู้จัดการฝ่ายปฏิบัติการ</div>
              <div style="font-size: 12px; color: #666;">วันที่ ........ / ........ / ................</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(docHtml);
      printWindow.document.close();
    };

    // ==========================================
    // STOCK MOVEMENT REPORT LOGIC (รายงานการเคลื่อนไหวสต๊อกอุปกรณ์)
    // ==========================================
    window.triggerMovementDatePicker = function(type) {
      const elem = document.getElementById(type === 'START' ? 'movementStartDate' : 'movementEndDate');
      if (elem) {
        if (typeof elem.showPicker === 'function') {
          try { elem.showPicker(); } catch (e) { elem.click(); }
        } else {
          elem.click();
        }
      }
    };

    window.handleMovementDateNativeChange = function(type) {
      const nativeElem = document.getElementById(type === 'START' ? 'movementStartDate' : 'movementEndDate');
      const textElem = document.getElementById(type === 'START' ? 'movementStartDateText' : 'movementEndDateText');
      if (nativeElem && textElem && nativeElem.value) {
        textElem.value = formatDateDDMMYYYY(nativeElem.value);
      } else if (textElem && (!nativeElem || !nativeElem.value)) {
        textElem.value = '';
      }
      updateStockMovementReportPreview();
    };

    window.handleMovementDateTextChange = function(type) {
      const nativeElem = document.getElementById(type === 'START' ? 'movementStartDate' : 'movementEndDate');
      const textElem = document.getElementById(type === 'START' ? 'movementStartDateText' : 'movementEndDateText');
      if (!textElem) return;

      const raw = textElem.value.trim();
      if (!raw) {
        if (nativeElem) nativeElem.value = '';
        updateStockMovementReportPreview();
        return;
      }

      let day, month, year;
      if (raw.includes('/')) {
        const parts = raw.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      } else if (raw.includes('-')) {
        const parts = raw.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
          }
        }
      }

      if (day && month && year && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const adYear = (year > 2400) ? (year - 543) : year;
        const yStr = String(adYear);
        const mStr = String(month).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const isoDateStr = `${yStr}-${mStr}-${dStr}`;

        if (nativeElem) nativeElem.value = isoDateStr;
        textElem.value = formatDateDDMMYYYY(isoDateStr);
      }
      updateStockMovementReportPreview();
    };

    window.setMovementDatePreset = function(preset) {
      const startInput = document.getElementById('movementStartDate');
      const endInput = document.getElementById('movementEndDate');
      const startTextInput = document.getElementById('movementStartDateText');
      const endTextInput = document.getElementById('movementEndDateText');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (preset === 'TODAY') {
        if (startInput) startInput.value = todayStr;
        if (endInput) endInput.value = todayStr;
      } else if (preset === '7_DAYS') {
        const prev7 = new Date();
        prev7.setDate(now.getDate() - 6);
        if (startInput) startInput.value = prev7.toISOString().split('T')[0];
        if (endInput) endInput.value = todayStr;
      } else if (preset === 'THIS_MONTH') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
        if (endInput) endInput.value = todayStr;
      } else if (preset === 'ALL') {
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';
      }

      if (startTextInput) startTextInput.value = startInput && startInput.value ? formatDateDDMMYYYY(startInput.value) : '';
      if (endTextInput) endTextInput.value = endInput && endInput.value ? formatDateDDMMYYYY(endInput.value) : '';

      updateStockMovementReportPreview();
    };

    window.openStockMovementReportModal = function(equipIdFilter = null) {
      const startInput = document.getElementById('movementStartDate');
      const endInput = document.getElementById('movementEndDate');
      const startTextInput = document.getElementById('movementStartDateText');
      const endTextInput = document.getElementById('movementEndDateText');
      const equipSelect = document.getElementById('movementEquipmentSelect');
      const empSelect = document.getElementById('movementEmployeeSelect');
      const catSelect = document.getElementById('movementCategorySelect');
      const typeSelect = document.getElementById('movementTypeSelect');

      const now = new Date();
      const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      if (startInput && !startInput.value) startInput.value = firstDayStr;
      if (endInput && !endInput.value) endInput.value = todayStr;

      if (startTextInput && startInput) startTextInput.value = formatDateDDMMYYYY(startInput.value);
      if (endTextInput && endInput) endTextInput.value = formatDateDDMMYYYY(endInput.value);

      // Populate Equipment Dropdown
      if (equipSelect) {
        let equipHtml = '<option value="ALL">📦 ทุกรายการอุปกรณ์</option>';
        if (Array.isArray(equipmentList) && equipmentList.length > 0) {
          const sortedEquip = [...equipmentList].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
          sortedEquip.forEach(item => {
            equipHtml += `<option value="${item.id}">${item.code ? '[' + item.code + '] ' : ''}${item.name}</option>`;
          });
        }
        equipSelect.innerHTML = equipHtml;
        if (equipIdFilter) {
          equipSelect.value = equipIdFilter;
        } else {
          equipSelect.value = 'ALL';
        }
      }

      // Populate Employee Dropdown
      if (empSelect) {
        let empHtml = '<option value="ALL">👤 ทุกบุคลากร</option>';
        if (Array.isArray(employeeList) && employeeList.length > 0) {
          const sortedEmp = [...employeeList].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
          sortedEmp.forEach(emp => {
            const codeStr = emp.code ? `[${emp.code}] ` : '';
            const deptStr = emp.department ? ` (${emp.department})` : '';
            empHtml += `<option value="${emp.id}">${codeStr}${emp.name}${deptStr}</option>`;
          });
        }
        empSelect.innerHTML = empHtml;
        empSelect.value = 'ALL';
      }

      // Populate Categories Dropdown
      if (catSelect) {
        let catHtml = '<option value="ALL">📦 ทุกหมวดหมู่</option>';
        if (Array.isArray(categoriesList) && categoriesList.length > 0) {
          categoriesList.forEach(c => {
            const iconStr = c.icon ? c.icon + ' ' : '';
            catHtml += `<option value="${c.name}">${iconStr}${c.name}</option>`;
          });
        }
        catSelect.innerHTML = catHtml;
        catSelect.value = 'ALL';
      }

      if (typeSelect) typeSelect.value = 'ALL';

      updateStockMovementReportPreview();

      const modalElem = document.getElementById('stockMovementReportModal');
      if (modalElem) {
        const modal = new bootstrap.Modal(modalElem);
        modal.show();
      }
    };

    window.getFilteredStockMovementItems = function() {
      const startDate = document.getElementById('movementStartDate')?.value || '';
      const endDate = document.getElementById('movementEndDate')?.value || '';
      const equipId = document.getElementById('movementEquipmentSelect')?.value || 'ALL';
      const selectedEmpId = document.getElementById('movementEmployeeSelect')?.value || 'ALL';
      const moveType = document.getElementById('movementTypeSelect')?.value || 'ALL';
      const cat = document.getElementById('movementCategorySelect')?.value || 'ALL';

      let records = [];

      // Helper to match category for equipment
      const getEquipCategory = (id, code, name) => {
        if (!equipmentList) return '';
        const found = equipmentList.find(x => x.id === id || x.code === code || x.name === name);
        return found ? (found.category || '') : '';
      };

      if (Array.isArray(transactionHistory)) {
        transactionHistory.forEach(tx => {
          if (!tx) return;

          // If transaction has items array (multi-item)
          if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
            tx.items.forEach(it => {
              const itemEquipId = it.equipmentId || tx.equipmentId || '';
              const itemEquipCode = it.equipmentCode || it.code || tx.equipmentCode || tx.code || '';
              const itemEquipName = it.equipmentName || it.name || tx.equipmentName || tx.name || '';
              const itemCategory = it.category || getEquipCategory(itemEquipId, itemEquipCode, itemEquipName);

              records.push({
                txId: tx.docNo || tx.id,
                rawTx: tx,
                timestamp: tx.timestamp || '-',
                timestampMs: typeof getRecordTimestampMs === 'function' ? getRecordTimestampMs(tx) : new Date(tx.timestamp || 0).getTime(),
                type: tx.type || '-',
                equipmentId: itemEquipId,
                equipmentCode: itemEquipCode,
                equipmentName: itemEquipName,
                category: itemCategory,
                quantity: Number(it.quantity !== undefined ? it.quantity : (tx.quantity || 0)),
                unit: it.unit || tx.unit || 'ชิ้น',
                employeeId: tx.employeeId || '',
                employeeName: tx.employeeName || '-',
                location: tx.location || '-',
                note: tx.note || '-'
              });
            });
          } else {
            // Single item transaction
            const itemEquipId = tx.equipmentId || '';
            const itemEquipCode = tx.equipmentCode || tx.code || '';
            const itemEquipName = tx.equipmentName || tx.name || '-';
            const itemCategory = tx.category || getEquipCategory(itemEquipId, itemEquipCode, itemEquipName);

            records.push({
              txId: tx.docNo || tx.id,
              rawTx: tx,
              timestamp: tx.timestamp || '-',
              timestampMs: typeof getRecordTimestampMs === 'function' ? getRecordTimestampMs(tx) : new Date(tx.timestamp || 0).getTime(),
              type: tx.type || '-',
              equipmentId: itemEquipId,
              equipmentCode: itemEquipCode,
              equipmentName: itemEquipName,
              category: itemCategory,
              quantity: Number(tx.quantity || 0),
              unit: tx.unit || 'ชิ้น',
              employeeId: tx.employeeId || '',
              employeeName: tx.employeeName || '-',
              location: tx.location || '-',
              note: tx.note || '-'
            });
          }
        });
      }

      // Filter by Date Range
      if (startDate || endDate) {
        const sTime = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
        const eTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

        records = records.filter(r => {
          const t = r.timestampMs;
          if (isNaN(t) || t === 0) return true;
          return t >= sTime && t <= eTime;
        });
      }

      // Filter by Equipment
      if (equipId !== 'ALL') {
        const targetEquip = equipmentList ? equipmentList.find(x => x.id === equipId) : null;
        records = records.filter(r => {
          if (r.equipmentId === equipId) return true;
          if (targetEquip) {
            if (targetEquip.code && r.equipmentCode === targetEquip.code) return true;
            if (targetEquip.name && r.equipmentName === targetEquip.name) return true;
          }
          return false;
        });
      }

      // Filter by Employee
      if (selectedEmpId !== 'ALL') {
        const targetEmp = (employeeList || []).find(e => e.id === selectedEmpId);
        records = records.filter(r => {
          if (r.employeeId && r.employeeId === selectedEmpId) return true;
          if (targetEmp) {
            if (r.employeeName && targetEmp.name && r.employeeName.includes(targetEmp.name)) return true;
            if (r.employeeName && targetEmp.code && r.employeeName.includes(targetEmp.code)) return true;
          }
          return false;
        });
      }

      // Filter by Movement Type
      if (moveType !== 'ALL') {
        records = records.filter(r => {
          if (moveType === 'รับเข้าสต๊อก') {
            return r.type.includes('รับเข้า') || r.type.includes('เติมสต๊อก') || r.type.includes('Inbound');
          }
          return r.type === moveType;
        });
      }

      // Filter by Category
      if (cat !== 'ALL') {
        records = records.filter(r => r.category === cat);
      }

      // Sort newest first
      records.sort((a, b) => b.timestampMs - a.timestampMs);

      return records;
    };

    window.updateStockMovementReportPreview = function() {
      const records = getFilteredStockMovementItems();
      const startDate = document.getElementById('movementStartDate')?.value || '';
      const endDate = document.getElementById('movementEndDate')?.value || '';

      const formattedStart = formatDateDDMMYYYY(startDate);
      const formattedEnd = formatDateDDMMYYYY(endDate);

      const startFormattedElem = document.getElementById('movementStartDateFormatted');
      const endFormattedElem = document.getElementById('movementEndDateFormatted');
      if (startFormattedElem) startFormattedElem.textContent = startDate ? `📅 รูปแบบ วัน/เดือน/ปี: ${formattedStart}` : '';
      if (endFormattedElem) endFormattedElem.textContent = endDate ? `📅 รูปแบบ วัน/เดือน/ปี: ${formattedEnd}` : '';

      let totalTx = records.length;
      let totalInbound = 0;
      let totalOutbound = 0;
      let totalReturned = 0;

      records.forEach(r => {
        const qty = Number(r.quantity || 0);
        const type = r.type || '';

        if (type.includes('รับเข้า') || type.includes('เติมสต๊อก')) {
          totalInbound += qty;
        } else if (type === 'เบิกจ่าย' || type === 'ยืมอุปกรณ์') {
          totalOutbound += qty;
        } else if (type === 'คืนอุปกรณ์') {
          totalReturned += qty;
        }
      });

      // Update counters
      const elemTotalTx = document.getElementById('movementTotalTxCount');
      const elemTotalIn = document.getElementById('movementTotalInbound');
      const elemTotalOut = document.getElementById('movementTotalOutbound');
      const elemTotalRet = document.getElementById('movementTotalReturned');
      const elemFilteredCount = document.getElementById('movementFilteredCount');
      const elemDateRangeText = document.getElementById('movementDateRangeText');

      if (elemTotalTx) elemTotalTx.textContent = totalTx.toLocaleString('th-TH');
      if (elemTotalIn) elemTotalIn.textContent = totalInbound.toLocaleString('th-TH');
      if (elemTotalOut) elemTotalOut.textContent = totalOutbound.toLocaleString('th-TH');
      if (elemTotalRet) elemTotalRet.textContent = totalReturned.toLocaleString('th-TH');
      if (elemFilteredCount) elemFilteredCount.textContent = totalTx;

      if (elemDateRangeText) {
        if (startDate && endDate) {
          elemDateRangeText.textContent = `ช่วงวันที่: ${formattedStart} ถึง ${formattedEnd}`;
        } else if (startDate) {
          elemDateRangeText.textContent = `ตั้งแต่: ${formattedStart}`;
        } else if (endDate) {
          elemDateRangeText.textContent = `ถึงวันที่: ${formattedEnd}`;
        } else {
          elemDateRangeText.textContent = `ช่วงวันที่: ข้อมูลทั้งหมด`;
        }
      }

      // Populate preview table
      const tbody = document.getElementById('movementReportPreviewTableBody');
      if (!tbody) return;

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">ไม่พบประวัติการเคลื่อนไหวสต๊อกตามเงื่อนไขที่เลือก</td></tr>`;
        return;
      }

      let rowsHtml = '';
      records.forEach(r => {
        let typeBadge = '';
        let qtyColor = 'text-dark';
        let qtyPrefix = '';

        if (r.type === 'เบิกจ่าย') {
          typeBadge = '<span class="badge bg-danger"><i class="bi bi-box-arrow-up me-1"></i> เบิกจ่าย</span>';
          qtyColor = 'text-danger';
          qtyPrefix = '-';
        } else if (r.type === 'ยืมอุปกรณ์') {
          typeBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-arrow-repeat me-1"></i> ยืมอุปกรณ์</span>';
          qtyColor = 'text-warning-emphasis';
          qtyPrefix = '-';
        } else if (r.type === 'คืนอุปกรณ์') {
          typeBadge = '<span class="badge bg-info text-dark"><i class="bi bi-box-arrow-in-down me-1"></i> คืนอุปกรณ์</span>';
          qtyColor = 'text-info-emphasis';
          qtyPrefix = '+';
        } else if (r.type.includes('รับเข้า') || r.type.includes('เติมสต๊อก')) {
          typeBadge = '<span class="badge bg-success"><i class="bi bi-box-arrow-in-down-left me-1"></i> รับเข้าสต๊อก</span>';
          qtyColor = 'text-success';
          qtyPrefix = '+';
        } else {
          typeBadge = `<span class="badge bg-secondary">${r.type}</span>`;
        }

        rowsHtml += `
          <tr>
            <td class="ps-3 text-secondary">
              <div class="fw-bold text-dark">${r.timestamp}</div>
              <small class="font-monospace text-muted fs-8">#${r.txId}</small>
            </td>
            <td>
              <div class="fw-bold text-dark">${r.equipmentName}</div>
              ${r.equipmentCode ? `<span class="badge bg-light text-dark border font-monospace fs-8">${r.equipmentCode}</span>` : ''}
              ${r.category ? `<span class="badge bg-light text-secondary border fs-8 ms-1">${r.category}</span>` : ''}
            </td>
            <td class="text-center">${typeBadge}</td>
            <td class="text-center fw-bold ${qtyColor} fs-7">${qtyPrefix}${r.quantity} ${r.unit}</td>
            <td class="fw-semibold text-dark">${r.employeeName}</td>
            <td class="text-muted fs-8">
              ${r.location !== '-' ? `<div><i class="bi bi-geo-alt-fill text-danger me-1"></i>${r.location}</div>` : ''}
              ${r.note !== '-' ? `<div><i class="bi bi-chat-left-text me-1"></i>${r.note}</div>` : ''}
              ${(r.location === '-' && r.note === '-') ? '-' : ''}
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = rowsHtml;
    };

    window.exportStockMovementToCSV = function() {
      const records = getFilteredStockMovementItems();
      if (!records || records.length === 0) {
        if (typeof showToast === 'function') showToast("⚠️ ไม่พบประวัติการเคลื่อนไหวสต๊อกที่จะส่งออก");
        return;
      }

      const startDate = document.getElementById('movementStartDate')?.value || '';
      const endDate = document.getElementById('movementEndDate')?.value || '';
      const formattedStart = formatDateDDMMYYYY(startDate);
      const formattedEnd = formatDateDDMMYYYY(endDate);
      const dateRangeStr = (startDate && endDate) ? `${formattedStart.replace(/\//g, '-')}_to_${formattedEnd.replace(/\//g, '-')}` : 'all_dates';

      let csv = '\uFEFF'; // UTF-8 BOM
      csv += `"รายงานการเคลื่อนไหวของสต๊อกอุปกรณ์การเกษตร - Flora Garden"\n`;
      csv += `"วันที่ออกรายงาน:","${new Date().toLocaleString('th-TH')}"\n`;
      csv += `"ช่วงเวลาข้อมูล:","${formattedStart || 'ทั้งหมด'} ถึง ${formattedEnd || 'ทั้งหมด'}"\n`;
      csv += `"จำนวนรายการเคลื่อนไหว:","${records.length}"\n\n`;

      csv += `"ลำดับ","วัน-เวลา","เลขที่เอกสาร/อ้างอิง","รหัสอุปกรณ์","ชื่ออุปกรณ์","หมวดหมู่","ประเภทการเคลื่อนไหว","จำนวน","หน่วยนับ","ผู้ทำรายการ/เบิก-ยืม","สถานที่/แปลงเกษตร","หมายเหตุ"\n`;

      records.forEach((r, index) => {
        const cleanName = (r.equipmentName || '').replace(/"/g, '""');
        const cleanCode = (r.equipmentCode || '').replace(/"/g, '""');
        const cleanCat = (r.category || '').replace(/"/g, '""');
        const cleanEmp = (r.employeeName || '').replace(/"/g, '""');
        const cleanLoc = (r.location || '').replace(/"/g, '""');
        const cleanNote = (r.note || '').replace(/"/g, '""');
        const cleanUnit = (r.unit || 'ชิ้น').replace(/"/g, '""');

        csv += `"${index + 1}","${r.timestamp}","${r.txId}","${cleanCode}","${cleanName}","${cleanCat}","${r.type}","${r.quantity}","${cleanUnit}","${cleanEmp}","${cleanLoc}","${cleanNote}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `flora_garden_stock_movement_report_${dateRangeStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (typeof showToast === 'function') showToast("📊 ส่งออกรายงานการเคลื่อนไหวสต๊อกเป็น CSV เรียบร้อยแล้ว!");
    };

    window.exportStockMovementToPDF = function() {
      const records = getFilteredStockMovementItems();
      if (!records || records.length === 0) {
        if (typeof showToast === 'function') showToast("⚠️ ไม่พบประวัติการเคลื่อนไหวสต๊อกที่จะส่งออก");
        return;
      }

      const startDate = document.getElementById('movementStartDate')?.value || '';
      const endDate = document.getElementById('movementEndDate')?.value || '';
      const formattedStart = formatDateDDMMYYYY(startDate);
      const formattedEnd = formatDateDDMMYYYY(endDate);
      const equipId = document.getElementById('movementEquipmentSelect')?.value || 'ALL';
      const moveType = document.getElementById('movementTypeSelect')?.value || 'ALL';

      let totalInbound = 0;
      let totalOutbound = 0;
      let totalReturned = 0;

      let rowsHtml = '';
      records.forEach((r, index) => {
        const qty = Number(r.quantity || 0);
        const type = r.type || '';

        if (type.includes('รับเข้า') || type.includes('เติมสต๊อก')) totalInbound += qty;
        else if (type === 'เบิกจ่าย' || type === 'ยืมอุปกรณ์') totalOutbound += qty;
        else if (type === 'คืนอุปกรณ์') totalReturned += qty;

        let typeStyle = "color: #333; font-weight: bold;";
        if (type === 'เบิกจ่าย') typeStyle = "color: #c62828; font-weight: bold;";
        else if (type === 'ยืมอุปกรณ์') typeStyle = "color: #e65100; font-weight: bold;";
        else if (type === 'คืนอุปกรณ์') typeStyle = "color: #0288d1; font-weight: bold;";
        else if (type.includes('รับเข้า') || type.includes('เติมสต๊อก')) typeStyle = "color: #2e7d32; font-weight: bold;";

        rowsHtml += `
          <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px;">${index + 1}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; font-size: 11px;">${r.timestamp}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; font-weight: bold; font-size: 11px;">#${r.txId}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">
              <strong>${r.equipmentName}</strong>
              ${r.equipmentCode ? `<br><small style="color:#666;">[${r.equipmentCode}]</small>` : ''}
            </td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; ${typeStyle}">${r.type}</td>
            <td style="text-align: center; border: 1px solid #ddd; padding: 6px; font-weight: bold;">${r.quantity} ${r.unit}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">${r.employeeName}</td>
            <td style="border: 1px solid #ddd; padding: 6px; font-size: 11px; color: #555;">
              ${r.location !== '-' ? `สถานที่: ${r.location}<br>` : ''}
              ${r.note !== '-' ? `หมายเหตุ: ${r.note}` : ''}
              ${(r.location === '-' && r.note === '-') ? '-' : ''}
            </td>
          </tr>
        `;
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("⚠️ เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตให้เปิด Pop-up");
        return;
      }

      const todayThai = new Date().toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const dateRangeDisplay = (startDate && endDate)
        ? `${formattedStart} ถึง ${formattedEnd}`
        : (startDate ? `ตั้งแต่ ${formattedStart}` : (endDate ? `ถึงวันที่ ${formattedEnd}` : 'ข้อมูลทั้งหมดล่าสุด'));

      const docHtml = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>รายงานการเคลื่อนไหวของสต๊อกอุปกรณ์ - Flora Garden</title>
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Prompt', sans-serif; padding: 25px; color: #333; line-height: 1.4; background: #fff; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #e65100; padding-bottom: 15px; margin-bottom: 20px; }
            .company-name { color: #2e7d32; font-size: 22px; font-weight: 700; margin: 0; }
            .report-title { font-size: 18px; font-weight: 600; color: #e65100; margin-top: 4px; }
            .meta-info { font-size: 13px; color: #555; text-align: right; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; }
            .card-box { flex: 1; background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 12px; text-align: center; }
            .card-title { font-size: 12px; color: #f57f17; font-weight: 600; }
            .card-value { font-size: 18px; font-weight: 700; color: #bf360c; margin: 4px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background-color: #f57c00; color: #ffffff; border: 1px solid #e65100; padding: 8px; text-align: left; }
            .footer-summary { margin-top: 20px; padding: 12px; background: #fff3e0; border-radius: 6px; font-weight: 600; display: flex; justify-content: space-between; font-size: 13px; color: #e65100; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
            .sign-box { width: 40%; }
            .sign-line { border-bottom: 1px dashed #666; margin-top: 40px; margin-bottom: 8px; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #e65100; color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; font-family: 'Prompt', sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
              🖨️ พิมพ์เอกสาร / บันทึกเป็น PDF
            </button>
          </div>

          <div class="header-container">
            <div>
              <h1 class="company-name">🌿 บริษัท โฟลร่า การ์เด้น จำกัด (Flora Garden)</h1>
              <div class="report-title">รายงานประวัติการเคลื่อนไหวของสต๊อกอุปกรณ์ (Stock Movement Ledger)</div>
            </div>
            <div class="meta-info">
              <div><strong>วันที่ออกรายงาน:</strong> ${todayThai}</div>
              <div><strong>ช่วงวันที่กำหนด:</strong> ${dateRangeDisplay}</div>
              <div><strong>ประเภทเคลื่อนไหว:</strong> ${moveType === 'ALL' ? 'ทุกประเภท' : moveType}</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card-box" style="background: #e3f2fd; border-color: #90caf9;">
              <div class="card-title" style="color: #1565c0;">ทำรายการเคลื่อนไหวรวม</div>
              <div class="card-value" style="color: #0d47a1;">${records.length} รายการ</div>
            </div>
            <div class="card-box" style="background: #e8f5e9; border-color: #a5d6a7;">
              <div class="card-title" style="color: #2e7d32;">รับเข้าสต๊อกรวม</div>
              <div class="card-value" style="color: #1b5e20;">+${totalInbound.toLocaleString('th-TH')} ชิ้น</div>
            </div>
            <div class="card-box" style="background: #ffebee; border-color: #ef9a9a;">
              <div class="card-title" style="color: #c62828;">เบิกจ่าย/ยืม ออกไปรวม</div>
              <div class="card-value" style="color: #b71c1c;">-${totalOutbound.toLocaleString('th-TH')} ชิ้น</div>
            </div>
            <div class="card-box" style="background: #e0f7fa; border-color: #80deea;">
              <div class="card-title" style="color: #00838f;">ส่งคืนคลังรวม</div>
              <div class="card-value" style="color: #006064;">+${totalReturned.toLocaleString('th-TH')} ชิ้น</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th style="width: 110px; text-align: center;">วัน-เวลา</th>
                <th style="width: 90px; text-align: center;">เลขที่อ้างอิง</th>
                <th>ชื่อ / รหัสอุปกรณ์</th>
                <th style="width: 90px; text-align: center;">ประเภท</th>
                <th style="width: 75px; text-align: center;">จำนวน</th>
                <th>ผู้ทำรายการ / เบิก-ยืม</th>
                <th>สถานที่ / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-summary">
            <span>รวมรายการเคลื่อนไหว: ${records.length} รายการ</span>
            <span>รับเข้า: +${totalInbound.toLocaleString('th-TH')}</span>
            <span>เบิกจ่าย/ยืม: -${totalOutbound.toLocaleString('th-TH')}</span>
            <span>คืนอุปกรณ์: +${totalReturned.toLocaleString('th-TH')}</span>
          </div>

          <div class="signature-section">
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>( ...................................................... )</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">ผู้รายงาน / เจ้าหน้าที่คลังอุปกรณ์</div>
              <div style="font-size: 12px; color: #666;">วันที่ ........ / ........ / ................</div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>( ...................................................... )</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">ผู้อนุมัติ / ผู้จัดการฝ่ายปฏิบัติการ</div>
              <div style="font-size: 12px; color: #666;">วันที่ ........ / ........ / ................</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(docHtml);
      printWindow.document.close();
    };

    // ==========================================
    // INBOUND RESTOCK EQUIPMENT LOGIC (รับเข้าสต๊อกขาเข้า)
    // ==========================================
    window.openRestockInboundModal = function(equipId = null) {
      const select = document.getElementById('restockEquipSelect');
      const empSelect = document.getElementById('restockEmpSelect');
      if (!select) return;

      const equipSearchInput = document.getElementById('restockEquipSearchInput');
      if (equipSearchInput) equipSearchInput.value = '';

      const empSearchInput = document.getElementById('restockEmpSearchInput');
      if (empSearchInput) empSearchInput.value = '';

      select.innerHTML = '<option value="">-- กรุณาเลือกอุปกรณ์การเกษตร --</option>';
      equipmentList.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.code}] ${item.name} (คงเหลือปัจจุบัน: ${item.quantity} ${item.unit})`;
        if (equipId && equipId === item.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (empSelect) {
        empSelect.innerHTML = '<option value="">-- กรุณาเลือกผู้ตรวจรับ --</option>';
        employeeList.forEach(emp => {
          const opt = document.createElement('option');
          opt.value = emp.id;
          opt.textContent = `[${emp.id}] ${emp.name} - ${emp.department}`;
          empSelect.appendChild(opt);
        });
      }

      if (equipId) {
        select.value = equipId;
        updateRestockEquipPreviewInfo();
      } else {
        const previewBox = document.getElementById('restockEquipPreviewBox');
        if (previewBox) previewBox.classList.add('d-none');
      }

      document.getElementById('restockQtyInput').value = 10;
      document.getElementById('restockNoteInput').value = '';

      const modalElem = document.getElementById('restockInboundModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    window.filterRestockEquipDropdown = function(query) {
      const select = document.getElementById('restockEquipSelect');
      if (!select) return;
      const q = (query || '').toLowerCase().trim();
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกอุปกรณ์การเกษตร --</option>';

      const filtered = equipmentList.filter(item => {
        if (!q) return true;
        return (item.name && item.name.toLowerCase().includes(q)) ||
               (item.code && item.code.toLowerCase().includes(q)) ||
               (item.category && item.category.toLowerCase().includes(q)) ||
               (item.location && item.location.toLowerCase().includes(q));
      });

      filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.code}] ${item.name} (คงเหลือปัจจุบัน: ${item.quantity} ${item.unit})`;
        if (currentVal && currentVal === item.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q) {
        select.value = filtered[0].id;
        updateRestockEquipPreviewInfo();
      }
    };

    window.clearRestockEquipSearch = function() {
      const searchInput = document.getElementById('restockEquipSearchInput');
      if (searchInput) searchInput.value = '';
      filterRestockEquipDropdown('');
    };

    window.filterRestockEmpDropdown = function(query) {
      const select = document.getElementById('restockEmpSelect');
      if (!select) return;
      const q = (query || '').toLowerCase().trim();
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- กรุณาเลือกผู้ตรวจรับ --</option>';

      const filtered = employeeList.filter(emp => {
        if (!q) return true;
        return (emp.name && emp.name.toLowerCase().includes(q)) ||
               (emp.id && emp.id.toLowerCase().includes(q)) ||
               (emp.department && emp.department.toLowerCase().includes(q)) ||
               (emp.position && emp.position.toLowerCase().includes(q)) ||
               (emp.phone && emp.phone.includes(q));
      });

      filtered.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `[${emp.id}] ${emp.name} - ${emp.department}`;
        if (currentVal && currentVal === emp.id) opt.selected = true;
        select.appendChild(opt);
      });

      if (filtered.length === 1 && q) {
        select.value = filtered[0].id;
      }
    };

    window.clearRestockEmpSearch = function() {
      const searchInput = document.getElementById('restockEmpSearchInput');
      if (searchInput) searchInput.value = '';
      filterRestockEmpDropdown('');
    };

    window.updateRestockEquipPreviewInfo = function() {
      const equipId = document.getElementById('restockEquipSelect').value;
      const previewBox = document.getElementById('restockEquipPreviewBox');
      if (!equipId) {
        if (previewBox) previewBox.classList.add('d-none');
        return;
      }

      const item = equipmentList.find(x => x.id === equipId);
      if (!item) return;

      if (previewBox) previewBox.classList.remove('d-none');
      document.getElementById('restockEquipPreviewImg').src = item.imageUrl || DEFAULT_EQUIPMENT_IMAGE;
      document.getElementById('restockEquipCodeBadge').textContent = item.code;
      document.getElementById('restockEquipCatBadge').textContent = item.category;
      document.getElementById('restockEquipNameText').textContent = item.name;
      document.getElementById('restockEquipLocText').textContent = item.location || 'คลังกลาง';
      document.getElementById('restockEquipCurrentStock').textContent = `${item.quantity} ${item.unit}`;
      document.getElementById('restockUnitSpan').textContent = item.unit || 'ชิ้น';
    };

    window.handleRestockInboundSubmit = async function(e) {
      e.preventDefault();
      const equipId = document.getElementById('restockEquipSelect').value;
      const qty = parseInt(document.getElementById('restockQtyInput').value) || 0;
      const empId = document.getElementById('restockEmpSelect').value;
      const note = document.getElementById('restockNoteInput').value.trim();

      if (!equipId || qty <= 0 || !empId) {
        alert("กรุณาเลือกอุปกรณ์ ระบุจำนวนขาเข้า และเลือกพนักงานผู้ตรวจรับให้ถูกต้อง");
        return;
      }

      const item = equipmentList.find(x => x.id === equipId);
      const emp = employeeList.find(x => x.id === empId);

      if (!item || !emp) return;

      // Increment stock
      item.quantity += qty;
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          await setDoc(doc(db, "equipment", item.id), item, { merge: true });
        } catch(err){
          console.warn("Restock equipment firestore error:", err);
        }
      }

      // Log transaction
      const newTx = {
        id: 'tx-' + String(Date.now()).slice(-6),
        type: 'รับเข้าสต๊อก (ขาเข้า)',
        employeeId: emp.id,
        employeeName: `${emp.name} (${emp.department})`,
        equipmentId: item.id,
        equipmentName: `${item.name} [${item.code}]`,
        quantity: qty,
        unit: item.unit,
        location: item.location || 'คลังกลาง',
        note: note ? `รับเข้าขาเข้า: ${note}` : 'รับสินค้าเข้าสต๊อก/สั่งซื้อเพิ่ม',
        rawTimestamp: Date.now(),
        timestamp: new Date().toLocaleString('th-TH')
      };

      transactionHistory.unshift(newTx);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        addDoc(collection(db, "transactions"), newTx).catch(()=>{});
      }

      const modalElem = document.getElementById('restockInboundModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      showToast(`📥 บันทึกรับเข้าสต๊อก "${item.name}" จำนวน +${qty} ${item.unit} เรียบร้อยแล้ว (สต๊อกใหม่: ${item.quantity} ${item.unit})`);

      renderCatalogGrid();
      renderStaffTable();
      renderHistoryTable();
      updateStats();
    };

    window.openEquipQrModal = function(equipId) {
      const item = equipmentList.find(x => x.id === equipId);
      if (!item) return;

      activeModalEquipId = item.id;
      document.getElementById('qrEquipName').textContent = item.name;
      document.getElementById('qrEquipCode').textContent = `CODE: ${item.code}`;

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=EQUIPMENT:${item.code}`;
      document.getElementById('qrEquipImage').src = qrUrl;

      const modal = new bootstrap.Modal(document.getElementById('equipmentQrModal'));
      modal.show();
    };

    window.selectFromQrModal = function() {
      if (activeModalEquipId) {
        quickSelectTransaction(activeModalEquipId);
        const modalElem = document.getElementById('equipmentQrModal');
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();
      }
    };

    let currentPopupMenuEquipId = null;

    window.openEquipmentPopupMenu = function(equipId) {
      const isStaff = currentRole === 'STAFF' || currentRole === 'ADMIN' || currentRole === 'MANAGER';
      if (!isStaff) return;

      const item = equipmentList.find(x => x.id === equipId);
      if (!item) return;

      currentPopupMenuEquipId = item.id;

      const imgElem = document.getElementById('popupMenuEquipImage');
      if (imgElem) {
        imgElem.src = item.imageUrl || DEFAULT_EQUIPMENT_IMAGE;
        imgElem.onerror = function() { this.src = DEFAULT_EQUIPMENT_IMAGE; };
      }
      const codeElem = document.getElementById('popupMenuEquipCode');
      if (codeElem) codeElem.textContent = item.code || item.id;

      const nameElem = document.getElementById('popupMenuEquipName');
      if (nameElem) nameElem.textContent = item.name || 'ไม่มีชื่ออุปกรณ์';

      const catElem = document.getElementById('popupMenuEquipCat');
      if (catElem) catElem.innerHTML = `<i class="bi bi-tag-fill me-1"></i>${item.category || 'ทั่วไป'}`;

      const locElem = document.getElementById('popupMenuEquipLoc');
      if (locElem) locElem.innerHTML = `<i class="bi bi-geo-alt-fill me-1"></i>${item.location || 'คลังกลาง'}`;

      const editBtn = document.getElementById('popupMenuActionEdit');
      const deleteBtn = document.getElementById('popupMenuActionDelete');
      if (editBtn) editBtn.style.display = isStaff ? 'block' : 'none';
      if (deleteBtn) deleteBtn.style.display = isStaff ? 'block' : 'none';

      const modalElem = document.getElementById('equipmentPopupMenuModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
        modal.show();
      }
    };

    window.triggerEquipmentMenuAction = function(actionType) {
      const equipId = currentPopupMenuEquipId;
      const modalElem = document.getElementById('equipmentPopupMenuModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();
      }

      if (actionType === 'ADD_NEW') {
        setTimeout(() => {
          if (typeof resetAddModal === 'function') resetAddModal();
          const addModalElem = document.getElementById('addEquipmentModal');
          if (addModalElem) {
            const addModal = bootstrap.Modal.getOrCreateInstance(addModalElem);
            addModal.show();
          }
        }, 250);
        return;
      }

      if (!equipId) return;

      setTimeout(() => {
        if (actionType === 'HISTORY') {
          if (typeof openEquipmentTransactionHistoryModal === 'function') openEquipmentTransactionHistoryModal(equipId);
        } else if (actionType === 'BORROWERS') {
          if (typeof showEquipmentBorrowersModal === 'function') showEquipmentBorrowersModal(equipId);
        } else if (actionType === 'RESTOCK') {
          if (typeof openRestockInboundModal === 'function') openRestockInboundModal(equipId);
        } else if (actionType === 'QR') {
          if (typeof openEquipQrModal === 'function') openEquipQrModal(equipId);
        } else if (actionType === 'LABEL') {
          if (typeof openPrintLabelModal === 'function') openPrintLabelModal(equipId);
        } else if (actionType === 'EDIT') {
          if (typeof openEditModal === 'function') openEditModal(equipId);
        } else if (actionType === 'DELETE') {
          if (typeof deleteEquipment === 'function') deleteEquipment(equipId);
        }
      }, 250);
    };

    // ==========================================
    // EQUIPMENT TRANSACTION HISTORY MODAL LOGIC
    // ==========================================
    let currentEquipHistoryId = null;

    window.openEquipmentTransactionHistoryModal = function(equipId) {
      if (!equipId) return;
      const item = (equipmentList || []).find(x => x.id === equipId || x.code === equipId);
      if (!item) {
        if (typeof showToast === 'function') showToast("❌ ไม่พบข้อมูลอุปกรณ์ที่เลือก");
        return;
      }

      currentEquipHistoryId = item.id;

      const defaultImg = typeof DEFAULT_EQUIPMENT_IMAGE !== 'undefined' ? DEFAULT_EQUIPMENT_IMAGE : 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&auto=format&fit=crop&q=80';

      // Header Preview Elements
      const imgElem = document.getElementById('eqHistModalImg');
      if (imgElem) {
        imgElem.src = item.imageUrl || defaultImg;
        imgElem.onerror = function() { this.src = defaultImg; };
      }

      const nameElem = document.getElementById('eqHistModalName');
      if (nameElem) nameElem.textContent = item.name || 'ไม่มีชื่ออุปกรณ์';

      const codeElem = document.getElementById('eqHistModalCode');
      if (codeElem) codeElem.textContent = item.code || item.id;

      const catElem = document.getElementById('eqHistModalCat');
      if (catElem) catElem.textContent = item.category || 'ทั่วไป';

      const locElem = document.getElementById('eqHistModalLoc');
      if (locElem) locElem.textContent = item.location || 'คลังกลาง';

      const statusBadgeElem = document.getElementById('eqHistModalStatusBadge');
      if (statusBadgeElem) {
        const curQty = Number(item.quantity) || 0;
        const minQty = item.minQuantity !== undefined ? Number(item.minQuantity) : 3;
        if (curQty < minQty) {
          statusBadgeElem.innerHTML = `<span class="badge bg-danger text-white"><i class="bi bi-bell-fill me-1"></i>เตือน! สต๊อกต่ำกว่าขั้นต่ำ (${curQty}/${minQty})</span>`;
        } else if (curQty <= minQty + 2) {
          statusBadgeElem.innerHTML = `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle-fill me-1"></i>สต๊อกใกล้ขั้นต่ำ</span>`;
        } else {
          statusBadgeElem.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25"><i class="bi bi-check-circle-fill me-1"></i>พร้อมใช้งาน</span>`;
        }
      }

      const stockElem = document.getElementById('eqHistModalStock');
      if (stockElem) stockElem.textContent = `${item.quantity || 0} ${item.unit || 'ชิ้น'}`;

      const borrowedElem = document.getElementById('eqHistModalBorrowed');
      if (borrowedElem) borrowedElem.textContent = `${item.borrowedCount || 0} ${item.unit || 'ชิ้น'}`;

      // Borrowers shortcut button in footer
      const btnBorrowers = document.getElementById('btnEqHistOpenBorrowers');
      const badgeBorrowersCount = document.getElementById('btnEqHistBorrowersCount');
      if (btnBorrowers) {
        if ((item.borrowedCount || 0) > 0) {
          btnBorrowers.classList.remove('d-none');
          if (badgeBorrowersCount) badgeBorrowersCount.textContent = `${item.borrowedCount} ${item.unit || 'ชิ้น'}`;
        } else {
          btnBorrowers.classList.add('d-none');
        }
      }

      // Reset Search & Type Filter
      const searchInput = document.getElementById('eqHistSearchInput');
      if (searchInput) searchInput.value = '';

      const typeFilter = document.getElementById('eqHistTypeFilter');
      if (typeFilter) typeFilter.value = 'ALL';

      // Render Table
      renderEquipmentHistoryModalTable();

      // Show Modal
      const modalElem = document.getElementById('equipmentTransactionHistoryModal');
      if (modalElem) {
        const modalInst = bootstrap.Modal.getOrCreateInstance(modalElem);
        modalInst.show();
      }
    };

    window.openBorrowersFromHistModal = function() {
      const modalElem = document.getElementById('equipmentTransactionHistoryModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();
      }
      setTimeout(() => {
        if (currentEquipHistoryId && typeof showEquipmentBorrowersModal === 'function') {
          showEquipmentBorrowersModal(currentEquipHistoryId);
        }
      }, 250);
    };

    window.renderEquipmentHistoryModalTable = function() {
      if (!currentEquipHistoryId) return;
      const item = (equipmentList || []).find(x => x.id === currentEquipHistoryId);
      if (!item) return;

      const targetId = (item.id || '').toString().toLowerCase();
      const targetCode = (item.code || '').toString().toLowerCase();
      const targetName = (item.name || '').toString().toLowerCase();

      function isMatchingEquip(eqId, eqCode, eqName) {
        const idStr = (eqId || '').toString().toLowerCase();
        const codeStr = (eqCode || '').toString().toLowerCase();
        const nameStr = (eqName || '').toString().toLowerCase();
        
        return (targetId && idStr === targetId) ||
               (targetCode && codeStr === targetCode) ||
               (targetCode && idStr === targetCode) ||
               (targetName && nameStr.length > 0 && nameStr.includes(targetName));
      }

      // 1. Extract all transactions relating to this equipment
      const relatedTxs = [];
      let totalDisbursedQty = 0;
      let totalRestockedQty = 0;

      (transactionHistory || []).forEach(tx => {
        if (!tx) return;
        let matchedQty = 0;
        let matchedUnit = item.unit || 'ชิ้น';

        if (Array.isArray(tx.items) && tx.items.length > 0) {
          tx.items.forEach(it => {
            if (isMatchingEquip(it.equipmentId, it.equipmentCode, it.equipmentName)) {
              matchedQty += Number(it.quantity || 0);
              if (it.unit) matchedUnit = it.unit;
            }
          });
        } else {
          if (isMatchingEquip(tx.equipmentId, tx.equipmentCode, tx.equipmentName)) {
            matchedQty = Number(tx.quantity || 0);
            if (tx.unit) matchedUnit = tx.unit;
          }
        }

        if (matchedQty > 0 || isMatchingEquip(tx.equipmentId, tx.equipmentCode, tx.equipmentName)) {
          const effectiveQty = matchedQty > 0 ? matchedQty : (Number(tx.quantity) || 1);
          relatedTxs.push({
            ...tx,
            itemSpecificQty: effectiveQty,
            itemSpecificUnit: matchedUnit
          });

          const txType = tx.type || '';
          if (txType === 'เบิกจ่าย') {
            totalDisbursedQty += effectiveQty;
          } else if (txType === 'รับเข้าสต๊อก' || txType === 'เติมสต๊อก') {
            totalRestockedQty += effectiveQty;
          }
        }
      });

      // Update Header Stats
      const totalTxElem = document.getElementById('eqHistModalTotalTx');
      if (totalTxElem) totalTxElem.textContent = `${relatedTxs.length} รายการ`;

      const disbursedElem = document.getElementById('eqHistModalDisbursed');
      if (disbursedElem) disbursedElem.textContent = `${totalDisbursedQty} ${item.unit || 'ชิ้น'}`;

      const restockedElem = document.getElementById('eqHistModalRestocked');
      if (restockedElem) restockedElem.textContent = `${totalRestockedQty} ${item.unit || 'ชิ้น'}`;

      // 2. Sort strictly by latest date/time first (เรียงตามวันที่ล่าสุด)
      relatedTxs.sort((a, b) => {
        const tA = (a.rawTimestamp || (a.timestamp ? new Date(a.timestamp).getTime() : 0)) || 0;
        const tB = (b.rawTimestamp || (b.timestamp ? new Date(b.timestamp).getTime() : 0)) || 0;
        return tB - tA; // LATEST FIRST
      });

      // 3. Filter by search query & type filter
      const searchQuery = (document.getElementById('eqHistSearchInput')?.value || '').toLowerCase().trim();
      const selectedType = document.getElementById('eqHistTypeFilter')?.value || 'ALL';

      const filtered = relatedTxs.filter(tx => {
        const matchesType = selectedType === 'ALL' || (tx.type && tx.type.includes(selectedType));
        if (!matchesType) return false;

        if (!searchQuery) return true;

        const empName = String(tx.employeeName || '').toLowerCase();
        const empCode = String(tx.employeeCode || tx.employeeId || '').toLowerCase();
        const locStr = String(tx.location || '').toLowerCase();
        const noteStr = String(tx.note || '').toLowerCase();
        const timeStr = String(tx.timestamp || '').toLowerCase();
        const typeStr = String(tx.type || '').toLowerCase();
        const docNo = String(tx.docNo || tx.id || '').toLowerCase();

        return empName.includes(searchQuery) ||
               empCode.includes(searchQuery) ||
               locStr.includes(searchQuery) ||
               noteStr.includes(searchQuery) ||
               timeStr.includes(searchQuery) ||
               typeStr.includes(searchQuery) ||
               docNo.includes(searchQuery);
      });

      // 4. Render Table
      const tbody = document.getElementById('eqHistTableBody');
      const emptyState = document.getElementById('eqHistEmptyState');
      const countBadge = document.getElementById('eqHistCountBadge');

      if (countBadge) countBadge.textContent = `พบ ${filtered.length} รายการ`;

      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }

      if (emptyState) emptyState.classList.add('d-none');

      let html = '';
      filtered.forEach(tx => {
        // Type Badge
        let typeBadge = '';
        const t = tx.type || '';
        if (t === 'เบิกจ่าย') {
          typeBadge = `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1"><i class="bi bi-box-arrow-up-right me-1"></i>เบิกจ่าย</span>`;
        } else if (t === 'ยืมอุปกรณ์') {
          typeBadge = `<span class="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-50 px-2 py-1"><i class="bi bi-arrow-repeat me-1 text-warning"></i>ยืมอุปกรณ์</span>`;
        } else if (t === 'คืนอุปกรณ์') {
          typeBadge = `<span class="badge bg-info bg-opacity-15 text-info-emphasis border border-info border-opacity-25 px-2 py-1"><i class="bi bi-box-arrow-in-down-left me-1"></i>คืนอุปกรณ์</span>`;
        } else if (t === 'รับเข้าสต๊อก' || t === 'เติมสต๊อก') {
          typeBadge = `<span class="badge bg-success bg-opacity-15 text-success border border-success border-opacity-25 px-2 py-1"><i class="bi bi-plus-circle-fill me-1"></i>รับเข้าสต๊อก</span>`;
        } else {
          typeBadge = `<span class="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">${escapeHtml(t || '-')}</span>`;
        }

        // Employee Info
        const empObj = (employeeList || []).find(e => e.id === tx.employeeId || (e.name && tx.employeeName && tx.employeeName.includes(e.name)));
        const empAvatar = empObj?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
        const empName = empObj ? empObj.name : (tx.employeeName || 'พนักงาน');
        const empDept = empObj ? empObj.department : (tx.employeeDepartment || 'ทั่วไป');

        // Due Date / Status
        let dueOrStatus = '-';
        if (t === 'ยืมอุปกรณ์') {
          const dueText = tx.dueDateStr || (tx.dueDate ? (typeof formatDueDateForReceipt === 'function' ? formatDueDateForReceipt(tx) : tx.dueDate) : '3 วัน');
          dueOrStatus = `<span class="text-danger fw-semibold"><i class="bi bi-calendar-event me-1"></i>${dueText}</span>`;
        } else if (t === 'คืนอุปกรณ์') {
          dueOrStatus = `<span class="badge bg-success-subtle text-success"><i class="bi bi-check2-all me-1"></i>คืนแล้ว</span>`;
        } else if (t === 'รับเข้าสต๊อก' || t === 'เติมสต๊อก') {
          dueOrStatus = `<span class="badge bg-light text-muted border">เติมคลัง</span>`;
        } else if (t === 'เบิกจ่าย') {
          dueOrStatus = `<span class="badge bg-light text-muted border">ตัดสต๊อก</span>`;
        }

        const qtyDisplay = `<strong class="text-dark fs-7">${tx.itemSpecificQty || tx.quantity || 1}</strong> <span class="text-muted fs-9">${tx.itemSpecificUnit || tx.unit || 'ชิ้น'}</span>`;

        html += `
          <tr>
            <td class="ps-3 text-nowrap">
              <div class="fw-bold text-dark fs-8">${tx.timestamp || '-'}</div>
              <small class="text-muted font-monospace fs-9">#${tx.docNo || (tx.id ? tx.id.substring(0, 8) : '-')}</small>
            </td>
            <td>${typeBadge}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <img src="${empAvatar}" class="rounded-circle border shadow-2xs" style="width: 28px; height: 28px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'" />
                <div>
                  <div class="fw-semibold text-dark fs-8 text-truncate" style="max-width: 170px;">${escapeHtml(empName)}</div>
                  <span class="badge bg-light text-secondary border fs-9 py-0.5">${escapeHtml(empDept)}</span>
                </div>
              </div>
            </td>
            <td class="text-center text-nowrap">${qtyDisplay}</td>
            <td class="fs-8">${dueOrStatus}</td>
            <td class="fs-8 text-secondary text-truncate" style="max-width: 140px;" title="${escapeHtml(tx.location || item.location || 'คลังกลาง')}">
              <i class="bi bi-geo-alt-fill me-1 text-danger"></i>${escapeHtml(tx.location || item.location || 'คลังกลาง')}
            </td>
            <td class="fs-8 text-secondary" style="max-width: 180px;">
              ${tx.note ? escapeHtml(tx.note) : '<span class="text-muted">-</span>'}
            </td>
            <td class="text-center pe-3">
              ${tx.id ? `
                <button type="button" class="btn btn-xs btn-outline-primary rounded-pill px-2 py-0.5 shadow-2xs" onclick="openPrintTransactionVoucherModal('${tx.id}')" title="ดู/พิมพ์เอกสารรายการ">
                  <i class="bi bi-file-earmark-text"></i>
                </button>
              ` : '<span class="text-muted">-</span>'}
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    };

    // ==========================================
    // EQUIPMENT BORROWERS MODAL LOGIC
    // ==========================================
    window.showEquipmentBorrowersModal = function(equipId) {
      const item = (equipmentList || []).find(x => x.id === equipId || x.code === equipId);
      if (!item) {
        showToast("❌ ไม่พบข้อมูลอุปกรณ์ที่เลือก");
        return;
      }

      const defaultImg = typeof DEFAULT_EQUIPMENT_IMAGE !== 'undefined' ? DEFAULT_EQUIPMENT_IMAGE : 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&auto=format&fit=crop&q=80';

      const imgElem = document.getElementById('eqBorrowersImg');
      if (imgElem) imgElem.src = item.imageUrl || defaultImg;

      const nameElem = document.getElementById('eqBorrowersName');
      if (nameElem) nameElem.textContent = item.name || 'ไม่มีชื่ออุปกรณ์';

      const codeElem = document.getElementById('eqBorrowersCode');
      if (codeElem) codeElem.textContent = item.code || item.id;

      const catElem = document.getElementById('eqBorrowersCat');
      if (catElem) catElem.textContent = item.category || 'ทั่วไป';

      const locElem = document.getElementById('eqBorrowersLoc');
      if (locElem) locElem.textContent = item.location || 'คลังกลาง';

      const stockElem = document.getElementById('eqBorrowersStock');
      if (stockElem) stockElem.textContent = `${item.quantity || 0} ${item.unit || 'ชิ้น'}`;

      const totalElem = document.getElementById('eqBorrowersTotal');
      if (totalElem) totalElem.textContent = `${item.borrowedCount || 0} ${item.unit || 'ชิ้น'}`;

      const targetId = (item.id || '').toString().toLowerCase();
      const targetCode = (item.code || '').toString().toLowerCase();
      const targetName = (item.name || '').toString().toLowerCase();

      function isMatchingEquip(eqId, eqCode, eqName) {
        const idStr = (eqId || '').toString().toLowerCase();
        const codeStr = (eqCode || '').toString().toLowerCase();
        const nameStr = (eqName || '').toString().toLowerCase();
        
        return (targetId && idStr === targetId) ||
               (targetCode && codeStr === targetCode) ||
               (targetCode && idStr === targetCode) ||
               (targetName && nameStr.length > 0 && nameStr.includes(targetName));
      }

      const itemTxs = [];
      const borrowerMap = {};

      const sortedTxs = [...(transactionHistory || [])].sort((a, b) => {
        const tA = (a.rawTimestamp || (a.timestamp ? new Date(a.timestamp).getTime() : 0));
        const tB = (b.rawTimestamp || (b.timestamp ? new Date(b.timestamp).getTime() : 0));
        return tA - tB;
      });

      sortedTxs.forEach(tx => {
        if (!tx) return;
        const type = tx.type || '';
        if (type !== 'ยืมอุปกรณ์' && type !== 'คืนอุปกรณ์') return;

        let qtyInTx = 0;
        if (Array.isArray(tx.items) && tx.items.length > 0) {
          tx.items.forEach(it => {
            if (isMatchingEquip(it.equipmentId, it.equipmentCode, it.equipmentName)) {
              qtyInTx += Number(it.quantity || 0);
            }
          });
        } else {
          if (isMatchingEquip(tx.equipmentId, tx.equipmentCode, tx.equipmentName)) {
            qtyInTx = Number(tx.quantity || 0);
          }
        }

        if (qtyInTx <= 0) return;

        itemTxs.unshift(tx);

        const empId = tx.employeeId || 'unknown';
        const empObj = (employeeList || []).find(e => e.id === empId || (e.name && tx.employeeName && tx.employeeName.includes(e.name)));
        const empName = empObj ? empObj.name : (tx.employeeName || 'พนักงานไม่ระบุชื่อ');
        const empDept = empObj ? empObj.department : (tx.employeeName && tx.employeeName.includes('(') ? tx.employeeName : 'ไม่ระบุแผนก');

        const key = empObj ? empObj.id : empName;

        if (!borrowerMap[key]) {
          borrowerMap[key] = {
            employeeId: empObj ? empObj.id : null,
            employeeName: empName,
            department: empDept,
            empObj: empObj,
            borrowedQty: 0,
            lastBorrowTime: tx.timestamp || '-',
            dueDateStr: tx.dueDateStr || (tx.dueDate ? (typeof formatDueDateForReceipt === 'function' ? formatDueDateForReceipt(tx) : null) : null),
            dueDate: tx.dueDate || null
          };
        }

        if (type === 'ยืมอุปกรณ์') {
          borrowerMap[key].borrowedQty += qtyInTx;
          borrowerMap[key].lastBorrowTime = tx.timestamp || borrowerMap[key].lastBorrowTime;
          if (tx.dueDateStr) borrowerMap[key].dueDateStr = tx.dueDateStr;
          else if (tx.dueDate && typeof formatDueDateForReceipt === 'function') borrowerMap[key].dueDateStr = formatDueDateForReceipt(tx);
          if (tx.dueDate) borrowerMap[key].dueDate = tx.dueDate;
        } else if (type === 'คืนอุปกรณ์') {
          borrowerMap[key].borrowedQty = Math.max(0, borrowerMap[key].borrowedQty - qtyInTx);
        }
      });

      const activeBorrowers = Object.values(borrowerMap).filter(b => b.borrowedQty > 0);

      const tbody = document.getElementById('eqBorrowersTableBody');
      const countBadge = document.getElementById('eqBorrowersCountBadge');

      if (countBadge) countBadge.textContent = `${activeBorrowers.length} พนักงาน`;

      if (tbody) {
        if (activeBorrowers.length === 0) {
          if ((item.borrowedCount || 0) > 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                  <i class="bi bi-info-circle text-warning fs-3 d-block mb-1"></i>
                  <div class="fw-bold text-dark">มียอดถูกยืมอยู่ในระบบ ${item.borrowedCount} ${item.unit || 'ชิ้น'}</div>
                  <small class="text-secondary">ยังไม่มีข้อมูลรายชื่อพนักงานยืมในประวัติล่าสุด หรือเป็นยอดจากการทำรายการก่อนการซิงค์ระบบ</small>
                </td>
              </tr>
            `;
          } else {
            tbody.innerHTML = `
              <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                  <i class="bi bi-check-circle text-success fs-3 d-block mb-1"></i>
                  <div class="fw-bold text-dark">ไม่มีพนักงานยืมอุปกรณ์ชิ้นนี้อยู่ขณะนี้</div>
                  <small class="text-secondary">อุปกรณ์ทั้งหมดพร้อมใช้งานอยู่ในคลังกลาง</small>
                </td>
              </tr>
            `;
          }
        } else {
          let html = '';
          activeBorrowers.forEach(b => {
            const empAvatar = b.empObj && b.empObj.photoUrl ? b.empObj.photoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
            
            let dueDateText = b.dueDateStr;
            if (!dueDateText && b.dueDate) {
              dueDateText = typeof formatDueDateForReceipt === 'function' ? formatDueDateForReceipt(b) : null;
            }
            if (!dueDateText) {
              dueDateText = 'ตามกำหนดมาตรฐาน (3 วัน)';
            }

            const now = Date.now();
            const isOverdue = b.dueDate ? (now > b.dueDate) : false;

            html += `
              <tr class="${isOverdue ? 'overdue-pulse-row' : ''}">
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <img src="${empAvatar}" class="rounded-circle border shadow-sm" style="width: 32px; height: 32px; object-fit: cover;" />
                    <div>
                      <div class="fw-bold text-dark">${b.employeeName}</div>
                      ${b.empObj && b.empObj.employeeCode ? `<span class="badge bg-dark font-monospace fs-8">${b.empObj.employeeCode}</span>` : ''}
                    </div>
                  </div>
                </td>
                <td><span class="badge bg-light text-dark border fs-8">${b.department}</span></td>
                <td class="text-center fw-bold text-warning fs-6">${b.borrowedQty} ${item.unit || 'ชิ้น'}</td>
                <td class="text-center fs-8 text-secondary">${b.lastBorrowTime}</td>
                <td class="text-center fs-8">
                  <div class="fw-bold ${isOverdue ? 'text-danger' : 'text-dark'}">${dueDateText}</div>
                  ${isOverdue ? '<span class="badge bg-danger text-white fs-8 mt-0.5 overdue-pulse-badge"><i class="bi bi-exclamation-triangle-fill me-1"></i>เกินกำหนดคืน</span>' : '<span class="badge bg-warning bg-opacity-25 text-dark border border-warning fs-8 mt-0.5"><i class="bi bi-calendar-check me-1"></i>กำหนดส่งคืน</span>'}
                </td>
                <td class="text-center">
                  <div class="d-flex align-items-center justify-content-center gap-1">
                    <button type="button" class="btn btn-xs btn-success rounded-pill px-2 py-1 fs-8 fw-bold shadow-sm d-inline-flex align-items-center gap-1" onclick="sendLineOverdueReminder('${b.employeeId || ''}', '${b.employeeName.replace(/'/g, "\\'")}', '${item.name.replace(/'/g, "\\'")}', '${item.code || ''}', ${b.borrowedQty}, '${item.unit || 'ชิ้น'}', ${isOverdue ? 1 : 0}, '${dueDateText}')" title="ส่งการแจ้งเตือนติดตามคืนทาง LINE">
                      <i class="bi bi-line"></i> LINE
                    </button>
                    ${b.employeeId ? `
                      <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-2 py-1 fs-8 fw-semibold" onclick="viewBorrowerEmpHistory('${b.employeeId}')">
                        <i class="bi bi-clock-history me-1"></i> ประวัติ
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        }
      }

      const histTbody = document.getElementById('eqBorrowersHistoryTableBody');
      if (histTbody) {
        if (itemTxs.length === 0) {
          histTbody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center py-3 text-muted fs-8">
                ไม่มีประวัติการทำรายการเบิก-ยืม-คืน สำหรับอุปกรณ์ชิ้นนี้
              </td>
            </tr>
          `;
        } else {
          let hHtml = '';
          itemTxs.slice(0, 30).forEach(tx => {
            let typeBadge = '';
            if (tx.type === 'ยืมอุปกรณ์') typeBadge = '<span class="badge bg-warning text-dark">🟡 ยืมอุปกรณ์</span>';
            else if (tx.type === 'คืนอุปกรณ์') typeBadge = '<span class="badge bg-info text-dark">🟢 คืนอุปกรณ์</span>';
            else typeBadge = `<span class="badge bg-secondary">${tx.type}</span>`;

            let qtyVal = tx.quantity || 0;
            if (Array.isArray(tx.items)) {
              const matchIt = tx.items.find(it => isMatchingEquip(it.equipmentId, it.equipmentCode, it.equipmentName));
              if (matchIt) qtyVal = matchIt.quantity;
            }

            hHtml += `
              <tr>
                <td class="text-nowrap text-secondary">${tx.timestamp || '-'}</td>
                <td>${typeBadge}</td>
                <td class="fw-semibold text-dark">${tx.employeeName || '-'}</td>
                <td class="text-center fw-bold text-dark">${qtyVal} ${item.unit || 'ชิ้น'}</td>
                <td class="text-muted text-truncate" style="max-width: 150px;" title="${tx.note || ''}">${tx.note || '-'}</td>
              </tr>
            `;
          });
          histTbody.innerHTML = hHtml;
        }
      }

      const modalElem = document.getElementById('equipmentBorrowersModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
        modal.show();
      }
    };

    window.viewBorrowerEmpHistory = function(empId) {
      const modalElem = document.getElementById('equipmentBorrowersModal');
      if (modalElem) {
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();
      }
      setTimeout(() => {
        if (typeof openEmployeeBorrowHistoryModal === 'function') {
          openEmployeeBorrowHistoryModal(empId);
        }
      }, 250);
    };

    // ==========================================
    // OVERDUE BORROWINGS SYSTEM LOGIC
    // ==========================================
    window.currentOverdueThresholdDays = 3;

    window.initThaiFlatpickr = function() {
      const elem = document.getElementById('transDueDate');
      if (!elem || typeof flatpickr === 'undefined') return;

      if (window.transDueDatePicker) return;

      const thLocale = (flatpickr.l10ns && flatpickr.l10ns.th) ? flatpickr.l10ns.th : {
        weekdays: {
          shorthand: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
          longhand: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
        },
        months: {
          shorthand: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
          longhand: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
        },
        firstDayOfWeek: 1,
        time_24hr: true
      };

      window.transDueDatePicker = flatpickr(elem, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'Y-m-d H:i',
        altInput: true,
        altInputClass: 'form-control fw-bold border-warning bg-white cursor-pointer fs-7',
        altFormat: 'd/m/Y H:i',
        locale: thLocale,
        onReady: function(selectedDates, dateStr, instance) {
          applyThaiBuddhistYear(instance);
        },
        onValueUpdate: function(selectedDates, dateStr, instance) {
          applyThaiBuddhistYear(instance);
        },
        onMonthChange: function(selectedDates, dateStr, instance) {
          applyThaiBuddhistYear(instance);
        },
        onYearChange: function(selectedDates, dateStr, instance) {
          applyThaiBuddhistYear(instance);
        },
        onOpen: function(selectedDates, dateStr, instance) {
          applyThaiBuddhistYear(instance);
        }
      });
    };

    function applyThaiBuddhistYear(instance) {
      if (!instance) return;

      if (instance.altInput && instance.selectedDates.length > 0) {
        const d = instance.selectedDates[0];
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const yearBE = d.getFullYear() + 543;
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');

        instance.altInput.value = `${day}/${month}/${yearBE} เวลา ${hours}:${mins} น.`;
      }

      if (instance.calendarContainer) {
        const yearInputs = instance.calendarContainer.querySelectorAll('.cur-year');
        yearInputs.forEach(yInput => {
          const val = parseInt(yInput.value || yInput.getAttribute('value') || '0', 10);
          if (val && val < 2400) {
            yInput.value = val + 543;
          }
        });
      }
    }

    window.setQuickDueDate = function(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(17, 0, 0, 0); // Default to 17:00
      
      if (!window.transDueDatePicker) {
        initThaiFlatpickr();
      }

      if (window.transDueDatePicker) {
        window.transDueDatePicker.setDate(d, true);
      } else {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const input = document.getElementById('transDueDate');
        if (input) input.value = `${year}-${month}-${day} ${hours}:${minutes}`;
      }
    };

    window.toggleTransTypeUI = function() {
      const selectedType = document.querySelector('input[name="transType"]:checked')?.value;
      const box = document.getElementById('borrowDueDateBox');
      if (box) {
        if (selectedType === 'ยืมอุปกรณ์') {
          box.classList.remove('d-none');
          initThaiFlatpickr();
          if (!window.transDueDatePicker || window.transDueDatePicker.selectedDates.length === 0) {
            setQuickDueDate(3);
          }
        } else {
          box.classList.add('d-none');
        }
      }

      const submitBtn = document.getElementById('btnSubmitTransaction');
      if (submitBtn) {
        if (selectedType === 'ยืมอุปกรณ์') {
          submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> บันทึก ยืมอุปกรณ์';
        } else if (selectedType === 'คืนอุปกรณ์') {
          submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> บันทึก คืนอุปกรณ์';
        } else {
          submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> บันทึก ตัดสต๊อก';
        }
      }

      if (typeof renderTransCartList === 'function') {
        renderTransCartList();
      }
    };

    window.calculateOverdueBorrowings = function(daysThreshold = 3) {
      if (!Array.isArray(transactionHistory) || transactionHistory.length === 0) {
        return [];
      }

      const sortedTxs = [...transactionHistory].sort((a, b) => {
        const tA = (a.rawTimestamp || (a.timestamp ? new Date(a.timestamp).getTime() : 0));
        const tB = (b.rawTimestamp || (b.timestamp ? new Date(b.timestamp).getTime() : 0));
        return tA - tB;
      });

      const activeBatches = [];

      sortedTxs.forEach(tx => {
        if (!tx) return;
        const type = tx.type || '';
        if (type !== 'ยืมอุปกรณ์' && type !== 'คืนอุปกรณ์') return;

        const txTime = tx.rawTimestamp || (tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now());
        const empId = tx.employeeId || tx.employeeName || 'unknown';
        const empName = tx.employeeName || 'ไม่ระบุชื่อ';

        let itemsInTx = [];
        if (Array.isArray(tx.items) && tx.items.length > 0) {
          itemsInTx = tx.items;
        } else if (tx.equipmentId || tx.equipmentName) {
          itemsInTx = [{
            equipmentId: tx.equipmentId,
            equipmentCode: tx.equipmentCode,
            equipmentName: tx.equipmentName,
            quantity: Number(tx.quantity || 0)
          }];
        }

        itemsInTx.forEach(it => {
          const qty = Number(it.quantity || 0);
          if (qty <= 0) return;

          if (type === 'ยืมอุปกรณ์') {
            activeBatches.push({
              txId: tx.id,
              borrowTime: txTime,
              timestampStr: tx.timestamp || new Date(txTime).toLocaleString('th-TH'),
              dueDate: tx.dueDate || null,
              dueDateStr: tx.dueDateStr || null,
              employeeId: tx.employeeId,
              employeeName: empName,
              equipmentId: it.equipmentId,
              equipmentCode: it.equipmentCode,
              equipmentName: it.equipmentName,
              borrowedQty: qty,
              remainingQty: qty,
              note: tx.note || ''
            });
          } else if (type === 'คืนอุปกรณ์') {
            let returnRemaining = qty;
            for (let i = 0; i < activeBatches.length && returnRemaining > 0; i++) {
              const batch = activeBatches[i];
              if (batch.remainingQty <= 0) continue;

              const sameEmp = (batch.employeeId && tx.employeeId && batch.employeeId === tx.employeeId) ||
                              (batch.employeeName && empName && batch.employeeName === empName);

              const sameEq = (batch.equipmentId && it.equipmentId && batch.equipmentId === it.equipmentId) ||
                             (batch.equipmentCode && it.equipmentCode && batch.equipmentCode === it.equipmentCode) ||
                             (batch.equipmentName && it.equipmentName && batch.equipmentName === it.equipmentName);

              if (sameEmp && sameEq) {
                const deduct = Math.min(batch.remainingQty, returnRemaining);
                batch.remainingQty -= deduct;
                returnRemaining -= deduct;
              }
            }
          }
        });
      });

      const now = Date.now();
      const msPerDay = 1000 * 60 * 60 * 24;

      const overdueList = [];
      activeBatches.forEach(batch => {
        if (batch.remainingQty > 0) {
          const diffMs = now - batch.borrowTime;
          const daysElapsed = Math.floor(diffMs / msPerDay);

          let isOverdue = false;
          let daysOverdue = 0;

          if (batch.dueDate) {
            if (now > batch.dueDate) {
              isOverdue = true;
              daysOverdue = Math.max(1, Math.floor((now - batch.dueDate) / msPerDay));
            }
          } else {
            if (daysElapsed >= daysThreshold) {
              isOverdue = true;
              daysOverdue = Math.max(0, daysElapsed - daysThreshold);
            }
          }

          if (isOverdue) {
            const eqObj = (equipmentList || []).find(e => e.id === batch.equipmentId || e.code === batch.equipmentCode || e.name === batch.equipmentName);
            const empObj = (employeeList || []).find(e => e.id === batch.employeeId || (e.name && batch.employeeName && batch.employeeName.includes(e.name)));

            overdueList.push({
              ...batch,
              daysElapsed,
              daysOverdue,
              equipmentObj: eqObj,
              employeeObj: empObj,
              unit: eqObj ? eqObj.unit : 'ชิ้น',
              location: eqObj ? eqObj.location : 'คลังกลาง',
              department: empObj ? empObj.department : (batch.employeeName && batch.employeeName.includes('(') ? batch.employeeName : 'ไม่ระบุแผนก')
            });
          }
        }
      });

      return overdueList;
    };

    window.setOverdueDaysThreshold = function(days, btnElem) {
      window.currentOverdueThresholdDays = days;
      const btns = document.querySelectorAll('.overdue-thresh-btn');
      btns.forEach(b => {
        b.classList.remove('btn-danger', 'text-white', 'active');
        b.classList.add('btn-light', 'text-dark');
      });
      if (btnElem) {
        btnElem.classList.remove('btn-light', 'text-dark');
        btnElem.classList.add('btn-danger', 'text-white', 'active');
      }
      renderOverdueTable();
      if (typeof updateStats === 'function') updateStats();
    };

    window.showOverdueBorrowingsModal = function() {
      renderOverdueTable();
      const modalElem = document.getElementById('overdueBorrowingsModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
        modal.show();
      }
    };

    window.renderOverdueTable = function() {
      const thresh = window.currentOverdueThresholdDays !== undefined ? window.currentOverdueThresholdDays : 3;
      const list = calculateOverdueBorrowings(thresh);

      const searchVal = (document.getElementById('overdueSearchInput')?.value || '').toLowerCase().trim();
      const filtered = list.filter(item => {
        if (!searchVal) return true;
        const emp = (item.employeeName || '').toLowerCase();
        const eq = (item.equipmentName || '').toLowerCase();
        const code = (item.equipmentCode || '').toLowerCase();
        const dept = (item.department || '').toLowerCase();
        return emp.includes(searchVal) || eq.includes(searchVal) || code.includes(searchVal) || dept.includes(searchVal);
      });

      const totalItemsElem = document.getElementById('overdueModalTotalItems');
      const totalEmpsElem = document.getElementById('overdueModalTotalEmps');
      const totalQtyElem = document.getElementById('overdueModalTotalQty');

      const uniqueEmps = new Set(filtered.map(x => x.employeeId || x.employeeName));
      let sumQty = 0;
      filtered.forEach(x => sumQty += x.remainingQty);

      if (totalItemsElem) totalItemsElem.innerHTML = `${filtered.length} <span class="fs-7 text-muted font-normal">รายการ</span>`;
      if (totalEmpsElem) totalEmpsElem.innerHTML = `${uniqueEmps.size} <span class="fs-7 text-muted font-normal">คน</span>`;
      if (totalQtyElem) totalQtyElem.innerHTML = `${sumQty} <span class="fs-7 text-muted font-normal">ชิ้น</span>`;

      const tbody = document.getElementById('overdueTableBody');
      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-5 text-muted">
              <i class="bi bi-check-circle-fill text-success fs-1 d-block mb-2"></i>
              <div class="fw-bold text-dark fs-6">ไม่มีรายการยืมอุปกรณ์เกินกำหนด${thresh > 0 ? ` (${thresh} วัน)` : ''}</div>
              <small class="text-secondary">พนักงานทุกคนส่งคืนอุปกรณ์ตรงเวลา หรือยังไม่ถึงเกณฑ์ระยะเวลาที่เลือก</small>
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      filtered.forEach(it => {
        const empAvatar = it.employeeObj && it.employeeObj.photoUrl ? it.employeeObj.photoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
        const eqImg = it.equipmentObj && it.equipmentObj.imageUrl ? it.equipmentObj.imageUrl : 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&auto=format&fit=crop&q=80';

        let overdueBadge = '';
        if (thresh === 0) {
          overdueBadge = `<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>ยืมมาแล้ว ${it.daysElapsed} วัน</span>`;
        } else if (it.daysOverdue === 0) {
          overdueBadge = `<span class="badge bg-warning text-dark overdue-pulse-badge"><i class="bi bi-clock me-1"></i>ถึงกำหนดคืนวันนี้ (ยืม ${it.daysElapsed} วัน)</span>`;
        } else {
          overdueBadge = `<span class="badge bg-danger text-white overdue-pulse-badge"><i class="bi bi-exclamation-triangle-fill me-1"></i>เกินกำหนด ${it.daysOverdue} วัน (ยืมรวม ${it.daysElapsed} วัน)</span>`;
        }

        html += `
          <tr class="${it.daysOverdue > 0 ? 'overdue-pulse-row' : ''}">
            <td class="ps-3">
              <div class="d-flex align-items-center gap-2">
                <img src="${empAvatar}" class="rounded-circle border shadow-sm" style="width: 36px; height: 36px; object-fit: cover;" />
                <div>
                  <div class="fw-bold text-dark">${it.employeeName}</div>
                  ${it.employeeObj && it.employeeObj.employeeCode ? `<span class="badge bg-dark font-monospace fs-8">${it.employeeObj.employeeCode}</span>` : ''}
                </div>
              </div>
            </td>
            <td><span class="badge bg-light text-dark border fs-8">${it.department}</span></td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <img src="${eqImg}" class="rounded-3 border" style="width: 32px; height: 32px; object-fit: cover;" />
                <div>
                  <div class="fw-semibold text-dark fs-8">${it.equipmentName}</div>
                  <span class="badge bg-secondary font-monospace fs-8" style="font-size: 9px;">${it.equipmentCode || 'EQ'}</span>
                </div>
              </div>
            </td>
            <td class="text-center text-nowrap fs-8 text-secondary">
              <div>${it.timestampStr}</div>
              ${it.dueDateStr ? `<div class="fw-bold text-danger mt-0.5" style="font-size: 10px;"><i class="bi bi-calendar-check me-1"></i>กำหนดคืน: ${it.dueDateStr}</div>` : ''}
            </td>
            <td class="text-center">${overdueBadge}</td>
            <td class="text-center fw-bold text-danger fs-6">${it.remainingQty} ${it.unit}</td>
            <td class="text-center pe-3 text-nowrap">
              <div class="d-flex align-items-center justify-content-center gap-1">
                <button type="button" class="btn btn-xs btn-success rounded-pill px-2.5 py-1 fs-8 fw-bold shadow-sm d-inline-flex align-items-center gap-1" onclick="sendLineOverdueReminder('${it.employeeId || ''}', '${it.employeeName.replace(/'/g, "\\'")}', '${it.equipmentName.replace(/'/g, "\\'")}', '${it.equipmentCode || ''}', ${it.remainingQty}, '${it.unit || 'ชิ้น'}', ${it.daysOverdue || 0}, '${it.dueDateStr || ''}')" title="ส่งการแจ้งเตือนติดตามคืนอุปกรณ์เกินกำหนดทาง LINE">
                  <i class="bi bi-line fs-7"></i> LINE
                </button>
                <button type="button" class="btn btn-xs btn-outline-warning rounded-pill px-2 py-1 fs-8 fw-semibold" onclick="sendOverdueReminder('${it.employeeId || ''}', '${it.employeeName.replace(/'/g, "\\'")}', '${it.equipmentName.replace(/'/g, "\\'")}')" title="ส่งการแจ้งเตือนติดตามคืนอุปกรณ์">
                  <i class="bi bi-bell-fill text-warning me-1"></i> แจ้งเตือน
                </button>
                <button type="button" class="btn btn-xs btn-primary rounded-pill px-2.5 py-1 fs-8 fw-bold" onclick="quickReturnOverdueTransaction('${it.employeeId || ''}', '${it.equipmentId || ''}', ${it.remainingQty})" title="ทำรายการคืนอุปกรณ์ชิ้นนี้ทันที">
                  <i class="bi bi-box-arrow-in-down me-1"></i> คืนด่วน
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    };

    window.sendOverdueReminder = function(empId, empName, equipName) {
      showToast(`🔔 ส่งการแจ้งเตือนเตือนความจำติดตามคืน "${equipName}" ถึงคุณ ${empName} เรียบร้อยแล้ว!`);
      if (typeof addSystemLog === 'function') {
        addSystemLog('OVERDUE_REMINDER', `ส่งการแจ้งเตือนเตือนความจำติดตามคืนอุปกรณ์ ${equipName} ถึงพนักงาน ${empName}`);
      }
    };

    window.sendLineOverdueReminder = function(empId, empName, equipName, equipCode, qty, unit, daysOverdue, dueDateStr) {
      const empObj = (employeeList || []).find(e => e.id === empId || e.name === empName);
      const dept = empObj ? (empObj.department || 'ไม่ระบุแผนก') : 'ไม่ระบุแผนก';
      const phone = empObj ? (empObj.phone || '-') : '-';

      let msg = `📲 [แจ้งเตือนยืมอุปกรณ์เกินกำหนดคืนทาง LINE]\n`;
      msg += `เรียน: คุณ${empName} (${dept})\n`;
      msg += `----------------------------------------\n`;
      msg += `📦 อุปกรณ์: ${equipName}${equipCode ? ' [' + equipCode + ']' : ''}\n`;
      msg += `🔢 จำนวนค้างคืน: ${qty} ${unit || 'ชิ้น'}\n`;
      if (daysOverdue > 0) {
        msg += `⏳ สถานะ: เกินกำหนดคืนแล้ว ${daysOverdue} วัน\n`;
      } else {
        msg += `⏳ สถานะ: ถึงกำหนดส่งคืนวันนี้\n`;
      }
      if (dueDateStr) {
        msg += `📅 กำหนดส่งคืน: ${dueDateStr}\n`;
      }
      if (phone && phone !== '-') {
        msg += `📞 เบอร์โทรศัพท์: ${phone}\n`;
      }
      msg += `----------------------------------------\n`;
      msg += `📌 โปรดนำอุปกรณ์ดังกล่าวมาส่งคืน ณ คลังกลาง โฟลร่า การ์เด้น โดยเร็วที่สุด ขอบคุณครับ 🙏`;

      const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;

      navigator.clipboard.writeText(msg).then(() => {
        showToast(`💚 คัดลอกข้อความแจ้งเตือน LINE สำหรับคุณ ${empName} เรียบร้อยแล้ว! กำลังเปิด LINE...`);
      }).catch(() => {
        showToast(`💚 กำลังส่งแจ้งเตือนทาง LINE ถึงคุณ ${empName}...`);
      });

      if (typeof addSystemLog === 'function') {
        addSystemLog('LINE_NOTIFY_OVERDUE', `ส่งการแจ้งเตือน LINE เกินกำหนด (${equipName}) ถึง ${empName}`);
      }

      setTimeout(() => {
        window.open(lineShareUrl, '_blank');
      }, 300);
    };

    window.sendAllOverdueLineNotify = function() {
      const thresh = window.currentOverdueThresholdDays !== undefined ? window.currentOverdueThresholdDays : 3;
      const list = calculateOverdueBorrowings(thresh);

      if (!list || list.length === 0) {
        showToast("ℹ️ ไม่พบรายการอุปกรณ์ยืมเกินกำหนดสำหรับส่งแจ้งเตือน LINE");
        return;
      }

      const todayThai = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeThai = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

      let msg = `📲 [แจ้งเตือนรายการยืมอุปกรณ์เกินกำหนดคืนทาง LINE]\n`;
      msg += `🌿 บริษัท โฟลร่า การ์เด้น จำกัด\n`;
      msg += `📅 ข้อมูล ณ วันที่ ${todayThai} เวลา ${timeThai} น.\n`;
      msg += `----------------------------------------\n`;

      const groupedByEmp = {};
      list.forEach(item => {
        const name = item.employeeName;
        if (!groupedByEmp[name]) groupedByEmp[name] = [];
        groupedByEmp[name].push(item);
      });

      let idx = 1;
      for (const [empName, items] of Object.entries(groupedByEmp)) {
        const dept = items[0].department || 'ไม่ระบุแผนก';
        msg += `${idx}. คุณ ${empName} (${dept})\n`;
        items.forEach(it => {
          msg += `   - ${it.equipmentName} [${it.equipmentCode || 'EQ'}] จำนวน ${it.remainingQty} ${it.unit || 'ชิ้น'}`;
          if (it.daysOverdue > 0) {
            msg += ` (เกิน ${it.daysOverdue} วัน)\n`;
          } else {
            msg += ` (ยืม ${it.daysElapsed} วัน)\n`;
          }
        });
        idx++;
      }

      msg += `----------------------------------------\n`;
      msg += `📌 โปรดนำอุปกรณ์ทั้งหมดกลับส่งคืน ณ คลังกลาง หรือติดต่อเจ้าหน้าที่คลัง ขอบคุณครับ 🙏`;

      const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;

      navigator.clipboard.writeText(msg).then(() => {
        showToast(`💚 คัดลอกข้อความสรุป LINE ${list.length} รายการ เรียบร้อยแล้ว! กำลังเปิด LINE...`);
      }).catch(() => {
        showToast(`💚 กำลังเปิด LINE เพื่อส่งข้อความแจ้งเตือนทั้งหมด ${list.length} รายการ...`);
      });

      if (typeof addSystemLog === 'function') {
        addSystemLog('LINE_NOTIFY_OVERDUE_ALL', `ส่งการแจ้งเตือน LINE สรุปอุปกรณ์เกินกำหนด ${list.length} รายการ`);
      }

      setTimeout(() => {
        window.open(lineShareUrl, '_blank');
      }, 300);
    };

    window.quickReturnOverdueTransaction = function(empId, equipId, qty) {
      const modalElem = document.getElementById('overdueBorrowingsModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getInstance(modalElem);
        if (modal) modal.hide();
      }

      setTimeout(() => {
        const tabBtn = document.getElementById('transaction-tab');
        if (tabBtn) {
          const bsTab = new bootstrap.Tab(tabBtn);
          bsTab.show();
        }

        const typeReturnRadio = document.getElementById('typeReturn');
        if (typeReturnRadio) {
          typeReturnRadio.checked = true;
          if (typeof toggleTransTypeUI === 'function') toggleTransTypeUI();
        }

        const empSelect = document.getElementById('transEmployeeSelect');
        if (empSelect && empId) {
          empSelect.value = empId;
        }

        if (equipId && typeof quickSelectTransaction === 'function') {
          quickSelectTransaction(equipId);
        }

        const qtyInput = document.getElementById('transQty');
        if (qtyInput && qty > 0) {
          qtyInput.value = qty;
        }

        const noteInput = document.getElementById('transNote');
        if (noteInput) {
          noteInput.value = `คืนอุปกรณ์ยืมเกินกำหนด (ติดตามผ่านระบบแจ้งเตือน)`;
        }

        showToast(`↩️ เตรียมข้อมูลคืนอุปกรณ์ "${qty} ชิ้น" เรียบร้อยแล้ว กรุณาตรวจสอบและกดบันทึกรายการ`);
      }, 300);
    };

    window.copyOverdueNotificationText = function() {
      const thresh = window.currentOverdueThresholdDays !== undefined ? window.currentOverdueThresholdDays : 3;
      const list = calculateOverdueBorrowings(thresh);

      if (list.length === 0) {
        showToast("ℹ️ ไม่พบรายการอุปกรณ์ยืมเกินกำหนดสำหรับคัดลอก");
        return;
      }

      let text = `📢 **แจ้งเตือนรายการยืมอุปกรณ์การเกษตรเกินกำหนดคืน**\n`;
      text += `📅 ข้อมูล ณ วันที่ ${new Date().toLocaleDateString('th-TH')} เวลา ${new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} น.\n`;
      text += `----------------------------------------\n`;

      const groupedByEmp = {};
      list.forEach(item => {
        const name = item.employeeName;
        if (!groupedByEmp[name]) groupedByEmp[name] = [];
        groupedByEmp[name].push(item);
      });

      let idx = 1;
      for (const [empName, items] of Object.entries(groupedByEmp)) {
        const dept = items[0].department || '';
        text += `${idx}. **คุณ ${empName}** (${dept})\n`;
        items.forEach(it => {
          text += `   - ${it.equipmentName} [${it.equipmentCode || 'EQ'}] จำนวน ${it.remainingQty} ${it.unit} (ยืมมาแล้ว ${it.daysElapsed} วัน)\n`;
        });
        idx++;
      }

      text += `----------------------------------------\n`;
      text += `📌 โปรดนำอุปกรณ์ดังกล่าวกลับส่งคืน ณ คลังกลาง หรือติดต่อเจ้าหน้าที่คลังอุปกรณ์ ขอบคุณครับ`;

      navigator.clipboard.writeText(text).then(() => {
        showToast("📋 คัดลอกข้อความติดตามคืนอุปกรณ์ลง Clipboard เรียบร้อยแล้ว สามารถวางส่งใน LINE / ข้อความ ได้ทันที!");
      }).catch(err => {
        showToast("❌ ไม่สามารถคัดลอกข้อความได้");
      });
    };

    window.handleQuickQrScanConfirm = function() {
      const equipId = document.getElementById('quickScanSelect').value;
      if (!equipId) {
        alert("กรุณาเลือกอุปกรณ์การเกษตรที่ต้องการสแกน");
        return;
      }

      quickSelectTransaction(equipId);
      const modalElem = document.getElementById('qrScanModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();
      showToast("สแกน QR Code ด่วนสำเร็จ! ระบบเลือกอุปกรณ์ให้อัตโนมัติในฟอร์ม");
    };

    // ==========================================
    // AUDIO & SCANNER ENGINE LOGIC
    // ==========================================
    function playScanBeep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch (e) {}
    }

    let html5QrScannerInstance = null;
    let isScannerActive = false;
    let activeScannedItemId = null;
    let activeScannedUnknownCode = null;

    window.openBarcodeQrScannerModal = function() {
      const promptState = document.getElementById('scannedItemPromptState');
      const resultCard = document.getElementById('scannedItemResultCard');
      const notFoundCard = document.getElementById('scannedItemNotFoundCard');
      if (promptState) promptState.classList.remove('d-none');
      if (resultCard) resultCard.classList.add('d-none');
      if (notFoundCard) notFoundCard.classList.add('d-none');

      const modalElem = document.getElementById('barcodeQrScannerModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();

      setTimeout(() => {
        startHtml5Scanner();
      }, 300);
    };

    window.restartHtml5Scanner = function() {
      stopHtml5Scanner();
      setTimeout(() => {
        startHtml5Scanner();
      }, 300);
    };

    window.stopHtml5Scanner = function() {
      if (html5QrScannerInstance && isScannerActive) {
        html5QrScannerInstance.stop().then(() => {
          isScannerActive = false;
        }).catch(err => console.warn("Stop scanner:", err));
      }
    };

    function startHtml5Scanner() {
      if (isScannerActive) return;

      const loadingText = document.getElementById('scannerLoadingText');
      if (loadingText) loadingText.classList.remove('d-none');

      try {
        const config = { 
          fps: 15, 
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0
        };

        html5QrScannerInstance = new Html5Qrcode("barcodeScannerReaderContainer");
        
        html5QrScannerInstance.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            playScanBeep();
            handleScannedBarcodeCode(decodedText);
          },
          (errorMessage) => {
            // Ignore frame decode errors
          }
        ).then(() => {
          isScannerActive = true;
          if (loadingText) loadingText.classList.add('d-none');
        }).catch(err => {
          console.warn("Camera access error:", err);
          if (loadingText) {
            loadingText.innerHTML = `
              <div class="alert alert-warning fs-8 m-2 text-start">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> ไม่สามารถเปิดกล้องวิดีโอได้ คุณสามารถพิมพ์หรือยิงบาร์โค้ดในช่องค้นหาด้านล่างแทนได้
              </div>`;
          }
        });
      } catch (e) {
        console.warn("Scanner init exception:", e);
      }
    }

    window.handleManualBarcodeSearch = function() {
      const input = document.getElementById('manualScannerBarcodeInput');
      if (input && input.value.trim()) {
        playScanBeep();
        handleScannedBarcodeCode(input.value.trim());
      }
    };

    window.handleScannedBarcodeCode = function(rawCode) {
      let cleanCode = rawCode.trim();
      if (cleanCode.startsWith('EQUIPMENT:')) {
        cleanCode = cleanCode.replace('EQUIPMENT:', '').trim();
      }

      // Find item in equipmentList
      const item = equipmentList.find(x => 
        (x.code && x.code.toLowerCase() === cleanCode.toLowerCase()) || 
        (x.id && x.id.toLowerCase() === cleanCode.toLowerCase()) ||
        (x.name && x.name.toLowerCase().includes(cleanCode.toLowerCase()))
      );

      const promptState = document.getElementById('scannedItemPromptState');
      const foundCard = document.getElementById('scannedItemResultCard');
      const notFoundCard = document.getElementById('scannedItemNotFoundCard');

      if (promptState) promptState.classList.add('d-none');

      if (item) {
        activeScannedItemId = item.id;
        if (notFoundCard) notFoundCard.classList.add('d-none');
        if (foundCard) foundCard.classList.remove('d-none');

        document.getElementById('scannedItemImg').src = item.imageUrl || DEFAULT_EQUIPMENT_IMAGE;
        document.getElementById('scannedItemName').textContent = item.name;
        document.getElementById('scannedItemCategory').textContent = item.category;
        document.getElementById('scannedItemCode').textContent = `รหัสสินค้า: ${item.code}`;
        document.getElementById('scannedItemLocation').textContent = item.location || 'คลังกลาง';
        document.getElementById('scannedItemStock').textContent = `${item.quantity} ${item.unit}`;

        showToast(`📷 สแกนพบสินค้า: "${item.name}" (สต็อก: ${item.quantity} ${item.unit})`);

        const autoSelectCheck = document.getElementById('autoSelectBarcodeScannerCheckbox');
        if (autoSelectCheck && autoSelectCheck.checked) {
          selectFromScannerToForm();
        }
      } else {
        activeScannedUnknownCode = cleanCode;
        if (foundCard) foundCard.classList.add('d-none');
        if (notFoundCard) notFoundCard.classList.remove('d-none');
        document.getElementById('scannedUnknownCodeText').textContent = cleanCode;
      }
    };

    window.quickUpdateStockFromScanner = async function(delta) {
      if (!activeScannedItemId) return;
      const item = equipmentList.find(x => x.id === activeScannedItemId);
      if (!item) return;

      const newQty = item.quantity + delta;
      if (newQty < 0) {
        alert("ไม่สามารถปรับสต็อกให้ต่ำกว่า 0 ได้");
        return;
      }

      item.quantity = newQty;
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          await setDoc(doc(db, "equipment", item.id), item, { merge: true });
        } catch(e){}
      }

      const txType = delta > 0 ? "เติมสต็อกด่วน" : "เบิกตัดสต็อกด่วน";
      const newTx = {
        id: 'tx-' + String(Date.now()).slice(-6),
        type: txType,
        employeeId: currentAuthUser ? currentAuthUser.uid : 'SCANNER',
        employeeName: currentAuthUser ? (currentAuthUser.displayName || 'ผู้ใช้สแกนเนอร์') : 'สแกนเนอร์หน้าร้าน',
        equipmentId: item.id,
        equipmentName: `${item.name} [${item.code}]`,
        quantity: Math.abs(delta),
        unit: item.unit,
        location: item.location || 'คลังกลาง',
        note: `สแกนกล้องบาร์โค้ดปรับปรุงสต็อก (${delta > 0 ? '+' : ''}${delta})`,
        rawTimestamp: Date.now(),
        timestamp: new Date().toLocaleString('th-TH')
      };

      transactionHistory.unshift(newTx);
      saveToLocalStorage();
      if (isFirebaseReady && db) {
        addDoc(collection(db, "transactions"), newTx).catch(()=>{});
      }

      playScanBeep();
      showToast(`⚡ อัปเดตสต็อก "${item.name}" เรียบร้อย! สต็อกใหม่: ${item.quantity} ${item.unit}`);

      document.getElementById('scannedItemStock').textContent = `${item.quantity} ${item.unit}`;
      renderCatalogGrid();
      renderStaffTable();
      updateStats();
    };

    window.selectFromScannerToForm = function() {
      if (activeScannedItemId) {
        const item = equipmentList.find(x => x.id === activeScannedItemId);
        quickSelectTransaction(activeScannedItemId);
        stopHtml5Scanner();
        const modalElem = document.getElementById('barcodeQrScannerModal');
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();
        if (item) showToast(`⚡ เลือกอุปกรณ์ "${item.name}" [${item.code}] ลงฟอร์มทำรายการเรียบร้อยแล้ว`);
      }
    };

    window.printSingleLabelFromScanner = function() {
      if (activeScannedItemId) {
        stopHtml5Scanner();
        const modalElem = document.getElementById('barcodeQrScannerModal');
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();
        openPrintLabelModal(activeScannedItemId);
      }
    };

    window.openAddEquipmentWithScannedCode = function() {
      stopHtml5Scanner();
      const modalElem = document.getElementById('barcodeQrScannerModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      openAddModal();
      if (activeScannedUnknownCode) {
        const codeInput = document.getElementById('equipCodeInput');
        if (codeInput) codeInput.value = activeScannedUnknownCode;
      }
    };

    // ==========================================
    // PRINTABLE BARCODE & QR CODE LABEL GENERATOR
    // ==========================================
    window.openPrintLabelModal = function(equipId = 'ALL') {
      const select = document.getElementById('labelItemSelect');
      if (select) {
        let optionsHtml = `
          <option value="ALL">📦 ทุกรายการในคลังอุปกรณ์ (${equipmentList.length} รายการ)</option>
          <option value="LOW_STOCK">🔴 รายการสต๊อกต่ำเท่านั้น (≤ 5)</option>
        `;
        if (window.selectedStaffItemIds && window.selectedStaffItemIds.size > 0) {
          optionsHtml += `<option value="SELECTED">✨ รายการที่เลือกในตาราง (${window.selectedStaffItemIds.size} รายการ)</option>`;
        }
        select.innerHTML = optionsHtml;
        equipmentList.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = `🏷️ [${item.code}] ${item.name} (คงเหลือ: ${item.quantity} ${item.unit})`;
          if (equipId && equipId === item.id) opt.selected = true;
          select.appendChild(opt);
        });
        if (equipId === 'SELECTED' && window.selectedStaffItemIds && window.selectedStaffItemIds.size > 0) {
          select.value = 'SELECTED';
        } else if (equipId && equipId !== 'ALL') {
          select.value = equipId;
        } else {
          select.value = 'ALL';
        }
      }

      renderPrintableLabelsPreview();

      const modalElem = document.getElementById('printableLabelModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    window.renderPrintableLabelsPreview = function() {
      const selectElem = document.getElementById('labelItemSelect');
      const selectedScope = selectElem ? selectElem.value : 'ALL';
      const cols = parseInt(document.getElementById('labelColsSelect').value) || 3;
      const copiesCount = parseInt(document.getElementById('labelCopiesInput').value) || 1;

      const showBarcode = document.getElementById('chkShowBarcode').checked;
      const showQr = document.getElementById('chkShowQr').checked;
      const showName = document.getElementById('chkShowName').checked;
      const showDetails = document.getElementById('chkShowDetails').checked;

      let itemsToPrint = [];
      if (selectedScope === 'ALL') {
        itemsToPrint = [...equipmentList];
      } else if (selectedScope === 'LOW_STOCK') {
        itemsToPrint = equipmentList.filter(x => x.quantity <= (x.minQuantity !== undefined ? x.minQuantity : 3));
      } else if (selectedScope === 'SELECTED') {
        itemsToPrint = equipmentList.filter(x => window.selectedStaffItemIds && window.selectedStaffItemIds.has(x.id));
      } else {
        const found = equipmentList.find(x => x.id === selectedScope);
        if (found) itemsToPrint = [found];
      }

      const container = document.getElementById('labelSheetPreviewContainer');
      const printSheet = document.getElementById('printableLabelSheet');

      if (itemsToPrint.length === 0) {
        if (container) container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-tag display-4 d-block mb-2"></i>ไม่พบรายการอุปกรณ์สำหรับพิมพ์ฉลาก</div>`;
        if (printSheet) printSheet.innerHTML = '';
        return;
      }

      let gridClass = 'col-4';
      if (cols === 2) gridClass = 'col-6';
      else if (cols === 3) gridClass = 'col-4';
      else if (cols === 4) gridClass = 'col-3';

      let previewHtml = `<div class="row g-2">`;
      let printHtml = `<div class="row g-2">`;
      const renderTasks = [];

      itemsToPrint.forEach((item, itemIdx) => {
        for (let c = 0; c < copiesCount; c++) {
          const prevBcId = `p-bc-${itemIdx}-${c}`;
          const prevQrId = `p-qr-${itemIdx}-${c}`;
          const prBcId = `pr-bc-${itemIdx}-${c}`;
          const prQrId = `pr-qr-${itemIdx}-${c}`;

          const labelTemplate = (bcId, qrId) => `
            <div class="${gridClass}">
              <div class="sticker-label-box p-2 border rounded-3 bg-white text-dark h-100 position-relative" style="font-size: 0.8rem; page-break-inside: avoid; break-inside: avoid;">
                <div class="d-flex align-items-center justify-content-between mb-1 border-bottom pb-1">
                  <div class="fw-bold text-success text-truncate fs-8"><i class="bi bi-flower1 me-1"></i>${item.category}</div>
                  <span class="badge bg-dark font-monospace">${item.code}</span>
                </div>

                ${showName ? `<div class="fw-bold fs-7 text-dark mb-1 text-truncate" title="${item.name}">${item.name}</div>` : ''}

                <div class="d-flex align-items-center justify-content-center gap-2 my-1">
                  ${showBarcode ? `
                    <div class="text-center flex-grow-1 overflow-hidden" style="max-height: 52px;">
                      <svg id="${bcId}"></svg>
                    </div>
                  ` : ''}
                  ${showQr ? `
                    <div class="text-center flex-shrink-0">
                      <canvas id="${qrId}" style="width: 52px; height: 52px;"></canvas>
                    </div>
                  ` : ''}
                </div>

                ${showDetails ? `
                  <div class="d-flex justify-content-between align-items-center fs-8 text-muted mt-1 border-top pt-1">
                    <div><i class="bi bi-geo-alt me-1 text-danger"></i>${item.location || 'คลังกลาง'}</div>
                    <div class="font-monospace text-dark fw-bold"><i class="bi bi-tag-fill me-1 text-success"></i>${item.code}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;

          previewHtml += labelTemplate(prevBcId, prevQrId);
          printHtml += labelTemplate(prBcId, prQrId);

          renderTasks.push({ item, prevBcId, prevQrId, prBcId, prQrId });
        }
      });

      previewHtml += `</div>`;
      printHtml += `</div>`;

      if (container) container.innerHTML = previewHtml;
      if (printSheet) printSheet.innerHTML = printHtml;

      setTimeout(() => {
        renderTasks.forEach(task => {
          if (showBarcode) {
            [task.prevBcId, task.prBcId].forEach(id => {
              const svgElem = document.getElementById(id);
              if (svgElem && typeof JsBarcode === 'function') {
                try {
                  JsBarcode(svgElem, task.item.code, {
                    format: "CODE128",
                    width: 1.4,
                    height: 32,
                    displayValue: true,
                    fontSize: 10,
                    margin: 2
                  });
                } catch(e){}
              }
            });
          }

          if (showQr) {
            [task.prevQrId, task.prQrId].forEach(id => {
              const canvasElem = document.getElementById(id);
              if (canvasElem && typeof QRCode === 'object' && QRCode.toCanvas) {
                try {
                  QRCode.toCanvas(canvasElem, `EQUIPMENT:${task.item.code}`, {
                    width: 52,
                    margin: 1
                  });
                } catch(e){}
              }
            });
          }
        });
      }, 80);
    };

    window.triggerPrintLabels = function() {
      window.renderPrintableLabelsPreview();

      const printSheet = document.getElementById('printableLabelSheet');
      if (printSheet) {
        printSheet.classList.remove('d-none');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            printSheet.classList.add('d-none');
          }, 1000);
        }, 200);
      } else {
        window.print();
      }
    };

    // ==========================================
    // PRINTABLE EMPLOYEE BADGE GENERATOR LOGIC
    // ==========================================
    let activePrintEmpId = 'ALL';

    window.openPrintEmployeeBadgeModal = function(empId = 'ALL') {
      activePrintEmpId = empId;
      const select = document.getElementById('badgeEmpSelect');
      if (select) {
        select.innerHTML = `
          <option value="ALL">👥 บุคลากรทั้งหมดในระบบ (${employeeList.length} ท่าน)</option>
          <option value="WORKER">👨‍🌾 เฉพาะพนักงานทำเกษตร (Worker)</option>
          <option value="STAFF">💼 เฉพาะเจ้าหน้าที่สำนักงาน (Staff)</option>
        `;
        employeeList.forEach(emp => {
          const opt = document.createElement('option');
          opt.value = emp.id;
          opt.textContent = `🪪 [${emp.id}] ${emp.name} (${emp.department})`;
          if (empId && empId === emp.id) opt.selected = true;
          select.appendChild(opt);
        });
        if (empId) select.value = empId;
      }

      renderPrintableEmployeeBadgesPreview();

      const modalElem = document.getElementById('printableEmployeeBadgeModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    window.updateBadgeMarginTopDisplay = function() {
      const val = parseInt(document.getElementById('badgeMarginTopInput')?.value) || 0;
      const el = document.getElementById('badgeMarginTopVal');
      if (el) el.textContent = `${val} มม. (${(val / 10).toFixed(1)} ซม.)`;
    };

    window.updateBadgeMarginSideDisplay = function() {
      const val = parseInt(document.getElementById('badgeMarginSideInput')?.value) || 0;
      const el = document.getElementById('badgeMarginSideVal');
      if (el) el.textContent = `${val} มม. (${(val / 10).toFixed(1)} ซม.)`;
    };

    window.applyBadgePrintPreset = function(presetKey) {
      const orientationSel = document.getElementById('badgeOrientationSelect');
      const colsSel = document.getElementById('badgeColsSelect');
      const copiesInp = document.getElementById('badgeCopiesInput');
      const themeSel = document.getElementById('badgeThemeSelect');
      const topInp = document.getElementById('badgeMarginTopInput');
      const sideInp = document.getElementById('badgeMarginSideInput');
      const cutChk = document.getElementById('chkEmpCutLines');

      if (presetKey === 'a4-4col') {
        if (orientationSel) orientationSel.value = 'landscape';
        if (colsSel) colsSel.value = '4';
        if (copiesInp) copiesInp.value = '1';
        if (themeSel) themeSel.value = 'flora';
        if (topInp) topInp.value = '5';
        if (sideInp) sideInp.value = '6';
        if (cutChk) cutChk.checked = true;
      } else if (presetKey === 'pvc-single') {
        if (orientationSel) orientationSel.value = 'portrait';
        if (colsSel) colsSel.value = '1';
        if (copiesInp) copiesInp.value = '1';
        if (themeSel) themeSel.value = 'flora';
        if (topInp) topInp.value = '2';
        if (sideInp) sideInp.value = '2';
        if (cutChk) cutChk.checked = false;
      } else if (presetKey === 'a4-2col') {
        if (orientationSel) orientationSel.value = 'portrait';
        if (colsSel) colsSel.value = '2';
        if (copiesInp) copiesInp.value = '1';
        if (themeSel) themeSel.value = 'flora';
        if (topInp) topInp.value = '8';
        if (sideInp) sideInp.value = '8';
        if (cutChk) cutChk.checked = true;
      }

      updateBadgeMarginTopDisplay();
      updateBadgeMarginSideDisplay();
      renderPrintableEmployeeBadgesPreview();
    };

    window.resetBadgePrintSettings = function() {
      applyBadgePrintPreset('a4-4col');
      const photoChk = document.getElementById('chkEmpShowPhoto');
      const qrChk = document.getElementById('chkEmpShowQr');
      const roleChk = document.getElementById('chkEmpShowRole');
      const detailsChk = document.getElementById('chkEmpShowDetails');
      if (photoChk) photoChk.checked = true;
      if (qrChk) qrChk.checked = true;
      if (roleChk) roleChk.checked = true;
      if (detailsChk) detailsChk.checked = true;
      renderPrintableEmployeeBadgesPreview();
    };

    window.renderPrintableEmployeeBadgesPreview = function() {
      const selectElem = document.getElementById('badgeEmpSelect');
      const selectedScope = selectElem ? selectElem.value : 'ALL';
      const cols = parseInt(document.getElementById('badgeColsSelect')?.value) || 4;
      const copiesCount = parseInt(document.getElementById('badgeCopiesInput')?.value) || 1;
      const orientation = document.getElementById('badgeOrientationSelect')?.value || 'landscape';
      const themeKey = document.getElementById('badgeThemeSelect')?.value || 'flora';
      const marginTopMm = parseInt(document.getElementById('badgeMarginTopInput')?.value) ?? 5;
      const marginSideMm = parseInt(document.getElementById('badgeMarginSideInput')?.value) ?? 6;
      const showCutLines = document.getElementById('chkEmpCutLines')?.checked ?? true;

      // Theme Colors Map
      const themeMap = {
        flora: { bg: '#2e7d32', border: '#2e7d32', text: '#ffffff' },
        blue: { bg: '#0284c7', border: '#0284c7', text: '#ffffff' },
        gold: { bg: '#d97706', border: '#d97706', text: '#ffffff' },
        dark: { bg: '#1f2937', border: '#1f2937', text: '#ffffff' }
      };
      const theme = themeMap[themeKey] || themeMap.flora;

      // Update dynamic print style for @page orientation, margins, theme and color adjust
      let dynamicPrintStyle = document.getElementById('dynamicBadgePrintOrientationStyle');
      if (!dynamicPrintStyle) {
        dynamicPrintStyle = document.createElement('style');
        dynamicPrintStyle.id = 'dynamicBadgePrintOrientationStyle';
        document.head.appendChild(dynamicPrintStyle);
      }
      dynamicPrintStyle.textContent = `@media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        @page { size: A4 ${orientation}; margin: ${marginTopMm}mm ${marginSideMm}mm 5mm ${marginSideMm}mm; }
        .printable-area { padding: 0 !important; margin: 0 !important; background: transparent !important; }
        .a4-badge-page-sheet {
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          padding-top: ${marginTopMm}mm !important;
        }
        .a4-badge-page-sheet:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
        .id-badge-header { background-color: ${theme.bg} !important; color: ${theme.text} !important; margin: 0 0 6px 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .badge-title-pill { background-color: #e0f2fe !important; color: #dc3545 !important; border: 1px solid #7dd3fc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .id-badge-container { border-color: ${theme.border} !important; ${showCutLines ? 'border-style: dashed !important;' : 'border-style: solid !important;'} page-break-inside: avoid !important; break-inside: avoid !important; }
      }`;

      const showPhoto = document.getElementById('chkEmpShowPhoto')?.checked;
      const showQr = document.getElementById('chkEmpShowQr')?.checked;
      const showRole = document.getElementById('chkEmpShowRole')?.checked;
      const showDetails = document.getElementById('chkEmpShowDetails')?.checked;

      let employeesToPrint = [];
      if (selectedScope === 'ALL') {
        employeesToPrint = [...employeeList];
      } else if (selectedScope === 'WORKER') {
        employeesToPrint = employeeList.filter(x => x.role === 'WORKER');
      } else if (selectedScope === 'STAFF') {
        employeesToPrint = employeeList.filter(x => x.role === 'STAFF');
      } else {
        const found = employeeList.find(x => x.id === selectedScope);
        if (found) employeesToPrint = [found];
      }

      const container = document.getElementById('badgeSheetPreviewContainer');
      const printSheet = document.getElementById('printableEmployeeBadgeSheet');

      if (employeesToPrint.length === 0) {
        if (container) container.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-person-badge display-4 d-block mb-2"></i>ไม่พบรายชื่อบุคลากรสำหรับการพิมพ์บัตร</div>`;
        if (printSheet) printSheet.innerHTML = '';
        return;
      }

      let gridClass = 'col-3';
      let rowGutter = 'g-2';
      let cardPadding = 'p-2';
      let qrPx = 55;
      let nameFs = 'fs-7';
      let deptFs = 'fs-8';
      let infoFs = 'fs-8';
      let headerPadding = 'p-1';
      let headerTitleFs = 'fs-8';
      let subTitleStyle = 'style="font-size: 0.62rem;"';
      let cardMaxWidth = '100%';

      if (cols === 1) {
        gridClass = 'col-12';
        rowGutter = 'g-3';
        cardPadding = 'p-4';
        qrPx = 110;
        nameFs = 'fs-5';
        deptFs = 'fs-7';
        infoFs = 'fs-8';
        headerPadding = 'p-2';
        headerTitleFs = 'fs-6';
        subTitleStyle = '';
        cardMaxWidth = '380px';
      } else if (cols === 2) {
        gridClass = 'col-6';
        rowGutter = 'g-3';
        cardPadding = 'p-3';
        qrPx = 95;
        nameFs = 'fs-5';
        deptFs = 'fs-8';
        infoFs = 'fs-8';
        headerPadding = 'p-2';
        headerTitleFs = 'fs-7';
        subTitleStyle = '';
        cardMaxWidth = '320px';
      } else if (cols === 3) {
        gridClass = 'col-4';
        rowGutter = 'g-2';
        cardPadding = 'p-2.5';
        qrPx = 75;
        nameFs = 'fs-6';
        deptFs = 'fs-8';
        infoFs = 'fs-8';
        headerPadding = 'p-1.5';
        headerTitleFs = 'fs-8';
        subTitleStyle = 'style="font-size: 0.68rem;"';
        cardMaxWidth = '260px';
      } else {
        // cols === 4 (4 บัตร/แถว = 8 บัตร/หน้า A4 แนวนอน 2 แถว)
        gridClass = 'col-3';
        rowGutter = 'g-2';
        cardPadding = 'p-1.5';
        qrPx = 55;
        nameFs = 'fs-8';
        deptFs = 'fs-8';
        infoFs = 'fs-8';
        headerPadding = 'p-1';
        headerTitleFs = 'fs-8';
        subTitleStyle = 'style="font-size: 0.60rem;"';
        cardMaxWidth = '100%';
      }

      // รูปภาพ ใหญ่กว่า QR Code 100% ทุกรูปแบบ
      const photoPx = Math.round(qrPx * 2.00);

      const renderTasks = [];
      const allBadgeItems = [];

      employeesToPrint.forEach((emp, empIdx) => {
        for (let c = 0; c < copiesCount; c++) {
          const prevQrId = `p-empqr-${empIdx}-${c}`;
          const prQrId = `pr-empqr-${empIdx}-${c}`;

          const deptName = emp.department ? (emp.department.startsWith('แผนก') ? emp.department : 'แผนก' + emp.department) : 'ไม่ระบุแผนก';
          const badgeTitleText = getBadgeTitleText(emp);
          const cardBorderStyle = showCutLines ? 'border-dashed' : 'border-solid';

          const badgeTemplate = (qrId) => `
            <div class="${gridClass}">
              <div class="id-badge-container shadow-sm mx-auto bg-white ${cardPadding} rounded-3 border border-2 position-relative text-center h-100 ${cardBorderStyle}" style="page-break-inside: avoid; break-inside: avoid; max-width: ${cardMaxWidth}; border-color: ${theme.border} !important;">
                <!-- Header Badge -->
                <div class="id-badge-header text-white ${headerPadding} rounded-3 mb-1.5 overflow-hidden" style="background-color: ${theme.bg} !important;">
                  <div class="fw-bold ${headerTitleFs} text-uppercase lh-sm py-0.5"><i class="bi bi-flower1 me-1"></i> ทุ่งสวรรค์ ตะวันฉาย</div>
                  <div class="mt-0.5">
                    <span class="badge-title-pill d-inline-block px-2 py-0.5 rounded-pill fw-bold" style="background-color: #e0f2fe !important; color: #dc3545 !important; border: 1px solid #7dd3fc !important; ${subTitleStyle}">${badgeTitleText}</span>
                  </div>
                </div>

                <!-- Employee Photo (ใหญ่กว่า QR Code 50%) -->
                ${showPhoto ? `
                  <div class="my-1 d-flex align-items-center justify-content-center mx-auto">
                    <img src="${emp.photoUrl}" class="id-badge-photo rounded-3 border border-2 shadow-sm mb-0" style="width: ${photoPx}px; height: ${photoPx}px; object-fit: cover; object-position: top center; border-color: ${theme.border} !important;" alt="${emp.name}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'" />
                  </div>
                ` : ''}

                <!-- Employee Info -->
                <h6 class="fw-bold text-dark mb-0.5 ${nameFs}">${formatEmpName(emp)}</h6>

                ${showRole ? `
                  <div class="text-success ${deptFs} mb-0.5 font-semibold fw-bold">[${emp.id}] ${deptName}</div>
                ` : ''}

                ${showDetails && emp.details ? `
                  <div class="text-secondary ${infoFs} mb-0.5 fst-italic text-truncate px-1">📝 ${emp.details}</div>
                ` : ''}

                ${showDetails && emp.phone ? `
                  <div class="text-muted ${infoFs} mb-1">📞 ${emp.phone}</div>
                ` : ''}

                <!-- QR Code & ID -->
                ${showQr ? `
                  <div class="p-1 bg-light rounded-3 border d-inline-block shadow-sm my-0.5 mx-auto">
                    <img id="${qrId}-img" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('EMPLOYEE:' + emp.id)}" style="width: ${qrPx}px; height: ${qrPx}px; object-fit: contain;" alt="Employee QR Code" />
                    <canvas id="${qrId}" class="d-none" style="width: ${qrPx}px; height: ${qrPx}px;"></canvas>
                    ${showDetails ? `<div class="font-monospace fw-bold text-dark mt-0.5" style="font-size: 0.65rem;">ID: ${emp.id}</div>` : ''}
                  </div>
                ` : ''}

                ${showDetails && !showQr ? `
                  <div class="font-monospace fw-bold fs-8 text-dark my-1">ID: ${emp.id}</div>
                ` : ''}
              </div>
            </div>
          `;

          allBadgeItems.push({
            previewHtml: badgeTemplate(prevQrId),
            printHtml: badgeTemplate(prQrId)
          });

          renderTasks.push({ emp, prevQrId, prQrId });
        }
      });

      // Pagination setup: 4 cards/row × 2 rows = 8 cards per page on A4 Landscape
      const cardsPerPage = (cols === 4) ? 8 : (cols === 3 ? 12 : (cols === 2 ? 6 : 2));
      const totalPages = Math.ceil(allBadgeItems.length / cardsPerPage);

      let previewHtml = '';
      let printHtml = '';

      for (let p = 0; p < allBadgeItems.length; p += cardsPerPage) {
        const pageItems = allBadgeItems.slice(p, p + cardsPerPage);
        const pageNum = Math.floor(p / cardsPerPage) + 1;
        const isLastPage = (p + cardsPerPage >= allBadgeItems.length);

        previewHtml += `
          <div class="a4-sheet-preview bg-white p-3 mb-4 rounded-3 border shadow-sm">
            <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
              <span class="badge bg-success fs-8 fw-bold">📄 ตัวอย่างแผ่นพิมพ์ A4 (${orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}) - หน้าที่ ${pageNum} / ${totalPages} (${pageItems.length} บัตร)</span>
              <span class="text-muted fs-8 fw-semibold"><i class="bi bi-aspect-ratio me-1"></i> ${cols} บัตร/แถว (${pageItems.length <= cols ? '1 แถว' : '2 แถว'})</span>
            </div>
            <div class="row ${rowGutter}">
              ${pageItems.map(item => item.previewHtml).join('')}
            </div>
          </div>
        `;

        const pageBreakCss = isLastPage ? '' : 'page-break-after: always !important; break-after: page !important;';

        printHtml += `
          <div class="a4-badge-page-sheet" style="${pageBreakCss} page-break-inside: avoid; break-inside: avoid;">
            <div class="row ${rowGutter}">
              ${pageItems.map(item => item.printHtml).join('')}
            </div>
          </div>
        `;
      }

      if (container) container.innerHTML = previewHtml;
      if (printSheet) printSheet.innerHTML = printHtml;

      setTimeout(() => {
        renderTasks.forEach(task => {
          if (showQr) {
            const qrData = `EMPLOYEE:${task.emp.id}`;
            [task.prevQrId, task.prQrId].forEach(id => {
              if (typeof QRCode === 'object' && QRCode.toDataURL) {
                try {
                  QRCode.toDataURL(qrData, { width: qrPx + 20, margin: 1 }, function(err, url) {
                    if (!err && url) {
                      const img = document.getElementById(id + '-img');
                      if (img) img.src = url;
                    }
                  });
                } catch(e){}
              }

              const canvasElem = document.getElementById(id);
              if (canvasElem && typeof QRCode === 'object' && QRCode.toCanvas) {
                try {
                  QRCode.toCanvas(canvasElem, qrData, {
                    width: qrPx,
                    margin: 1
                  });
                } catch(e){}
              }
            });
          }
        });
      }, 80);
    };

    window.triggerPrintEmployeeBadges = function() {
      window.renderPrintableEmployeeBadgesPreview();

      const printSheet = document.getElementById('printableEmployeeBadgeSheet');
      if (printSheet) {
        printSheet.classList.remove('d-none');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            printSheet.classList.add('d-none');
          }, 1000);
        }, 200);
      } else {
        window.print();
      }
    };

    // ==========================================
    // REAL CAMERA QR SCANNER FOR EMPLOYEE BADGE
    // ==========================================
    let empHtml5QrScannerInstance = null;
    let isEmpScannerActive = false;
    let activeScannedEmpId = null;

    window.openScanEmpBadgeModal = function() {
      const promptState = document.getElementById('scannedEmpPromptState');
      const resultCard = document.getElementById('scannedEmpResultCard');
      const notFoundCard = document.getElementById('scannedEmpNotFoundCard');
      if (promptState) promptState.classList.remove('d-none');
      if (resultCard) resultCard.classList.add('d-none');
      if (notFoundCard) notFoundCard.classList.add('d-none');

      populateQuickScanEmpDropdown();

      const modalElem = document.getElementById('scanEmpBadgeModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();

      setTimeout(() => {
        startEmpQrScanner();
      }, 300);
    };

    window.restartEmpQrScanner = function() {
      stopEmpQrScanner();
      setTimeout(() => {
        startEmpQrScanner();
      }, 300);
    };

    window.stopEmpQrScanner = function() {
      if (empHtml5QrScannerInstance && isEmpScannerActive) {
        empHtml5QrScannerInstance.stop().then(() => {
          isEmpScannerActive = false;
        }).catch(err => console.warn("Stop emp scanner:", err));
      }
    };

    function startEmpQrScanner() {
      if (isEmpScannerActive) return;

      const loadingText = document.getElementById('empScannerLoadingText');
      if (loadingText) loadingText.classList.remove('d-none');

      try {
        const config = { 
          fps: 15, 
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        };

        empHtml5QrScannerInstance = new Html5Qrcode("empQrScannerReaderContainer");
        
        empHtml5QrScannerInstance.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            playScanBeep();
            handleScannedEmpQrCode(decodedText);
          },
          (errorMessage) => {
            // Ignore frame decode errors
          }
        ).then(() => {
          isEmpScannerActive = true;
          if (loadingText) loadingText.classList.add('d-none');
        }).catch(err => {
          console.warn("Emp camera access error:", err);
          if (loadingText) {
            loadingText.innerHTML = `
              <div class="alert alert-warning fs-8 m-2 text-start">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> ไม่สามารถเปิดกล้องวิดีโอได้ คุณสามารถพิมพ์ค้นหาหรือเลือกรายชื่อพนักงานด้านล่างแทนได้
              </div>`;
          }
        });
      } catch (e) {
        console.warn("Emp scanner init exception:", e);
      }
    }

    window.handleManualEmpQrSearch = function(q) {
      if (!q || !q.trim()) return;
      handleScannedEmpQrCode(q.trim());
    };

    window.handleManualEmpQrSearchBtn = function() {
      const input = document.getElementById('manualEmpQrInput');
      if (input && input.value.trim()) {
        playScanBeep();
        handleScannedEmpQrCode(input.value.trim());
      }
    };

    window.handleEmpSelectFromDropdown = function(empId) {
      if (empId) {
        playScanBeep();
        handleScannedEmpQrCode(empId);
      }
    };

    window.handleScannedEmpQrCode = function(rawCode) {
      let cleanCode = rawCode.trim();
      if (cleanCode.startsWith('EMPLOYEE:')) {
        cleanCode = cleanCode.replace('EMPLOYEE:', '').trim();
      }

      // Find in employeeList
      const emp = employeeList.find(x => 
        (x.id && x.id.toLowerCase() === cleanCode.toLowerCase()) || 
        (x.code && x.code.toLowerCase() === cleanCode.toLowerCase()) ||
        (x.name && x.name.toLowerCase().includes(cleanCode.toLowerCase()))
      );

      const promptState = document.getElementById('scannedEmpPromptState');
      const foundCard = document.getElementById('scannedEmpResultCard');
      const notFoundCard = document.getElementById('scannedEmpNotFoundCard');

      if (promptState) promptState.classList.add('d-none');

      if (emp) {
        activeScannedEmpId = emp.id;
        if (notFoundCard) notFoundCard.classList.add('d-none');
        if (foundCard) foundCard.classList.remove('d-none');

        const isStaff = emp.role === 'STAFF';
        const roleLabel = isStaff ? 'เจ้าหน้าที่สำนักงาน (Staff)' : 'พนักงานทำเกษตร (Worker)';
        const roleBadgeClass = isStaff ? 'bg-primary' : 'bg-success';

        const imgElem = document.getElementById('scannedEmpImg');
        if (imgElem) imgElem.src = emp.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
        
        const nameElem = document.getElementById('scannedEmpName');
        if (nameElem) nameElem.textContent = formatEmpName(emp);

        const roleElem = document.getElementById('scannedEmpRoleBadge');
        if (roleElem) {
          roleElem.textContent = roleLabel;
          roleElem.className = `badge ${roleBadgeClass} fs-8 mb-1`;
        }

        const idElem = document.getElementById('scannedEmpIdCode');
        if (idElem) idElem.textContent = `รหัสประจำตัว: ${emp.id}`;

        const deptElem = document.getElementById('scannedEmpDepartment');
        if (deptElem) deptElem.textContent = emp.department || 'แผนกทั่วไป';

        const phoneElem = document.getElementById('scannedEmpPhone');
        if (phoneElem) phoneElem.textContent = emp.phone || '-';

        const posElem = document.getElementById('scannedEmpPosition');
        if (posElem) posElem.textContent = emp.position || '-';

        showToast(`🪪 สแกน QR พบพนักงาน: "${emp.name}" [${emp.id}] (${emp.department || 'ทั่วไป'})`);

        const autoSelectEmpCheck = document.getElementById('autoSelectEmpScannerCheckbox');
        if (autoSelectEmpCheck && autoSelectEmpCheck.checked) {
          handleSelectEmpToTransactionForm();
        }
      } else {
        activeScannedEmpId = null;
        if (foundCard) foundCard.classList.add('d-none');
        if (notFoundCard) notFoundCard.classList.remove('d-none');
        const unkElem = document.getElementById('scannedEmpUnknownCodeText');
        if (unkElem) unkElem.textContent = cleanCode;
      }
    };

    window.handleDirectBadgeClockInFromResult = function() {
      if (!activeScannedEmpId) return;
      const emp = employeeList.find(x => x.id === activeScannedEmpId);
      if (!emp) return;

      const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      const todayStr = new Date().toLocaleDateString('th-TH');

      const log = {
        id: 'att-' + Date.now(),
        employeeId: emp.id,
        employeeName: emp.name,
        status: 'เข้างาน',
        time: timeStr,
        date: todayStr,
        note: 'สแกน QR Code บัตรพนักงาน (Employee QR Scanner)'
      };

      attendanceLogs.unshift(log);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        addDoc(collection(db, "attendance"), log).catch(()=>{});
      }

      stopEmpQrScanner();
      const modalElem = document.getElementById('scanEmpBadgeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      showToast(`🟢 สแกนบัตรเข้างานสำเร็จ! [${emp.id}] คุณ${emp.name} ลงเวลาเข้างานแล้ว (${timeStr})`);
      renderAttendanceTable();
    };

    window.handleSelectEmpToTransactionForm = function() {
      if (!activeScannedEmpId) return;
      const emp = employeeList.find(x => x.id === activeScannedEmpId);
      if (!emp) return;

      // Filter & Select Employee in Transaction Form
      const searchInput = document.getElementById('transEmpSearchInput');
      if (searchInput) {
        searchInput.value = emp.name;
        filterTransEmployeeSelect(emp.name);
      }

      const select = document.getElementById('empSelect');
      if (select) {
        select.value = emp.id;
      }

      // Filter & Select Employee in Attendance Form
      const attSearch = document.getElementById('attEmpSearchInput');
      if (attSearch) {
        attSearch.value = emp.name;
        filterAttendanceEmployeeSelect(emp.name);
      }
      const attSelect = document.getElementById('attEmpSelect');
      if (attSelect) {
        attSelect.value = emp.id;
      }

      stopEmpQrScanner();
      const modalElem = document.getElementById('scanEmpBadgeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      showToast(`เลือกคุณ ${emp.name} [${emp.id}] เข้าสู่ฟอร์มเรียบร้อยแล้ว`);
    };

    window.printBadgeForScannedEmp = function() {
      if (!activeScannedEmpId) return;
      stopEmpQrScanner();
      const modalElem = document.getElementById('scanEmpBadgeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      openPrintEmployeeBadgeModal(activeScannedEmpId);
    };

    window.openAddEmployeeModalFromScanner = function() {
      stopEmpQrScanner();
      const modalElem = document.getElementById('scanEmpBadgeModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      openAddEmployeeModal();
    };

    window.openAddEmployeeModal = function() {
      const form = document.getElementById('addEmployeeForm');
      if (form) form.reset();
      document.getElementById('editEmpIdHidden').value = '';
      const fileInput = document.getElementById('empPhotoFileInput');
      if (fileInput) fileInput.value = '';
      const cameraInput = document.getElementById('empPhotoCameraInput');
      if (cameraInput) cameraInput.value = '';
      const urlInput = document.getElementById('empPhotoUrlInput');
      if (urlInput) urlInput.value = '';
      if (document.getElementById('empPositionSelect')) document.getElementById('empPositionSelect').value = '';
      if (document.getElementById('empDetailsInput')) document.getElementById('empDetailsInput').value = '';
      document.getElementById('empModalTitle').innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>เพิ่มข้อมูลพนักงานใหม่';
      populateDepartmentDropdowns();
      const box = document.getElementById('empPhotoPreviewBox');
      if (box) box.classList.add('d-none');
      const modal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
      modal.show();
    };

    window.openEditEmployeeModal = function(empId) {
      const emp = employeeList.find(x => x.id === empId);
      if (!emp) return;

      const fileInput = document.getElementById('empPhotoFileInput');
      if (fileInput) fileInput.value = '';
      const cameraInput = document.getElementById('empPhotoCameraInput');
      if (cameraInput) cameraInput.value = '';

      document.getElementById('editEmpIdHidden').value = emp.id;
      document.getElementById('empModalTitle').innerHTML = '<i class="bi bi-pencil-square me-2"></i>แก้ไขข้อมูลพนักงาน';
      document.getElementById('empNameInput').value = emp.name || '';
      if (document.getElementById('empNicknameInput')) {
        document.getElementById('empNicknameInput').value = emp.nickname || '';
      }
      document.getElementById('empCodeInput').value = emp.code || emp.id;
      if (document.getElementById('empRoleSelect')) document.getElementById('empRoleSelect').value = emp.role;
      populateDepartmentDropdowns(emp.department);
      if (document.getElementById('empPositionSelect')) document.getElementById('empPositionSelect').value = emp.position || '';
      if (document.getElementById('empDetailsInput')) document.getElementById('empDetailsInput').value = emp.details || '';
      document.getElementById('empPhoneInput').value = emp.phone;
      document.getElementById('empPhotoUrlInput').value = emp.photoUrl || '';

      const img = document.getElementById('empPhotoPreview');
      const box = document.getElementById('empPhotoPreviewBox');
      if (img && box && emp.photoUrl) {
        img.src = emp.photoUrl;
        box.classList.remove('d-none');
      } else if (box) {
        box.classList.add('d-none');
      }

      const modal = new bootstrap.Modal(document.getElementById('addEmployeeModal'));
      modal.show();
    };

    // Global variables for employee photo download modal
    let currentDownloadBlob = null;
    let currentDownloadFileName = 'employee_photo.jpeg';
    let currentDownloadUrl = '';

    window.downloadCurrentEmployeePhoto = async function() {
      const editId = document.getElementById('editEmpIdHidden')?.value || '';
      const codeInput = document.getElementById('empCodeInput')?.value.trim() || '';
      const nameInput = document.getElementById('empNameInput')?.value.trim() || '';
      const existingEmp = editId ? employeeList.find(x => x.id === editId) : null;

      // Determine clean filename matching Firebase Storage format (${safeCode}.jpeg)
      const empCode = codeInput || (existingEmp ? (existingEmp.code || existingEmp.id) : editId) || (nameInput ? nameInput : 'employee');
      const safeEmpCode = empCode.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeEmpCode}.jpeg`;
      currentDownloadFileName = fileName;

      // Determine photo source
      const fileInput = document.getElementById('empPhotoFileInput');
      const cameraInput = document.getElementById('empPhotoCameraInput');
      const urlInput = document.getElementById('empPhotoUrlInput')?.value.trim() || '';
      const previewImg = document.getElementById('empPhotoPreview');
      const previewSrc = previewImg ? previewImg.src : '';

      let sourceUrl = '';
      const selectedFile = (fileInput && fileInput.files && fileInput.files.length > 0) 
        ? fileInput.files[0] 
        : ((cameraInput && cameraInput.files && cameraInput.files.length > 0) ? cameraInput.files[0] : null);

      if (selectedFile) {
        sourceUrl = URL.createObjectURL(selectedFile);
      } else if (urlInput) {
        sourceUrl = urlInput;
      } else if (previewSrc && !previewSrc.includes('unsplash.com') && previewSrc !== window.location.href) {
        sourceUrl = previewSrc;
      } else if (existingEmp && existingEmp.photoUrl) {
        sourceUrl = existingEmp.photoUrl;
      }

      if (!sourceUrl) {
        alert("⚠️ ไม่พบรูปภาพพนักงานสำหรับดาวน์โหลด กรุณาเลือกไฟล์รูปภาพหรือระบุ URL รูปถ่ายก่อน");
        return;
      }

      try {
        showToast(`⌛ กำลังจัดเตรียมรูปภาพพนักงาน "${fileName}"...`);

        let targetBlob = null;

        // 1. Direct Firebase Storage SDK download using getBytes / getBlob
        if (isFirebaseReady && storage) {
          let storagePath = "";
          if (sourceUrl.includes('/o/')) {
            try {
              storagePath = decodeURIComponent(sourceUrl.split('/o/')[1].split('?')[0]);
            } catch (e) {}
          } else if (sourceUrl.startsWith('gs://')) {
            storagePath = sourceUrl.replace(/^gs:\/\/[^\/]+\//, '');
          }

          const defaultEmpPath = `employee_photos/${safeEmpCode}.jpeg`;
          const pathsToTry = [storagePath, defaultEmpPath, `employee_photos/${safeEmpCode}.png`].filter(Boolean);

          for (const p of pathsToTry) {
            try {
              const stRef = ref(storage, p);
              const buf = await getBytes(stRef);
              if (buf && buf.byteLength > 0) {
                targetBlob = new Blob([buf], { type: 'image/jpeg' });
                break;
              }
            } catch (eBytes) {
              try {
                const stRef = ref(storage, p);
                const b = await getBlob(stRef);
                if (b && b.size > 0) {
                  targetBlob = b;
                  break;
                }
              } catch (eBlob) {}
            }
          }
        }

        // 2. If user selected a local file
        if (!targetBlob && selectedFile) {
          targetBlob = selectedFile;
        } 
        // 3. If data URL
        else if (!targetBlob && sourceUrl.startsWith('data:image')) {
          targetBlob = dataURLToBlob(sourceUrl);
        }

        // 4. Try helper fetchImageAsBlobOrBase64
        if (!targetBlob && typeof fetchImageAsBlobOrBase64 === 'function') {
          targetBlob = await fetchImageAsBlobOrBase64(sourceUrl, nameInput || safeEmpCode, 'EMPLOYEE');
        }

        // 5. Try fetching via CORS proxies
        if (!targetBlob && sourceUrl.startsWith('http')) {
          const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(sourceUrl)}`,
            `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(sourceUrl)}`
          ];
          for (const proxyUrl of proxies) {
            try {
              const res = await fetch(proxyUrl);
              if (res.ok) {
                const b = await res.blob();
                if (b && b.size > 0) {
                  targetBlob = b;
                  break;
                }
              }
            } catch (pErr) {}
          }
        }

        // 6. Try Canvas conversion if blob is still missing
        if (!targetBlob) {
          targetBlob = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const cvs = document.createElement('canvas');
                cvs.width = img.naturalWidth || img.width || 400;
                cvs.height = img.naturalHeight || img.height || 400;
                const ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0);
                cvs.toBlob(b => resolve(b), 'image/jpeg', 0.95);
              } catch (e) {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = sourceUrl;
          });
        }

        // 7. Guarantee a Blob if still missing
        if (!targetBlob) {
          targetBlob = await new Promise((resolve) => {
            const cvs = document.createElement('canvas');
            cvs.width = 400;
            cvs.height = 400;
            const ctx = cvs.getContext('2d');
            ctx.fillStyle = '#1b4332';
            ctx.fillRect(0, 0, 400, 400);
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.arc(200, 160, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(nameInput || empCode || 'EMPLOYEE', 200, 290);
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#b7e4c7';
            ctx.fillText(`รหัส: ${empCode}`, 200, 330);
            cvs.toBlob(b => resolve(b), 'image/jpeg', 0.95);
          });
        }

        currentDownloadBlob = targetBlob;
        if (currentDownloadUrl && currentDownloadUrl.startsWith('blob:')) {
          URL.revokeObjectURL(currentDownloadUrl);
        }
        currentDownloadUrl = URL.createObjectURL(targetBlob);

        // Update Download Modal UI
        const modalImg = document.getElementById('downloadModalPhotoImg');
        const badgeElem = document.getElementById('downloadModalFileNameBadge');
        const openTabBtn = document.getElementById('downloadModalOpenTabBtn');

        if (modalImg) modalImg.src = currentDownloadUrl;
        if (badgeElem) badgeElem.textContent = `ชื่อไฟล์: ${fileName}`;
        if (openTabBtn) openTabBtn.href = currentDownloadUrl;

        // Show Download Modal
        const modalElem = document.getElementById('downloadEmpPhotoModal');
        if (modalElem && typeof bootstrap !== 'undefined') {
          const bsModal = new bootstrap.Modal(modalElem);
          bsModal.show();
        }

        // Attempt direct click download trigger
        window.triggerDirectPhotoDownload();

      } catch (err) {
        console.warn("Download employee photo notice:", err);
        showToast(`❌ เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ: ${err.message}`);
      }
    };

    window.triggerDirectPhotoDownload = function() {
      if (!currentDownloadBlob && !currentDownloadUrl) {
        showToast("❌ ไม่พบไฟล์รูปภาพสำหรับดาวน์โหลด");
        return;
      }

      try {
        const downloadUrl = currentDownloadUrl || URL.createObjectURL(currentDownloadBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = currentDownloadFileName || 'employee_photo.jpeg';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast(`✅ ดาวน์โหลดรูปพนักงาน "${currentDownloadFileName}" เรียบร้อยแล้ว!`);
      } catch (err) {
        console.warn("Direct download trigger error:", err);
        showToast(`⚠️ หากไฟล์ไม่เริ่มดาวน์โหลด ให้คลิกขวาที่รูปในหน้าต่าง แล้วเลือก Save image as`);
      }
    };

    function populateDepartmentDropdowns(selectedValue = null) {
      const select = document.getElementById('empDeptSelect');
      if (!select) return;

      const currentVal = selectedValue || select.value;

      select.innerHTML = '<option value="">-- กรุณาเลือกแผนก --</option>';

      let hasSelected = false;

      departmentsList.forEach(deptName => {
        const opt = document.createElement('option');
        opt.value = deptName;
        opt.textContent = deptName;
        if (deptName === currentVal) {
          opt.selected = true;
          hasSelected = true;
        }
        select.appendChild(opt);
      });

      if (currentVal && !hasSelected) {
        const opt = document.createElement('option');
        opt.value = currentVal;
        opt.textContent = `${currentVal} (แผนกเดิม)`;
        opt.selected = true;
        select.appendChild(opt);
      }
    }
    window.populateDepartmentDropdowns = populateDepartmentDropdowns;

    window.openManageDepartmentsModal = function() {
      renderDepartmentsListModal();
      const input = document.getElementById('newDeptNameInput');
      if (input) input.value = '';
      const modal = new bootstrap.Modal(document.getElementById('manageDepartmentsModal'));
      modal.show();
    };

    window.renderDepartmentsListModal = function() {
      const container = document.getElementById('departmentsListContainer');
      const badge = document.getElementById('deptCountBadge');
      if (!container) return;

      if (badge) badge.textContent = `ทั้งหมด ${departmentsList.length} รายการ`;

      if (departmentsList.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted fs-7"><i class="bi bi-inbox display-6 d-block mb-2 text-secondary"></i>ยังไม่มีรายการแผนก/สวนในระบบ</div>`;
        return;
      }

      let html = '';
      departmentsList.forEach((deptName, idx) => {
        const empCount = employeeList.filter(e => e.department === deptName).length;
        const deptCode = `DEP-${String(idx + 1).padStart(3, '0')}`;

        html += `
          <div class="list-group-item d-flex align-items-center justify-content-between p-2.5 border-bottom gap-2">
            <div class="d-flex align-items-center gap-2 overflow-hidden">
              <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 font-monospace fs-8 px-2 py-1">${deptCode}</span>
              <div>
                <div class="fw-bold text-dark fs-7 text-truncate" title="${deptName}">${deptName}</div>
                <div class="fs-8 text-muted"><i class="bi bi-people me-1"></i> มีพนักงานในแผนก: <span class="fw-semibold text-success">${empCount} คน</span></div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1 flex-shrink-0">
              <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-2 py-1 fs-8 fw-semibold" onclick="editDepartmentName('${encodeURIComponent(deptName)}')">
                <i class="bi bi-pencil me-1"></i> แก้ไข
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-2 py-1 fs-8 fw-semibold" onclick="deleteDepartmentName('${encodeURIComponent(deptName)}')">
                <i class="bi bi-trash me-1"></i> ลบ
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    };

    window.addNewDepartmentFromModal = async function() {
      const input = document.getElementById('newDeptNameInput');
      if (!input) return;

      const newName = input.value.trim();
      if (!newName) {
        alert("กรุณาระบุชื่อแผนกใหม่");
        return;
      }

      if (departmentsList.includes(newName)) {
        alert(`มีแผนก / สวนชื่อ "${newName}" อยู่ในระบบแล้ว`);
        return;
      }

      departmentsList.push(newName);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const qSnap = await getDocs(collection(db, "departments"));
          let maxNum = 0;
          qSnap.forEach(dSnap => {
            const match = dSnap.id.match(/^DEP-(\d+)$/i) || dSnap.id.match(/^dept_v3_(\d+)$/);
            if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
            }
          });
          const nextIndex = maxNum > 0 ? maxNum + 1 : (departmentsList.length || 1);
          const deptId = `DEP-${String(nextIndex).padStart(3, '0')}`;
          await setDoc(doc(db, "departments", deptId), { id: deptId, code: deptId, name: newName });
        } catch (err) {
          console.warn("Firestore add department notice:", err);
        }
      }

      input.value = '';
      renderDepartmentsListModal();
      populateDepartmentDropdowns(newName);

      if (typeof logAuditAction === 'function') {
        logAuditAction('แผนก/สวน', 'เพิ่ม', `เพิ่มแผนก/สวน "${newName}" เข้าสู่ระบบ`, newName);
      }

      showToast(`เพิ่มแผนก/สวน "${newName}" เข้าสู่ระบบเรียบร้อยแล้ว`);
    };

    window.editDepartmentName = async function(encodedOldName) {
      const oldName = decodeURIComponent(encodedOldName);
      const newName = prompt(`แก้ไขชื่อแผนก:`, oldName);

      if (newName === null) return;
      const trimmed = newName.trim();

      if (!trimmed) {
        alert("ชื่อแผนก / สวน ต้องไม่เป็นค่าว่าง");
        return;
      }

      if (trimmed === oldName) return;

      if (departmentsList.includes(trimmed)) {
        alert(`ชื่อแผนก / สวน "${trimmed}" มีอยู่ในระบบแล้ว`);
        return;
      }

      const idx = departmentsList.indexOf(oldName);
      if (idx !== -1) {
        departmentsList[idx] = trimmed;
      } else {
        departmentsList.push(trimmed);
      }

      let updatedCount = 0;
      employeeList.forEach(emp => {
        if (emp.department === oldName) {
          emp.department = trimmed;
          updatedCount++;

          if (isFirebaseReady && db) {
            try {
              updateDoc(doc(db, "employees", emp.id), { department: trimmed });
            } catch(e){}
          }
        }
      });

      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const qSnap = await getDocs(collection(db, "departments"));
          let updated = false;
          qSnap.forEach(async (dSnap) => {
            if (dSnap.data().name === oldName) {
              updated = true;
              await setDoc(doc(db, "departments", dSnap.id), { name: trimmed, code: dSnap.data().code || dSnap.id }, { merge: true });
            }
          });
          if (!updated) {
            let maxNum = 0;
            qSnap.forEach(dSnap => {
              const match = dSnap.id.match(/^DEP-(\d+)$/i) || dSnap.id.match(/^dept_v3_(\d+)$/);
              if (match) {
                const n = parseInt(match[1], 10);
                if (n > maxNum) maxNum = n;
              }
            });
            const nextIndex = maxNum > 0 ? maxNum + 1 : (departmentsList.length || 1);
            const deptId = `DEP-${String(nextIndex).padStart(3, '0')}`;
            await setDoc(doc(db, "departments", deptId), { id: deptId, code: deptId, name: trimmed });
          }
        } catch(err) {
          console.warn("Firestore edit department notice:", err);
        }
      }

      renderDepartmentsListModal();
      populateDepartmentDropdowns(trimmed);
      renderEmployeeDirectory();
      populateEmployeeDropdowns();

      showToast(`อัปเดตชื่อแผนก/สวนเป็น "${trimmed}" เรียบร้อยแล้ว (อัปเดตพนักงาน ${updatedCount} คน)`);
    };

    window.deleteDepartmentName = async function(encodedDeptName) {
      const deptName = decodeURIComponent(encodedDeptName);
      const empCount = employeeList.filter(e => e.department === deptName).length;

      const confirmMsg = empCount > 0 
        ? `มีพนักงานในแผนกนี้ ${empCount} คน ต้องการลบแผนก "${deptName}" ออกจากรายการหรือไม่?` 
        : `ต้องการลบแผนก/สวน "${deptName}" หรือไม่?`;

      const ok = await window.showConfirmDialog({
        title: "ลบแผนก/สวน",
        message: confirmMsg,
        type: "danger",
        confirmText: "ลบแผนก"
      });
      if (!ok) return;

      departmentsList = departmentsList.filter(d => d !== deptName);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const qSnap = await getDocs(collection(db, "departments"));
          qSnap.forEach(async (dSnap) => {
            if (dSnap.data().name === deptName || dSnap.id === deptName) {
              await deleteDoc(dSnap.ref);
            }
          });
        } catch(err) {
          console.warn("Firestore delete department notice:", err);
        }
      }

      renderDepartmentsListModal();
      populateDepartmentDropdowns();

      if (typeof logAuditAction === 'function') {
        logAuditAction('แผนก/สวน', 'ลบ', `ลบแผนก/สวน "${deptName}" ออกจากระบบ`, deptName);
      }

      showToast(`ลบแผนก/สวน "${deptName}" ออกจากระบบเรียบร้อยแล้ว`);
    };

    // ==================== LOCATIONS LIST MANAGEMENT ====================
    function populateLocationDropdowns(selectedLoc = '') {
      const locSelects = document.querySelectorAll('.location-select-picker, #equipLocationInput');
      locSelects.forEach(select => {
        const curVal = selectedLoc || select.value;
        let html = '<option value="">เลือกสถานที่จัดเก็บ</option>';
        (locationsList || []).forEach(loc => {
          html += `<option value="${loc}">${loc}</option>`;
        });
        select.innerHTML = html;
        if (curVal) {
          if (!Array.from(select.options).some(opt => opt.value === curVal)) {
            const opt = document.createElement('option');
            opt.value = curVal;
            opt.textContent = curVal;
            select.appendChild(opt);
          }
          select.value = curVal;
        }
      });
    }
    window.populateLocationDropdowns = populateLocationDropdowns;

    window.openManageLocationsModal = function() {
      renderLocationsListModal();
      const input = document.getElementById('newLocationNameInput');
      if (input) input.value = '';
      const modalElem = document.getElementById('manageLocationsModal');
      if (modalElem) {
        const modal = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
        modal.show();
      }
    };

    window.renderLocationsListModal = function() {
      const container = document.getElementById('locationsListContainer');
      const badge = document.getElementById('locCountBadge');
      if (!container) return;

      if (badge) badge.textContent = `ทั้งหมด ${locationsList.length} รายการ`;

      if (!locationsList || locationsList.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted fs-7"><i class="bi bi-geo-alt display-6 d-block mb-2 text-secondary"></i>ยังไม่มีรายการสถานที่เก็บอุปกรณ์ในระบบ</div>`;
        return;
      }

      let html = '';
      locationsList.forEach((locName, idx) => {
        const equipCount = (equipmentList || []).filter(e => e.location === locName).length;
        const locCode = `LOC-${String(idx + 1).padStart(3, '0')}`;

        html += `
          <div class="list-group-item d-flex align-items-center justify-content-between p-2.5 border-bottom gap-2">
            <div class="d-flex align-items-center gap-2 overflow-hidden">
              <span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 font-monospace fs-8 px-2 py-1">${locCode}</span>
              <div>
                <div class="fw-bold text-dark fs-7 text-truncate" title="${locName}">${locName}</div>
                <div class="fs-8 text-muted"><i class="bi bi-tools me-1"></i> มีอุปกรณ์จัดเก็บที่นี่: <span class="fw-semibold text-danger">${equipCount} รายการ</span></div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-1 flex-shrink-0">
              <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-2 py-1 fs-8 fw-semibold" onclick="editLocationName('${encodeURIComponent(locName)}')">
                <i class="bi bi-pencil me-1"></i> แก้ไข
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-2 py-1 fs-8 fw-semibold" onclick="deleteLocationName('${encodeURIComponent(locName)}')">
                <i class="bi bi-trash me-1"></i> ลบ
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    };

    window.addNewLocationFromModal = async function() {
      const input = document.getElementById('newLocationNameInput');
      if (!input) return;

      const newName = input.value.trim();
      if (!newName) {
        alert("ระบุชื่อสถานที่จัดเก็บใหม่");
        return;
      }

      if (locationsList.includes(newName)) {
        alert(`มีสถานที่จัดเก็บชื่อ "${newName}" อยู่ในระบบแล้ว`);
        return;
      }

      locationsList.push(newName);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const qSnap = await getDocs(collection(db, "locations"));
          let maxNum = 0;
          qSnap.forEach(lSnap => {
            const match = lSnap.id.match(/^LOC-(\d+)$/i);
            if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
            }
          });
          const nextIndex = maxNum > 0 ? maxNum + 1 : (locationsList.length || 1);
          const locId = `LOC-${String(nextIndex).padStart(3, '0')}`;
          await setDoc(doc(db, "locations", locId), { id: locId, code: locId, name: newName });
        } catch (err) {
          console.warn("Firestore add location notice:", err);
        }
      }

      input.value = '';
      renderLocationsListModal();
      populateLocationDropdowns(newName);

      if (typeof logAuditAction === 'function') {
        logAuditAction('สถานที่จัดเก็บ', 'เพิ่ม', `เพิ่มสถานที่จัดเก็บอุปกรณ์ใหม่ "${newName}"`, newName);
      }

      showToast(`📍 เพิ่มสถานที่จัดเก็บ "${newName}" เรียบร้อยแล้ว`);
    };

    window.editLocationName = async function(encodedOldName) {
      const oldName = decodeURIComponent(encodedOldName);
      const newName = prompt(`แก้ไขชื่อสถานที่จัดเก็บ:`, oldName);

      if (newName === null) return;
      const trimmed = newName.trim();

      if (!trimmed) {
        alert("ชื่อสถานที่จัดเก็บต้องไม่เป็นค่าว่าง");
        return;
      }

      if (trimmed === oldName) return;

      if (locationsList.includes(trimmed)) {
        alert(`ชื่อสถานที่จัดเก็บ "${trimmed}" มีอยู่ในระบบแล้ว`);
        return;
      }

      const idx = locationsList.indexOf(oldName);
      if (idx !== -1) {
        locationsList[idx] = trimmed;
      } else {
        locationsList.push(trimmed);
      }

      let updatedCount = 0;
      (equipmentList || []).forEach(item => {
        if (item.location === oldName) {
          item.location = trimmed;
          updatedCount++;

          if (isFirebaseReady && db) {
            try {
              updateDoc(doc(db, "equipment", item.id), { location: trimmed });
            } catch(e){}
          }
        }
      });

      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const qSnap = await getDocs(collection(db, "locations"));
          let updated = false;
          qSnap.forEach(async (lSnap) => {
            if (lSnap.data().name === oldName) {
              updated = true;
              await setDoc(doc(db, "locations", lSnap.id), { name: trimmed, code: lSnap.data().code || lSnap.id }, { merge: true });
            }
          });
          if (!updated) {
            let maxNum = 0;
            qSnap.forEach(lSnap => {
              const match = lSnap.id.match(/^LOC-(\d+)$/i);
              if (match) {
                const n = parseInt(match[1], 10);
                if (n > maxNum) maxNum = n;
              }
            });
            const nextIndex = maxNum > 0 ? maxNum + 1 : (locationsList.length || 1);
            const locId = `LOC-${String(nextIndex).padStart(3, '0')}`;
            await setDoc(doc(db, "locations", locId), { id: locId, code: locId, name: trimmed });
          }
        } catch(err) {
          console.warn("Firestore edit location notice:", err);
        }
      }

      renderLocationsListModal();
      populateLocationDropdowns(trimmed);
      if (typeof renderCatalogGrid === 'function') renderCatalogGrid();

      if (typeof logAuditAction === 'function') {
        logAuditAction('สถานที่จัดเก็บ', 'แก้ไข', `แก้ไขชื่อสถานที่จัดเก็บจาก "${oldName}" เป็น "${trimmed}" (อัปเดตอุปกรณ์ ${updatedCount} รายการ)`, trimmed);
      }

      showToast(`✏️ อัปเดตชื่อสถานที่จัดเก็บเป็น "${trimmed}" เรียบร้อยแล้ว (อัปเดตอุปกรณ์ ${updatedCount} รายการ)`);
    };

    window.deleteLocationName = async function(encodedLocName) {
      const locName = decodeURIComponent(encodedLocName);
      const equipCount = (equipmentList || []).filter(e => e.location === locName).length;

      const confirmMsg = equipCount > 0
        ? `มีอุปกรณ์ในสถานที่นี้ ${equipCount} รายการ ต้องการลบสถานที่ "${locName}" หรือไม่?`
        : `ต้องการลบสถานที่จัดเก็บ "${locName}" ออกจากรายการหรือไม่?`;

      const ok = await window.showConfirmDialog({
        title: "ลบสถานที่จัดเก็บ",
        message: confirmMsg,
        type: "danger",
        confirmText: "ลบสถานที่"
      });
      if (!ok) return;

      locationsList = locationsList.filter(l => l !== locName);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const qSnap = await getDocs(collection(db, "locations"));
          qSnap.forEach(async (lSnap) => {
            if (lSnap.data().name === locName || lSnap.id === locName) {
              await deleteDoc(lSnap.ref);
            }
          });
        } catch(err) {
          console.warn("Firestore delete location notice:", err);
        }
      }

      renderLocationsListModal();
      populateLocationDropdowns();

      if (typeof logAuditAction === 'function') {
        logAuditAction('สถานที่จัดเก็บ', 'ลบ', `ลบสถานที่จัดเก็บอุปกรณ์ "${locName}" ออกจากระบบ`, locName);
      }

      showToast(`🗑️ ลบสถานที่จัดเก็บ "${locName}" ออกจากระบบเรียบร้อยแล้ว`);
    };

    window.deleteEmployee = async function(empId) {
      const emp = employeeList.find(x => x.id === empId);
      if (!emp) return;

      const ok = await window.showConfirmDialog({
        title: "ลบข้อมูลพนักงาน",
        message: `ต้องการลบพนักงาน "${emp.name}" [${emp.id}] หรือไม่?`,
        type: "danger",
        confirmText: "ลบพนักงาน"
      });
      if (ok) {
        employeeList = employeeList.filter(x => x.id !== empId);
        saveToLocalStorage();
        if (isFirebaseReady && db) {
          try { await deleteDoc(doc(db, "employees", empId)); } catch(e){}
        }

        if (typeof logAuditAction === 'function') {
          logAuditAction('บุคลากร', 'ลบ', `ลบข้อมูลบุคลากร "${emp.name}" [${emp.id}] (แผนก: ${emp.department || '-'})`, empId);
        }

        showToast(`ลบข้อมูลพนักงาน "${emp.name}" และรูปถ่ายเรียบร้อยแล้ว`);
        renderEmployeeDirectory();
        populateEmployeeDropdowns();
        updateStats();
      }
    };

    window.quickSelectTransaction = function(equipId) {
      const select = document.getElementById('equipSelect');
      select.value = equipId;
      select.dispatchEvent(new Event('change'));

      const transTabBtn = new bootstrap.Tab(document.getElementById('transaction-tab'));
      transTabBtn.show();
    };

    window.openEditModal = function(id) {
      const item = equipmentList.find(x => x.id === id);
      if (!item) return;

      document.getElementById('editEquipId').value = item.id;
      document.getElementById('equipModalTitle').innerHTML = '<i class="bi bi-pencil-square me-2"></i>แก้ไขรายการอุปกรณ์การเกษตร';
      document.getElementById('equipNameThai').value = item.name;
      document.getElementById('equipCodeInput').value = item.code;
      document.getElementById('equipCategorySelect').value = item.category;
      document.getElementById('equipQtyInput').value = item.quantity;
      if (document.getElementById('equipMinQtyInput')) document.getElementById('equipMinQtyInput').value = item.minQuantity !== undefined ? item.minQuantity : 3;
      document.getElementById('equipUnitInput').value = item.unit;
      populateLocationDropdowns(item.location || '');
      document.getElementById('equipLocationInput').value = item.location || '';
      document.getElementById('equipManualImgUrl').value = item.imageUrl;
      document.getElementById('equipDescInput').value = item.description;

      const img = document.getElementById('equipImgPreview');
      const box = document.getElementById('equipImgPreviewBox');
      if (img && box && item.imageUrl) {
        img.src = item.imageUrl;
        box.classList.remove('d-none');
      }

      const modal = new bootstrap.Modal(document.getElementById('addEquipmentModal'));
      modal.show();
    };

    window.openAddEquipmentModal = function() {
      resetAddModal();
      const modalElem = document.getElementById('addEquipmentModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    window.resetAddModal = function() {
      document.getElementById('addEquipmentForm').reset();
      document.getElementById('editEquipId').value = '';
      document.getElementById('equipCodeInput').value = '';
      if (document.getElementById('equipMinQtyInput')) document.getElementById('equipMinQtyInput').value = 3;
      document.getElementById('equipModalTitle').innerHTML = '<i class="bi bi-plus-circle me-2"></i>เพิ่มรายการอุปกรณ์การเกษตรใหม่';
      document.getElementById('autoSearchLoadingOverlay').classList.add('d-none');
      populateLocationDropdowns();
      const box = document.getElementById('equipImgPreviewBox');
      if (box) box.classList.add('d-none');

      if (typeof updateEquipmentCodeForCategory === 'function') {
        updateEquipmentCodeForCategory();
      }
    };

    window.deleteEquipment = async function(id, skipConfirm = false) {
      if (!id) return;
      const targetStr = String(id).trim().toLowerCase();

      // Find item in equipmentList (by id, code, or lower-case match)
      const item = equipmentList.find(x => 
        (x.id && String(x.id).trim().toLowerCase() === targetStr) || 
        (x.code && String(x.code).trim().toLowerCase() === targetStr)
      ) || equipmentList.find(x =>
        (x.id && String(x.id).trim().toLowerCase().includes(targetStr)) ||
        (x.code && String(x.code).trim().toLowerCase().includes(targetStr))
      );

      const displayName = item ? item.name : id;
      const displayCode = item ? (item.code || item.id) : id;

      if (!skipConfirm) {
        const ok = await window.showConfirmDialog({
          title: "ลบอุปกรณ์",
          message: `ต้องการลบอุปกรณ์ "${displayName}" [${displayCode}] หรือไม่?`,
          type: "danger",
          confirmText: "ลบอุปกรณ์"
        });
        if (!ok) return;
      }

      // Filter out matching items from memory
      equipmentList = equipmentList.filter(x => {
        const xId = x.id ? String(x.id).trim().toLowerCase() : '';
        const xCode = x.code ? String(x.code).trim().toLowerCase() : '';
        if (item) {
          const itemId = item.id ? String(item.id).trim().toLowerCase() : '';
          const itemCode = item.code ? String(item.code).trim().toLowerCase() : '';
          if (itemId && xId === itemId) return false;
          if (itemCode && xCode === itemCode) return false;
        }
        if (targetStr && (xId === targetStr || xCode === targetStr)) return false;
        return true;
      });

      saveToLocalStorage();

      // Delete from Firestore (both by document ID and by querying fields)
      if (isFirebaseReady && db) {
        try {
          if (item && item.id) await deleteDoc(doc(db, "equipment", item.id));
          if (item && item.code && item.code !== item.id) await deleteDoc(doc(db, "equipment", item.code));
          await deleteDoc(doc(db, "equipment", String(id)));

          // Query Firestore collection to purge any doc with code == target or id == target
          const eqCol = collection(db, "equipment");
          const qSnap = await getDocs(eqCol);
          qSnap.forEach(async (dSnap) => {
            const data = dSnap.data();
            const dCode = data.code ? String(data.code).trim().toLowerCase() : '';
            const dId = data.id ? String(data.id).trim().toLowerCase() : '';
            const docId = dSnap.id ? String(dSnap.id).trim().toLowerCase() : '';

            if (
              (item && (
                (item.id && (dId === String(item.id).toLowerCase() || docId === String(item.id).toLowerCase())) ||
                (item.code && dCode === String(item.code).toLowerCase())
              )) ||
              dCode === targetStr || dId === targetStr || docId === targetStr
            ) {
              console.log("Purging matching Firestore document:", dSnap.id);
              await deleteDoc(dSnap.ref);
            }
          });
        } catch(e) {
          console.warn("Firestore delete equipment notice:", e);
        }
      }

      if (typeof logAuditAction === 'function') {
        logAuditAction('อุปกรณ์', 'ลบ', `ลบรายการอุปกรณ์ "${displayName}" [${displayCode}]`, id);
      }

      showToast(`ลบรายการอุปกรณ์ "${displayName}" [${displayCode}] เรียบร้อยแล้ว`);
      renderCatalogGrid();
      renderStaffTable();
      populateEquipmentDropdown();
      populateQuickScanDropdown();
      updateStats();
      if (typeof renderDbEditorTable === 'function') renderDbEditorTable();
    };

    // Database Inspector Functions
    window.openDatabaseInspector = function() {
      document.getElementById('dbCountEmp').textContent = employeeList.length;
      document.getElementById('dbCountEquip').textContent = equipmentList.length;
      document.getElementById('dbCountTx').textContent = transactionHistory.length;
      document.getElementById('dbCountAtt').textContent = attendanceLogs.length;

      document.getElementById('dbEmpJsonCode').textContent = JSON.stringify(employeeList, null, 2);
      document.getElementById('dbEquipJsonCode').textContent = JSON.stringify(equipmentList, null, 2);
      document.getElementById('dbTxJsonCode').textContent = JSON.stringify(transactionHistory, null, 2);
      document.getElementById('dbAttJsonCode').textContent = JSON.stringify(attendanceLogs, null, 2);
    };

    window.exportDatabaseJson = function() {
      const fullBackup = {
        exportedAt: new Date().toISOString(),
        databaseName: "Flora Garden App Database",
        collections: {
          employees: employeeList,
          equipment: equipmentList,
          transactions: transactionHistory,
          attendance: attendanceLogs
        }
      };
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestampStr = typeof window.getThaiDateTimeFilenameString === 'function' ? window.getThaiDateTimeFilenameString() : new Date().toISOString().slice(0,10);
      a.download = `flora_garden_database_${timestampStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("ส่งออกข้อมูล JSON ของฐานข้อมูลเรียบร้อยแล้ว");
    };

    window.clearDatabaseCache = async function() {
      if (currentRole !== 'ADMIN') {
        showToast("⚠️ เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ล้างแคช");
        return;
      }
      const ok = await window.showConfirmDialog({
        title: "ล้างแคชฐานข้อมูล",
        message: "ต้องการล้างแคชข้อมูลในเครื่องและโหลดข้อมูลสดจากเซิร์ฟเวอร์ใหม่หรือไม่?",
        type: "warning",
        icon: "bi-arrow-clockwise",
        confirmText: "ล้างแคชและรีโหลด"
      });
      if (ok) {
        try {
          localStorage.removeItem('flora_employees');
          localStorage.removeItem('flora_equipment');
          localStorage.removeItem('flora_transactions');
          localStorage.removeItem('flora_attendance');
          localStorage.removeItem('flora_categories');
          localStorage.removeItem('flora_departments');
          
          localStorage.setItem('flora_db_initialized', 'true');
          localStorage.setItem('flora_fs_seeded_employees', 'true');
          localStorage.setItem('flora_fs_seeded_attendance', 'true');
          localStorage.setItem('flora_fs_seeded_categories', 'true');
          localStorage.setItem('flora_fs_seeded_equipment', 'true');
          
          if (typeof showToast === 'function') {
            showToast("🧹 ล้างแคชฐานข้อมูลเรียบร้อยแล้ว กำลังดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์...");
          }
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (err) {
          console.warn("Clear cache notice:", err);
          window.location.reload();
        }
      }
    };

    // Function to show the custom confirmation modal for database purge (PRESERVING Firebase Storage images)
    window.purgeEntireDatabaseAndStorage = function() {
      const modalEl = document.getElementById('confirmPurgeDbModal');
      const chk = document.getElementById('chkConfirmPurgeDb');
      const btn = document.getElementById('btnConfirmPurgeDbAction');
      
      if (chk) chk.checked = false;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-trash3-fill me-1.5"></i> ยืนยันลบฐานข้อมูลทันที';
      }

      if (modalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
      } else {
        // Fallback confirmation
        const c1 = confirm("⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการ 'ลบฐานข้อมูลทั้งหมด' ?\n\n*หมายเหตุ: จะไม่ลบไฟล์รูปภาพใน Firebase Storage (รูปภาพจะยังคงอยู่ใน Storage ปลอดภัย)*");
        if (c1) {
          window.executeConfirmedPurgeDatabase();
        }
      }
    };

    // Execute the confirmed database purge
    window.executeConfirmedPurgeDatabase = async function() {
      const modalEl = document.getElementById('confirmPurgeDbModal');
      const btn = document.getElementById('btnConfirmPurgeDbAction');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true"></span> กำลังลบฐานข้อมูล...';
      }

      if (typeof showToast === 'function') {
        showToast("⏳ กำลังเริ่มประมวลผลลบเอกสารฐานข้อมูลใน Firestore (คงรูปภาพใน Storage)...");
      }

      let deletedDocsCount = 0;

      try {
        // NOTE: We DO NOT delete images from Firebase Storage here as requested.
        // Storage images remain intact and preserved in Firebase Storage.

        // 1. Delete all documents in Firestore collections if Firestore ready
        if (isFirebaseReady && db) {
          const collectionsToPurge = ["equipment", "employees", "transactions", "attendance", "categories", "departments", "locations", "system_metadata", "audit_logs"];
          for (const colName of collectionsToPurge) {
            try {
              const colRef = collection(db, colName);
              const qSnap = await getDocs(colRef);
              for (const dSnap of qSnap.docs) {
                await deleteDoc(dSnap.ref);
                deletedDocsCount++;
              }
            } catch (fErr) {
              console.warn(`Firestore collection purge notice (${colName}):`, fErr.message);
            }
          }
        }

        // 2. Clear local memory arrays
        equipmentList = [];
        employeeList = [];
        transactionHistory = [];
        attendanceLogs = [];
        auditLogs = [];
        categoriesList = [];
        departmentsList = [];
        locationsList = [];
        window.departmentsList = [];
        window.locationsList = [];

        // 3. Clear LocalStorage keys
        localStorage.removeItem('flora_employees');
        localStorage.removeItem('flora_equipment');
        localStorage.removeItem('flora_transactions');
        localStorage.removeItem('flora_attendance');
        localStorage.removeItem('flora_audit_logs');
        localStorage.removeItem('flora_categories');
        localStorage.removeItem('flora_departments');
        localStorage.removeItem('flora_locations');
        localStorage.removeItem('flora_db_initialized');
        localStorage.removeItem('flora_fs_seeded_employees');
        localStorage.removeItem('flora_fs_seeded_attendance');
        localStorage.removeItem('flora_fs_seeded_categories');
        localStorage.removeItem('flora_fs_seeded_equipment');
        localStorage.removeItem('flora_fs_seeded_locations');

        saveToLocalStorage();

        // 4. Refresh UI components
        renderCatalogGrid();
        renderStaffTable();
        renderHistoryTable();
        renderEmployeeDirectory();
        renderAttendanceTable();
        populateEmployeeDropdowns();
        populateEquipmentDropdown();
        populateQuickScanDropdown();
        populateLocationDropdowns();
        populateDepartmentDropdowns();
        if (typeof renderLocationsListModal === 'function') renderLocationsListModal();
        if (typeof renderDepartmentsListModal === 'function') renderDepartmentsListModal();
        if (typeof renderCategoryManagementList === 'function') renderCategoryManagementList();
        if (typeof renderAuditLogsTable === 'function') renderAuditLogsTable();
        updateStats();

        if (typeof renderDbEditorTable === 'function') renderDbEditorTable();
        if (typeof openDatabaseInspector === 'function') openDatabaseInspector();

        // Hide confirmation modal
        if (modalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
        }

        showToast(`🗑️ ลบฐานข้อมูลสำเร็จแล้ว (${deletedDocsCount} รายการ) รวมถึง locations ใน Firestore เรียบร้อยแล้ว`);
      } catch (err) {
        console.error("Purge error:", err);
        if (typeof showToast === 'function') {
          showToast("❌ เกิดข้อผิดพลาดขณะลบฐานข้อมูล: " + err.message);
        } else {
          alert("เกิดข้อผิดพลาดขณะลบฐานข้อมูล: " + err.message);
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash3-fill me-1.5"></i> ยืนยันลบฐานข้อมูลทันที';
        }
      }
    };

    // Function to scan and purge only orphaned/unused images from Firebase Storage
    window.scanAndCleanupOrphanedStorageImages = async function() {
      if (!isFirebaseReady || !storage) {
        showToast("⚠️ Firebase Storage ยังไม่พร้อมใช้งาน กรุณาตรวจสอบการเชื่อมต่อระบบคลาวด์");
        return;
      }

      showToast("🔍 กำลังสแกนตรวจสอบไฟล์รูปภาพขยะใน Firebase Storage...");

      try {
        // 1. Gather all active image URLs / paths in use
        const activeImagePaths = new Set();
        (equipmentList || []).forEach(eq => {
          if (eq && eq.imageUrl) activeImagePaths.add(String(eq.imageUrl));
        });
        (employeeList || []).forEach(emp => {
          if (emp && emp.photoUrl) activeImagePaths.add(String(emp.photoUrl));
        });

        // Convert URLs into readable decoded strings for matching
        const decodedActiveStrings = new Set();
        activeImagePaths.forEach(urlStr => {
          try {
            decodedActiveStrings.add(decodeURIComponent(urlStr));
          } catch (e) {
            decodedActiveStrings.add(urlStr);
          }
        });

        // 2. Scan Storage folders
        const folders = ["equipment_images", "employee_photos", "uploads"];
        let totalFilesScanned = 0;
        const orphanedItems = [];

        for (const folder of folders) {
          try {
            const folderRef = ref(storage, folder);
            const res = await listAll(folderRef);
            totalFilesScanned += res.items.length;

            for (const itemRef of res.items) {
              const fullPath = itemRef.fullPath; // e.g. "equipment_images/item1.jpeg"
              const fileName = itemRef.name;     // e.g. "item1.jpeg"

              let isUsed = false;
              for (const activeStr of decodedActiveStrings) {
                if (activeStr.includes(fullPath) || activeStr.includes(fileName)) {
                  isUsed = true;
                  break;
                }
              }

              if (!isUsed) {
                orphanedItems.push(itemRef);
              }
            }
          } catch (folderErr) {
            console.warn(`Storage folder scan notice (${folder}):`, folderErr.message);
          }
        }

        if (orphanedItems.length === 0) {
          showToast(`✅ ไม่พบไฟล์รูปภาพขยะใน Storage (${totalFilesScanned} ไฟล์ใช้งานปกติ)`);
          return;
        }

        // 3. Prompt user for deletion
        const ok = await window.showConfirmDialog({
          title: "ลบไฟล์รูปภาพขยะ",
          message: `พบรูปภาพตกค้างไม่ได้ใช้ ${orphanedItems.length} ไฟล์ ต้องการลบเพื่อคืนพื้นที่ Storage หรือไม่?`,
          type: "danger",
          icon: "bi-trash3-fill",
          confirmText: `ลบ ${orphanedItems.length} ไฟล์`
        });
        if (!ok) return;

        showToast(`⏳ กำลังลบไฟล์รูปภาพขยะ ${orphanedItems.length} ไฟล์ ออกจาก Firebase Storage...`);

        let deletedCount = 0;
        for (const itemRef of orphanedItems) {
          try {
            await deleteObject(itemRef);
            deletedCount++;
          } catch (delErr) {
            console.warn(`Failed to delete orphaned storage item ${itemRef.fullPath}:`, delErr);
          }
        }

        if (typeof logAuditAction === 'function') {
          logAuditAction('STORAGE_CLEANUP', currentUser ? currentUser.displayName || currentUser.email : 'Admin', `สแกนและลบไฟล์รูปภาพขยะใน Firebase Storage จำนวน ${deletedCount} ไฟล์`);
        }

        alert(`🎉 ลบไฟล์รูปภาพขยะใน Firebase Storage เรียบร้อยแล้ว!\n\n• ลบไฟล์ขยะตกค้างสำเร็จ: ${deletedCount} ไฟล์\n• คืนพื้นที่ Storage ให้ระบบเรียบร้อยแล้วครับ`);
        showToast(`🧹 ลบรูปภาพขยะ ${deletedCount} ไฟล์ เรียบร้อยแล้ว!`);

      } catch (err) {
        console.error("scanAndCleanupOrphanedStorageImages error:", err);
        alert("เกิดข้อผิดพลาดในการสแกนไฟล์รูปภาพขยะ: " + err.message);
      }
    };


    // Category Management Functions
    function renderCategoryDropdowns() {
      const catalogSelect = document.getElementById('catalogCategorySelect');
      const equipSelect = document.getElementById('equipCategorySelect');
      const staffCatSelect = document.getElementById('staffCategorySelect');

      const selectedCatalog = catalogSelect ? catalogSelect.value : 'ALL';
      const selectedEquip = equipSelect ? equipSelect.value : '';
      const selectedStaffCat = staffCatSelect ? staffCatSelect.value : 'ALL';

      if (catalogSelect) {
        let catHtml = '<option value="ALL">-- ทุกหมวดหมู่อุปกรณ์ --</option>';
        categoriesList.forEach(cat => {
          const display = cat.label ? `${cat.icon ? cat.icon + ' ' : ''}${cat.label}` : `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`;
          catHtml += `<option value="${cat.name}">${display}</option>`;
        });
        catalogSelect.innerHTML = catHtml;
        if (categoriesList.some(c => c.name === selectedCatalog) || selectedCatalog === 'ALL') {
          catalogSelect.value = selectedCatalog;
        } else {
          catalogSelect.value = 'ALL';
        }
      }

      if (staffCatSelect) {
        let staffCatHtml = '<option value="ALL">-- ทุกหมวดหมู่ --</option>';
        categoriesList.forEach(cat => {
          const display = cat.label ? `${cat.icon ? cat.icon + ' ' : ''}${cat.label}` : `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`;
          staffCatHtml += `<option value="${cat.name}">${display}</option>`;
        });
        staffCatSelect.innerHTML = staffCatHtml;
        if (categoriesList.some(c => c.name === selectedStaffCat) || selectedStaffCat === 'ALL') {
          staffCatSelect.value = selectedStaffCat;
        } else {
          staffCatSelect.value = 'ALL';
        }
      }

      if (equipSelect) {
        let equipCatHtml = '<option value="">-- เลือกหมวดหมู่ --</option>';
        categoriesList.forEach(cat => {
          const display = cat.label ? `${cat.icon ? cat.icon + ' ' : ''}${cat.label}` : `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`;
          equipCatHtml += `<option value="${cat.name}">${display}</option>`;
        });
        equipSelect.innerHTML = equipCatHtml;
        if (categoriesList.some(c => c.name === selectedEquip)) {
          equipSelect.value = selectedEquip;
        }
      }
    }

    window.openCategoryModal = function() {
      resetCategoryForm();
      renderCategoryManagementList();
    };

    window.renderCategoryManagementList = function() {
      const tbody = document.getElementById('categoryTableBody');
      if (!tbody) return;

      if (!categoriesList || categoriesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">ยังไม่มีหมวดหมู่อุปกรณ์</td></tr>`;
        return;
      }

      let html = '';
      categoriesList.forEach((cat, idx) => {
        const itemCount = equipmentList.filter(eq => eq.category === cat.name).length;
        const catCode = cat.code || (cat.id && cat.id.startsWith('CAT-') ? cat.id : `CAT-${String(idx + 1).padStart(3, '0')}`);

        html += `
          <tr>
            <td class="text-center"><span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 font-monospace fs-8 px-2 py-1">${catCode}</span></td>
            <td class="text-center fs-5">${cat.icon || '📦'}</td>
            <td class="fw-bold text-dark">
              ${cat.name}
              ${cat.prefix ? `<span class="badge bg-secondary bg-opacity-10 text-secondary border ms-1 fs-8">${cat.prefix}</span>` : ''}
            </td>
            <td class="text-secondary">${cat.label || '-'}</td>
            <td class="text-center"><span class="badge bg-light text-dark border">${itemCount} รายการ</span></td>
            <td class="text-end pe-3">
              <button class="btn btn-sm btn-outline-primary rounded-circle me-1" title="แก้ไขหมวดหมู่" onclick="editCategory('${cat.id}')">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger rounded-circle" title="ลบหมวดหมู่" onclick="deleteCategory('${cat.id}')">
                <i class="bi bi-trash-fill"></i>
              </button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    };

    window.handleSaveCategory = async function(e) {
      if (e) e.preventDefault();

      const editId = document.getElementById('editCatId').value;
      const name = document.getElementById('catNameInput').value.trim();
      const icon = document.getElementById('catIconInput').value.trim();
      const label = document.getElementById('catLabelInput').value.trim();

      if (!name) {
        showToast("กรุณาระบุชื่อหมวดหมู่");
        return;
      }

      const existingIndex = categoriesList.findIndex(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== editId);
      if (existingIndex !== -1) {
        showToast("ชื่อหมวดหมู่นี้มีอยู่แล้วในระบบ");
        return;
      }

      let oldName = null;
      let targetCatId = editId;
      if (editId) {
        const catIdx = categoriesList.findIndex(c => c.id === editId);
        if (catIdx !== -1) {
          oldName = categoriesList[catIdx].name;
          const catPrefix = getCategoryPrefix(name);
          const code = categoriesList[catIdx].code || (editId.startsWith('CAT-') ? editId : `CAT-${String(catIdx + 1).padStart(3, '0')}`);
          categoriesList[catIdx] = {
            ...categoriesList[catIdx],
            code,
            name,
            prefix: catPrefix,
            icon: icon || '📦',
            label: label || name
          };

          if (oldName && oldName !== name) {
            equipmentList.forEach(item => {
              if (item.category === oldName) {
                item.category = name;
              }
            });
          }
        }
        showToast("แก้ไขหมวดหมู่อุปกรณ์เรียบร้อยแล้ว");
      } else {
        let maxNum = 0;
        categoriesList.forEach(c => {
          const match = (c.code || c.id || '').match(/^CAT-(\d+)$/i);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNum) maxNum = n;
          }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : (categoriesList.length + 1);
        const catCode = `CAT-${String(nextNum).padStart(3, '0')}`;
        targetCatId = catCode;
        const catPrefix = getCategoryPrefix(name);
        const newCat = {
          id: catCode,
          code: catCode,
          name,
          prefix: catPrefix,
          icon: icon || '📦',
          label: label || name
        };
        categoriesList.push(newCat);
        showToast("เพิ่มหมวดหมู่อุปกรณ์ใหม่เรียบร้อยแล้ว");
      }

      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          const catPrefix = getCategoryPrefix(name);
          if (editId) {
            const found = categoriesList.find(c => c.id === editId);
            await setDoc(doc(db, "categories", editId), {
              id: editId,
              code: (found && found.code) ? found.code : editId,
              name,
              prefix: catPrefix,
              icon: icon || '📦',
              label: label || name
            }, { merge: true });
          } else {
            const newCat = categoriesList.find(c => c.id === targetCatId) || categoriesList[categoriesList.length - 1];
            if (newCat && newCat.id) {
              await setDoc(doc(db, "categories", newCat.id), newCat);
            }
          }
        } catch (err) {
          console.warn("Firestore category sync error:", err);
        }
      }

      if (typeof logAuditAction === 'function') {
        const actionType = editId ? 'แก้ไข' : 'เพิ่ม';
        const detailsText = editId ? `แก้ไขหมวดหมู่อุปกรณ์ "${name}"` : `เพิ่มหมวดหมู่อุปกรณ์ใหม่ "${name}"`;
        logAuditAction('หมวดหมู่', actionType, detailsText, editId || (categoriesList[categoriesList.length - 1]?.id || ''));
      }

      renderCategoryDropdowns();
      renderCategoryManagementList();
      renderCatalogGrid();
      renderStaffTable();
      resetCategoryForm();
    };

    window.editCategory = function(catId) {
      const cat = categoriesList.find(c => c.id === catId);
      if (!cat) return;

      document.getElementById('editCatId').value = cat.id;
      document.getElementById('catNameInput').value = cat.name;
      document.getElementById('catIconInput').value = cat.icon || '';
      document.getElementById('catLabelInput').value = cat.label || '';

      document.getElementById('catFormHeader').innerHTML = '<i class="bi bi-pencil-square me-1"></i> แก้ไขหมวดหมู่อุปกรณ์';
      document.getElementById('btnSaveCat').innerHTML = '<i class="bi bi-check-lg me-1"></i> บันทึกการแก้ไข';
      document.getElementById('btnCancelEditCat').classList.remove('d-none');
    };

    window.resetCategoryForm = function() {
      document.getElementById('editCatId').value = '';
      document.getElementById('catNameInput').value = '';
      document.getElementById('catIconInput').value = '';
      document.getElementById('catLabelInput').value = '';

      document.getElementById('catFormHeader').innerHTML = '<i class="bi bi-plus-circle me-1"></i> เพิ่มหมวดหมู่อุปกรณ์ใหม่';
      document.getElementById('btnSaveCat').innerHTML = '<i class="bi bi-check-lg me-1"></i> บันทึก';
      document.getElementById('btnCancelEditCat').classList.add('d-none');
    };

    window.deleteCategory = async function(catId) {
      const cat = categoriesList.find(c => c.id === catId);
      if (!cat) return;

      const affectedItems = equipmentList.filter(eq => eq.category === cat.name);
      let confirmMsg = affectedItems.length > 0
        ? `ต้องการลบหมวดหมู่ "${cat.name}" หรือไม่? (อุปกรณ์ ${affectedItems.length} รายการจะถูกย้ายไปหมวดทั่วไป)`
        : `ต้องการลบหมวดหมู่อุปกรณ์ "${cat.name}" ใช่หรือไม่?`;

      const ok = await window.showConfirmDialog({
        title: "ลบหมวดหมู่อุปกรณ์",
        message: confirmMsg,
        type: "danger",
        confirmText: "ลบหมวดหมู่"
      });
      if (!ok) return;

      if (affectedItems.length > 0) {
        const fallbackCategory = categoriesList.find(c => c.name !== cat.name)?.name || 'อุปกรณ์เซฟตี้และทั่วไป';
        equipmentList.forEach(item => {
          if (item.category === cat.name) {
            item.category = fallbackCategory;
          }
        });
      }

      categoriesList = categoriesList.filter(c => c.id !== catId);
      saveToLocalStorage();

      if (isFirebaseReady && db) {
        try {
          await deleteDoc(doc(db, "categories", catId));
        } catch (err) {
          console.warn("Firestore category delete error:", err);
        }
      }

      if (typeof logAuditAction === 'function') {
        logAuditAction('หมวดหมู่', 'ลบ', `ลบหมวดหมู่อุปกรณ์ "${cat.name}"`, catId);
      }

      showToast(`ลบหมวดหมู่ "${cat.name}" เรียบร้อยแล้ว`);
      renderCategoryDropdowns();
      renderCategoryManagementList();
      renderCatalogGrid();
      renderStaffTable();
      resetCategoryForm();
    };

    // ==========================================
    // DATABASE MANAGER & INSPECTOR LOGIC
    // ==========================================
    let currentDbCollection = 'equipment';

    window.canAccessDatabaseEditor = function() {
      const isRoleAdmin = (typeof currentRole !== 'undefined' && currentRole === 'ADMIN');
      const email = ((typeof currentAuthUser !== 'undefined' && currentAuthUser?.email) || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.email) || '').trim().toLowerCase();
      
      if (isRoleAdmin) return true;
      if (email === 'jaru072@gmail.com') return true;
      return false;
    };

    window.updateDbEditorMenuVisibility = function() {
      const isSuperAdmin = typeof window.canAccessDatabaseEditor === 'function' ? window.canAccessDatabaseEditor() : false;

      // Toggle visibility for all super-admin-only elements
      document.querySelectorAll('.super-admin-only-element').forEach(el => {
        if (isSuperAdmin) {
          el.classList.remove('d-none');
        } else {
          el.classList.add('d-none');
        }
      });

      const clearAuditBtnWrapper = document.getElementById('clearAllAuditLogsBtnWrapper');
      if (clearAuditBtnWrapper) {
        if (isSuperAdmin) {
          clearAuditBtnWrapper.classList.remove('d-none');
        } else {
          clearAuditBtnWrapper.classList.add('d-none');
        }
      }

      const actionHeader = document.getElementById('auditLogActionHeader');
      if (actionHeader) {
        if (isSuperAdmin) {
          actionHeader.classList.remove('d-none');
        } else {
          actionHeader.classList.add('d-none');
        }
      }
    };

    window.openDatabaseEditorModal = function(coll = 'equipment') {
      if (!window.canAccessDatabaseEditor()) {
        if (typeof showToast === 'function') showToast("⚠️ เฉพาะผู้ดูแลระบบ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์เข้าถึง นำทางดูฐานข้อมูล");
        else alert("⚠️ เฉพาะผู้ดูแลระบบ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์เข้าถึง นำทางดูฐานข้อมูล");
        return;
      }
      currentDbCollection = coll;
      updateDbBadges();
      switchDbCollection(coll);

      const modalElem = document.getElementById('dbEditorModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    window.openBackupRestoreModalFromDbEditor = function() {
      const dbModalElem = document.getElementById('dbEditorModal');
      const dbModalInst = bootstrap.Modal.getInstance(dbModalElem);
      if (dbModalInst) dbModalInst.hide();

      openBackupRestoreModal();
    };

    function updateDbBadges() {
      const bEquip = document.getElementById('dbBadgeEquip');
      if (bEquip) bEquip.textContent = equipmentList.length;

      const bEmp = document.getElementById('dbBadgeEmp');
      if (bEmp) bEmp.textContent = employeeList.length;

      const bTx = document.getElementById('dbBadgeTx');
      if (bTx) bTx.textContent = transactionHistory.length;

      const bAtt = document.getElementById('dbBadgeAtt');
      if (bAtt) bAtt.textContent = attendanceLogs.length;

      const bCat = document.getElementById('dbBadgeCat');
      if (bCat) bCat.textContent = categoriesList.length;

      const statusBadge = document.getElementById('dbStatusBadge');
      if (statusBadge) {
        if (isFirebaseReady && db) {
          statusBadge.className = 'badge bg-success';
          statusBadge.innerHTML = '<i class="bi bi-wifi me-1"></i> Firebase Sync Active';
        } else {
          statusBadge.className = 'badge bg-secondary';
          statusBadge.innerHTML = '<i class="bi bi-hdd-fill me-1"></i> Local Storage Mode';
        }
      }
    }

    window.switchDbCollection = function(coll) {
      currentDbCollection = coll;
      updateDbBadges();

      ['equipment', 'employees', 'transactions', 'attendance', 'categories'].forEach(c => {
        const pill = document.getElementById(`pill-${c}`);
        if (pill) {
          if (c === coll) {
            pill.className = 'nav-link active btn-sm rounded-pill py-1.5 px-3 fw-bold fs-7 d-flex align-items-center gap-1.5 bg-success text-white shadow-sm';
          } else {
            pill.className = 'nav-link btn-sm rounded-pill py-1.5 px-3 fw-bold fs-7 d-flex align-items-center gap-1.5 text-dark bg-white border';
          }
        }
      });

      const titles = {
        equipment: '📦 คลังข้อมูล: อุปกรณ์การเกษตร',
        employees: '👥 คลังข้อมูล: รายชื่อบุคลากร',
        transactions: '📜 คลังข้อมูล: ประวัติการทำรายการ',
        attendance: '⏰ คลังข้อมูล: บันทึกเวลาเข้า-ออก/การลา',
        categories: '🏷️ คลังข้อมูล: หมวดหมู่อุปกรณ์การเกษตร'
      };

      const titleElem = document.getElementById('dbCollTitle');
      if (titleElem) titleElem.textContent = titles[coll] || coll;

      renderDbEditorTable();
    };

    window.renderDbEditorTable = function() {
      const searchInput = document.getElementById('dbSearchInput');
      const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

      const headerRow = document.getElementById('dbTableHeaderRow');
      const tableBody = document.getElementById('dbTableBody');
      const recordCountText = document.getElementById('dbRecordCountText');

      if (!headerRow || !tableBody) return;

      let items = [];
      let headersHtml = '';
      let rowsHtml = '';

      if (currentDbCollection === 'equipment') {
        items = equipmentList.filter(eq => 
          !q || 
          (eq.name && eq.name.toLowerCase().includes(q)) || 
          (eq.code && eq.code.toLowerCase().includes(q)) ||
          (eq.category && eq.category.toLowerCase().includes(q)) ||
          (eq.location && eq.location.toLowerCase().includes(q))
        );

        headersHtml = `
          <th class="ps-3">รหัส & QR</th>
          <th>รูปภาพ</th>
          <th>ชื่ออุปกรณ์การเกษตร</th>
          <th>หมวดหมู่</th>
          <th class="text-center">คงเหลือ / ยืม</th>
          <th>สถานที่เก็บ</th>
          <th class="text-end pe-3">จัดการ</th>
        `;

        items.forEach(eq => {
          rowsHtml += `
            <tr>
              <td class="ps-3 font-monospace fw-bold"><span class="badge bg-dark">${eq.code || eq.id}</span></td>
              <td><img src="${eq.imageUrl || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=100&auto=format&fit=crop&q=80'}" class="rounded-3 border shadow-sm" style="width: 42px; height: 42px; object-fit: cover;" /></td>
              <td>
                <div class="fw-bold text-dark">${eq.name}</div>
                <div class="fs-8 text-muted">${eq.description || 'ไม่มีคำอธิบาย'}</div>
              </td>
              <td><span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">${eq.category || 'ทั่วไป'}</span></td>
              <td class="text-center">
                <span class="fw-bold text-success fs-7">${eq.quantity}</span> <small class="text-muted">${eq.unit || 'ชิ้น'}</small>
                ${eq.borrowedCount ? `<div class="fs-8 text-warning fw-semibold">(ยืม ${eq.borrowedCount})</div>` : ''}
              </td>
              <td class="fs-8 text-secondary"><i class="bi bi-geo-alt me-1 text-danger"></i>${eq.location || 'คลังกลาง'}</td>
              <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1 fw-semibold me-1 fs-8" onclick="openDbRecordEditModal('equipment', '${eq.id}')">
                  <i class="bi bi-pencil-square me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-8" onclick="deleteDbRecord('equipment', '${eq.id}')" title="ลบรายการนี้">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
        });

      } else if (currentDbCollection === 'employees') {
        items = employeeList.filter(emp => 
          !q || 
          (emp.name && emp.name.toLowerCase().includes(q)) || 
          (emp.nickname && emp.nickname.toLowerCase().includes(q)) ||
          (emp.id && emp.id.toLowerCase().includes(q)) ||
          (emp.department && emp.department.toLowerCase().includes(q)) ||
          (emp.phone && emp.phone.includes(q))
        );

        headersHtml = `
          <th class="ps-3">รหัสพนักงาน</th>
          <th>รูปถ่าย</th>
          <th>ชื่อ-นามสกุล (ชื่อเล่น)</th>
          <th>แผนก / ตำแหน่ง</th>
          <th>สิทธิ์ใช้งาน</th>
          <th>เบอร์โทรศัพท์</th>
          <th class="text-end pe-3">จัดการ</th>
        `;

        items.forEach(emp => {
          const isStaff = emp.role === 'STAFF';
          const roleBadge = isStaff ? '<span class="badge bg-primary">Staff</span>' : '<span class="badge bg-success">Worker</span>';

          rowsHtml += `
            <tr>
              <td class="ps-3 font-monospace fw-bold"><span class="badge bg-dark">${emp.id}</span></td>
              <td><img src="${emp.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}" class="rounded-circle border shadow-sm" style="width: 40px; height: 40px; object-fit: cover;" /></td>
              <td>
                <div class="fw-bold text-dark">${formatEmpName(emp)}</div>
                <div class="fs-8 text-muted">${emp.email || '-'}</div>
              </td>
              <td>
                <div class="fs-8 fw-semibold text-primary">${emp.department || 'ทั่วไป'}</div>
                <div class="fs-8 text-muted">${emp.position || 'พนักงาน'}</div>
              </td>
              <td>${roleBadge}</td>
              <td class="fs-8 text-muted">${emp.phone || '-'}</td>
              <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1 fw-semibold me-1 fs-8" onclick="openDbRecordEditModal('employees', '${emp.id}')">
                  <i class="bi bi-pencil-square me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-8" onclick="deleteDbRecord('employees', '${emp.id}')" title="ลบพนักงานท่านนี้">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
        });

      } else if (currentDbCollection === 'transactions') {
        items = transactionHistory.filter(tx => 
          !q || 
          (tx.type && tx.type.toLowerCase().includes(q)) || 
          (tx.employeeName && tx.employeeName.toLowerCase().includes(q)) ||
          (tx.equipmentName && tx.equipmentName.toLowerCase().includes(q)) ||
          (tx.location && tx.location.toLowerCase().includes(q)) ||
          (tx.id && tx.id.toLowerCase().includes(q))
        );

        headersHtml = `
          <th class="ps-3">ID / วัน-เวลา</th>
          <th>ประเภทรายการ</th>
          <th>ผู้ทำรายการ</th>
          <th>อุปกรณ์</th>
          <th class="text-center">จำนวน</th>
          <th>สถานที่ / หมายเหตุ</th>
          <th class="text-end pe-3">จัดการ</th>
        `;

        items.forEach(tx => {
          let badgeClass = 'bg-secondary';
          if (tx.type === 'เบิกจ่าย') badgeClass = 'bg-danger';
          else if (tx.type === 'ยืมอุปกรณ์') badgeClass = 'bg-warning text-dark';
          else if (tx.type === 'คืนอุปกรณ์') badgeClass = 'bg-info text-dark';
          else if (tx.type.includes('รับเข้า')) badgeClass = 'bg-success';

          rowsHtml += `
            <tr>
              <td class="ps-3">
                <div class="font-monospace fs-8 text-muted">${tx.id || '-'}</div>
                <div class="fw-semibold text-dark fs-8">${tx.date || ''} ${tx.time || ''}</div>
              </td>
              <td><span class="badge ${badgeClass}">${tx.type}</span></td>
              <td class="fw-bold text-dark fs-8">${tx.employeeName || '-'}</td>
              <td class="fw-semibold text-success fs-8">${tx.equipmentName || '-'}</td>
              <td class="text-center fw-bold fs-7">${tx.quantity || 1}</td>
              <td class="fs-8 text-muted">${tx.location || tx.note || '-'}</td>
              <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1 fw-semibold me-1 fs-8" onclick="openDbRecordEditModal('transactions', '${tx.id}')">
                  <i class="bi bi-pencil-square me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-8" onclick="deleteDbRecord('transactions', '${tx.id}')" title="ลบรายการประวัตินี้">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
        });

      } else if (currentDbCollection === 'attendance') {
        items = attendanceLogs.filter(att => 
          !q || 
          (att.employeeName && att.employeeName.toLowerCase().includes(q)) || 
          (att.status && att.status.toLowerCase().includes(q)) ||
          (att.date && att.date.includes(q)) ||
          (att.id && att.id.toLowerCase().includes(q))
        );

        headersHtml = `
          <th class="ps-3">ID / วัน-เวลา</th>
          <th>ชื่อพนักงาน</th>
          <th>สถานะการเข้างาน</th>
          <th>หมายเหตุ</th>
          <th class="text-end pe-3">จัดการ</th>
        `;

        items.forEach(att => {
          let stBadge = 'bg-success';
          if (att.status === 'เลิกงาน') stBadge = 'bg-danger';
          else if (att.status === 'ลาป่วย') stBadge = 'bg-purple';
          else if (att.status === 'ลาหยุด') stBadge = 'bg-warning text-dark';

          rowsHtml += `
            <tr>
              <td class="ps-3">
                <div class="font-monospace fs-8 text-muted">${att.id || '-'}</div>
                <div class="fw-semibold text-dark fs-8">${att.date || ''} ${att.time || ''}</div>
              </td>
              <td class="fw-bold text-dark fs-8">${att.employeeName || '-'}</td>
              <td><span class="badge ${stBadge}">${att.status}</span></td>
              <td class="fs-8 text-muted">${att.note || '-'}</td>
              <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1 fw-semibold me-1 fs-8" onclick="openDbRecordEditModal('attendance', '${att.id}')">
                  <i class="bi bi-pencil-square me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-8" onclick="deleteDbRecord('attendance', '${att.id}')" title="ลบบันทึกเวลานี้">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
        });

      } else if (currentDbCollection === 'categories') {
        items = categoriesList.filter(cat => 
          !q || 
          (cat.name && cat.name.toLowerCase().includes(q)) || 
          (cat.label && cat.label.toLowerCase().includes(q))
        );

        headersHtml = `
          <th class="ps-3">ID หมวดหมู่</th>
          <th>ไอคอน</th>
          <th>ชื่อหมวดหมู่</th>
          <th>คำอธิบายรายละเอียด</th>
          <th class="text-end pe-3">จัดการ</th>
        `;

        items.forEach(cat => {
          rowsHtml += `
            <tr>
              <td class="ps-3 font-monospace fs-8 text-muted">${cat.id}</td>
              <td class="fs-4">${cat.icon || '🏷️'}</td>
              <td class="fw-bold text-dark fs-7">${cat.name}</td>
              <td class="fs-8 text-muted">${cat.label || '-'}</td>
              <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1 fw-semibold me-1 fs-8" onclick="openDbRecordEditModal('categories', '${cat.id}')">
                  <i class="bi bi-pencil-square me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fs-8" onclick="deleteDbRecord('categories', '${cat.id}')" title="ลบหมวดหมู่นี้">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `;
        });
      }

      if (items.length === 0) {
        rowsHtml = `
          <tr>
            <td colspan="8" class="text-center py-5 text-muted">
              <i class="bi bi-inbox display-4 d-block mb-2"></i>
              ไม่พบข้อมูลรายการในตารางคลังข้อมูลนี้
            </td>
          </tr>
        `;
      }

      headerRow.innerHTML = headersHtml;
      tableBody.innerHTML = rowsHtml;
      if (recordCountText) recordCountText.textContent = `${items.length} รายการ`;
    };

    window.openAddNewDbRecordModal = function() {
      if (currentDbCollection === 'equipment') {
        openAddEquipmentModal();
      } else if (currentDbCollection === 'employees') {
        openAddEmployeeModal();
      } else if (currentDbCollection === 'categories') {
        openCategoryModal();
      } else {
        openDbRecordEditModal(currentDbCollection, 'NEW');
      }
    };

    window.openDbRecordEditModal = function(coll, recordId) {
      document.getElementById('dbEditTargetColl').value = coll;
      document.getElementById('dbEditTargetId').value = recordId;

      const fieldsContainer = document.getElementById('dbEditFormFields');
      const textarea = document.getElementById('dbEditJsonTextarea');
      const titleElem = document.getElementById('dbEditModalTitle');

      if (!fieldsContainer) return;

      let targetRecord = null;
      if (recordId !== 'NEW') {
        if (coll === 'equipment') targetRecord = equipmentList.find(x => x.id === recordId);
        else if (coll === 'employees') targetRecord = employeeList.find(x => x.id === recordId);
        else if (coll === 'transactions') targetRecord = transactionHistory.find(x => x.id === recordId);
        else if (coll === 'attendance') targetRecord = attendanceLogs.find(x => x.id === recordId);
        else if (coll === 'categories') targetRecord = categoriesList.find(x => x.id === recordId);
      } else {
        targetRecord = { id: (coll.slice(0,3) + '-' + Date.now()) };
      }

      if (!targetRecord && recordId !== 'NEW') {
        showToast("ไม่พบข้อมูลระเบียนที่ต้องการแก้ไข");
        return;
      }

      if (titleElem) {
        titleElem.innerHTML = `✏️ แก้ไขข้อมูลระเบียน [${coll.toUpperCase()}]: ${targetRecord.id || targetRecord.name || ''}`;
      }

      if (textarea) {
        textarea.value = JSON.stringify(targetRecord, null, 2);
      }

      let formHtml = '';
      Object.keys(targetRecord).forEach(key => {
        const val = targetRecord[key] !== undefined ? targetRecord[key] : '';
        const isReadonly = key === 'id' ? 'readonly bg-light' : '';
        
        formHtml += `
          <div class="col-12 col-md-6">
            <label class="form-label fw-bold fs-8 mb-1 text-capitalize">${key}</label>
            <input type="text" class="form-control form-control-sm rounded-3 fs-8 db-edit-field" data-field-name="${key}" value="${String(val).replace(/"/g, '&quot;')}" ${isReadonly} />
          </div>
        `;
      });

      fieldsContainer.innerHTML = formHtml;

      const modalElem = document.getElementById('dbRecordEditModal');
      const modalInst = new bootstrap.Modal(modalElem);
      modalInst.show();
    };

    window.applyJsonToFormFields = function() {
      const textarea = document.getElementById('dbEditJsonTextarea');
      if (!textarea || !textarea.value.trim()) return;

      try {
        const parsed = JSON.parse(textarea.value.trim());
        const fieldsContainer = document.getElementById('dbEditFormFields');
        let formHtml = '';
        Object.keys(parsed).forEach(key => {
          const val = parsed[key] !== undefined ? parsed[key] : '';
          const isReadonly = key === 'id' ? 'readonly bg-light' : '';
          formHtml += `
            <div class="col-12 col-md-6">
              <label class="form-label fw-bold fs-8 mb-1 text-capitalize">${key}</label>
              <input type="text" class="form-control form-control-sm rounded-3 fs-8 db-edit-field" data-field-name="${key}" value="${String(val).replace(/"/g, '&quot;')}" ${isReadonly} />
            </div>
          `;
        });
        fieldsContainer.innerHTML = formHtml;
        showToast("แปลง Raw JSON เข้าสู่ฟอร์มเรียบร้อยแล้ว");
      } catch (err) {
        alert("รูปแบบ JSON ไม่ถูกต้อง: " + err.message);
      }
    };

    window.saveDbRecordFromModal = async function() {
      const coll = document.getElementById('dbEditTargetColl').value;
      const recordId = document.getElementById('dbEditTargetId').value;

      const fieldInputs = document.querySelectorAll('.db-edit-field');
      const updatedData = {};

      fieldInputs.forEach(input => {
        const fieldName = input.getAttribute('data-field-name');
        let val = input.value;
        if (!isNaN(val) && val.trim() !== '' && fieldName !== 'id' && fieldName !== 'code' && fieldName !== 'phone') {
          val = Number(val);
        }
        updatedData[fieldName] = val;
      });

      if (!updatedData.id) {
        updatedData.id = recordId !== 'NEW' ? recordId : (coll.slice(0,3) + '-' + Date.now());
      }

      if (coll === 'equipment') {
        const idx = equipmentList.findIndex(x => x.id === updatedData.id);
        if (idx !== -1) equipmentList[idx] = updatedData;
        else equipmentList.unshift(updatedData);

        if (isFirebaseReady && db) {
          try { await setDoc(doc(db, "equipment", updatedData.id), updatedData, { merge: true }); } catch(e){}
        }
        renderCatalogGrid();
        renderStaffTable();
      } else if (coll === 'employees') {
        const idx = employeeList.findIndex(x => x.id === updatedData.id);
        if (idx !== -1) employeeList[idx] = updatedData;
        else employeeList.unshift(updatedData);

        if (isFirebaseReady && db) {
          try { await setDoc(doc(db, "employees", updatedData.id), updatedData, { merge: true }); } catch(e){}
        }
        renderEmployeeDirectory();
        populateEmployeeDropdowns();
      } else if (coll === 'transactions') {
        const idx = transactionHistory.findIndex(x => x.id === updatedData.id);
        if (idx !== -1) transactionHistory[idx] = updatedData;
        else transactionHistory.unshift(updatedData);

        if (isFirebaseReady && db) {
          try { await setDoc(doc(db, "transactions", updatedData.id), updatedData, { merge: true }); } catch(e){}
        }
        renderHistoryTable();
      } else if (coll === 'attendance') {
        const idx = attendanceLogs.findIndex(x => x.id === updatedData.id);
        if (idx !== -1) attendanceLogs[idx] = updatedData;
        else attendanceLogs.unshift(updatedData);

        if (isFirebaseReady && db) {
          try { await setDoc(doc(db, "attendance", updatedData.id), updatedData, { merge: true }); } catch(e){}
        }
        renderAttendanceTable();
      } else if (coll === 'categories') {
        const idx = categoriesList.findIndex(x => x.id === updatedData.id);
        if (idx !== -1) categoriesList[idx] = updatedData;
        else categoriesList.push(updatedData);

        if (isFirebaseReady && db) {
          try { await setDoc(doc(db, "categories", updatedData.id), updatedData, { merge: true }); } catch(e){}
        }
        renderCategoryDropdowns();
        renderCategoryManagementList();
      }

      saveToLocalStorage();
      updateStats();

      const modalElem = document.getElementById('dbRecordEditModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();

      showToast(`บันทึกการแก้ไขฐานข้อมูลคลัง "${coll}" สำเร็จ!`);
      renderDbEditorTable();
    };

    window.deleteCurrentEditRecordFromModal = function() {
      const coll = document.getElementById('dbEditTargetColl').value;
      const recordId = document.getElementById('dbEditTargetId').value;

      if (!recordId || recordId === 'NEW') return;
      deleteDbRecord(coll, recordId);

      const modalElem = document.getElementById('dbRecordEditModal');
      const modalInst = bootstrap.Modal.getInstance(modalElem);
      if (modalInst) modalInst.hide();
    };

    window.deleteDbRecord = async function(coll, recordId) {
      const ok = await window.showConfirmDialog({
        title: "ลบข้อมูลจากฐานข้อมูล",
        message: `ต้องการลบข้อมูล ID: "${recordId}" ออกจากระบบใช่หรือไม่?`,
        type: "danger",
        confirmText: "ลบข้อมูล"
      });
      if (!ok) return;

      if (coll === 'equipment') {
        await window.deleteEquipment(recordId, true);
        renderDbEditorTable();
        return;
      } else if (coll === 'employees') {
        const empObj = (employeeList || []).find(x => x.id === recordId);
        const empName = empObj ? empObj.name : recordId;
        employeeList = employeeList.filter(x => x.id !== recordId);
        if (isFirebaseReady && db) { try { await deleteDoc(doc(db, "employees", recordId)); } catch(e){} }
        renderEmployeeDirectory();
        populateEmployeeDropdowns();
        if (typeof logAuditAction === 'function') {
          logAuditAction('บุคลากร', 'ลบ', `ลบข้อมูลบุคลากร "${empName}" [${recordId}] จากหน้าจัดการฐานข้อมูล`, recordId);
        }
      } else if (coll === 'transactions') {
        const txObj = (transactionHistory || []).find(x => x.id === recordId);
        const txDetails = txObj ? `${txObj.type || 'รายการ'} (${txObj.equipmentName || ''} - ${txObj.employeeName || ''})` : `ID: ${recordId}`;
        transactionHistory = transactionHistory.filter(x => x.id !== recordId);
        if (isFirebaseReady && db) { try { await deleteDoc(doc(db, "transactions", recordId)); } catch(e){} }
        renderHistoryTable();
        if (typeof logAuditAction === 'function') {
          logAuditAction('ประวัติรายการ', 'ลบ', `ลบรายการประวัติการเบิก/ยืม/คืน #${recordId} (${txDetails})`, recordId);
        }
      } else if (coll === 'attendance') {
        attendanceLogs = attendanceLogs.filter(x => x.id !== recordId);
        if (isFirebaseReady && db) { try { await deleteDoc(doc(db, "attendance", recordId)); } catch(e){} }
        renderAttendanceTable();
        if (typeof logAuditAction === 'function') {
          logAuditAction('ระบบ', 'ลบ', `ลบบันทึกเวลาเข้า-ออกงาน ID: ${recordId}`, recordId);
        }
      } else if (coll === 'categories') {
        const catObj = (categoriesList || []).find(x => x.id === recordId);
        const catName = catObj ? catObj.name : recordId;
        categoriesList = categoriesList.filter(x => x.id !== recordId);
        if (isFirebaseReady && db) { try { await deleteDoc(doc(db, "categories", recordId)); } catch(e){} }
        renderCategoryDropdowns();
        renderCategoryManagementList();
        if (typeof logAuditAction === 'function') {
          logAuditAction('หมวดหมู่', 'ลบ', `ลบหมวดหมู่อุปกรณ์ "${catName}" [${recordId}] จากหน้าจัดการฐานข้อมูล`, recordId);
        }
      } else if (coll === 'departments') {
        const dObj = (departmentsList || []).find((d) => (typeof d === 'string' ? d === recordId : d.id === recordId));
        const dName = typeof dObj === 'string' ? dObj : (dObj ? dObj.name : recordId);
        departmentsList = (departmentsList || []).filter(d => (typeof d === 'string' ? d !== dName && d !== recordId : d.id !== recordId && d.name !== dName));
        if (isFirebaseReady && db) { try { await deleteDoc(doc(db, "departments", recordId)); } catch(e){} }
        populateDepartmentDropdowns();
        if (typeof renderDepartmentsListModal === 'function') renderDepartmentsListModal();
        if (typeof logAuditAction === 'function') {
          logAuditAction('แผนก', 'ลบ', `ลบแผนก "${dName}" [${recordId}] จากหน้าจัดการฐานข้อมูล`, recordId);
        }
      } else if (coll === 'locations') {
        const lObj = (locationsList || []).find((l) => (typeof l === 'string' ? l === recordId : l.id === recordId));
        const lName = typeof lObj === 'string' ? lObj : (lObj ? lObj.name : recordId);
        locationsList = (locationsList || []).filter(l => (typeof l === 'string' ? l !== lName && l !== recordId : l.id !== recordId && l.name !== lName));
        if (isFirebaseReady && db) { try { await deleteDoc(doc(db, "locations", recordId)); } catch(e){} }
        populateLocationDropdowns();
        if (typeof renderLocationsListModal === 'function') renderLocationsListModal();
        if (typeof logAuditAction === 'function') {
          logAuditAction('สถานที่จัดเก็บ', 'ลบ', `ลบสถานที่จัดเก็บ "${lName}" [${recordId}] จากหน้าจัดการฐานข้อมูล`, recordId);
        }
      }

      saveToLocalStorage();
      updateStats();
      showToast(`ลบรายการ ID: ${recordId} ออกจากคลังข้อมูลสำเร็จ`);
      renderDbEditorTable();
    };

    async function seedCollectionIfEmpty(collName, list) {
      if (!isFirebaseReady || !db || !Array.isArray(list) || list.length === 0) return;
      try {
        for (const item of list) {
          if (item && item.id) {
            await setDoc(doc(db, collName, item.id), item, { merge: true });
          }
        }
      } catch (e) {
        console.warn(`Seeding ${collName} notice:`, e);
      }
    }

    async function setupFirestoreListeners() {
      if (!isFirebaseReady || !db) return;

      try {
        onSnapshot(collection(db, "employees"), async (snapshot) => {
          const deptMap = {
            "เจ้าหน้าที่สำนักงาน (Staff)": "แผนกงานธุรการ",
            "แผนกเรือนกระจกและเพาะชำ": "แผนกงานทดลอง",
            "แผนกตกแต่งและตัดแต่งกิ่ง": "แผนกทีมเจดีย์/แปลง G",
            "แผนกระบบน้ำและบำรุงดิน": "แผนกทีมถนนธรรมชัย/เฟื้องฟ้า/ผสมดิน",
            "สวนกุหลาบและไม้ดอก": "แผนกทีมกุหลาบ",
            "สวนไม้ผลและไม้ยืนต้น": "แผนกทีมไม้ดอกหลังวิหารคดคอร์ 13-20(ปอ)",
            "แผนกดูแลไม้ดอก (Rose & Tulip)": "แผนกทีมกุหลาบ",
            "แผนกไม้ประดับใบ (Indoor Flora)": "แผนกงานทดลอง"
          };

          if (snapshot.empty) {
            employeeList = [];
          } else {
            employeeList = snapshot.docs.map(d => {
              const data = d.data();
              let updatedDept = data.department;
              if (deptMap[data.department]) {
                updatedDept = deptMap[data.department];
                try { updateDoc(doc(db, "employees", d.id), { department: updatedDept }); } catch(e){}
              }
              return { id: d.id, ...data, department: updatedDept };
            });
          }
          saveToLocalStorage();
          renderEmployeeDirectory();
          populateEmployeeDropdowns();
          renderStaffTable();
          updateStats();
        }, (err) => {
          console.warn("Firestore employees sync notice:", err.message);
        });

        onSnapshot(collection(db, "attendance"), async (snapshot) => {
          if (snapshot.empty) {
            attendanceLogs = [];
          } else {
            attendanceLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
          saveToLocalStorage();
          renderAttendanceTable();
        }, (err) => {
          console.warn("Firestore attendance sync notice:", err.message);
        });

        onSnapshot(collection(db, "categories"), async (snapshot) => {
          if (snapshot.empty) {
            categoriesList = [];
          } else {
            const fsCatsMap = new Map();
            for (const d of snapshot.docs) {
              const data = d.data() || {};
              const officialCode = (data.code || data.id || d.id || '').trim();
              const catName = (data.name || '').trim();
              const item = { ...data, id: officialCode || d.id, code: officialCode || d.id, name: catName || officialCode };

              // Auto-migrate legacy Firestore documents where document ID !== category code
              if (isFirebaseReady && db && officialCode && d.id !== officialCode) {
                try {
                  await setDoc(doc(db, "categories", officialCode), item, { merge: true });
                  await deleteDoc(d.ref);
                } catch(migErr) {
                  console.warn("Auto migrate category docId to code notice:", migErr);
                }
              }

              const mapKey = (item.code || item.id || item.name).toLowerCase();
              if (!fsCatsMap.has(mapKey)) {
                fsCatsMap.set(mapKey, item);
              }
            }

            const fsCats = Array.from(fsCatsMap.values());
            fsCats.sort((a, b) => {
              const numA = parseInt(((a.code || a.id || '').match(/^CAT-(\d+)$/i) || [0, 999999])[1], 10);
              const numB = parseInt(((b.code || b.id || '').match(/^CAT-(\d+)$/i) || [0, 999999])[1], 10);
              if (numA !== numB) return numA - numB;
              return (a.name || '').localeCompare(b.name || '', 'th');
            });
            categoriesList = fsCats;
          }
          saveToLocalStorage();
          renderCategoryDropdowns();
          renderCategoryManagementList();
          renderCatalogGrid();
        }, (err) => {
          console.warn("Firestore categories sync notice:", err.message);
        });

        onSnapshot(collection(db, "equipment"), async (snapshot) => {
          if (snapshot.empty) {
            equipmentList = [];
          } else {
            const fsEquipMap = new Map();
            for (const d of snapshot.docs) {
              const data = d.data() || {};
              const expectedCode = (data.code || d.id || '').trim();
              const item = { ...data, id: expectedCode || d.id, code: expectedCode || d.id };
              if (item.minQuantity === undefined || item.minQuantity === null) {
                item.minQuantity = 3;
              }

              // Auto-migrate legacy Firestore documents where document ID !== equipment code
              if (isFirebaseReady && db && expectedCode && d.id !== expectedCode) {
                try {
                  const newDocData = { ...item, id: expectedCode, code: expectedCode };
                  await setDoc(doc(db, "equipment", expectedCode), newDocData, { merge: true });
                  await deleteDoc(d.ref);
                } catch(migErr) {
                  console.warn("Auto migrate equipment docId to code notice:", migErr);
                }
              }

              const mapKey = (item.code || item.id).toLowerCase();
              if (!fsEquipMap.has(mapKey)) {
                fsEquipMap.set(mapKey, item);
              }
            }

            const fsEquip = Array.from(fsEquipMap.values());
            fsEquip.sort((a, b) => {
              const codeA = (a.code || a.id || '').toString();
              const codeB = (b.code || b.id || '').toString();
              return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
            });
            equipmentList = fsEquip;
          }
          saveToLocalStorage();
          renderCatalogGrid();
          renderStaffTable();
          populateEquipmentDropdown();
          populateQuickScanDropdown();
          updateStats();
        }, (err) => {
          console.warn("Firestore equipment sync notice:", err.message);
        });

        onSnapshot(collection(db, "transactions"), (snapshot) => {
          if (snapshot.empty) {
            transactionHistory = [];
          } else {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
              const timeA = getRecordTimestampMs(a);
              const timeB = getRecordTimestampMs(b);
              return timeB - timeA;
            });
            transactionHistory = list;
          }
          saveToLocalStorage();
          renderHistoryTable();
          if (typeof updateStats === 'function') updateStats();
        }, (err) => {
          console.warn("Firestore transactions sync notice:", err.message);
        });

        onSnapshot(collection(db, "departments"), async (snapshot) => {
          const legacyDepts = [
            "เจ้าหน้าที่สำนักงาน (Staff)",
            "แผนกเรือนกระจกและเพาะชำ",
            "แผนกตกแต่งและตัดแต่งกิ่ง",
            "แผนกระบบน้ำและบำรุงดิน",
            "สวนกุหลาบและไม้ดอก",
            "สวนไม้ผลและไม้ยืนต้น",
            "แผนกดูแลไม้ดอก (Rose & Tulip)",
            "แผนกไม้ประดับใบ (Indoor Flora)"
          ];

          let fsDepts = [];
          if (!snapshot.empty) {
            const deptMap = new Map();
            for (const dSnap of snapshot.docs) {
              const data = dSnap.data() || {};
              const name = (data.name || dSnap.id || '').trim();
              const officialCode = (data.code || data.id || dSnap.id || '').trim();

              if (legacyDepts.includes(name)) {
                try { await deleteDoc(dSnap.ref); } catch(e){}
                continue;
              }

              if (name) {
                // Auto-migrate if document ID !== department code
                if (isFirebaseReady && db && officialCode && dSnap.id !== officialCode) {
                  try {
                    await setDoc(doc(db, "departments", officialCode), { id: officialCode, code: officialCode, name }, { merge: true });
                    await deleteDoc(dSnap.ref);
                  } catch(migErr) {
                    console.warn("Auto migrate department docId notice:", migErr);
                  }
                }

                const key = name.toLowerCase();
                if (!deptMap.has(key)) {
                  deptMap.set(key, { id: officialCode || dSnap.id, code: officialCode || dSnap.id, name });
                } else if (dSnap.id !== officialCode) {
                  // Duplicate document with non-standard ID, delete it
                  try { await deleteDoc(dSnap.ref); } catch(e){}
                }
              }
            }

            const validDocs = Array.from(deptMap.values());
            validDocs.sort((a, b) => {
              const numA = parseInt(((a.code || a.id).match(/^DEP-(\d+)$/i) || a.id.match(/^dept_v3_(\d+)$/) || [0, 999999])[1], 10);
              const numB = parseInt(((b.code || b.id).match(/^DEP-(\d+)$/i) || b.id.match(/^dept_v3_(\d+)$/) || [0, 999999])[1], 10);
              if (numA !== numB) return numA - numB;
              return a.name.localeCompare(b.name, 'th');
            });

            fsDepts = validDocs.map(d => d.name);
            departmentsList = fsDepts;
          } else {
            departmentsList = [];
          }

          saveToLocalStorage();
          populateDepartmentDropdowns();
          if (typeof renderDepartmentsListModal === 'function') {
            renderDepartmentsListModal();
          }
        }, (err) => {
          console.warn("Firestore departments sync notice:", err.message);
        });

        onSnapshot(collection(db, "locations"), async (snapshot) => {
          let fsLocs = [];
          if (!snapshot.empty) {
            const locMap = new Map();
            for (const dSnap of snapshot.docs) {
              const data = dSnap.data() || {};
              const name = (data.name || dSnap.id || '').trim();
              const officialCode = (data.code || data.id || dSnap.id || '').trim();

              if (name) {
                // Auto-migrate if document ID !== location code
                if (isFirebaseReady && db && officialCode && dSnap.id !== officialCode) {
                  try {
                    await setDoc(doc(db, "locations", officialCode), { id: officialCode, code: officialCode, name }, { merge: true });
                    await deleteDoc(dSnap.ref);
                  } catch(migErr) {
                    console.warn("Auto migrate location docId notice:", migErr);
                  }
                }

                const key = name.toLowerCase();
                if (!locMap.has(key)) {
                  locMap.set(key, { id: officialCode || dSnap.id, code: officialCode || dSnap.id, name });
                } else if (dSnap.id !== officialCode) {
                  // Duplicate document with non-standard ID, delete it
                  try { await deleteDoc(dSnap.ref); } catch(e){}
                }
              }
            }

            const locDocs = Array.from(locMap.values());
            locDocs.sort((a, b) => {
              const numA = parseInt(((a.code || a.id || '').match(/^LOC-(\d+)$/i) || [0, 999999])[1], 10);
              const numB = parseInt(((b.code || b.id || '').match(/^LOC-(\d+)$/i) || [0, 999999])[1], 10);
              if (numA !== numB) return numA - numB;
              return (a.name || a.id).localeCompare((b.name || b.id), 'th');
            });
            fsLocs = locDocs.map(d => (d.name || d.id)).filter(Boolean);
            locationsList = fsLocs;
          } else {
            locationsList = [];
          }

          saveToLocalStorage();
          populateLocationDropdowns();
          if (typeof renderLocationsListModal === 'function') {
            renderLocationsListModal();
          }
        }, (err) => {
          console.warn("Firestore locations sync notice:", err.message);
        });

        onSnapshot(collection(db, "audit_logs"), (snapshot) => {
          if (snapshot.empty) {
            auditLogs = [];
          } else {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => getRecordTimestampMs(b) - getRecordTimestampMs(a));
            auditLogs = list;
          }
          saveToLocalStorage();
          if (typeof window.renderAuditLogsTable === 'function') {
            window.renderAuditLogsTable();
          }
        }, (err) => {
          console.warn("Firestore audit_logs sync notice:", err.message);
        });

        onSnapshot(collection(db, "user_login_logs"), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            userLoginLogs = list;
            if (typeof window.renderUserLoginLogsTable === 'function') {
              window.renderUserLoginLogsTable();
            }
          }
        }, (err) => {
          console.warn("Firestore user_login_logs sync notice:", err.message);
        });

        if (typeof window.ensureAdminUserInUsersCollection === 'function') {
          window.ensureAdminUserInUsersCollection();
        }

        onSnapshot(collection(db, "users"), (snapshot) => {
          allUsersList = [];
          snapshot.forEach(docSnap => {
            allUsersList.push({ id: docSnap.id, ...docSnap.data() });
          });
          if (allUsersList.length === 0 && typeof window.ensureAdminUserInUsersCollection === 'function') {
            window.ensureAdminUserInUsersCollection();
          }
          if (typeof window.renderUsersTable === 'function') {
            window.renderUsersTable();
          }
        }, (err) => {
          console.warn("Firestore users sync notice:", err.message);
        });
      } catch (err) {
        console.warn("Firestore listener setup exception:", err);
      }

      // ==================== IMAGE OPTIMIZER MODAL UI FUNCTIONS ====================
      window.openImageOptimizerModal = function() {
        if (typeof window.canAccessDatabaseEditor === 'function' && !window.canAccessDatabaseEditor()) {
          if (typeof showToast === 'function') showToast("⚠️ เฉพาะผู้ดูแลระบบ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์เข้าถึง ตั้งค่าบีบอัดรูปภาพ");
          else alert("⚠️ เฉพาะผู้ดูแลระบบ Admin (jaru072@gmail.com) เท่านั้นที่มีสิทธิ์เข้าถึง ตั้งค่าบีบอัดรูปภาพ");
          return;
        }

        const modalElem = document.getElementById('imageOptimizationModal');
        if (!modalElem) return;

        const s = window.storageImageOptimizationSettings || {};
        const chk = document.getElementById('optToggleEnabled');
        const fmt = document.getElementById('optFormatSelect');
        const preset = document.getElementById('optPresetSelect');
        const maxKb = document.getElementById('optMaxFileSizeInput');

        if (chk) chk.checked = s.enabled !== false;
        if (fmt) fmt.value = s.format || 'webp';
        if (preset) preset.value = s.presetKey || 'MEDIUM';
        if (maxKb) maxKb.value = s.maxFileSizeKB || 350;

        const modalInst = new bootstrap.Modal(modalElem);
        modalInst.show();
      };

      window.saveImageOptimizerSettings = function() {
        const chk = document.getElementById('optToggleEnabled');
        const fmt = document.getElementById('optFormatSelect');
        const preset = document.getElementById('optPresetSelect');
        const maxKb = document.getElementById('optMaxFileSizeInput');

        window.storageImageOptimizationSettings = {
          enabled: chk ? chk.checked : true,
          format: fmt ? fmt.value : 'webp',
          presetKey: preset ? preset.value : 'MEDIUM',
          maxFileSizeKB: maxKb ? (parseInt(maxKb.value) || 350) : 350,
          quality: (preset && preset.value === 'SMALL') ? 0.75 : (preset && preset.value === 'LARGE') ? 0.90 : 0.82
        };

        try {
          localStorage.setItem('flora_image_optimization_settings', JSON.stringify(window.storageImageOptimizationSettings));
        } catch (e) {}

        showToast("⚡ บันทึกการตั้งค่าบีบอัดรูปภาพก่อนอัปโหลด Storage เรียบร้อยแล้ว!");
        const modalElem = document.getElementById('imageOptimizationModal');
        if (modalElem) {
          const inst = bootstrap.Modal.getInstance(modalElem);
          if (inst) inst.hide();
        }
      };

      window.runLiveTestCompression = async function(inputElem) {
        if (!inputElem || !inputElem.files || !inputElem.files[0]) return;
        const testFile = inputElem.files[0];

        const container = document.getElementById('liveTestResultContainer');
        const origNameEl = document.getElementById('testOrigName');
        const origSizeEl = document.getElementById('testOrigSize');
        const origDimEl = document.getElementById('testOrigDim');

        const optSizeEl = document.getElementById('testOptSize');
        const optDimEl = document.getElementById('testOptDim');
        const optFmtEl = document.getElementById('testOptFmt');

        const pctBadge = document.getElementById('testSavedPctBadge');
        const savedMbText = document.getElementById('testSavedMbText');
        const previewImg = document.getElementById('testCompressedPreview');

        if (container) container.classList.remove('d-none');
        if (origNameEl) origNameEl.textContent = testFile.name;
        if (origSizeEl) origSizeEl.textContent = testFile.size >= 1024*1024 ? (testFile.size / (1024*1024)).toFixed(2) + ' MB' : (testFile.size/1024).toFixed(1) + ' KB';

        const fmtVal = document.getElementById('optFormatSelect')?.value || 'webp';
        const presetVal = document.getElementById('optPresetSelect')?.value || 'MEDIUM';

        const optRes = await autoOptimizeAndResizeImage(testFile, { force: true, format: fmtVal, presetKey: presetVal });

        if (optRes) {
          if (origDimEl) origDimEl.textContent = `${testFile.name.substring(testFile.name.lastIndexOf('.'))} (${testFile.type || 'image'})`;
          if (optSizeEl) optSizeEl.textContent = optRes.compressedSizeFormatted;
          if (optDimEl) optDimEl.textContent = `${optRes.width} x ${optRes.height} px`;
          if (optFmtEl) optFmtEl.textContent = (optRes.extension || 'webp').toUpperCase();

          if (pctBadge) pctBadge.textContent = `-${optRes.savedPercent}%`;
          if (savedMbText) {
            const savedKb = (optRes.savedBytes / 1024).toFixed(1);
            savedMbText.textContent = `ประหยัดพื้นที่ได้ ${optRes.savedPercent}% (ลดลง ${savedKb} KB)`;
          }

          if (previewImg && optRes.dataUrl) {
            previewImg.src = optRes.dataUrl;
          }
        }
      };

      window.batchOptimizeAllStorageImages = async function() {
        const ok = await window.showConfirmDialog({
          title: "บีบอัดรูปภาพระบบ",
          message: "ต้องการบีบอัดและปรับขนาดรูปภาพทั้งหมดเพื่อประหยัดพื้นที่ Storage หรือไม่?",
          type: "primary",
          icon: "bi-lightning-charge-fill",
          confirmText: "เริ่มบีบอัดรูปภาพ"
        });
        if (!ok) return;

        let totalProcessed = 0;
        let totalSavedBytes = 0;

        showToast("⚡ กำลังประมวลผลบีบอัดรูปภาพทั้งหมดในระบบ...");

        const allItemsToOptimize = [];

        (equipmentList || []).forEach(e => {
          if (e && e.imageUrl && !e.imageUrl.includes('via.placeholder')) {
            allItemsToOptimize.push({ item: e, type: 'EQUIPMENT', urlField: 'imageUrl', id: e.id, code: e.code });
          }
        });

        (employeeList || []).forEach(emp => {
          if (emp && emp.photoUrl && !emp.photoUrl.includes('via.placeholder')) {
            allItemsToOptimize.push({ item: emp, type: 'EMPLOYEE', urlField: 'photoUrl', id: emp.id, code: emp.empCode || emp.id });
          }
        });

        for (let i = 0; i < allItemsToOptimize.length; i++) {
          const target = allItemsToOptimize[i];
          const currentUrl = target.item[target.urlField];
          try {
            let blob = null;
            if (typeof currentUrl === 'string' && currentUrl.startsWith('data:')) {
              const res = await fetch(currentUrl);
              blob = await res.blob();
            } else if (currentUrl && !currentUrl.includes('placeholder')) {
              blob = await window.fetchImageAsBlobOrBase64(currentUrl);
            }

            if (blob && blob.size > 100 * 1024) {
              const presetType = target.type;
              const optRes = await autoOptimizeAndResizeImage(blob, { presetType, force: true });
              if (optRes && optRes.blob && optRes.savedBytes > 0) {
                totalSavedBytes += optRes.savedBytes;
                totalProcessed++;

                if (isFirebaseReady && storage) {
                  const folder = (target.type === 'EMPLOYEE') ? 'employee_photos' : 'equipment_images';
                  const safeCode = (target.code || target.id || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
                  const newUrl = await uploadBase64OrUrlToFirebaseStorage(optRes.dataUrl, folder, `${safeCode}.${optRes.extension}`, true);
                  if (newUrl) {
                    target.item[target.urlField] = newUrl;
                    if (isFirebaseReady && db && target.id) {
                      const coll = (target.type === 'EMPLOYEE') ? 'employees' : 'equipment';
                      await setDoc(doc(db, coll, target.id), target.item, { merge: true });
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.warn("Batch optimize single image error:", currentUrl, err);
          }
        }

        saveToLocalStorage();
        renderCatalogGrid();
        renderEmployeeDirectory();

        const totalSavedMb = (totalSavedBytes / (1024 * 1024)).toFixed(2);
        alert(`🎉 บีบอัดรูปภาพในระบบเรียบร้อยแล้ว!\n\n- ประมวลผลสำเร็จ: ${totalProcessed} รูปภาพ\n- ประหยัดพื้นที่ Storage รวม: ${totalSavedMb} MB`);
        showToast(`🎉 ย่อและบีบอัดรูปภาพสำเร็จ! ประหยัดพื้นที่รวม ${totalSavedMb} MB`);
      };
    }

    let feedbackTimer = null;
    window.hideFeedbackPopup = function() {
      const popup = document.getElementById('globalFeedbackPopup');
      if (popup) popup.classList.add('d-none');
      if (feedbackTimer) {
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
      }
    };

    // Global 3-Second Feedback Popup (Compact, positioned near active target or center-top, disappears in 3s without progress bar, replaces old bottom-right toast)
    window.showFeedbackPopup = function(options = {}) {
      if (typeof options === 'string') {
        options = { message: options };
      }
      const title = options.title || 'บันทึก เสร็จแล้ว';
      let message = options.message || options.text || 'บันทึก เสร็จแล้ว';
      const type = options.type || 'success'; // 'success', 'primary', 'warning', 'info', 'danger'
      const duration = typeof options.duration === 'number' ? options.duration : 3000;
      
      const iconClass = options.icon || (
        type === 'success' ? 'bi-check-circle-fill' :
        type === 'primary' ? 'bi-info-circle-fill' :
        type === 'warning' ? 'bi-exclamation-triangle-fill' :
        type === 'danger' ? 'bi-x-circle-fill' : 'bi-bell-fill'
      );

      const popup = document.getElementById('globalFeedbackPopup');
      const titleEl = document.getElementById('globalFeedbackTitle');
      const msgEl = document.getElementById('globalFeedbackMessage');
      const iconEl = document.getElementById('globalFeedbackIcon');
      const iconCont = document.getElementById('globalFeedbackIconContainer');

      if (!popup) return;

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.innerHTML = message;

      const iconColor = type === 'warning' ? 'text-warning bg-warning' : type === 'primary' ? 'text-primary bg-primary' : type === 'info' ? 'text-info bg-info' : type === 'danger' ? 'text-danger bg-danger' : 'text-success bg-success';
      if (iconCont) iconCont.className = `p-2 rounded-circle ${iconColor} bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0`;
      if (iconEl) iconEl.className = `bi ${iconClass} fs-5`;

      let target = options.target;
      if (!target && window.event) {
        target = window.event.target || window.event.currentTarget;
      }
      if (!target) {
        target = document.activeElement;
      }
      if (typeof target === 'string') {
        target = document.querySelector(target);
      }
      if (target && !(target instanceof HTMLElement)) {
        target = target.target || target.currentTarget || null;
      }

      popup.classList.remove('d-none');
      const boxWidth = Math.min(330, window.innerWidth - 24);
      popup.style.width = `${boxWidth}px`;

      if (target && target instanceof HTMLElement && typeof target.getBoundingClientRect === 'function' && target.tagName !== 'BODY') {
        const rect = target.getBoundingClientRect();
        const popupHeight = popup.offsetHeight || 80;
        
        let top = rect.top - popupHeight - 8;
        if (top < 12) {
          top = rect.bottom + 8;
        }
        if (top + popupHeight > window.innerHeight - 12) {
          top = Math.max(12, window.innerHeight - popupHeight - 12);
        }

        let left = rect.left + (rect.width / 2) - (boxWidth / 2);
        if (left < 12) left = 12;
        if (left + boxWidth > window.innerWidth - 12) {
          left = window.innerWidth - boxWidth - 12;
        }

        popup.style.top = `${Math.round(top)}px`;
        popup.style.left = `${Math.round(left)}px`;
        popup.style.right = 'auto';
        popup.style.bottom = 'auto';
        popup.style.transform = 'scale(1)';
      } else {
        // Center-top floating feedback notification
        popup.style.top = '24px';
        popup.style.left = '50%';
        popup.style.right = 'auto';
        popup.style.bottom = 'auto';
        popup.style.transform = 'translateX(-50%) scale(1)';
      }

      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        window.hideFeedbackPopup();
      }, duration);
    };

    function showToast(msg, options = {}) {
      if (typeof options === 'string') {
        options = { title: options };
      }
      window.showFeedbackPopup({
        title: "บันทึก เสร็จแล้ว",
        message: msg || "บันทึก เสร็จแล้ว",
        duration: 3000,
        ...options
      });
    }

    // Global UI Confirmation Dialog / Popover (Compact, positioned above/near clicked target, concise text)
    window.showConfirmDialog = function(options = {}) {
      return new Promise((resolve) => {
        if (typeof options === 'string') {
          options = { message: options };
        }
        const title = options.title || 'ยืนยันการดำเนินการ';
        const message = options.message || options.text || 'คุณต้องการดำเนินการต่อใช่หรือไม่?';
        const confirmText = options.confirmText || 'ยืนยัน';
        const cancelText = options.cancelText || 'ยกเลิก';
        const type = options.type || 'danger'; // 'danger', 'warning', 'primary', 'success', 'info'
        const iconClass = options.icon || (type === 'warning' ? 'bi-exclamation-triangle-fill' : type === 'primary' ? 'bi-info-circle-fill' : type === 'success' ? 'bi-check-circle-fill' : 'bi-trash3-fill');
        
        let target = options.target;
        if (!target && window.event) {
          target = window.event.target || window.event.currentTarget;
        }
        if (!target) {
          target = document.activeElement;
        }
        if (typeof target === 'string') {
          target = document.querySelector(target);
        }
        if (target && !(target instanceof HTMLElement)) {
          target = target.target || target.currentTarget || null;
        }

        const backdrop = document.getElementById('globalConfirmBackdrop');
        const box = document.getElementById('globalConfirmBox');
        const titleEl = document.getElementById('globalConfirmTitle');
        const msgEl = document.getElementById('globalConfirmMessage');
        const btnCancel = document.getElementById('globalConfirmBtnCancel');
        const btnOk = document.getElementById('globalConfirmBtnOk');
        const iconEl = document.getElementById('globalConfirmIcon');
        const iconCont = document.getElementById('globalConfirmIconContainer');

        if (!box || !backdrop) {
          resolve(window.confirm ? window.confirm(message) : true);
          return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.innerHTML = message.replace(/\n/g, '<br>');
        if (btnCancel) btnCancel.textContent = cancelText;
        if (btnOk) {
          const span = btnOk.querySelector('span');
          if (span) span.textContent = confirmText;
          else btnOk.textContent = confirmText;
        }

        const btnColorClass = type === 'warning' ? 'btn-warning text-dark' : type === 'primary' ? 'btn-primary' : type === 'success' ? 'btn-success' : type === 'info' ? 'btn-info text-white' : 'btn-danger';
        if (btnOk) btnOk.className = `btn ${btnColorClass} btn-sm rounded-pill px-3.5 py-1 fw-bold fs-8 shadow-sm d-flex align-items-center gap-1`;
        
        const iconColor = type === 'warning' ? 'text-warning bg-warning' : type === 'primary' ? 'text-primary bg-primary' : type === 'success' ? 'text-success bg-success' : type === 'info' ? 'text-info bg-info' : 'text-danger bg-danger';
        if (iconCont) iconCont.className = `p-2 rounded-circle ${iconColor} bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0`;
        if (iconEl) iconEl.className = `bi ${iconClass} fs-5`;

        backdrop.classList.remove('d-none');
        box.classList.remove('d-none');

        const boxWidth = Math.min(330, window.innerWidth - 24);
        box.style.width = `${boxWidth}px`;

        if (target && target instanceof HTMLElement && typeof target.getBoundingClientRect === 'function' && target.tagName !== 'BODY') {
          const rect = target.getBoundingClientRect();
          const boxHeight = box.offsetHeight || 140;
          
          // Position right above the clicked button if possible
          let top = rect.top - boxHeight - 8;
          if (top < 12) {
            top = rect.bottom + 8;
          }
          if (top + boxHeight > window.innerHeight - 12) {
            top = Math.max(12, window.innerHeight - boxHeight - 12);
          }

          let left = rect.left + (rect.width / 2) - (boxWidth / 2);
          if (left < 12) left = 12;
          if (left + boxWidth > window.innerWidth - 12) {
            left = window.innerWidth - boxWidth - 12;
          }

          box.style.top = `${Math.round(top)}px`;
          box.style.left = `${Math.round(left)}px`;
          box.style.transform = 'scale(1)';
        } else {
          box.style.top = '50%';
          box.style.left = '50%';
          box.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        function cleanup(result) {
          backdrop.classList.add('d-none');
          box.classList.add('d-none');
          document.removeEventListener('keydown', onKeyDown);
          if (btnOk) btnOk.onclick = null;
          if (btnCancel) btnCancel.onclick = null;
          if (backdrop) backdrop.onclick = null;
          resolve(result);
        }

        function onKeyDown(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            cleanup(false);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            cleanup(true);
          }
        }

        if (btnOk) btnOk.onclick = () => cleanup(true);
        if (btnCancel) btnCancel.onclick = () => cleanup(false);
        if (backdrop) backdrop.onclick = () => cleanup(false);
        document.addEventListener('keydown', onKeyDown);

        setTimeout(() => {
          if (btnOk) btnOk.focus();
        }, 50);
      });
    };
    window.customConfirm = window.showConfirmDialog;
    window.showToast = showToast;
    window.showSuccessFeedback = function(msg, options = {}) {
      window.showFeedbackPopup({
        title: "บันทึก เสร็จแล้ว",
        message: msg || "บันทึก เสร็จแล้ว",
        type: "success",
        icon: "bi-check-circle-fill",
        duration: 3000,
        ...options
      });
    };

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    window.isThammaSrithongAdminStrict = function() {
      const email = ((typeof currentAuthUser !== 'undefined' && currentAuthUser?.email) || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.email) || '').trim().toLowerCase();
      const displayName = ((typeof currentAuthUser !== 'undefined' && currentAuthUser?.displayName) || (typeof currentUserProfile !== 'undefined' && currentUserProfile?.displayName) || '').trim().toLowerCase();
      
      const isEmailMatch = email === 'jaru072@gmail.com';
      const isNameMatch = displayName.includes('thamma') || displayName.includes('srithong') || displayName.includes('ธรรมะ') || displayName.includes('ศรีทอง');

      return isEmailMatch || (isNameMatch && (typeof currentRole !== 'undefined' && currentRole === 'ADMIN'));
    };

    window.copyDataFromOldDatabases = async function(showFeedback = true, customSourceDbId = null) {
      // STRICT PERMISSION CHECK: Only Thamma Srithong (jaru072@gmail.com) can execute
      if (!window.isThammaSrithongAdminStrict()) {
        const errorMsg = "⛔ สงวนสิทธิ์เฉพาะผู้ดูแลระบบหลัก คุณ Thamma Srithong (jaru072@gmail.com) เท่านั้น";
        if (showFeedback) showToast(errorMsg);
        alert(errorMsg);
        return 0;
      }

      const targetDbId = "ai-studio-floragardenv2-c509b5a5-f4a3-4546-bbae-c5f21564ba7d";
      const primarySourceDbId = customSourceDbId ? customSourceDbId.trim() : "ai-studio-floragardentest-b067b23c-205a-446d-8774-e8804286e5e1";

      try {
        const app = getApp();
        if (!db) {
          if (showFeedback) showToast("⚠️ ฐานข้อมูลปลายทาง V.2 ยังไม่พร้อมใช้งาน");
          return 0;
        }

        const collectionsToMigrate = [
          "equipment",
          "employees",
          "attendance",
          "categories",
          "transactions",
          "departments",
          "locations",
          "users",
          "audit_logs",
          "user_login_logs",
          "items",
          "borrowings",
          "system_settings",
          "activity_logs"
        ];

        if (showFeedback) showToast(`⏳ กำลังตรวจสอบและเชื่อมต่อฐานข้อมูล...`);

        // Helper to convert Firestore REST Document to JS Object
        const parseFirestoreRestDoc = (fields) => {
          if (!fields) return {};
          const result = {};
          for (const [key, valueObj] of Object.entries(fields)) {
            if (valueObj.stringValue !== undefined) result[key] = valueObj.stringValue;
            else if (valueObj.integerValue !== undefined) result[key] = parseInt(valueObj.integerValue, 10);
            else if (valueObj.doubleValue !== undefined) result[key] = parseFloat(valueObj.doubleValue);
            else if (valueObj.booleanValue !== undefined) result[key] = valueObj.booleanValue;
            else if (valueObj.timestampValue !== undefined) result[key] = valueObj.timestampValue;
            else if (valueObj.nullValue !== undefined) result[key] = null;
            else if (valueObj.arrayValue !== undefined) {
              result[key] = (valueObj.arrayValue.values || []).map(v => {
                if (v.stringValue !== undefined) return v.stringValue;
                if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
                if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
                if (v.booleanValue !== undefined) return v.booleanValue;
                if (v.mapValue !== undefined) return parseFirestoreRestDoc(v.mapValue.fields);
                return Object.values(v)[0];
              });
            } else if (valueObj.mapValue !== undefined) {
              result[key] = parseFirestoreRestDoc(valueObj.mapValue.fields);
            } else {
              result[key] = Object.values(valueObj)[0];
            }
          }
          return result;
        };

        // Fallback: Read collection via Firebase REST API
        const fetchCollectionViaRest = async (dbId, colName) => {
          try {
            let idToken = "";
            try {
              let currentUser = auth.currentUser;
              if (!currentUser && window.auth && window.auth.currentUser) {
                currentUser = window.auth.currentUser;
              }
              if (currentUser) {
                idToken = await currentUser.getIdToken(true); // Force refresh token
              }
            } catch (tokErr) {
              console.warn("Could not retrieve auth idToken:", tokErr);
            }

            const cleanDbId = (dbId === "(default)") ? "(default)" : dbId;
            const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${cleanDbId}/documents/${colName}?pageSize=300&key=${firebaseConfig.apiKey}`;
            const headers = {};
            if (idToken) {
              headers['Authorization'] = `Bearer ${idToken}`;
            }
            
            const res = await fetch(url, { headers });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              const errTxt = errBody.error?.message || res.statusText || `HTTP ${res.status}`;
              console.warn(`REST fetch error for ${dbId}/${colName}:`, res.status, errBody);
              return { error: `[${res.status}] ${errTxt}`, docs: [] };
            }
            const data = await res.json();
            if (!data.documents || data.documents.length === 0) {
              return { docs: [] };
            }
            const docs = data.documents.map(docItem => {
              const parts = docItem.name.split('/');
              const docId = parts[parts.length - 1];
              return {
                id: docId,
                data: parseFirestoreRestDoc(docItem.fields)
              };
            });
            return { docs };
          } catch (e) {
            return { error: e.message, docs: [] };
          }
        };

        // Helper to get or create a Firestore instance for a given database ID
        let migrationAppIndex = 1;
        const getDbInstance = (dbId) => {
          try {
            const fsSettings = { experimentalAutoDetectLongPolling: true };
            if (!dbId || dbId === "(default)") {
              try {
                return getFirestore(app);
              } catch (e) {
                const subApp = initializeApp(firebaseConfig, `migrationApp_${migrationAppIndex++}`);
                return initializeFirestore(subApp, fsSettings);
              }
            }
            
            try {
              const subApp = initializeApp({ ...firebaseConfig, firestoreDatabaseId: dbId }, `migrationApp_${migrationAppIndex++}`);
              return initializeFirestore(subApp, fsSettings, dbId);
            } catch (initErr) {
              try {
                return getFirestore(app, dbId);
              } catch (e2) {
                console.warn(`[Migration] Failed to get db instance for ${dbId}:`, initErr, e2);
                return null;
              }
            }
          } catch (e) {
            console.warn(`[Migration] Failed to get db instance for ${dbId}:`, e);
            return null;
          }
        };

        // 1. Try Primary Source: floragardentest
        let totalDocsCopied = 0;
        const detailedCounts = {};
        const recordedErrors = [];

        const testAndCopyFromDb = async (sourceDbId, label) => {
          let copied = 0;
          const errors = [];
          const src = getDbInstance(sourceDbId);

          for (const colName of collectionsToMigrate) {
            let foundDocs = false;

            // Strategy A: Direct REST API (Reliable in multi-db contexts)
            const restResult = await fetchCollectionViaRest(sourceDbId, colName);
            if (restResult.docs && restResult.docs.length > 0) {
              foundDocs = true;
              console.log(`[Migration-REST] Found ${restResult.docs.length} docs in '${colName}' (${label})`);
              detailedCounts[colName] = (detailedCounts[colName] || 0) + restResult.docs.length;
              for (const docObj of restResult.docs) {
                const rawData = docObj.data || {};
                const officialCode = (rawData.code || (colName === 'equipment' ? rawData.equipmentCode : '') || rawData.id || docObj.id || '').trim();
                const cleanData = { ...rawData, id: officialCode || docObj.id, code: officialCode || docObj.id };
                const targetId = officialCode || docObj.id;

                await setDoc(doc(db, colName, targetId), cleanData, { merge: true });
                if (docObj.id !== targetId) {
                  try { await deleteDoc(doc(db, colName, docObj.id)); } catch(e){}
                }
                copied++;
              }
            } else if (restResult.error && !restResult.error.includes("404")) {
              errors.push(`REST [${colName}]: ${restResult.error}`);
            }

            // Strategy B: SDK getDocs if REST returned 0 docs or failed
            if (!foundDocs && src) {
              try {
                const snap = await getDocs(collection(src, colName));
                if (snap && snap.docs && snap.docs.length > 0) {
                  foundDocs = true;
                  console.log(`[Migration-SDK] Found ${snap.docs.length} docs in '${colName}' (${label})`);
                  detailedCounts[colName] = (detailedCounts[colName] || 0) + snap.docs.length;
                  for (const docSnap of snap.docs) {
                    const rawData = docSnap.data() || {};
                    const officialCode = (rawData.code || (colName === 'equipment' ? rawData.equipmentCode : '') || rawData.id || docSnap.id || '').trim();
                    const cleanData = { ...rawData, id: officialCode || docSnap.id, code: officialCode || docSnap.id };
                    const targetId = officialCode || docSnap.id;

                    await setDoc(doc(db, colName, targetId), cleanData, { merge: true });
                    if (docSnap.id !== targetId) {
                      try { await deleteDoc(doc(db, colName, docSnap.id)); } catch(e){}
                    }
                    copied++;
                  }
                }
              } catch (colErr) {
                console.warn(`[Migration-SDK] Error reading '${colName}' from ${label}:`, colErr.message || colErr);
                if (!errors.some(e => e.includes(colName))) {
                  errors.push(`SDK [${colName}]: ${colErr.message || colErr}`);
                }
              }
            }
          }
          return { count: copied, errors };
        };

        console.log(`[Migration] Scanning primary source: ${primarySourceDbId}`);
        const primaryResult = await testAndCopyFromDb(primarySourceDbId, `Flora Garden Test (${primarySourceDbId})`);
        totalDocsCopied += primaryResult.count;
        if (primaryResult.errors.length > 0) {
          recordedErrors.push(...primaryResult.errors);
        }

        // 2. If primary returned 0 docs, ASK USER FIRST via confirm dialog
        if (totalDocsCopied === 0) {
          console.log("[Migration] Primary source returned 0 docs.");
          
          let userChoice = null;
          if (showFeedback) {
            const errSummary = recordedErrors.length > 0 ? `\n\n(รายละเอียดข้อความแจ้งเตือน: ${recordedErrors[0]})` : "";
            userChoice = confirm(
              `ℹ️ ตรวจสอบฐานข้อมูล "${primarySourceDbId}" แล้ว ไม่พบข้อมูล${errSummary}\n\n` +
              "คุณต้องการให้ระบบลองตรวจสอบฐานข้อมูลสำรองอื่นๆ ในโปรเจกต์ 'flora-gaden' หรือไม่?\n\n" +
              "• กด 'ตกลง (OK)' = ค้นหาจากฐานข้อมูลเดิมตัวอื่น (Flora Garden New / Default)\n" +
              "• กด 'ยกเลิก (Cancel)' = ป้อน Database ID เอง หรือหยุดการทำงาน"
            );
          }

          if (userChoice) {
            showToast("⏳ กำลังตรวจสอบฐานข้อมูลสำรองอื่นๆ ในโปรเจกต์...");
            const otherCandidates = [
              { id: "ai-studio-floragardennew-077d9b3a-d839-404a-986e-0ab7c5c9be6e", name: "Flora Garden New (077d9b3a)" },
              { id: "ai-studio-1c1eba69-e70f-482c-b553-e77fc7efbd4f", name: "Flora Garden 1c1eba69" },
              { id: "(default)", name: "Default Database" }
            ];

            for (const cand of otherCandidates) {
              const candResult = await testAndCopyFromDb(cand.id, cand.name);
              if (candResult.count > 0) {
                console.log(`[Migration] Successfully recovered ${candResult.count} docs from candidate '${cand.name}' (${cand.id})!`);
                totalDocsCopied += candResult.count;
                break; // Found and copied data
              }
            }
          }
        }

        console.log(`[Migration] Migration execution finished. Total docs copied: ${totalDocsCopied}`);

        if (showFeedback) {
          if (totalDocsCopied > 0) {
            const summaryTxt = Object.entries(detailedCounts).map(([k, v]) => `• ${k}: ${v} รายการ`).join('\n');
            alert(`🎉 ซิงค์และคัดลอกข้อมูลเรียบร้อยแล้ว!\n\nจำนวนข้อมูลที่นำเข้าทั้งหมด: ${totalDocsCopied} รายการ\n\n${summaryTxt}\n\nข้อมูลทั้งหมดถูกจัดเก็บลงสู่ฐานข้อมูล V.2 (ai-studio-floragardenv2-c509b5a5-f4a3-4546-bbae-c5f21564ba7d) เรียบร้อยครับ`);
            showToast(`🎉 ซิงค์ข้อมูลสำเร็จแล้ว ${totalDocsCopied} รายการ`);
          } else {
            let diagnosticMsg = `ℹ️ ระบบได้ทำการตรวจค้นฐานข้อมูลแล้ว ไม่พบข้อมูล (0 รายการ)`;
            if (recordedErrors.length > 0) {
              diagnosticMsg += `\n\nข้อความแจ้งเตือนจากระบบ:\n${recordedErrors.slice(0, 3).join('\n')}`;
            }
            alert(diagnosticMsg);
            showToast(`ℹ️ ไม่พบข้อมูลในฐานข้อมูลต้นทาง`);
          }
        }

        if (typeof renderCatalogGrid === 'function') renderCatalogGrid();
        if (typeof renderStaffTable === 'function') renderStaffTable();
        if (typeof renderEmployeesList === 'function') renderEmployeesList();
        if (typeof updateStatsCards === 'function') updateStatsCards();

        return totalDocsCopied;
      } catch (err) {
        console.error("[Migration] Fatal error:", err);
        if (showFeedback) showToast("❌ เกิดข้อผิดพลาดขณะคัดลอกข้อมูล: " + err.message);
        alert("❌ เกิดข้อผิดพลาดขณะคัดลอกข้อมูล: " + err.message);
        return 0;
      }
    };

    window.confirmAndSyncFromFloraGardenTest = async function() {
      if (!window.isThammaSrithongAdminStrict()) {
        const errorMsg = "⛔ สงวนสิทธิ์เฉพาะผู้ดูแลระบบหลัก คุณ Thamma Srithong (jaru072@gmail.com) เท่านั้น";
        showToast(errorMsg);
        alert(errorMsg);
        return;
      }

      const defaultDb = "ai-studio-floragardentest-b067b23c-205a-446d-8774-e8804286e5e1";
      const customDbInput = prompt(
        "⚡ ซิงค์ข้อมูลจากฐานข้อมูลเดิมมายัง V.2\n\n" +
        "กรุณาตรวจสอบหรือระบุ Database ID ต้นทางที่ต้องการดึงข้อมูล:\n(ค่าเริ่มต้นคือ floragardentest)",
        defaultDb
      );

      if (customDbInput !== null) {
        const chosenDb = customDbInput.trim() || defaultDb;
        const total = await window.copyDataFromOldDatabases(true, chosenDb);
        if (total > 0) {
          // Automatically run deduplication and normalization after sync
          await window.cleanAndDeduplicateAllCollections(false);
        }
      }
    };

    // Clean up duplicate documents across collections and normalize doc.id === code
    window.cleanAndDeduplicateAllCollections = async function(showFeedback = true) {
      if (!isFirebaseReady || !db) {
        if (showFeedback) showToast("⚠️ Firebase Firestore ยังไม่พร้อมใช้งาน");
        return;
      }
      if (!window.isThammaSrithongAdminStrict()) {
        const errorMsg = "⛔ สงวนสิทธิ์เฉพาะผู้ดูแลระบบหลัก คุณ Thamma Srithong (jaru072@gmail.com) เท่านั้น";
        if (showFeedback) { showToast(errorMsg); alert(errorMsg); }
        return;
      }

      if (showFeedback) {
        const ok = await window.showConfirmDialog({
          title: "ล้างข้อมูลซ้ำซ้อนและจัดระเบียบ Document ID",
          message: "ระบบจะทำการสแกน collections (categories, departments, locations, equipment, employees) เพื่อรวมเอกสารที่ซ้ำกัน และจัดระเบียบให้ชื่อ Document ID ตรงกับ code: ประจำตัวอย่างถูกต้อง และลบเอกสารที่รหัสซ้ำ/random ออก ยืนยันดำเนินการหรือไม่?",
          type: "primary",
          icon: "bi-stars",
          confirmText: "เริ่มจัดระเบียบและล้างตัวซ้ำ"
        });
        if (!ok) return;
      }

      showToast("⏳ กำลังเริ่มจัดระเบียบ Document ID และล้างข้อมูลซ้ำซ้อน...");

      const report = {};
      let totalFixed = 0;
      let totalDeletedDuplicates = 0;

      const collectionsToCheck = [
        { name: "categories", codePrefix: "CAT", nameField: "name" },
        { name: "departments", codePrefix: "DEP", nameField: "name" },
        { name: "locations", codePrefix: "LOC", nameField: "name" },
        { name: "equipment", codePrefix: "EQ", nameField: "name" },
        { name: "employees", codePrefix: "EMP", nameField: "name" }
      ];

      for (const colInfo of collectionsToCheck) {
        const colName = colInfo.name;
        try {
          const qSnap = await getDocs(collection(db, colName));
          if (qSnap.empty) continue;

          const seenByCode = new Map();
          const seenByName = new Map();
          const docsToDelete = [];

          for (const dSnap of qSnap.docs) {
            const data = dSnap.data() || {};
            const codeVal = (data.code || (colName === 'equipment' ? data.equipmentCode : '') || data.id || dSnap.id || '').trim();
            const nameVal = (data.name || (colName === 'employees' ? data.fullName : '') || '').trim();
            const isStandardId = (dSnap.id === codeVal);

            const record = {
              dSnap,
              data,
              docId: dSnap.id,
              codeVal,
              nameVal,
              isStandardId
            };

            const codeKey = codeVal.toLowerCase();
            const nameKey = nameVal.toLowerCase();

            // Check duplicates by Code
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

            // Check duplicates by Name (for categories, departments, locations)
            if (nameKey && (colName === 'categories' || colName === 'departments' || colName === 'locations')) {
              if (!seenByName.has(nameKey)) {
                seenByName.set(nameKey, record);
              } else {
                const existing = seenByName.get(nameKey);
                if (isStandardId && !existing.isStandardId) {
                  if (!docsToDelete.includes(existing.dSnap)) docsToDelete.push(existing.dSnap);
                  seenByName.set(nameKey, record);
                } else {
                  if (!docsToDelete.includes(dSnap)) docsToDelete.push(dSnap);
                }
              }
            }
          }

          // 1. Ensure all authoritative documents are written with doc.id === codeVal
          for (const [codeKey, record] of seenByCode.entries()) {
            const targetId = record.codeVal || record.docId;
            const cleanData = { ...record.data, id: targetId, code: targetId };
            if (colName === 'departments' || colName === 'locations') {
              cleanData.name = record.nameVal || cleanData.name || targetId;
            }

            await setDoc(doc(db, colName, targetId), cleanData, { merge: true });
            totalFixed++;

            // If the original document had a different random ID, delete it
            if (record.docId !== targetId) {
              docsToDelete.push(record.dSnap);
            }
          }

          // 2. Delete all duplicate or stray documents
          const uniqueDocsToDelete = Array.from(new Set(docsToDelete));
          for (const strayDoc of uniqueDocsToDelete) {
            try {
              await deleteDoc(strayDoc.ref);
              totalDeletedDuplicates++;
            } catch (delErr) {
              console.warn(`Error deleting duplicate doc in ${colName}:`, delErr);
            }
          }

          report[colName] = {
            total: qSnap.size,
            unique: seenByCode.size,
            duplicatesRemoved: uniqueDocsToDelete.length
          };

        } catch (err) {
          console.warn(`Error deduplicating ${colName}:`, err);
        }
      }

      saveToLocalStorage();

      if (typeof renderCategoryDropdowns === 'function') renderCategoryDropdowns();
      if (typeof renderCategoryManagementList === 'function') renderCategoryManagementList();
      if (typeof populateDepartmentDropdowns === 'function') populateDepartmentDropdowns();
      if (typeof populateLocationDropdowns === 'function') populateLocationDropdowns();
      if (typeof renderDepartmentsListModal === 'function') renderDepartmentsListModal();
      if (typeof renderLocationsListModal === 'function') renderLocationsListModal();
      if (typeof renderCatalogGrid === 'function') renderCatalogGrid();
      if (typeof renderStaffTable === 'function') renderStaffTable();
      if (typeof renderEmployeeDirectory === 'function') renderEmployeeDirectory();

      const reportLines = Object.entries(report).map(([k, v]) => `• ${k}: ลบตัวซ้ำ ${v.duplicatesRemoved} รายการ (คงเหลือเอกสารหลัก ${v.unique} รายการ)`).join('\n');
      const msg = `🎉 จัดระเบียบและล้างข้อมูลซ้ำซ้อนสำเร็จแล้ว!\n\n• รวมเอกสารที่ลบซ้ำซ้อนออก: ${totalDeletedDuplicates} รายการ\n• จัดโครงสร้าง Document ID ตรงตาม code: สำเร็จ\n\nรายละเอียดแยกแต่ละตาราง:\n${reportLines}`;
      
      if (showFeedback) {
        alert(msg);
        showToast(`🎉 ล้างข้อมูลซ้ำซ้อนสำเร็จ (${totalDeletedDuplicates} รายการ)`);
      }
    };

    // ==========================================
    // EXCEL IMPORT FOR EMPLOYEES (ADMIN ONLY)
    // ==========================================
    let parsedExcelEmployeesData = [];

    window.triggerImportEmployeeExcel = function() {
      const fileInput = document.getElementById('excelEmpFileInput');
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    };

    window.downloadEmployeeExcelTemplate = function() {
      if (typeof XLSX === 'undefined') {
        alert("ระบบกำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้งในสักครู่");
        return;
      }
      const sampleData = [
        {
          "รหัสพนักงาน": "EMP-001",
          "ชื่อ-นามสกุล": "สมชาย สวนงาม",
          "ชื่อเล่น": "ชาย",
          "แผนก": "แผนกงานทดลอง",
          "ตำแหน่ง": "พนักงานเกษตร",
          "เบอร์โทร": "0812345678",
          "หมายเหตุ": "ประจำเรือนกระจก A"
        },
        {
          "รหัสพนักงาน": "EMP-002",
          "ชื่อ-นามสกุล": "วิภาวรรณ สดใส",
          "ชื่อเล่น": "เปิ้ล",
          "แผนก": "แผนกทีมกุหลาบ",
          "ตำแหน่ง": "หัวหน้าชุดดูแลดอกไม้",
          "เบอร์โทร": "0898765432",
          "หมายเหตุ": "ผู้เชี่ยวชาญการผสมดิน"
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายชื่อพนักงาน");
      XLSX.writeFile(wb, "ตัวอย่างไฟล์นำเข้าพนักงาน_FloraGarden.xlsx");
      showToast("📥 ดาวน์โหลดไฟล์ตัวอย่างนำเข้าพนักงานเรียบร้อยแล้ว");
    };

    window.handleImportEmployeeExcel = function(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (typeof XLSX === 'undefined') {
        alert("ยังไม่ได้โหลดไลบรารีอ่านไฟล์ Excel (XLSX) กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่");
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!jsonRows || jsonRows.length === 0) {
            alert("ไม่พบข้อมูลในไฟล์ Excel ที่เลือก กรุณาตรวจสอบไฟล์แล้วลองใหม่อีกครั้ง");
            return;
          }

          parsedExcelEmployeesData = [];

          function findVal(row, keyPatterns) {
            for (const k of Object.keys(row)) {
              const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
              for (const p of keyPatterns) {
                if (cleanK.includes(p)) {
                  return String(row[k]).trim();
                }
              }
            }
            return '';
          }

          let autoIdx = 1;
          jsonRows.forEach((row, i) => {
            const nameVal = findVal(row, ['ชื่อนามสกุล', 'ชื่อ', 'name', 'fullname', 'empname']);
            if (!nameVal) return; // Skip empty row without name

            let idVal = findVal(row, ['รหัสพนักงาน', 'รหัส', 'code', 'id', 'empcode', 'empid']);
            if (!idVal) {
              const paddedStr = String(employeeList.length + autoIdx).padStart(3, '0');
              idVal = `EMP-${paddedStr}`;
              autoIdx++;
            }

            const nicknameVal = findVal(row, ['ชื่อเล่น', 'nickname', 'nick']);
            const deptVal = findVal(row, ['แผนก', 'สวน', 'department', 'dept']) || 'ทั่วไป';
            const positionVal = findVal(row, ['ตำแหน่ง', 'position', 'pos']) || 'พนักงาน';
            const roleVal = findVal(row, ['สิทธิ์', 'บทบาท', 'role']) || 'WORKER';
            const phoneVal = findVal(row, ['เบอร์โทร', 'เบอร์', 'โทร', 'phone', 'tel', 'mobile']);
            const detailsVal = findVal(row, ['รายละเอียด', 'หมายเหตุ', 'details', 'note', 'remark']);

            parsedExcelEmployeesData.push({
              id: idVal,
              code: idVal,
              name: nameVal,
              nickname: nicknameVal,
              department: deptVal,
              position: positionVal,
              role: roleVal.toUpperCase().includes('ADMIN') ? 'ADMIN' : (roleVal.toUpperCase().includes('STAFF') ? 'STAFF' : 'WORKER'),
              phone: phoneVal,
              details: detailsVal,
              photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
            });
          });

          if (parsedExcelEmployeesData.length === 0) {
            alert("ไม่สามารถอ่านข้อมูลพนักงานจากหัวตารางในไฟล์ Excel ได้\n\nกรุณาใช้คอลัมน์ชื่อ: 'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'แผนก', 'ตำแหน่ง', 'เบอร์โทร'");
            return;
          }

          // Duplicate detection pass
          const excelNameCounts = {};
          parsedExcelEmployeesData.forEach(emp => {
            const norm = (emp.name || '').trim().toLowerCase();
            if (norm) {
              excelNameCounts[norm] = (excelNameCounts[norm] || 0) + 1;
            }
          });

          let dupNameCount = 0;
          let dupIdCount = 0;

          parsedExcelEmployeesData.forEach(emp => {
            const normName = (emp.name || '').trim().toLowerCase();
            const dbMatch = employeeList.find(x => x.name && x.name.trim().toLowerCase() === normName);
            const dbIdMatch = employeeList.find(x => x.id === emp.id || (x.code && x.code === emp.id));
            const inExcelDup = excelNameCounts[normName] > 1;

            emp.dbMatch = dbMatch || null;
            emp.dbIdMatch = dbIdMatch || null;
            emp.inExcelDup = inExcelDup;

            if (dbMatch || inExcelDup) dupNameCount++;
            if (dbIdMatch) dupIdCount++;
          });

          // Render Preview Table
          const tbody = document.getElementById('excelEmpPreviewTableBody');
          const countBadge = document.getElementById('excelEmpCountBadge');
          const dupNameBadge = document.getElementById('excelDupNameBadge');
          const confirmCountText = document.getElementById('excelConfirmCountText');

          if (countBadge) countBadge.textContent = parsedExcelEmployeesData.length;
          if (confirmCountText) confirmCountText.textContent = parsedExcelEmployeesData.length;

          if (dupNameBadge) {
            if (dupNameCount > 0) {
              dupNameBadge.innerHTML = `<span class="badge bg-warning text-dark ms-2 fw-semibold"><i class="bi bi-exclamation-triangle-fill text-dark me-1"></i>พบชื่อซ้ำ ${dupNameCount} รายการ</span>`;
            } else {
              dupNameBadge.innerHTML = `<span class="badge bg-success bg-opacity-15 text-success ms-2 fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>ไม่พบชื่อซ้ำ</span>`;
            }
          }

          if (tbody) {
            tbody.innerHTML = parsedExcelEmployeesData.map(emp => {
              let statusBadgeHtml = '';
              if (emp.dbIdMatch) {
                statusBadgeHtml = `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle py-1 px-2"><i class="bi bi-arrow-repeat me-1"></i>รหัสซ้ำ (${escapeHtml(emp.dbIdMatch.id)})</span>`;
              } else if (emp.dbMatch) {
                statusBadgeHtml = `<span class="badge bg-warning bg-opacity-15 text-dark border border-warning-subtle py-1 px-2" title="ตรงกับ ${escapeHtml(emp.dbMatch.id)}"><i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>ชื่อซ้ำในระบบ (${escapeHtml(emp.dbMatch.id)})</span>`;
              } else if (emp.inExcelDup) {
                statusBadgeHtml = `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle py-1 px-2"><i class="bi bi-files me-1"></i>ชื่อซ้ำในไฟล์</span>`;
              } else {
                statusBadgeHtml = `<span class="badge bg-success bg-opacity-10 text-success border border-success-subtle py-1 px-2"><i class="bi bi-plus-circle me-1"></i>ใหม่</span>`;
              }

              return `
                <tr>
                  <td class="ps-3 font-monospace fw-bold"><span class="badge bg-dark">${escapeHtml(emp.id)}</span></td>
                  <td class="fw-bold text-dark">${escapeHtml(emp.name)}</td>
                  <td class="text-success fw-bold">${escapeHtml(emp.nickname || '-')}</td>
                  <td><span class="badge bg-success bg-opacity-10 text-success fw-bold">${escapeHtml(emp.department)}</span></td>
                  <td class="text-secondary">${escapeHtml(emp.position)}</td>
                  <td class="text-muted font-monospace">${escapeHtml(emp.phone || '-')}</td>
                  <td class="text-center">${statusBadgeHtml}</td>
                </tr>
              `;
            }).join('');
          }

          const modalElem = document.getElementById('importEmployeeExcelModal');
          if (modalElem) {
            const modal = new bootstrap.Modal(modalElem);
            modal.show();
          }
        } catch (err) {
          console.error("handleImportEmployeeExcel error:", err);
          alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    };

    window.saveImportedEmployeeExcelData = async function() {
      if (!parsedExcelEmployeesData || parsedExcelEmployeesData.length === 0) {
        showToast("ไม่พบรายการพนักงานที่จะนำเข้า");
        return;
      }

      const overwriteCheck = document.getElementById('excelEmpOverwriteCheck');
      const shouldOverwrite = overwriteCheck ? overwriteCheck.checked : true;

      const confirmBtn = document.getElementById('confirmImportExcelBtn');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<div class="spinner-border spinner-border-sm me-2"></div>กำลังบันทึกข้อมูล...`;
      }

      let addedCount = 0;
      let updatedCount = 0;

      for (const emp of parsedExcelEmployeesData) {
        const normName = (emp.name || '').trim().toLowerCase();

        // Check if existing employee found by ID or by Name
        let existingIdx = employeeList.findIndex(x => x.id === emp.id || (x.code && x.code === emp.id));
        if (existingIdx === -1 && normName) {
          existingIdx = employeeList.findIndex(x => x.name && x.name.trim().toLowerCase() === normName);
        }

        if (existingIdx !== -1) {
          if (shouldOverwrite) {
            // Use existing employee's ID to preserve primary key consistency
            const existingEmp = employeeList[existingIdx];
            if (existingEmp && existingEmp.id) {
              emp.id = existingEmp.id;
              emp.code = existingEmp.id;
            }

            // Keep existing photo if not explicitly provided in excel
            const existingPhoto = existingEmp.photoUrl;
            if (existingPhoto && existingPhoto !== 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80') {
              emp.photoUrl = existingPhoto;
            }
            employeeList[existingIdx] = { ...existingEmp, ...emp };
            updatedCount++;
          }
        } else {
          employeeList.unshift(emp);
          addedCount++;
        }

        if (isFirebaseReady && db) {
          try {
            await setDoc(doc(db, "employees", emp.id), emp, { merge: true });
          } catch (fErr) {
            console.warn("Firestore import employee setDoc error:", fErr);
          }
        }
      }

      saveToLocalStorage();

      if (typeof logAuditAction === 'function') {
        logAuditAction('บุคลากร', 'นำเข้า Excel', `นำเข้าพนักงานจาก Excel ทั้งหมด ${parsedExcelEmployeesData.length} รายการ (เพิ่มใหม่: ${addedCount}, อัปเดตเดิม: ${updatedCount})`);
      }

      renderEmployeeDirectory();
      populateEmployeeDropdowns();
      updateStats();

      const modalElem = document.getElementById('importEmployeeExcelModal');
      if (modalElem) {
        const modalInst = bootstrap.Modal.getInstance(modalElem);
        if (modalInst) modalInst.hide();
      }

      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ยืนยันนำเข้าข้อมูล (${parsedExcelEmployeesData.length} รายการ)`;
      }

      showToast(`🟢 นำเข้าพนักงานสำเร็จ! เพิ่มใหม่ ${addedCount} รายการ, อัปเดต ${updatedCount} รายการ`);
      parsedExcelEmployeesData = [];
    };

    window.copyDataFromDefaultToNewDatabase = window.copyDataFromOldDatabases;

    async function runAutoMigration() {
      if (!localStorage.getItem("firestore_migrated_v4")) {
        console.log("[AutoMigration] Executing complete data copy from (default) into target database...");
        const count = await window.copyDataFromOldDatabases(true);
        if (typeof count === 'number') {
          localStorage.setItem("firestore_migrated_v4", "true");
        }
      }
    }

    // ==================== FLOATING SCROLL NAVIGATION (BACK TO TOP & GO TO BOTTOM) ====================
    window.scrollToPageTop = function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.scrollToPageBottom = function() {
      const maxScroll = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      window.scrollTo({ top: maxScroll, behavior: 'smooth' });
    };

    function initScrollNavWatcher() {
      const scrollContainer = document.getElementById('scrollNavContainer');
      const btnTop = document.getElementById('btnScrollToTop');
      const btnBottom = document.getElementById('btnScrollToBottom');
      if (!scrollContainer) return;

      function updateScrollButtonsVisibility() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const docHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight
        );

        const isPageScrollable = docHeight > (windowHeight + 100);

        if (isPageScrollable) {
          scrollContainer.classList.add('show');
        } else {
          scrollContainer.classList.remove('show');
        }

        if (btnTop) {
          if (scrollTop > 100) {
            btnTop.style.opacity = '1';
            btnTop.style.pointerEvents = 'auto';
            btnTop.removeAttribute('disabled');
          } else {
            btnTop.style.opacity = '0.35';
            btnTop.style.pointerEvents = 'none';
            btnTop.setAttribute('disabled', 'true');
          }
        }

        if (btnBottom) {
          const isNearBottom = (scrollTop + windowHeight) >= (docHeight - 100);
          if (!isNearBottom) {
            btnBottom.style.opacity = '1';
            btnBottom.style.pointerEvents = 'auto';
            btnBottom.removeAttribute('disabled');
          } else {
            btnBottom.style.opacity = '0.35';
            btnBottom.style.pointerEvents = 'none';
            btnBottom.setAttribute('disabled', 'true');
          }
        }
      }

      window.addEventListener('scroll', updateScrollButtonsVisibility, { passive: true });
      window.addEventListener('resize', updateScrollButtonsVisibility, { passive: true });
      try {
        const observer = new MutationObserver(updateScrollButtonsVisibility);
        observer.observe(document.body, { childList: true, subtree: true });
      } catch(e) {}

      updateScrollButtonsVisibility();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initApp();
        initScrollNavWatcher();
        setTimeout(runAutoMigration, 2000);
      });
    } else {
      initApp();
      initScrollNavWatcher();
      setTimeout(runAutoMigration, 2000);
    }