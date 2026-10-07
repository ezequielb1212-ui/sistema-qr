import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// CONFIGURACIÓN DE SUPABASE (Tabla: foto_qr_lr)
// ==========================================
const SUPABASE_URL = 'https://xdbquvontcxjymxharmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnF1dm9udCXjymxhcm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzYwNjMsImV4cCI6MjEwNjk1MjA2M30.YSQmfv6LFulZa9RIP7VnfL4UZXYobhsEUKOKGOI9Ilk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Credenciales fijas de Administrador
const ADMIN_USER = "admin@sistema.com";
const ADMIN_PASS = "tuContraseñaSegura123";

// Referencias del DOM
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

// Variables para el control del Lightbox de imágenes
let currentImagesArray = [];
let currentLightboxIndex = 0;

// 1. CARGA INICIAL
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');

    // MODO PÚBLICO: Si se escaneó un QR (?id=...) -> Mostrar SOLO imágenes en visor limpio
    if (recordId) {
        try {
            const { data, error } = await supabase
                .from('foto_qr_lr')
                .select('*')
                .eq('id', recordId)
                .single();

            if (data) {
                loginContainer.classList.add('hidden');
                appContainer.classList.remove('hidden');
                document.querySelector('.sidebar').classList.add('hidden');
                abrirVisorPublicoSoloImagenes(data);
            } else {
                alert("El registro escaneado no existe o fue eliminado.");
            }
        } catch (err) {
            console.error("Error al cargar el registro:", err);
        }
        return;
    }

    // MODO ADMINISTRADOR: Mostrar login
    localStorage.removeItem('adminLogueado');
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
});

// 2. CONTROL DE LOGIN
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = userInput.value.trim();
        const password = passInput.value.trim();

        if (email === ADMIN_USER && password === ADMIN_PASS) {
            localStorage.setItem('adminLogueado', 'true');
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
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

// 3. COMPRESIÓN DE IMÁGENES (Alta calidad para nitidez máxima)
function comprimirImagen(file, maxWidth = 1200, quality = 0.85) {
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

// 4. GUARDAR EN SUPABASE Y GENERAR QR
if (qrForm) {
    qrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const contenido = document.getElementById('contenido').value.trim();

        statusMsg.textContent = "Guardando en Supabase y generando QR...";
        statusMsg.classList.remove('hidden');

        try {
            const fechaActual = new Date();
            const year = fechaActual.getFullYear().toString();
            const month = (fechaActual.getMonth() + 1).toString().padStart(2, '0');

            const { data, error } = await supabase
                .from('foto_qr_lr')
                .insert([
                    {
                        titulo,
                        contenido,
                        imagenes: selectedImagesBase64,
                        year,
                        month
                    }
                ])
                .select();

            if (error) throw error;

            const nuevoRegistroId = data[0].id;
            const baseUrl = window.location.origin + window.location.pathname;
            const enlaceQRConDatos = `${baseUrl}?id=${nuevoRegistroId}`;
            ultimoContenidoQR = enlaceQRConDatos;

            statusMsg.textContent = "¡Guardado y QR Generado con éxito!";
            
            qrcodeContainer.innerHTML = "";
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrcodeContainer, {
                    text: enlaceQRConDatos,
                    width: 140,
                    height: 140
                });
            }
            
            qrActions.classList.remove('hidden');
            qrForm.reset();
            previewGallery.classList.add('hidden');
            selectedImagesBase64 = [];
            
            await cargarHistorialPorFechas();

        } catch (error) {
            console.error("Error al guardar:", error);
            statusMsg.textContent = "Error al procesar: " + error.message;
        }
    });
}

if (btnPrint) {
    btnPrint.addEventListener('click', () => { window.print(); });
}

if (btnCopy) {
    btnCopy.addEventListener('click', () => {
        if (ultimoContenidoQR) {
            navigator.clipboard.writeText(ultimoContenidoQR).then(() => {
                alert("¡Enlace copiado al portapapeles!");
            });
        }
    });
}

// 5. CARGAR HISTORIAL EN EL MENÚ LATERAL
async function cargarHistorialPorFechas() {
    try {
        const { data, error } = await supabase
            .from('foto_qr_lr')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        treeMenu.innerHTML = '';

        if (!data || data.length === 0) {
            treeMenu.innerHTML = '<p class="empty-text">No hay registros guardados.</p>';
            return;
        }

        const estructura = {};

        data.forEach(reg => {
            const year = reg.year || '2026';
            const month = reg.month || '10';

            if (!estructura[year]) estructura[year] = {};
            if (!estructura[year][month]) estructura[year][month] = [];

            estructura[year][month].push(reg);
        });

        for (const year in estructura) {
            const yearDiv = document.createElement('div');
            yearDiv.classList.add('year-folder');

            const yearTitle = document.createElement('div');
            yearTitle.classList.add('folder-title');
            yearTitle.textContent = `📁 Año ${year}`;
            yearDiv.appendChild(yearTitle);

            const monthList = document.createElement('div');
            monthList.classList.add('month-list');

            for (const month in estructura[year]) {
                const monthDiv = document.createElement('div');
                monthDiv.classList.add('month-folder');

                const monthTitle = document.createElement('div');
                monthTitle.classList.add('folder-title');
                monthTitle.textContent = `📂 Mes ${month}`;
                monthDiv.appendChild(monthTitle);

                const recordList = document.createElement('div');
                recordList.classList.add('record-list');

                estructura[year][month].forEach(reg => {
                    const item = document.createElement('div');
                    item.classList.add('record-item');
                    item.textContent = reg.titulo;
                    item.addEventListener('click', () => abrirModalVisor(reg));
                    recordList.appendChild(item);
                });

                monthDiv.appendChild(recordList);
                monthList.appendChild(monthDiv);
            }

            yearDiv.appendChild(monthList);
            treeMenu.appendChild(yearDiv);
        }

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

// 6. VISTA PÚBLICA (SOLO IMÁGENES AL ESCANEAR EL QR)
function abrirVisorPublicoSoloImagenes(reg) {
    viewerTitle.style.display = 'none';
    viewerContent.style.display = 'none';
    viewerImages.innerHTML = '';

    if (reg.imagenes && reg.imagenes.length > 0) {
        currentImagesArray = reg.imagenes;
        const gridWrapper = document.createElement('div');
        gridWrapper.classList.add('public-gallery-container');

        const grid = document.createElement('div');
        grid.classList.add('public-gallery-grid');

        reg.imagenes.forEach((imgBase64, index) => {
            const img = document.createElement('img');
            img.src = imgBase64;
            img.addEventListener('click', () => abrirLightbox(index));
            grid.appendChild(img);
        });

        gridWrapper.appendChild(grid);
        viewerImages.appendChild(gridWrapper);
    } else {
        viewerImages.innerHTML = '<p style="text-align:center; padding: 40px; color: #64748b;">No hay imágenes disponibles en este registro.</p>';
    }

    viewerModal.classList.remove('hidden');
}

// VISOR NORMAL PARA ADMINISTRADOR (Muestra título, contenido y fotos)
function abrirModalVisor(reg) {
    viewerTitle.style.display = 'block';
    viewerContent.style.display = 'block';
    viewerTitle.textContent = reg.titulo;
    viewerContent.textContent = reg.contenido;
    viewerImages.innerHTML = '';

    if (reg.imagenes && reg.imagenes.length > 0) {
        currentImagesArray = reg.imagenes;
        const grid = document.createElement('div');
        grid.classList.add('viewer-images-grid');

        reg.imagenes.forEach((imgBase64, index) => {
            const img = document.createElement('img');
            img.src = imgBase64;
            img.addEventListener('click', () => abrirLightbox(index));
            grid.appendChild(img);
        });
        viewerImages.appendChild(grid);
    } else {
        viewerImages.innerHTML = '<p>No hay imágenes adjuntas en este registro.</p>';
    }

    viewerModal.classList.remove('hidden');
}

// 7. LIGHTBOX (VISOR DE IMAGEN 1 X 1 CON FLECHAS LATERALES)
function abrirLightbox(index) {
    currentLightboxIndex = index;

    // Crear elemento lightbox si no existe
    let lightbox = document.getElementById('customLightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'customLightbox';
        lightbox.classList.add('lightbox-modal');
        document.body.appendChild(lightbox);
    }

    renderLightboxContent(lightbox);
}

function renderLightboxContent(lightbox) {
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" id="lbClose">&times;</button>
            <button class="lightbox-btn lightbox-prev" id="lbPrev">&#10094;</button>
            <img src="${currentImagesArray[currentLightboxIndex]}" alt="Imagen ampliada" id="lbImg">
            <button class="lightbox-btn lightbox-next" id="lbNext">&#10095;</button>
        </div>
    `;

    // Eventos de botones
    document.getElementById('lbClose').addEventListener('click', cerrarLightbox);
    document.getElementById('lbPrev').addEventListener('click', (e) => {
        e.stopPropagation();
        cambiarImagenLightbox(-1);
    });
    document.getElementById('lbNext').addEventListener('click', (e) => {
        e.stopPropagation();
        cambiarImagenLightbox(1);
    });

    // Cerrar haciendo clic fuera de la imagen
    lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'customLightbox' || e.target.classList.contains('lightbox-content')) {
            cerrarLightbox();
        }
    });
}

function cambiarImagenLightbox(direccion) {
    currentLightboxIndex += direccion;
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = currentImagesArray.length - 1; // Volver al final
    } else if (currentLightboxIndex >= currentImagesArray.length) {
        currentLightboxIndex = 0; // Volver al inicio
    }
    const lbImg = document.getElementById('lbImg');
    if (lbImg) {
        lbImg.src = currentImagesArray[currentLightboxIndex];
    }
}

function cerrarLightbox() {
    const lightbox = document.getElementById('customLightbox');
    if (lightbox) {
        lightbox.remove();
    }
}

if (btnCloseViewer) {
    btnCloseViewer.addEventListener('click', () => {
        viewerModal.classList.add('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}
