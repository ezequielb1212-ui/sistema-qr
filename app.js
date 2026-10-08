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

let selectedImagesBase64 = [];
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

if (imagenesInput) {
    imagenesInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        selectedImagesBase64 = [];
        thumbnailsContainer.innerHTML = '';
        if (files.length > 0) {
            previewGallery.classList.remove('hidden');
            for (let file of files) {
                const compressedBase64 = await comprimirImagen(file);
                selectedImagesBase64.push(compressedBase64);
                const img = document.createElement('img');
                img.src = compressedBase64;
                thumbnailsContainer.appendChild(img);
            }
        } else {
            previewGallery.classList.add('hidden');
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

function abrirVisorCarrusel(reg) {
    if (viewerTitle) viewerTitle.textContent = reg.titulo;
    if (viewerContent) viewerContent.textContent = reg.contenido || "";
    viewerImages.innerHTML = '';

    if (reg.imagenes && reg.imagenes.length > 0) {
        currentImagesArray = reg.imagenes;
        currentIndex = 0;

        const carContainer = document.createElement('div');
        carContainer.classList.add('carousel-container');

        const imgTag = document.createElement('img');
        imgTag.src = currentImagesArray[currentIndex];
        imgTag.id = "carouselActiveImg";
        carContainer.appendChild(imgTag);

        const counter = document.createElement('div');
        counter.classList.add('carousel-counter');
        counter.id = "carouselCounter";
        counter.textContent = `1 / ${currentImagesArray.length}`;
        carContainer.appendChild(counter);

        const btnDownload = document.createElement('a');
        btnDownload.id = "carouselDownloadBtn";
        btnDownload.classList.add('carousel-download-btn');
        btnDownload.innerHTML = '⬇️ Descargar';
        btnDownload.href = currentImagesArray[currentIndex];
        btnDownload.download = `${reg.titulo.replace(/\s+/g, '_')}_${currentIndex + 1}.jpg`;
        carContainer.appendChild(btnDownload);

        if (currentImagesArray.length > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.classList.add('carousel-btn', 'carousel-prev');
            btnPrev.innerHTML = '&#10094;';
            btnPrev.addEventListener('click', () => cambiarFotoCarrusel(-1, reg.titulo));

            const btnNext = document.createElement('button');
            btnNext.classList.add('carousel-btn', 'carousel-next');
            btnNext.innerHTML = '&#10095;';
            btnNext.addEventListener('click', () => cambiarFotoCarrusel(1, reg.titulo));

            carContainer.appendChild(btnPrev);
            carContainer.appendChild(btnNext);
        }

        viewerImages.appendChild(carContainer);
    } else {
        viewerImages.innerHTML = '<p style="color:white; text-align:center; padding:30px;">Este registro no tiene imágenes.</p>';
    }

    viewerModal.classList.remove('hidden');
}

function cambiarFotoCarrusel(direccion, tituloReg = "imagen") {
    currentIndex += direccion;
    if (currentIndex < 0) {
        currentIndex = currentImagesArray.length - 1;
    } else if (currentIndex >= currentImagesArray.length) {
        currentIndex = 0;
    }

    const activeImg = document.getElementById('carouselActiveImg');
    const counter = document.getElementById('carouselCounter');
    const btnDownload = document.getElementById('carouselDownloadBtn');

    if (activeImg) activeImg.src = currentImagesArray[currentIndex];
    if (counter) counter.textContent = `${currentIndex + 1} / ${currentImagesArray.length}`;
    if (btnDownload) {
        btnDownload.href = currentImagesArray[currentIndex];
        btnDownload.download = `${tituloReg.replace(/\s+/g, '_')}_${currentIndex + 1}.jpg`;
    }
}

if (btnCloseViewer) {
    btnCloseViewer.addEventListener('click', () => {
        viewerModal.classList.add('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}
