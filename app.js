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

// Editor & Cropper
const editorModal = document.getElementById('editorModal');
const btnCloseEditor = document.getElementById('btnCloseEditor');
const editorImage = document.getElementById('editorImage');
const btnRotateLeft = document.getElementById('btnRotateLeft');
const btnRotateRight = document.getElementById('btnRotateRight');
const btnBwFilter = document.getElementById('btnBwFilter');
const btnResetFilter = document.getElementById('btnResetFilter');
const brightnessInput = document.getElementById('brightnessInput');
const contrastInput = document.getElementById('contrastInput');
const btnSaveEdit = document.getElementById('btnSaveEdit');

let loadedFilesData = [];
let currentEditingIndex = null;
let cropperInstance = null;
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

// Compresión automática ultra eficiente para evitar el error de timeout al subir múltiples imágenes
function optimizarBase64(base64Str, maxWidth = 1200, quality = 0.70) {
    return new Promise((resolve) => {
        if (typeof base64Str === 'string' && base64Str.startsWith('data:application/pdf')) {
            return resolve(base64Str);
        }
        
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
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
}

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
            overlay.textContent = '✂️ Recortar';
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

// CROPPER & EDICIÓN CAMSCANNER
function abrirEditorCamScanner(index) {
    currentEditingIndex = index;
    isBw = false;
    brightnessInput.value = 100;
    contrastInput.value = 100;

    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    editorImage.src = loadedFilesData[index].data;
    editorModal.classList.remove('hidden');

    cropperInstance = new Cropper(editorImage, {
        viewMode: 1,
        autoCropArea: 0.9,
        responsive: true,
        background: false
    });
    
    aplicarFiltrosCSS();
}

function aplicarFiltrosCSS() {
    const brightness = brightnessInput.value;
    const contrast = contrastInput.value;
    const cropperCanvas = document.querySelector('.cropper-container .cropper-canvas img');
    if (cropperCanvas) {
        let filterVal = `brightness(${brightness}%) contrast(${contrast}%)`;
        if (isBw) filterVal += ` grayscale(100%) contrast(150%)`;
        cropperCanvas.style.filter = filterVal;
    }
}

if (btnRotateLeft) btnRotateLeft.addEventListener('click', () => cropperInstance && cropperInstance.rotate(-90));
if (btnRotateRight) btnRotateRight.addEventListener('click', () => cropperInstance && cropperInstance.rotate(90));
if (btnBwFilter) btnBwFilter.addEventListener('click', () => { isBw = !isBw; aplicarFiltrosCSS(); });
if (btnResetFilter) btnResetFilter.addEventListener('click', () => {
    isBw = false;
    brightnessInput.value = 100;
    contrastInput.value = 100;
    if (cropperInstance) cropperInstance.reset();
    aplicarFiltrosCSS();
});
if (brightnessInput) brightnessInput.addEventListener('input', aplicarFiltrosCSS);
if (contrastInput) contrastInput.addEventListener('input', aplicarFiltrosCSS);

if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', () => {
        if (!cropperInstance) return;

        const canvas = cropperInstance.getCroppedCanvas({
            maxWidth: 1600,
            maxHeight: 1600
        });

        if (isBw || brightnessInput.value !== "100" || contrastInput.value !== "100") {
            const ctx = canvas.getContext('2d');
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
                if (isBw) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const bw = avg > 125 ? 255 : 0;
                    data[i] = bw;
                    data[i + 1] = bw;
                    data[i + 2] = bw;
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        loadedFilesData[currentEditingIndex].data = croppedBase64;
        renderThumbnails();

        cropperInstance.destroy();
        cropperInstance = null;
        editorModal.classList.add('hidden');
    });
}

if (btnCloseEditor) {
    btnCloseEditor.addEventListener('click', () => {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        editorModal.classList.add('hidden');
    });
}

if (qrForm) {
    qrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const contenido = document.getElementById('contenido').value.trim();

        statusMsg.textContent = "Comprimiendo fotos y guardando...";
        statusMsg.classList.remove('hidden');

        try {
            const fecha = new Date();
            const year = fecha.getFullYear().toString();
            const month = (fecha.getMonth() + 1).toString().padStart(2, '0');

            const payloadImagenes = await Promise.all(
                loadedFilesData.map(item => optimizarBase64(item.data))
            );

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
            statusMsg.textContent = "Error al guardar: " + err.message;
        }
    });
}

// BOTÓN IMPRIMIR CON MEMBRETE OFICIAL Y FECHA/HORA EXACTA
if (btnPrint) {
    btnPrint.addEventListener('click', () => {
        let printHeader = qrActions.querySelector('.print-header');
        if (!printHeader) {
            printHeader = document.createElement('div');
            printHeader.className = 'print-header';
            qrActions.insertBefore(printHeader, qrcodeContainer);
        }

        const ahora = new Date();
        const fechaFormateada = ahora.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const horaFormateada = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        printHeader.innerHTML = `
            <h3>Dir. de Derivación y Traslado Seguro (LA RIOJA)</h3>
            <p>Fecha de impresión: ${fechaFormateada} - Hora: ${horaFormateada}</p>
        `;

        window.print();
    });
}

if (btnCopy) btnCopy.addEventListener('click', () => {
    if (ultimoContenidoQR) navigator.clipboard.writeText(ultimoContenidoQR).then(() => alert("¡Enlace copiado!"));
});

// CARGA OPTIMIZADA DEL HISTORIAL
async function cargarHistorialPorFechas() {
    try {
        treeMenu.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center; margin-top:15px;">Cargando...</p>';
        
        const { data, error } = await supabase
            .from('foto_qr_lr')
            .select('id, titulo, year, month, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        treeMenu.innerHTML = '';
        if (!data || data.length === 0) {
            treeMenu.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center; margin-top:15px;">Sin registros.</p>';
            return;
        }

        const estructura = {};
        data.forEach(reg => {
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
                    title.textContent = reg.titulo || 'Sin nombre';
                    title.addEventListener('click', () => {
                        obtenerYVisualizarDetalle(reg.id);
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
        treeMenu.innerHTML = `<p style="font-size:0.75rem; color:red; text-align:center; margin-top:15px; padding:0 5px;">Error al cargar: ${err.message}</p>`;
    }
}

async function obtenerYVisualizarDetalle(id) {
    try {
        const { data, error } = await supabase
            .from('foto_qr_lr')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (data) abrirVisorCarrusel(data);
    } catch (err) {
        alert("Error al obtener los datos del paciente: " + err.message);
    }
}

async function eliminarPaciente(id, titulo) {
    if (confirm(`¿Estás seguro de que deseas eliminar el registro de "${titulo || 'este paciente'}"?`)) {
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
    
    if (!fileData) {
        viewerImages.innerHTML = '<p style="color:white; text-align:center; padding:30px;">Archivo no disponible o dañado.</p>';
        return;
    }

    const carContainer = document.createElement('div');
    carContainer.classList.add('carousel-container');

    const isPdf = typeof fileData === 'string' && fileData.startsWith('data:application/pdf');

    if (isPdf) {
        const iframe = document.createElement('iframe');
        iframe.src = fileData;
        carContainer.appendChild(iframe);
    } else {
        const imgTag = document.createElement('img');
        imgTag.src = fileData;
        imgTag.onerror = () => {
            imgTag.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
            imgTag.style.opacity = '0.5';
        };
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
    btnDownload.download = `${(tituloReg || 'paciente').replace(/\s+/g, '_')}_${currentIndex + 1}.${isPdf ? 'pdf' : 'jpg'}`;
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
