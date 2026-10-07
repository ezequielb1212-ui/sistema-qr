import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// CONFIGURACIÓN DE SUPABASE (Tabla: foto_qr_lr)
// ==========================================
const SUPABASE_URL = 'https://xdbquvontcxjymxharmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnF1dm9udGN4anlteGhhcm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzYwNjMsImV4cCI6MjEwNjk1MjA2M30.YSQmfv6LFulZa9RIP7VnfL4UZXYobhsEUKOKGOI9Ilk';

// Inicialización limpia con persistencia desactivada
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Credenciales fijas de Administrador para el frontend
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

// 1. CARGA INICIAL
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');

    // MODO PÚBLICO: Si se escaneó un QR (?id=...)
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
                abrirModalVisor(data);
            } else {
                alert("El registro escaneado no existe o fue eliminado.");
            }
        } catch (err) {
            console.error("Error al cargar el registro:", err);
        }
        return;
    }

    // MODO ADMINISTRADOR: Por defecto SIEMPRE mostramos el login al entrar a la raíz
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

// CERRAR SESIÓN
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('adminLogueado');
        window.location.href = window.location.pathname;
    });
}

// 3. COMPRESIÓN DE IMÁGENES
function comprimirImagen(file, maxWidth = 800, quality = 0.7) {
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

// PREVISUALIZAR IMÁGENES
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

// 6. VISOR DE REGISTROS (MODAL)
function abrirModalVisor(reg) {
    viewerTitle.textContent = reg.titulo;
    viewerContent.textContent = reg.contenido;
    viewerImages.innerHTML = '';

    if (reg.imagenes && reg.imagenes.length > 0) {
        reg.imagenes.forEach(imgBase64 => {
            const img = document.createElement('img');
            img.src = imgBase64;
            viewerImages.appendChild(img);
        });
    } else {
        viewerImages.innerHTML = '<p>No hay imágenes adjuntas en este registro.</p>';
    }

    viewerModal.classList.remove('hidden');
}

if (btnCloseViewer) {
    btnCloseViewer.addEventListener('click', () => {
        viewerModal.classList.add('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}
