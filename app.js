import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://xdbquvontcxjymxharmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnF1dm9udGN4anlteGhhcm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzYwNjMsImV4cCI6MjEwNjk1MjA2M30.YSQmfv6LFulZa9RIP7VnfL4UZXYobhsEUKOKGOI9Ilk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const ADMIN_USER = "admin@sistema.com";
const ADMIN_PASS = "derivaciones2026";

const loginForm = document.getElementById('loginForm');
const userInput = document.getElementById('userInput');
const passInput = document.getElementById('passInput');
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const btnLogout = document.getElementById('btnLogout');

const qrForm = document.getElementById('qrForm');
const statusMsg = document.getElementById('statusMsg');
const qrcodeContainer = document.getElementById('qrcode');
const qrActions = document.getElementById('qrActions');
const btnPrint = document.getElementById('btnPrint');
const btnCopy = document.getElementById('btnCopy');
const treeMenu = document.getElementById('treeMenu');

const archivosInput = document.getElementById('archivosInput');
const previewGallery = document.getElementById('previewGallery');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');

const viewerModal = document.getElementById('viewerModal');
const btnCloseViewer = document.getElementById('btnCloseViewer');
const viewerTitle = document.getElementById('viewerTitle');
const viewerContent = document.getElementById('viewerContent');
const viewerImages = document.getElementById('viewerImages');

// Editor CamScanner variables
const editorModal = document.getElementById('editorModal');
const btnCloseEditor = document.getElementById('btnCloseEditor');
const editorCanvas = document.getElementById('editorCanvas');
const btnRotateLeft = document.getElementById('btnRotateLeft');
const btnRotateRight = document.getElementById('btnRotateRight');
const btnBwFilter = document.getElementById('btnBwFilter');
const btnResetFilter = document.getElementById('btnResetFilter');
const brightnessInput = document.getElementById('brightnessInput');
const contrastInput = document.getElementById('contrastInput');
const btnSaveEdit = document.getElementById('btnSaveEdit');

let loadedFilesData = [];
let currentEditingIndex = null;
let currentImageObject = null;
let currentRotation = 0;
let isBw = false;

let ultimoContenidoQR = "";
let currentImagesArray = [];
let currentIndex = 0;

const btnToggleSidebar = document.createElement('button');
btnToggleSidebar.id = "btnToggleSidebar";
btnToggleSidebar.className = "btn-toggle-sidebar";
btnToggleSidebar.innerHTML = "📂 Historial";
document.body.appendChild(btnToggleSidebar);

const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');

btnToggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
});

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');

    if (recordId) {
        try {
            const { data } = await supabase
                .from('foto_qr_lr')
                .select('*')
                .eq('id', recordId)
                .single();

            if (data) {
                loginContainer.classList.add('hidden');
                appContainer.classList.remove('hidden');
                if (sidebar) sidebar.classList.add('hidden');
                if (btnToggleSidebar) btnToggleSidebar.classList.add('hidden');
                if (mainContent) mainContent.style.marginLeft = '0';
                abrirVisorCarrusel(data);
            } else {
                alert("El registro escaneado no existe.");
            }
        } catch (err) {
            console.error("Error:", err);
        }
        return;
    }

    localStorage.removeItem('adminLogueado');
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    if (btnToggleSidebar) btnToggleSidebar.classList.add('hidden');
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (userInput.value.trim() === ADMIN_USER && passInput.value.trim() === ADMIN_PASS) {
            localStorage.setItem('adminLogueado', 'true');
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            btnToggleSidebar.classList.remove('hidden');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            }

            await cargarHistorialPorFechas();
            loginForm.reset();
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('adminLogueado');
        window.location.href = window.location.pathname;
    });
}

// Cargar Archivos (Fotos y PDFs)
if (archivosInput) {
    archivosInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        loadedFilesData = [];
        thumbnailsContainer.innerHTML = '';
        
        if (files.length > 0) {
            previewGallery.classList.remove('hidden');
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    const base64 = await fileToBase64(file);
                    loadedFilesData.push({ type: 'image', data: base64, name: file.name });
                } else if (file.type === 'application/pdf') {
                    const base64 = await fileToBase64(file);
                    loadedFilesData.push({ type: 'pdf', data: base64, name: file.name });
                }
            }
            renderThumbnails();
        } else {
            previewGallery.classList.add('hidden');
        }
    });
}

function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function renderThumbnails() {
    thumbnailsContainer.innerHTML = '';
    loadedFilesData.forEach((item, index) => {
        const thumb = document.createElement('div');
        thumb.classList.add('thumb-item');

        if (item.type === 'image') {
            const img = document.createElement('img');
            img.src = item.data;
            thumb.appendChild(img);
            
            const overlay = document.createElement('div');
            overlay.classList.add('edit-overlay');
            overlay.textContent = '✏️ Editar';
            thumb.appendChild(overlay);

            thumb.addEventListener('click', () => abrirEditorCamScanner(index));
        } else {
            const pdfBadge = document.createElement('div');
            pdfBadge.classList.add('pdf-badge');
            pdfBadge.innerHTML = '📄 PDF';
            thumb.appendChild(pdfBadge);
        }
        thumbnailsContainer.appendChild(thumb);
    });
}

// --- EDITOR CAMSCANNER ---
function abrirEditorCamScanner(index) {
    currentEditingIndex = index;
    currentRotation = 0;
    isBw = false;
    brightnessInput.value = 100;
    contrastInput.value = 100;

    const img = new Image();
    img.onload = () => {
        currentImageObject = img;
        aplicarFiltrosYCargarCanvas();
        editorModal.classList.remove('hidden');
    };
    img.src = loadedFilesData[index].data;
}

function aplicarFiltrosYCargarCanvas() {
    if (!currentImageObject) return;

    const ctx = editorCanvas.getContext('2d');
    const width = currentImageObject.width;
    const height = currentImageObject.height;

    if (currentRotation % 180 !== 0) {
        editorCanvas.width = height;
        editorCanvas.height = width;
    } else {
        editorCanvas.width = width;
        editorCanvas.height = height;
    }

    ctx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    ctx.save();

    ctx.translate(editorCanvas.width / 2, editorCanvas.height / 2);
    ctx.rotate((currentRotation * Math.PI) / 180);
    
    const brightness = brightnessInput.value;
    const contrast = contrastInput.value;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    ctx.drawImage(
        currentImageObject,
        -width / 2,
        -height / 2
    );
    ctx.restore();

    if (isBw) {
        const imgData = ctx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const bw = avg > 120 ? 255 : 0;
            data[i] = bw;
            data[i + 1] = bw;
            data[i + 2] = bw;
        }
        ctx.putImageData(imgData, 0, 0);
    }
}

if (btnRotateLeft) btnRotateLeft.addEventListener('click', () => { currentRotation -= 90; aplicarFiltrosYCargarCanvas(); });
if (btnRotateRight) btnRotateRight.addEventListener('click', () => { currentRotation += 90; aplicarFiltrosYCargarCanvas(); });
if (btnBwFilter) btnBwFilter.addEventListener('click', () => { isBw = !isBw; aplicarFiltrosYCargarCanvas(); });
if (btnResetFilter) btnResetFilter.addEventListener('click', () => {
    currentRotation = 0;
    isBw = false;
    brightnessInput.value = 100;
    contrastInput.value = 100;
    aplicarFiltrosYCargarCanvas();
});
if (brightnessInput) brightnessInput.addEventListener('input', aplicarFiltrosYCargarCanvas);
if (contrastInput) contrastInput.addEventListener('input', aplicarFiltrosYCargarCanvas);

if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', () => {
        const editedBase64 = editorCanvas.toDataURL('image/jpeg', 0.9);
        loadedFilesData[currentEditingIndex].data = editedBase64;
        renderThumbnails();
        editorModal.classList.add('hidden');
    });
}

if (btnCloseEditor) {
    btnCloseEditor.addEventListener('click', () => editorModal.classList.add('hidden'));
}

// SUBMIT DE FORMULARIO
if (qrForm) {
    qrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const contenido = document.getElementById('contenido').value.trim();

        statusMsg.textContent = "Guardando...";
        statusMsg.classList.remove('hidden');

        try {
            const fecha = new Date();
            const year = fecha.getFullYear().toString();
            const month = (fecha.getMonth() + 1).toString().padStart(2, '0');

            const payloadImagenes = loadedFilesData.map(item => item.data);

            const { data, error } = await supabase
                .from('foto_qr_lr')
                .insert([{ titulo, contenido, imagenes: payloadImagenes, year, month }])
                .select();

            if (error) throw error;

            const enlace = `${window.location.origin + window.location.pathname}?id=${data[0].id}`;
            ultimoContenidoQR = enlace;
            statusMsg.textContent = "¡QR Generado con éxito!";

            qrcodeContainer.innerHTML = "";
            new QRCode(qrcodeContainer, { text: enlace, width: 140, height: 140 });

            qrActions.classList.remove('hidden');
            qrForm.reset();
            previewGallery.classList.add('hidden');
            loadedFilesData = [];
            await cargarHistorialPorFechas();
        } catch (err) {
            statusMsg.textContent = "Error: " + err.message;
        }
    });
}

if (btnPrint) btnPrint.addEventListener('click', () => window.print());
if (btnCopy) btnCopy.addEventListener('click', () => {
    if (ultimoContenidoQR) navigator.clipboard.writeText(ultimoContenidoQR).then(() => alert("¡Enlace copiado!"));
});

// HISTORIAL Y ELIMINACIÓN DE PACIENTES
async function cargarHistorialPorFechas() {
    try {
        console.log("Cargando historial desde Supabase...");
        const { data, error } = await supabase
            .from('foto_qr_lr')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        treeMenu.innerHTML = '';
        if (!data || data.length === 0) {
            treeMenu.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center; margin-top:15px;">Sin registros.</p>';
            return;
        }

        const estructura = {};
        data.forEach(reg => {
            // Si no tiene año o mes guardado, lo extraemos de created_at o usamos la fecha actual
            let y = reg.year;
            let m = reg.month;
            if (!y || !m) {
                const d = reg.created_at ? new Date(reg.created_at) : new Date();
                y = d.getFullYear().toString();
                m = (d.getMonth() + 1).toString().padStart(2, '0');
            }

            if (!estructura[y]) estructura[y] = {};
            if (!estructura[y][m]) estructura[y][m] = [];
            estructura[y][m].push(reg);
        });

        for (const y in estructura) {
            const yDiv = document.createElement('div');
            yDiv.classList.add('year-folder');
            yDiv.innerHTML = `<div class="folder-title">📁 Año ${y}</div>`;
            const mList = document.createElement('div');

            for (const m in estructura[y]) {
                const mDiv = document.createElement('div');
                mDiv.classList.add('month-folder');
                mDiv.innerHTML = `<div class="folder-title">📂 Mes ${m}</div>`;
                const rList = document.createElement('div');
                rList.classList.add('record-list');

                estructura[y][m].forEach(reg => {
                    const row = document.createElement('div');
                    row.classList.add('record-item-row');

                    const title = document.createElement('div');
                    title.classList.add('record-item-title');
                    title.textContent = reg.titulo;
                    title.addEventListener('click', () => {
                        abrirVisorCarrusel(reg);
                        if (window.innerWidth <= 768) {
                            sidebar.classList.add('collapsed');
                            mainContent.classList.add('expanded');
                        }
                    });

                    const btnDelete = document.createElement('button');
                    btnDelete.classList.add('btn-delete-record');
                    btnDelete.innerHTML = '🗑️';
                    btnDelete.title = 'Eliminar Paciente';
                    btnDelete.addEventListener('click', (e) => {
                        e.stopPropagation();
                        eliminarPaciente(reg.id, reg.titulo);
                    });

                    row.appendChild(title);
                    row.appendChild(btnDelete);
                    rList.appendChild(row);
                });
                mDiv.appendChild(rList);
                mList.appendChild(mDiv);
            }
            yDiv.appendChild(mList);
            treeMenu.appendChild(yDiv);
        }
    } catch (err) {
        console.error("Error al cargar historial:", err);
        treeMenu.innerHTML = `<p style="font-size:0.8rem; color:red; text-align:center; margin-top:15px;">Error al cargar historial.</p>`;
    }
}

async function eliminarPaciente(id, titulo) {
    if (confirm(`¿Estás seguro de que deseas eliminar el registro de "${titulo}"?`)) {
        try {
            const { error } = await supabase
                .from('foto_qr_lr')
                .delete()
                .eq('id', id);

            if (error) throw error;
            alert("Registro eliminado con éxito.");
            await cargarHistorialPorFechas();
        } catch (err) {
            alert("Error al eliminar el registro: " + err.message);
        }
    }
}

// VISOR CARRUSEL CON SOPORTE PARA FOTOS Y PDF
function abrirVisorCarrusel(reg) {
    if (viewerTitle) viewerTitle.textContent = reg.titulo;
    if (viewerContent) viewerContent.textContent = reg.contenido || "";
    viewerImages.innerHTML = '';

    if (reg.imagenes && reg.imagenes.length > 0) {
        currentImagesArray = reg.imagenes;
        currentIndex = 0;
        renderElementoCarrusel(reg.titulo);
    } else {
        viewerImages.innerHTML = '<p style="color:white; text-align:center; padding:30px;">Este registro no tiene archivos adjuntos.</p>';
    }

    viewerModal.classList.remove('hidden');
}

function renderElementoCarrusel(tituloReg) {
    viewerImages.innerHTML = '';
    const fileData = currentImagesArray[currentIndex];
    const carContainer = document.createElement('div');
    carContainer.classList.add('carousel-container');

    const isPdf = fileData.startsWith('data:application/pdf');

    if (isPdf) {
        const iframe = document.createElement('iframe');
        iframe.src = fileData;
        carContainer.appendChild(iframe);
    } else {
        const imgTag = document.createElement('img');
        imgTag.src = fileData;
        carContainer.appendChild(imgTag);
    }

    const counter = document.createElement('div');
    counter.classList.add('carousel-counter');
    counter.textContent = `${currentIndex + 1} / ${currentImagesArray.length}`;
    carContainer.appendChild(counter);

    const btnDownload = document.createElement('a');
    btnDownload.classList.add('carousel-download-btn');
    btnDownload.innerHTML = '⬇️ Descargar';
    btnDownload.href = fileData;
    btnDownload.download = `${tituloReg.replace(/\s+/g, '_')}_${currentIndex + 1}.${isPdf ? 'pdf' : 'jpg'}`;
    carContainer.appendChild(btnDownload);

    if (currentImagesArray.length > 1) {
        const btnPrev = document.createElement('button');
        btnPrev.classList.add('carousel-btn', 'carousel-prev');
        btnPrev.innerHTML = '&#10094;';
        btnPrev.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + currentImagesArray.length) % currentImagesArray.length;
            renderElementoCarrusel(tituloReg);
        });

        const btnNext = document.createElement('button');
        btnNext.classList.add('carousel-btn', 'carousel-next');
        btnNext.innerHTML = '&#10095;';
        btnNext.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % currentImagesArray.length;
            renderElementoCarrusel(tituloReg);
        });

        carContainer.appendChild(btnPrev);
        carContainer.appendChild(btnNext);
    }

    viewerImages.appendChild(carContainer);
}

if (btnCloseViewer) {
    btnCloseViewer.addEventListener('click', () => {
        viewerModal.classList.add('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}
