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

const imagenesInput = document.getElementById('imagenesInput');
const previewGallery = document.getElementById('previewGallery');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');

const viewerModal = document.getElementById('viewerModal');
const btnCloseViewer = document.getElementById('btnCloseViewer');
const viewerTitle = document.getElementById('viewerTitle');
const viewerContent = document.getElementById('viewerContent');
const viewerImages = document.getElementById('viewerImages');

let selectedImagesBase64 = []; // Admite imágenes (data URL) y PDF (objetos con nombre y data URL)
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
    loginForm.addEventListener('submit', (e) => {
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

            cargarHistorialPorFechas();
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

function comprimirImagen(file, maxWidth = 1600, quality = 0.92) {
    return new Promise((resolve) => {
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
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function leerArchivoComoDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
        reader.readAsDataURL(file);
    });
}

if (imagenesInput) {
    imagenesInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        selectedImagesBase64 = [];
        thumbnailsContainer.innerHTML = '';

        if (!files.length) {
            previewGallery.classList.add('hidden');
            return;
        }

        previewGallery.classList.remove('hidden');

        try {
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const compressedBase64 = await comprimirImagen(file);
                    selectedImagesBase64.push({
                        tipo: 'imagen',
                        nombre: file.name,
                        data: compressedBase64
                    });

                    const img = document.createElement('img');
                    img.src = compressedBase64;
                    img.alt = file.name;
                    img.title = file.name;
                    thumbnailsContainer.appendChild(img);
                } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    // Límite preventivo para evitar guardar archivos demasiado grandes en una fila de la base de datos.
                    if (file.size > 5 * 1024 * 1024) {
                        throw new Error(`El PDF "${file.name}" supera los 5 MB. Elegí un archivo más pequeño.`);
                    }

                    const dataUrl = await leerArchivoComoDataURL(file);
                    selectedImagesBase64.push({
                        tipo: 'pdf',
                        nombre: file.name,
                        data: dataUrl
                    });

                    const pdfCard = document.createElement('div');
                    pdfCard.className = 'file-preview-pdf';
                    pdfCard.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:12px; min-width:100px; min-height:100px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; color:#334155; font-size:12px; overflow-wrap:anywhere;';
                    const icon = document.createElement('span');
                    icon.textContent = '📄';
                    icon.style.fontSize = '30px';
                    const name = document.createElement('span');
                    name.textContent = file.name;
                    name.style.maxWidth = '130px';
                    name.style.textAlign = 'center';
                    pdfCard.append(icon, name);
                    thumbnailsContainer.appendChild(pdfCard);
                } else {
                    throw new Error(`El archivo "${file.name}" no es una imagen ni un PDF.`);
                }
            }
        } catch (err) {
            selectedImagesBase64 = [];
            thumbnailsContainer.innerHTML = '';
            previewGallery.classList.add('hidden');
            imagenesInput.value = '';
            alert(err.message || 'No se pudieron cargar los archivos.');
        }
    });
}

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

            const { data, error } = await supabase
                .from('foto_qr_lr')
                .insert([{ titulo, contenido, imagenes: selectedImagesBase64, year, month }])
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
            selectedImagesBase64 = [];
            if (imagenesInput) imagenesInput.value = '';
            thumbnailsContainer.innerHTML = '';
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

async function cargarHistorialPorFechas() {
    try {
        const { data } = await supabase.from('foto_qr_lr').select('*').order('created_at', { ascending: false });
        treeMenu.innerHTML = '';
        if (!data || data.length === 0) {
            treeMenu.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center; margin-top:15px;">Sin registros.</p>';
            return;
        }

        const estructura = {};
        data.forEach(reg => {
            const y = reg.year || '2026';
            const m = reg.month || '10';
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
                    const item = document.createElement('div');
                    item.classList.add('record-item');
                    item.textContent = reg.titulo;
                    item.addEventListener('click', () => {
                        abrirVisorCarrusel(reg);
                        if (window.innerWidth <= 768) {
                            sidebar.classList.add('collapsed');
                            mainContent.classList.add('expanded');
                        }
                    });
                    rList.appendChild(item);
                });
                mDiv.appendChild(rList);
                mList.appendChild(mDiv);
            }
            yDiv.appendChild(mList);
            treeMenu.appendChild(yDiv);
        }
    } catch (err) {
        console.error(err);
    }
}

function normalizarAdjuntos(reg) {
    const elementos = Array.isArray(reg.imagenes) ? reg.imagenes : [];
    // Compatibilidad con registros antiguos, que guardaban cada imagen como una cadena.
    return elementos.map((item, index) => {
        if (typeof item === 'string') {
            return { tipo: 'imagen', nombre: `${reg.titulo || 'imagen'}_${index + 1}.jpg`, data: item };
        }
        return {
            tipo: item.tipo || (item.data && item.data.startsWith('data:application/pdf') ? 'pdf' : 'imagen'),
            nombre: item.nombre || `${reg.titulo || 'archivo'}_${index + 1}`,
            data: item.data || ''
        };
    }).filter(item => item.data);
}

function abrirVisorCarrusel(reg) {
    if (viewerTitle) viewerTitle.textContent = reg.titulo || 'Registro';
    if (viewerContent) viewerContent.textContent = reg.contenido || '';
    viewerImages.innerHTML = '';

    currentImagesArray = normalizarAdjuntos(reg);
    currentIndex = 0;

    if (!currentImagesArray.length) {
        viewerImages.innerHTML = '<p style="color:white; text-align:center; padding:30px;">Este registro no tiene imágenes ni archivos PDF.</p>';
    } else {
        mostrarAdjuntoActual(reg.titulo || 'archivo');
    }

    viewerModal.classList.remove('hidden');
}

function mostrarAdjuntoActual(tituloReg = 'archivo') {
    const item = currentImagesArray[currentIndex];
    if (!item) return;

    viewerImages.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'carousel-container';
    container.style.position = 'relative';

    if (item.tipo === 'pdf') {
        const pdfViewer = document.createElement('iframe');
        pdfViewer.src = item.data;
        pdfViewer.title = item.nombre;
        pdfViewer.style.cssText = 'width:100%; height:70vh; min-height:400px; border:0; background:#fff; border-radius:8px;';
        container.appendChild(pdfViewer);
    } else {
        const img = document.createElement('img');
        img.src = item.data;
        img.id = 'carouselActiveImg';
        img.alt = item.nombre;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh';
        img.style.objectFit = 'contain';
        container.appendChild(img);
    }

    const counter = document.createElement('div');
    counter.className = 'carousel-counter';
    counter.id = 'carouselCounter';
    counter.textContent = `${currentIndex + 1} / ${currentImagesArray.length}`;
    container.appendChild(counter);

    const download = document.createElement('a');
    download.id = 'carouselDownloadBtn';
    download.className = 'carousel-download-btn';
    download.textContent = '⬇️ Descargar';
    download.href = item.data;
    download.download = item.nombre || `${tituloReg.replace(/\s+/g, '_')}_${currentIndex + 1}`;
    download.target = '_blank';
    download.rel = 'noopener';
    container.appendChild(download);

    const filename = document.createElement('p');
    filename.textContent = item.nombre;
    filename.style.cssText = 'color:white; text-align:center; overflow-wrap:anywhere; padding:8px;';
    container.appendChild(filename);

    if (currentImagesArray.length > 1) {
        const prev = document.createElement('button');
        prev.className = 'carousel-btn carousel-prev';
        prev.innerHTML = '&#10094;';
        prev.type = 'button';
        prev.setAttribute('aria-label', 'Archivo anterior');
        prev.addEventListener('click', () => cambiarFotoCarrusel(-1, tituloReg));

        const next = document.createElement('button');
        next.className = 'carousel-btn carousel-next';
        next.innerHTML = '&#10095;';
        next.type = 'button';
        next.setAttribute('aria-label', 'Archivo siguiente');
        next.addEventListener('click', () => cambiarFotoCarrusel(1, tituloReg));

        container.append(prev, next);
    }

    viewerImages.appendChild(container);
}

function cambiarFotoCarrusel(direccion, tituloReg = 'archivo') {
    if (!currentImagesArray.length) return;
    currentIndex = (currentIndex + direccion + currentImagesArray.length) % currentImagesArray.length;
    mostrarAdjuntoActual(tituloReg);
}

if (btnCloseViewer) {
    btnCloseViewer.addEventListener('click', () => {
        viewerModal.classList.add('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}
