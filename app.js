import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de Firebase (asegúrate de mantener tus credenciales o las de tu proyecto)
const firebaseConfig = {
    apiKey: "AIzaSyB...", 
    authDomain: "generadorqr-app.firebaseapp.com",
    projectId: "generadorqr-app",
    storageBucket: "generadorqr-app.appspot.com",
    messagingSenderId: "331826500000",
    appId: "1:331826500000:web:..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias del DOM
const loginForm = document.getElementById('loginForm');
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

// 1. DETECTAR SI LA PÁGINA SE ABRIó DESDE UN QR ESCANEADO (con ?id=...)
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');

    if (recordId) {
        try {
            const docSnap = await getDoc(doc(db, "codigosQR", recordId));

            if (docSnap.exists()) {
                const reg = { id: docSnap.id, ...docSnap.data() };
                // Ocultar login/app normal y mostrar directo el visor con sus imágenes
                loginContainer.classList.add('hidden');
                appContainer.classList.remove('hidden');
                abrirModalVisor(reg);
            } else {
                alert("El registro escaneado no existe o fue eliminado.");
            }
        } catch (error) {
            console.error("Error al cargar el registro desde el QR:", error);
        }
    }
});

// CONTROL DE LOGIN
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        cargarHistorialPorFechas();
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        appContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        loginForm.reset();
    });
}

// FUNCIÓN PARA COMPRIMIR IMÁGENES (Evita saturar la base de datos)
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

// SELECCIÓN Y PREVISUALIZACIÓN DE IMÁGENES
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

// GENERAR QR Y GUARDAR EN FIRESTORE (CREANDO ENLACE DE ACCESO PARA LAS IMÁGENES)
if (qrForm) {
    qrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const contenido = document.getElementById('contenido').value.trim();

        statusMsg.textContent = "Guardando registro y generando QR...";
        statusMsg.classList.remove('hidden');

        try {
            const fechaActual = new Date();
            const year = fechaActual.getFullYear().toString();
            const month = (fechaActual.getMonth() + 1).toString().padStart(2, '0');

            // 1. Guardar en Firestore con las imágenes adjuntas
            const docRef = await addDoc(collection(db, "codigosQR"), {
                titulo,
                contenido,
                imagenes: selectedImagesBase64,
                year,
                month,
                fechaCreacion: fechaActual.toISOString()
            });

            // 2. Crear URL única apuntando a este registro para que el QR abra las imágenes
            const baseUrl = window.location.origin + window.location.pathname;
            const enlaceQRConDatos = `${baseUrl}?id=${docRef.id}`;
            ultimoContenidoQR = enlaceQRConDatos;

            statusMsg.textContent = "¡Guardado y QR Generado con éxito!";
            
            // 3. Dibujar QR visual en pantalla
            qrcodeContainer.innerHTML = "";
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrcodeContainer, {
                    text: enlaceQRConDatos,
                    width: 140,
                    height: 140
                });
            } else {
                qrcodeContainer.innerHTML = `<div style="padding:10px; font-size:0.85rem; word-break:break-all; background:#f8d7da; color:#721c24; border-radius:4px;"><strong>Enlace QR:</strong><br>${enlaceQRConDatos}</div>`;
            }
            
            qrActions.classList.remove('hidden');

            // 4. Limpiar formulario y refrescar historial
            qrForm.reset();
            previewGallery.classList.add('hidden');
            selectedImagesBase64 = [];
            
            await cargarHistorialPorFechas();

        } catch (error) {
            console.error("Error detallado:", error);
            statusMsg.textContent = "Error al procesar: " + error.message;
        }
    });
}

// BOTÓN IMPRIMIR QR
if (btnPrint) {
    btnPrint.addEventListener('click', () => {
        window.print();
    });
}

// BOTÓN COPIAR ENLACE AL PORTAPAPELES
if (btnCopy) {
    btnCopy.addEventListener('click', () => {
        if (ultimoContenidoQR) {
            navigator.clipboard.writeText(ultimoContenidoQR).then(() => {
                alert("¡Enlace del QR copiado al portapapeles!");
            }).catch(err => {
                console.error("Error al copiar: ", err);
            });
        } else {
            alert("No hay contenido para copiar.");
        }
    });
}

// CARGAR HISTORIAL EN EL MENÚ LATERAL
async function cargarHistorialPorFechas() {
    try {
        const querySnapshot = await getDocs(collection(db, "codigosQR"));
        treeMenu.innerHTML = '';

        if (querySnapshot.empty) {
            treeMenu.innerHTML = '<p class="empty-text">No hay registros guardados.</p>';
            return;
        }

        const estructura = {};

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const registro = { id: docSnap.id, ...data };
            const year = data.year || '2026';
            const month = data.month || '10';

            if (!estructura[year]) estructura[year] = {};
            if (!estructura[year][month]) estructura[year][month] = [];

            estructura[year][month].push(registro);
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
        treeMenu.innerHTML = '<p class="empty-text">Error al cargar historial.</p>';
    }
}

// ABRIR MODAL VISOR CON SUS RESPECTIVAS IMÁGENES
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
        // Limpiar parámetros de la URL al cerrar el visor opcionalmente
        window.history.replaceState({}, document.title, window.location.pathname);
    });
}