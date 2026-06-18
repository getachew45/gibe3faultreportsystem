 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyASXhHvfBIeJHDq8W3qOIJxu1WUpgFIdxc",
  authDomain: "gibe3faultreport-49cf5.firebaseapp.com",
  projectId: "gibe3faultreport-49cf5",
  storageBucket: "gibe3faultreport-49cf5.firebasestorage.app",
  messagingSenderId: "988734471018",
  appId: "1:988734471018:web:eeb163388d7413cb7f4313",
  measurementId: "G-5QDX6S601F"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let isAdmin = false; // System Role Flag

// --- AUTHENTICATION MANAGEMENT (STEP 8.1 & 8.2) ---
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        
        signInWithEmailAndPassword(auth, email, pass)
            .then(() => { loginForm.reset(); })
            .catch(err => alert("Authentication failed: " + err.message));
    });
}

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    const loginSection = document.getElementById('loginSection');
    const appContent = document.getElementById('appContent');
    const authStatus = document.getElementById('authStatus');
    const logoutBtn = document.getElementById('logoutBtn');

    if (user) {
        currentUser = user;
        // Simple Admin Check Rule (e.g., if email is admin@gibe3.gov.et or specific uid)
        isAdmin = user.email.toLowerCase().includes('admin') || user.email === "getachew86@gmail.com"; 
        
        loginSection.classList.add('hidden');
        appContent.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        authStatus.insertAdjacentHTML('afterbegin', <span id="userBadge" class="text-xs bg-blue-800 px-3 py-1.5 rounded border border-blue-400 font-medium"><i class="fa-solid fa-user-shield"></i> ${user.email} (${isAdmin ? 'Admin' : 'Operator'})</span>);
        
        loadReports();
    } else {
        currentUser = null;
        isAdmin = false;
        loginSection.classList.remove('hidden');
        appContent.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        const badge = document.getElementById('userBadge');
        if(badge) badge.remove();
    }
});

// --- SUBMIT FAULT REPORT ---
document.getElementById('faultForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const docId = document.getElementById('faultDocId').value;
    
    const faultData = {
        type: 'Fault',
        logNo: document.getElementById('faultLogNo').value,
        date: document.getElementById('faultDate').value,
        time: document.getElementById('faultTime').value,
        unit: document.getElementById('faultyUnit').value,
        equipment: document.getElementById('faultedEquipment').value,
        effect: document.querySelector('input[name="faultEffect"]:checked').value,
        interruption: document.getElementById('interruptionTime').value,
        restoration: document.getElementById('restorationTime').value,
        scada: document.getElementById('scadaSignals').value,
        remedial: document.getElementById('remedialAction').value,
        groups: {
            A: document.getElementById('groupA').value,
            B: document.getElementById('groupB').value,
            C: document.getElementById('groupC').value,
            D: document.getElementById('groupD').value
        },
        comments: document.getElementById('faultComments').value,
        recordedBy: document.getElementById('recordedBy').value,
        submittedTime: document.getElementById('submittedTime').value,
        status: 'Pending Maintenance',
        updatedAt: new Date().toISOString()
    };

    try {
        if(docId) {
            if(!isAdmin) return alert("Access Denied! Only Admin can edit records.");
            await updateDoc(doc(db, "reports", docId), faultData);
            alert("Fault Report updated successfully!");
        } else {
            await addDoc(collection(db, "reports"), faultData);
            alert("Fault Report saved successfully!");
        }
        document.getElementById('faultForm').reset();
        document.getElementById('faultDocId').value = '';
        loadReports();
    } catch (err) { alert("Error saving report: " + err.message); }
});

// --- SUBMIT MAINTENANCE REPORT ---
document.getElementById('maintForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const docId = document.getElementById('maintDocId').value;

    const maintData = {
        type: 'Maintenance',
        reportNo: document.getElementById('maintReportNo').value,
        logNo: document.getElementById('refFaultLogNo').value,
        unit: document.getElementById('repairedUnit').value,
        equipment: document.getElementById('repairedEquipment').value,
        workStarted: document.getElementById('workStarted').value,
        workCompleted: document.getElementById('workCompleted').value,
        details: document.getElementById('maintDetails').value,
        testResult: document.querySelector('input[name="testResult"]:checked').value,
        scadaClearance: document.querySelector('input[name="scadaClearance"]:checked').value,
        pendingSignals: document.getElementById('pendingSignals').value,
        recommendations: document.getElementById('maintRecommendations').value,
        managerName: document.getElementById('maintManagerName').value,
        signTime: document.getElementById('maintSignTime').value,
        status: 'Completed & Handed Over',
        updatedAt: new Date().toISOString()
    };

    try {
        if(docId) {
            if(!isAdmin) return alert("Access Denied! Only Admin can edit records.");
            await updateDoc(doc(db, "reports", docId), maintData);
            alert("Maintenance Report updated successfully!");
        } else {
            await addDoc(collection(db, "reports"), maintData);
            alert("Maintenance Handover saved successfully!");
        }
        document.getElementById('maintForm').reset();
        document.getElementById('maintDocId').value = '';
        loadReports();
    } catch (err) { alert("Error: " + err.message); }
});

// --- LOAD AND RENDER LOGS (With Admin Action Validation) ---
async function loadReports() {
    const querySnapshot = await getDocs(collection(db, "reports"));
    const tbody = document.getElementById('reportLogBody');
    tbody.innerHTML = '';

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        let statusColor = data.type === 'Fault' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';

        const row = `
            <tr class="hover:bg-gray-50 bg-white">
                <td class="p-3 border font-bold text-blue-900">${data.logNo || data.reportNo}</td>
                <td class="p-3 border">${data.unit}</td>
                <td class="p-3 border">${data.equipment}</td>
                <td class="p-3 border font-semibold text-xs">${data.type.toUpperCase()}</td>
                <td class="p-3 border"><span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColor}">${data.status}</span></td>
                <td class="p-3 border flex items-center gap-1">
                    <button onclick="viewSingleReport('${id}')" class="bg-blue-100 hover:bg-blue-200 text-blue-900 p-1 px-2 rounded text-xs" title="View & Print"><i class="fa-solid fa-eye"></i> View</button>
                    ${isAdmin ?` 
                        <button onclick="editReport('${id}', '${data.type}')" class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 p-1 px-2 rounded text-xs" title="Edit"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button onclick="deleteReport('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 p-1 px-2 rounded text-xs" title="Delete"><i class="fa-solid fa-trash"></i> Del</button>
                     `:` 
                        <button class="bg-gray-100 text-gray-400 p-1 px-2 rounded text-xs cursor-not-allowed" disabled title="Admin Only"><i class="fa-solid fa-lock"></i> Lock</button>
                    `}
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// --- EDIT & DELETE INTERFACES (Exposed Globals for UI clicks) ---
window.deleteReport = async (id) => {
    if(!isAdmin) return alert("Access Denied! Admins only.");
    if(confirm("Are you sure you want to permanently delete this report?")) {
        await deleteDoc(doc(db, "reports", id));
        loadReports();
    }
};

window.editReport = async (id, type) => {
    if(!isAdmin) return alert("Access Denied! Admins only.");
    const docSnap = await getDoc(doc(db, "reports", id));
    if(!docSnap.exists()) return;
    const data = docSnap.data();

    if(type === 'Fault') {
        document.getElementById('faultDocId').value = id;
        document.getElementById('faultLogNo').value = data.logNo;
        document.getElementById('faultDate').value = data.date;
        document.getElementById('faultTime').value = data.time;
        document.getElementById('faultyUnit').value = data.unit;
        document.getElementById('faultedEquipment').value = data.equipment;
        document.getElementById('interruptionTime').value = data.interruption;
        document.getElementById('restorationTime').value = data.restoration;
        document.getElementById('scada').value = data.scada;
        document.getElementById('remedialAction').value = data.remedial;
        document.getElementById('groupA').value = data.groups?.A || '';
        document.getElementById('groupB').value = data.groups?.B || '';
        document.getElementById('groupC').value = data.groups?.C || '';
        document.getElementById('groupD').value = data.groups?.D || '';
        document.getElementById('faultComments').value = data.comments;
        document.getElementById('recordedBy').value = data.recordedBy;
        document.getElementById('submittedTime').value = data.submittedTime;
        
        switchTab('faultTab', 'faultFormView');
    } else {
        document.getElementById('maintDocId').value = id;
        document.getElementById('maintReportNo').value = data.reportNo;
        document.getElementById('refFaultLogNo').value = data.logNo;
        document.getElementById('repairedUnit').value = data.unit;
        document.getElementById('repairedEquipment').value = data.equipment;
        document.getElementById('workStarted').value = data.workStarted;
        document.getElementById('workCompleted').value = data.workCompleted;
        document.getElementById('maintDetails').value = data.details;
        document.getElementById('maintRecommendations').value = data.recommendations;
        document.getElementById('maintManagerName').value = data.managerName;
        document.getElementById('maintSignTime').value = data.signTime;

        switchTab('maintTab', 'maintFormView');
    }
};

// --- PRINT LAYOUT CONFIGURATOR (STEP 8.6 & 8.8) ---
             window.viewSingleReport = async (id) => {
    const docSnap = await getDoc(doc(db, "reports", id));
    if(!docSnap.exists()) return;
    const data = docSnap.data();
    
    let container = document.getElementById('printableArea');
    
    if(data.type === 'Fault') {
        container.innerHTML = `
            <div class="p-6 style="font-family: monospace;">
                <div class="text-center border-b pb-4 mb-4">
                    <h1 class="text-xl font-bold">ETHIOPIAN ELECTRIC POWER</h1>
                    <h2 class="text-lg font-bold">GIBE III HYDROELECTRIC POWER PLANT</h2>
                    <h3 class="text-md font-semibold underline">1. FAULT RECORDING FORMAT</h3>
                </div>
                <p><strong>Fault Log No:</strong> ${data.logNo} | <strong>Date:</strong> ${data.date} | <strong>Time:</strong> ${data.time}</p>
                <h4 class="font-bold bg-gray-100 p-1 mt-4">A. Fault Details</h4>
                <p><strong>Faulty Unit / Line:</strong> ${data.unit}</p>
                <p><strong>Faulted Equipment:</strong> ${data.equipment}</p>
                <p><strong>Effect of Fault:</strong> [✓] ${data.effect}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">B. Interruption Details</h4>
                <p><strong>Interruption:</strong> ${data.interruption || 'N/A'} | <strong>Restoration:</strong> ${data.restoration || 'N/A'}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">C. SCADA Signals & Actions</h4>
                <p><strong>SCADA Signals:</strong> ${data.scada || 'None'}</p>
                <p><strong>Remedial Action:</strong> ${data.remedial || 'None'}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">D. Shift Handover Information</h4>
                <p><strong>Group A:</strong> ${data.groups?.A || '-'} | <strong>Group B:</strong> ${data.groups?.B || '-'}</p>
                <p><strong>Group C:</strong> ${data.groups?.C || '-'} | <strong>Group D:</strong> ${data.groups?.D || '-'}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">E. Comments & Sign-Off</h4>
                <p><strong>Comments:</strong> ${data.comments || 'None'}</p>
                <p><strong>Recorded By:</strong> ${data.recordedBy}</p>
                <p><strong>Operation Manager:</strong> Mr. Dejene Guta</p>
            </div>
       ` ;
    } else {
        container.innerHTML = `
            <div class="p-6">
                <div class="text-center border-b pb-4 mb-4">
                    <h1 class="text-xl font-bold">ETHIOPIAN ELECTRIC POWER</h1>
                    <h2 class="text-lg font-bold">GIBE III HYDROELECTRIC POWER PLANT</h2>
                    <h3 class="text-md font-semibold underline">2. MAINTENANCE COMPLETION & HANDOVER FORM</h3>
                </div>
                <p><strong>Maintenance Report No:</strong> ${data.reportNo} | <strong>Ref. Fault Log No:</strong> ${data.logNo}</p>
                <h4 class="font-bold bg-gray-100 p-1 mt-4">A. General Information</h4>
                <p><strong>Repaired Unit/Line:</strong> ${data.unit} | <strong>Equipment:</strong> ${data.equipment}</p>
                <p><strong>Work Window:</strong> ${data.workStarted} To ${data.workCompleted}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">B. Maintenance Work Details</h4>
                <p>${data.details}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">C. Post-Testing Readiness</h4>
                <p><strong>Test Result:</strong> ${data.testResult}</p>
                <p><strong>SCADA Clearance:</strong> ${data.scadaClearance} ${data.pendingSignals ? `(${data.pendingSignals})` : ''}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">D. Recommendations</h4>
               <p>${data.recommendations || 'None'}</p>
                
                <h4 class="font-bold bg-gray-100 p-1 mt-4">E. Sign-Offs</h4>
                <p><strong>Maintenance Manager:</strong> ${data.managerName} (${data.signTime})</p>
                <p><strong>Accepted By Operation Manager:</strong> Mr. Dejene Guta</p>
            </div>
        `;
    }
    document.getElementById('printModal').classList.remove('hidden');
};

window.closePrintModal = () => document.getElementById('printModal').classList.add('hidden');

// --- PDF GENERATOR (STEP 8.6) ---
window.generatePDF = () => {
    const element = document.getElementById('printableArea');
    const opt = {
        margin: 0.5,
        filename: 'Gibe3-Report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
};

// --- EXCEL TABLE EXPORT (STEP 8.7) ---
window.exportToExcel = () => {
    const table = document.getElementById('reportsTable');
    const wb = XLSX.utils.table_to_book(table, { sheet: "Fault Logs Summary" });
    XLSX.writeFile(wb, "Gibe3_Operations_Summary.xlsx");
};

// --- CLIENT SEARCH AND FILTER (STEP 8.5) ---
window.filterReports = () => {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const rows = document.querySelectorAll('#reportLogBody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
};