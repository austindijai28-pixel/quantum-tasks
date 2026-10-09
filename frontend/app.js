/**
 * QUANTUM TASKS 3.0 — 3D Cloud Dashboard & Task Manager
 * Integrates Three.js 3D WebGL visuals, real-time AWS API Gateway / Cognito sync,
 * 3D card tilt physics, search/filter suite, and synthesized audio feedback.
 */
import dotenv from 'dotenv';
dotenv.config();
const API_URL = process.env.API_URL;


// -------------------------------------------------------------
// 1. SYNTHESIZED WEB AUDIO SOUND FX
// -------------------------------------------------------------
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === "click") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === "success") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === "delete") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        }
    } catch (e) {
        // Ignore audio errors gracefully
    }
}

// -------------------------------------------------------------
// 2. THREE.JS 3D WEBGL AMBIENT DASHBOARD SCENE
// -------------------------------------------------------------
let scene, camera, renderer, nodesGroup, starField;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

function initThreeJSDashboard() {
    const canvas = document.getElementById("webgl-bg-canvas");
    if (!canvas) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 32;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floating 3D Geometric Nodes Group
    nodesGroup = new THREE.Group();

    const geometries = [
        new THREE.IcosahedronGeometry(1.6, 0),
        new THREE.OctahedronGeometry(1.4, 0),
        new THREE.TetrahedronGeometry(1.5, 0),
        new THREE.TorusGeometry(1.2, 0.35, 12, 24)
    ];

    const materials = [
        new THREE.MeshPhysicalMaterial({ color: 0x00f2fe, wireframe: true, transparent: true, opacity: 0.35 }),
        new THREE.MeshPhysicalMaterial({ color: 0x7928ca, wireframe: true, transparent: true, opacity: 0.3 }),
        new THREE.MeshPhysicalMaterial({ color: 0x00f2a9, wireframe: true, transparent: true, opacity: 0.35 }),
        new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0.25 })
    ];

    for (let i = 0; i < 18; i++) {
        const geo = geometries[i % geometries.length];
        const mat = materials[i % materials.length];
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.x = (Math.random() - 0.5) * 50;
        mesh.position.y = (Math.random() - 0.5) * 40;
        mesh.position.z = (Math.random() - 0.5) * 20 - 5;

        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;

        mesh.userData = {
            rotSpeedX: (Math.random() - 0.5) * 0.015,
            rotSpeedY: (Math.random() - 0.5) * 0.015,
            floatSpeed: 0.001 + Math.random() * 0.002,
            initialY: mesh.position.y
        };

        nodesGroup.add(mesh);
    }
    scene.add(nodesGroup);

    // Starfield Particle Constellation
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 80;
        positions[i + 1] = (Math.random() - 0.5) * 80;
        positions[i + 2] = (Math.random() - 0.5) * 50 - 10;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6
    });

    starField = new THREE.Points(particleGeo, particleMat);
    scene.add(starField);

    // Lights
    const pLight1 = new THREE.PointLight(0x00f2fe, 2, 50);
    pLight1.position.set(15, 15, 10);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0x7928ca, 2, 50);
    pLight2.position.set(-15, -15, 10);
    scene.add(pLight2);

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener("mousemove", (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) * 0.0008;
        mouseY = (e.clientY - window.innerHeight / 2) * 0.0008;
    });

    animateDashboardThreeJS();
}

function animateDashboardThreeJS() {
    requestAnimationFrame(animateDashboardThreeJS);

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    const time = Date.now() * 0.001;

    if (nodesGroup) {
        nodesGroup.children.forEach((mesh) => {
            mesh.rotation.x += mesh.userData.rotSpeedX;
            mesh.rotation.y += mesh.userData.rotSpeedY;
            mesh.position.y = mesh.userData.initialY + Math.sin(time + mesh.position.x) * 1.2;
        });
        nodesGroup.rotation.y += 0.0008;
    }

    if (starField) {
        starField.rotation.y += 0.0003;
    }

    camera.position.x = targetX * 14;
    camera.position.y = -targetY * 14;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

// -------------------------------------------------------------
// 3. 3D CARD TILT EFFECT HANDLER
// -------------------------------------------------------------
function apply3DTilt(element, maxTilt = 8) {
    if (!element) return;

    element.addEventListener("mousemove", (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const tiltX = ((y - centerY) / centerY) * -maxTilt;
        const tiltY = ((x - centerX) / centerX) * maxTilt;

        element.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-3px) scale3d(1.01, 1.01, 1.01)`;
    });

    element.addEventListener("mouseleave", () => {
        element.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)";
    });
}

// -------------------------------------------------------------
// 4. TOAST NOTIFICATION SYSTEM
// -------------------------------------------------------------
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""}`;

    const iconSvg = type === "success" 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f2a9" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : type === "error"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px) scale(0.9)";
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// -------------------------------------------------------------
// 5. STATUS & HEADERS
// -------------------------------------------------------------
const STATUS_ORDER = ["pending", "in-progress", "done"];
const STATUS_LABEL = {
    pending: "Pending",
    "in-progress": "In Progress",
    done: "Completed ✓"
};

function getHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = localStorage.getItem("id_token");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

function normalizeStatus(raw) {
    const clean = String(raw || "pending").trim().toLowerCase().replace(/\s+/g, "-");
    return STATUS_ORDER.includes(clean) ? clean : "pending";
}

function nextStatus(current) {
    return current === "done" ? "pending" : "done";
}

function setStatusMessage(text, isError = false) {
    const statusMsg = document.getElementById("statusMessage");
    if (!statusMsg) return;
    statusMsg.textContent = text;
    statusMsg.classList.toggle("is-error", isError);
}

function describeError(error) {
    const likelyCors = error instanceof TypeError && error.message.includes("Failed to fetch");
    return likelyCors
        ? "Network / CORS block (Check AWS API Gateway CORS settings)"
        : error.message;
}

// -------------------------------------------------------------
// 6. KPI METRICS & FILTER COUNTS
// -------------------------------------------------------------
function updateKPIMetrics() {
    const total = tasksState.length;
    const completed = tasksState.filter(t => t.status === "done").length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // KPI Numbers
    const elTotal = document.getElementById("kpiTotal");
    const elCompleted = document.getElementById("kpiCompleted");
    const elPending = document.getElementById("kpiPending");
    const elRate = document.getElementById("kpiRate");
    const elProgressBar = document.getElementById("kpiProgressBar");
    const elDonePercent = document.getElementById("kpiDonePercent");

    if (elTotal) elTotal.textContent = total;
    if (elCompleted) elCompleted.textContent = completed;
    if (elPending) elPending.textContent = pending;
    if (elRate) elRate.textContent = `${rate}%`;
    if (elProgressBar) elProgressBar.style.width = `${rate}%`;
    if (elDonePercent) elDonePercent.textContent = `${rate}% of total`;

    // Filter pill count badges
    const countAll = document.getElementById("countAll");
    const countPending = document.getElementById("countPending");
    const countDone = document.getElementById("countDone");

    if (countAll) countAll.textContent = total;
    if (countPending) countPending.textContent = pending;
    if (countDone) countDone.textContent = completed;
}

// -------------------------------------------------------------
// 7. TASK RENDERING & FILTERING
// -------------------------------------------------------------
function renderTasksList() {
    const list = document.getElementById("taskList");
    if (!list) return;

    list.innerHTML = "";

    // Apply active filter and search query
    const filtered = tasksState.filter(item => {
        const matchesFilter = 
            activeFilter === "all" ||
            (activeFilter === "pending" && item.status !== "done") ||
            (activeFilter === "done" && item.status === "done");

        const matchesSearch = searchQuery === "" || item.task.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        const isSearch = searchQuery.trim().length > 0;
        list.innerHTML = `
            <li class="empty-task-card">
                <div class="empty-icon-3d">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                </div>
                <div class="empty-title">${isSearch ? "No matching tasks found" : "No active tasks in this view"}</div>
                <p class="empty-desc">${isSearch ? "Try searching for a different keyword or clear the search filter." : "Create your first task above using the 3D action bar to get started."}</p>
            </li>
        `;
        return;
    }

    filtered.forEach(item => {
        const li = document.createElement("li");
        li.className = "task-card";
        li.dataset.id = item.id;
        li.dataset.status = item.status;

        const isDone = item.status === "done";

        li.innerHTML = `
            <button type="button" class="task-checkbox-btn" data-action="toggle-status" title="${isDone ? 'Mark as Pending' : 'Mark as Complete'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </button>
            <div class="task-title-wrap">
                <span class="task-title"></span>
                <span class="task-meta">ID: ${escapeHtml(item.id.slice(0, 8))} • Status: ${isDone ? 'Finished' : 'Pending'}</span>
            </div>
            <button type="button" class="status-pill" data-status="${item.status}" data-action="toggle-status" title="Toggle status">
                ${STATUS_LABEL[item.status] || item.status}
            </button>
            <button type="button" class="delete-btn" data-action="delete" title="Delete task" aria-label="Delete task">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;

        li.querySelector(".task-title").textContent = item.task;

        // Attach 3D tilt
        apply3DTilt(li, 4);

        list.appendChild(li);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// -------------------------------------------------------------
// 8. CRUD OPERATIONS (AWS API GATEWAY)
// -------------------------------------------------------------
async function loadTasks() {
    const rawBox = document.getElementById("rawResponse");
    const refreshBtn = document.getElementById("refreshBtn");
    
    if (refreshBtn) refreshBtn.classList.add("is-spinning");
    setStatusMessage("Synchronizing tasks with AWS Cloud...");

    try {
        
        const response = await fetch(API_URL, { headers: getHeaders() });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} — ${response.statusText}`);
        }

        const data = await response.json();
        if (rawBox) rawBox.textContent = JSON.stringify(data, null, 2);

        let rawTasks = [];
        if (Array.isArray(data)) {
            rawTasks = data;
        } else if (data && data.body !== undefined) {
            rawTasks = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
        } else if (data && Array.isArray(data.Items)) {
            rawTasks = data.Items;
        } else if (data && Array.isArray(data.tasks)) {
            rawTasks = data.tasks;
        }

        tasks = (Array.isArray(rawTasks) ? rawTasks : []).map(item => ({
            id: item.id?.S ?? item.id ?? ("task-" + Math.random().toString(36).substr(2, 9)),
            task: item.task?.S ?? item.task ?? "(untitled)",
            status: normalizeStatus(item.status?.S ?? item.status)
        }));

        tasksState = tasks;
        updateKPIMetrics();
        renderTasksList();
        setStatusMessage("");

    } catch (error) {
        console.error("Error loading tasks:", error);
        setStatusMessage(`Cloud sync error: ${describeError(error)}`, true);
        showToast("Failed to sync tasks with AWS API Gateway", "error");

    } finally {
        if (refreshBtn) refreshBtn.classList.remove("is-spinning");
    }
}

async function addTask() {
    const taskInput = document.getElementById("task");
    const task = taskInput ? taskInput.value.trim() : "";

    if (!task) {
        setStatusMessage("Please enter task details before submitting.", true);
        taskInput?.focus();
        return;
    }

    playSound("click");
    setStatusMessage("Creating task on AWS...");

    const newTaskObj = {
        id: "task-" + Date.now().toString(36),
        task: task,
        status: "pending"
    };

    // Optimistic UI insertion
    tasksState.unshift(newTaskObj);
    updateKPIMetrics();
    renderTasksList();
    if (taskInput) taskInput.value = "";

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ task: task, status: "pending" })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        showToast("Task saved to AWS DynamoDB", "success");
        playSound("success");
        setStatusMessage("");
        loadTasks();

    } catch (error) {
        console.error("Error adding task:", error);
        showToast("Saved locally (Cloud sync failed: CORS/Auth)", "info");
        setStatusMessage(`Cloud error: ${describeError(error)}`, true);
    }
}

async function updateTaskStatus(id, currentStatus) {
    const target = nextStatus(currentStatus);
    playSound(target === "done" ? "success" : "click");

    // Optimistic State Update
    const taskItem = tasksState.find(t => t.id === id);
    if (taskItem) {
        taskItem.status = target;
        updateKPIMetrics();
        renderTasksList();
    }

    try {
        

        const response = await fetch(API_URL, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ id: id, status: target })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        showToast(`Task updated to ${target}`, "success");

    } catch (error) {
        console.error("Error updating status:", error);
        showToast("Updated locally (Cloud sync failed)", "info");
    }
}

async function deleteTask(id, cardElement) {
    playSound("delete");

    if (cardElement) {
        cardElement.classList.add("is-removing");
    }

    setTimeout(() => {
        tasksState = tasksState.filter(t => t.id !== id);
        updateKPIMetrics();
        renderTasksList();
    }, 250);

    try {
        const response = await fetch(API_URL, {
            method: "DELETE",
            headers: getHeaders(),
            body: JSON.stringify({ id: id })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        showToast("Task deleted from AWS DynamoDB", "info");

    } catch (error) {
        console.error("Error deleting task:", error);
        showToast("Deleted locally (Cloud sync failed)", "info");
    }
}

function logout() {
    playSound("click");
    localStorage.clear();
    window.location.href = "login.html";
}

// -------------------------------------------------------------
// 9. DIGITAL CLOCK & EVENT LISTENERS
// -------------------------------------------------------------
function startDigitalClock() {
    const clock = document.getElementById("digitalClock");
    if (!clock) return;

    function update() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clock.textContent = `${hours}:${minutes}:${seconds} UTC+`;
    }

    update();
    setInterval(update, 1000);
}


// -------------------------------------------------------------
// 10. MUSIC PLAYER — Sunflower.mp3 on Repeat
// -------------------------------------------------------------


// -------------------------------------------------------------
// 11. INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initThreeJSDashboard();
    startDigitalClock();
    initEventListeners();
    initMusicPlayer();
    loadTasks();
});