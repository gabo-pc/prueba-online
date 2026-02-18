import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

import { auth } from './firebaseConfig';

// Importaciones de Firebase (Asegúrate de tener firebase configurado en tu proyecto)
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "firebase/auth";

// --- CONFIGURACIÓN DE IMÁGENES ---
import celularImg from './celular-mockup.png';
import logoImg from './logo-circular.png';
import qrPagoMovil from './qr-pago-movil.png';

import useTotalWasm from './hooks/useTotalWasm';

function App() {
  const auth = getAuth(); // Inicializamos Firebase Auth

  // --- ESTADOS EXISTENTES ---
  const [mostrarTienda, setMostrarTienda] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ 
    nombre: '', descripcion: '', precio: '', imagen: '', stock: 0, categoria: '' 
  }); 
  const [carrito, setCarrito] = useState([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');

  // --- ESTADOS DE REGISTRO EXISTENTES ---
  const [pasoRegistro, setPasoRegistro] = useState(1);
  const [datosUsuario, setDatosUsuario] = useState({ email: '', telefono: '', codigoPais: '+58' });
  const [mensajeStatus, setMensajeStatus] = useState('');
  const [timer, setTimer] = useState(60);
  const [timerActivo, setTimerActivo] = useState(false);
  const [metodoEnvio, setMetodoEnvio] = useState('');

  // --- NUEVOS ESTADOS PARA LOGIN Y RECUPERACIÓN ---
  const [esLogin, setEsLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [cargando, setCargando] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // NUEVO: estado para mostrar panel del carrito
  const [mostrarCarritoPanel, setMostrarCarritoPanel] = useState(false);

  // ---------- NUEVOS ESTADOS / LÓGICA PARA SUGERENCIAS ----------
  // Panel de sugerencias (solo dentro de la tienda)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [nuevaCalificacion, setNuevaCalificacion] = useState(5);
  // Mantener una referencia al usuario actual de Firebase (si está autenticado)
  const [currentUser, setCurrentUser] = useState(null);

  const [mostrarPasswordLogin, setMostrarPasswordLogin] = useState(false);
  // Agrega state arriba del return (junto a los otros useState)
  const [mostrarPasswordRegistro, setMostrarPasswordRegistro] = useState(false);

  // NUEVO: Estados para métodos de pago
  const [metodoPago, setMetodoPago] = useState(""); // "whatsapp" | "qr"
  const [mostrarModalQR, setMostrarModalQR] = useState(false);

  // ------------------------------------------------------------

  // Agregar cerca de los otros useState (por ejemplo justo después de mostrarCarritoPanel)
  const [mostrarContacto, setMostrarContacto] = useState(false);
  // Nuevo estado para el panel de SERVICIOS
  const [mostrarServiciosPanel, setMostrarServiciosPanel] = useState(false);


  const [mostrarMenuCategorias, setMostrarMenuCategorias] = useState(false);
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState("");
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);

  const LOCAL_STORAGE_KEY_CATEGORIAS = "vibemarket_categorias_extras";
  const [categoriasExtra, setCategoriasExtra] = useState([]);

  const CATEGORIAS_PREDEFINIDAS = [
  "Audifonos de Consumo",
  "Deportivas",
  "Pcs - Equipo Alta Gama",
  "Entrada de Audio",
  "Mouse - Perifericos",
  "Luces Led",
  "mouse Pad",
  "Proteinas",
  "Dedales Tact"
  ];
  


  // Hook WASM
const { calcularConWasm, loaded: wasmLoaded } = useTotalWasm();
const [totalWasm, setTotalWasm] = useState(null);

// fallback JS (en caso de que WASM no cargue aún)
const calcularTotalJS = (carrito) => {
  if (!Array.isArray(carrito) || carrito.length === 0) return 0.0;
  return carrito.reduce((acc, it) => {
    const precio = Number(it.precio) || 0;
    const cantidad = Number(it.cantidad) > 0 ? Number(it.cantidad) : 1;
    return acc + precio * cantidad;
  }, 0);
};


//const categoriasVibe

// recalcular total cuando cambie carrito (intenta usar WASM, sino JS)
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      if (wasmLoaded && calcularConWasm) {
        const precios = carrito.map(it => Number(it.precio) || 0);
        const cantidades = carrito.map(it => Number(it.cantidad) || 1);

        // LOGS DE DEBUG ↓↓↓
        console.log("DEBUG PRECIOS:", precios);
        console.log("DEBUG CANTIDADES:", cantidades);
        const t = await calcularConWasm(precios, cantidades);
        console.log("DEBUG TOTAL WASM:", t);
        // LOGS DE DEBUG ↑↑↑

        if (!mounted) return;
        setTotalWasm(t);
      } else {
        if (!mounted) return;
        setTotalWasm(calcularTotalJS(carrito));
      }
    } catch (err) {
      console.error('Error WASM -> fallback JS:', err);
      if (mounted) setTotalWasm(calcularTotalJS(carrito));
    }
  })();
  return () => { mounted = false; };
}, [carrito, wasmLoaded, calcularConWasm]);

// donde antes usabas totalDinero, ahora usa displayTotal:
const totalJS = calcularTotalJS(carrito);


const displayTotal = totalJS;

// Al inicio del componente App(), después de todos los useState

// 1. Efecto para RESTAURAR la vista guardada al cargar la página
useEffect(() => {
  try {
    const vistaGuardada = localStorage.getItem('vibemarket_vista');
    if (vistaGuardada === 'tienda') {
      setMostrarTienda(true);
      setEsRegistro(false);
      setEsLogin(false);
    }
  } catch (e) {
    console.warn('No se pudo restaurar la vista:', e);
  }
}, []); // Solo al montar

// 2. Efecto para GUARDAR la vista cuando cambie
useEffect(() => {
  try {
    if (mostrarTienda) {
      localStorage.setItem('vibemarket_vista', 'tienda');
    } else if (!esRegistro && !esLogin) {
      // Si estamos en landing (inicio)
      localStorage.setItem('vibemarket_vista', 'inicio');
    }
    // Nota: no guardamos registro/login, esos siempre empiezan desde inicio
  } catch (e) {
    console.warn('No se pudo guardar la vista:', e);
  }
}, [mostrarTienda, esRegistro, esLogin]);

  // El estado que depende de displayTotal.

  // Efecto que enlaza el enlace "SERVICIOS" en la landing para abrir el panel

  useEffect(() => {

    const handler = (e) => {
    e.preventDefault();
    setMostrarServiciosPanel(true);
    };





    




    // Espera un tick para que el DOM esté montado
  const timerId = setTimeout(() => {

    try {

      const anchors = Array.from(document.querySelectorAll('nav ul li a'));
      const servicioAnchor = anchors.find(a => a.textContent && a.textContent.trim().toUpperCase() === 'SERVICIOS');
      if (servicioAnchor) {
        servicioAnchor.addEventListener('click', handler);
      }

    } catch (err) {
      console.warn('No se pudo enlazar SERVICIOS:', err);
    }
  }, 50);

  // cleanup: remover listener si existía
  return () => {
    clearTimeout(timerId);
    try {
      const anchors = Array.from(document.querySelectorAll('nav ul li a'));
      const servicioAnchor = anchors.find(a => a.textContent && a.textContent.trim().toUpperCase() === 'SERVICIOS');
      if (servicioAnchor) {
        servicioAnchor.removeEventListener('click', handler);
      }
    } catch (err) {
      // noop
    }
  };
}, [mostrarTienda, esRegistro]);




  const API_URL = 'https://prueba-online.onrender.com/api/productos  ';

  // --- NUEVAS FUNCIONES DE FIREBASE (LOGIN Y RECUPERACIÓN useEffect) ---

  const manejarLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {  
      // Intento de inicio de sesión con Firebase    const calcularTot
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      
      // Actualizar usuario actual localmente (auth.currentUser suele contener al usuario)
      setCurrentUser(auth.currentUser || null);

      // Si la contraseña es correcta, entramos a la tienda
      setEsLogin(false);
      setMostrarTienda(true);
      alert("¡Bienvenido a VibeMarket!");
    } catch (error) {
      console.error("Error al iniciar sesión:", error.code);
      if (error.code === 'auth/user-not-found') alert("Usuario no encontrado");
      else if (error.code === 'auth/wrong-password') alert("Contraseña incorrecta");
      else alert("Error al iniciar sesión: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const recuperarContrasena = async () => {
    if (!loginData.email) {
      alert("Por favor, ingresa tu correo electrónico primero en el campo de usuario.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginData.email);
      alert("Enlace de recuperación enviado a: " + loginData.email + ". Revisa tu bandeja de entrada o spam.");
    } catch (error) {
      alert("Error al enviar el correo: " + error.message);
    }
  };

  // --- EFECTOS EXISTENTES (SIN MODIFICAR) ---
  // Reemplaza el useEffect de mount por este (carga productos y observa auth)
  useEffect(() => {
  // cargar productos como antes
  obtenerProductos();

  // cargar sugerencias desde localStorage (persistencia simple)
  try {
    const s = localStorage.getItem('sugerencias');
    if (s) setSugerencias(JSON.parse(s));
  } catch (e) {
    console.warn('No se pudieron cargar sugerencias desde localStorage', e);
  }

  // Observador de auth para cargar carrito por usuario y setear currentUser
  let unsubscribe = null;
  try {
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      unsubscribe = auth.onAuthStateChanged(async (user) => {
        setCurrentUser(user || null);

        // Cargar carrito asociado al usuario (o guest)
        try {
          const uid = user ? user.uid : null;
          const cart = loadCartForUid(uid);
          setCarrito(Array.isArray(cart) ? cart : []);
        } catch (e) {
          console.error('Error cargando carrito por uid:', e);
          setCarrito([]);
        }
      });
    } else {
      // Fallback: si no hay onAuthStateChanged (raro), intenta usar auth.currentUser
      const uid = auth && auth.currentUser ? auth.currentUser.uid : null;
      const cart = loadCartForUid(uid);
      setCarrito(Array.isArray(cart) ? cart : []);
      setCurrentUser(auth && auth.currentUser ? auth.currentUser : null);
    }
  } catch (e) {
    console.warn('No se pudo establecer observer de auth:', e);
    setCurrentUser(auth && auth.currentUser ? auth.currentUser : null);
  }

  return () => {
    // cleanup observer si existe
    try { if (unsubscribe) unsubscribe(); } catch (e) { /* noop */ }
  };
  }, []); // mantén dependencias vacías para ejecución en mount


  // Guarda automáticamente cuando cambia carrito o currentUser
  useEffect(() => {
  try {
    const uid = currentUser ? currentUser.uid : null;
    saveCartForUid(uid, carrito);
  } catch (e) {
    console.error('Error auto-guardando carrito por usuario', e);
  }
  }, [carrito, currentUser]);

  // --------- AÑADIR DESPUÉS DEL useEffect EXISTENTE ----------

  // Obtener productos desde API
  const obtenerProductos = async () => {
    try {
      const res = await axios.get(API_URL);
      // Asumo que la API devuelve un array en res.data
      setProductos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al obtener productos:', err);
      setProductos([]);
    }
  };

// Guardar carrito en localStorage
  // Reemplaza la función existente guardarCarritoEnLocalStorage por esta
  const guardarCarritoEnLocalStorage = (nuevoCarrito) => {
  // Actualiza el estado React como antes
  setCarrito(nuevoCarrito);
  try {
    // Guarda en localStorage con clave específica del usuario actual
    const uid = currentUser ? currentUser.uid : null;
    saveCartForUid(uid, nuevoCarrito);
  } catch (e) {
    console.error('Error guardando carrito en localStorage por usuario', e);
  }
  };

  // Helpers para localStorage por usuario (pegar después de guardarCarritoEnLocalStorage)
  const storageKeyFor = (uid) => `carrito_${uid || 'guest'}`;

  const saveCartForUid = (uid, cart) => {
  try {
    localStorage.setItem(storageKeyFor(uid), JSON.stringify(cart || []));
  } catch (e) {
    console.error('saveCartForUid error', e);
  }
  };

  const loadCartForUid = (uid) => {
  try {
    const s = localStorage.getItem(storageKeyFor(uid));
    return s ? JSON.parse(s) : [];
  } catch (e) {
    console.error('loadCartForUid error', e);
    return [];
  }
  };

  // Agregar producto al carrito (añade cantidad si ya existe)
  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item._id === producto._id);
    let nuevo;
    if (existe) {
      nuevo = carrito.map(item =>
        item._id === producto._id ? { ...item, cantidad: (item.cantidad || 1) + 1 } : item
      );
    } else {
      nuevo = [...carrito, { ...producto, cantidad: 1 }];
    }
    guardarCarritoEnLocalStorage(nuevo);
    alert(`${producto.nombre} añadido al carrito`);
  };

  // Eliminar producto por id (para admin)
  const eliminarProducto = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      setProductos(productos.filter(p => p._id !== id));
      alert('Producto eliminado');
    } catch (err) {
      console.error('Error eliminando producto:', err);
      alert('Error eliminando producto');
    }
  };

  // Guardar nuevo producto (admin) — POST a tu API
  const guardarProducto = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      // Si la fuente de la imagen es URL y se guardó en imagenUrl, úsala.
      const payload = {
        nombre: nuevoProducto.nombre,
        descripcion: nuevoProducto.descripcion || '',
        precio: Number(nuevoProducto.precio) || 0,
        imagen: nuevoProducto.imagen || '',
        stock: nuevoProducto.stock || 0,
        categoria: nuevoProducto.categoria || ''
      };
      const res = await axios.post(API_URL, payload);
      setProductos([ ...(productos || []), res.data ]);
      setNuevoProducto({ nombre: '', descripcion: '', precio: '', imagen: '', stock: 0, categoria: '' });
      // limpiar tambien campo imagenUrl si estaba usado
      setImagenUrl('');
      setMostrarPanelAgregar(false);
      alert('Producto publicado');
    } catch (err) {
      console.error('Error publicando producto:', err);
      alert('Error publicando producto');
    }
  };

  // Enviar pedido por WhatsApp
  const enviarWhatsApp = () => {
    if (carrito.length === 0) return alert('El carrito está vacío');
    const lines = carrito.map(item => `- ${item.nombre} x${item.cantidad || 1} - $${(Number(item.precio) * (item.cantidad || 1)).toFixed(2)}`);
    const total = carrito.reduce((s, i) => s + Number(i.precio) * (i.cantidad || 1), 0);
    const mensaje = encodeURIComponent(`Hola, quiero hacer un pedido:\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}`);
    const telefono = '58' + '4246322487'; // reemplaza por número destino (sin + ni espacios)
    window.open(`https://wa.me/  ${telefono}?text=${mensaje}`, '_blank');
  };

  // Login admin (simple toggle / placeholder)
  // Reemplaza por verificación real (p. ej. verificar uid del usuario con Firebase)
  const loginAdmin = () => {
    const clave = prompt('Clave de administrador (placeholder):');
    if (clave === 'admin123') {
      setEsAdmin(true);
      alert('Modo administrador activado');
    } else {
      alert('Clave incorrecta');
    }
  };

  // Stubs que tu UI espera (si no están definidos en otro lado)
  // Reemplazar el stub existente por esta versión para crear cuenta y enviar enlace de verificación
const handleRegistroSubmit = async (e) => {
  e.preventDefault();

  try {
    // Tomar datos del form (tu formulario en el paso 1)
    const form = e.target;
    // FormData para leer inputs con name (y querySelector para el password que no tiene name)
    const fd = new FormData(form);
    const email = fd.get('email') && String(fd.get('email')).trim();
    const nombre = (form.querySelector('input[placeholder="Tu nombre completo"]')?.value || '').trim();
    const telefono = fd.get('telefono') && String(fd.get('telefono')).trim();
    const codigoPais = fd.get('countryCode') || '+58';
    const password = form.querySelector('input[type="password"]')?.value;

    if (!email || !password) {
      return alert('Por favor completa correo y contraseña.');
    }

    setCargando(true);

    // Crear usuario con Firebase Auth
    const resultado = await createUserWithEmailAndPassword(auth, email, password);
    const usuario = resultado.user;

    // Opcional: actualizar displayName con nombre (si quieres)
    try {
      if (nombre) {
        // Sólo si quieres: actualizar displayName requiere updateProfile import y llamada.
        // No lo hago automáticamente para no añadir más imports; déjame saber si quieres que lo haga.
      }
    } catch (e) {
      console.warn('No se pudo actualizar displayName:', e);
    }

    // Enviar correo de verificación
    try {
      await sendEmailVerification(usuario);
      // Mensaje claro para el usuario
      alert(`Se ha enviado un enlace de verificación a ${email}. Revisa tu bandeja de entrada (y spam) y confirma tu cuenta antes de iniciar sesión.`);
      setMensajeStatus(`Enlace de verificación enviado a ${email}`);
    } catch (e) {
      console.error('Error enviando email de verificación:', e);
      alert('Error enviando enlace de verificación: ' + (e.message || e));
    }

    // Mantener UX: avanzar paso de registro o mostrar pantalla de verificación
    setPasoRegistro(2);
  } catch (err) {
    console.error('Error en registro:', err);
    if (err.code === 'auth/email-already-in-use') {
      alert('Este correo ya está en uso. Intenta iniciar sesión o usar otro correo.');
    } else if (err.code === 'auth/invalid-email') {
      alert('Correo inválido.');
    } else if (err.code === 'auth/weak-password') {
      alert('La contraseña es muy débil. Usa al menos 6 caracteres.');
    } else {
      alert('Error registrando: ' + (err.message || err));
    }
  } finally {
    setCargando(false);
  }
};







  const reEnviarEnlaceVerificacion = async () => {
  try {
    const user = auth && auth.currentUser;
    if (!user) {
      return alert('No se detectó usuario activo. Por favor vuelve a registrarte o inicia sesión para reenviar el enlace.');
    }
    await sendEmailVerification(user);
    alert(`Se ha reenviado el enlace de verificación a ${user.email}. Revisa tu bandeja de entrada o spam.`);
    setMensajeStatus(`Enlace reenviado a ${user.email}`);
  } catch (err) {
    console.error('Error reenviando enlace de verificación:', err);
    alert('No se pudo reenviar el enlace: ' + (err.message || err));
  }
};

  const enviarCodigo = (metodo) => {
    setMetodoEnvio(metodo);
    setMensajeStatus(`Código enviado por ${metodo === 'correo' ? 'Gmail' : 'teléfono'}`);
    setTimer(60);
    setTimerActivo(true);
    // Aquí deberías activar el countdown (puedes usar useEffect con timerActivo)
  };

  // Contador simple para timer (puedes ajustar para cancelar cuando llegue a 0)
  useEffect(() => {
    if (!timerActivo) return;
    if (timer <= 0) {
      setTimerActivo(false);
      return;
    }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timerActivo, timer]);


  // Detecta el enlace "CONTACTO" en la landing y le asigna handler para abrir el modal
useEffect(() => {
  // handler que abrira el modal
  const handler = (e) => {
    e.preventDefault();
    setMostrarContacto(true);
  };

  // Espera un tick para que el DOM esté montado si se carga condicionalmente
  const timerId = setTimeout(() => {
    try {
      // Busca todos los enlaces del nav y encuentra el que tenga el texto "CONTACTO"
      const anchors = Array.from(document.querySelectorAll('nav ul li a'));
      const contactAnchor = anchors.find(a => a.textContent && a.textContent.trim().toUpperCase() === 'CONTACTO');
      if (contactAnchor) {
        contactAnchor.addEventListener('click', handler);
      }
    } catch (err) {
      console.warn('No se pudo enlazar CONTACTO:', err);
    }
  }, 50);

  // cleanup: remover listener si existía
  return () => {
    clearTimeout(timerId);
    try {
      const anchors = Array.from(document.querySelectorAll('nav ul li a'));
      const contactAnchor = anchors.find(a => a.textContent && a.textContent.trim().toUpperCase() === 'CONTACTO');
      if (contactAnchor) {
        contactAnchor.removeEventListener('click', handler);
      }
    } catch (err) {
      // noop
    }
  };
}, [mostrarTienda, esRegistro]); // se re-ejecuta si cambias de vista

const categoriasVibe = [...CATEGORIAS_PREDEFINIDAS, ...categoriasExtra];
  // --------- VALORES DERIVADOS (para arreglar los errores de 'not defined') ----------
  const categoriasUnicas = React.useMemo(() => {
    const setCats = new Set((productos || []).map(p => (p.categoria || 'Otros')));
    return ['Todos', ...Array.from(setCats)];
  }, [productos]);

  const productosFiltrados = React.useMemo(() => {
    const q = (busqueda || '').trim().toLowerCase();
    return (productos || []).filter(p => {
      const matchCategoria = filtroCategoria === 'Todos' || (p.categoria || 'Otros') === filtroCategoria;
      const matchBusqueda = !q || (p.nombre || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q);
      return matchCategoria && matchBusqueda;
    });
  }, [productos, filtroCategoria, busqueda]);

  // Declarar categorías base y extras
  
 
  


  useEffect(() => {
  try {
    const ex = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIAS) || "[]");
    if (Array.isArray(ex)) setCategoriasExtra(ex);
  } catch (e) {
    // nada
  }
  }, []);

  //handlers


  const totalItems = carrito.reduce((s, it) => s + (it.cantidad || 1), 0);
 

  // --- NUEVA LÓGICA: seleccionar imagen desde dispositivo ---
  // ref para el input file oculto
  const fileInputRef = useRef(null);

  // Abre el selector de archivos
  const seleccionarImagenDesdeDispositivo = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Helper único para comprimir la imagen (renombrado para evitar colisiones)
  const compressImageIfNeeded = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Error cargando la imagen'));
        img.onload = () => {
          // calcular dimensiones manteniendo aspecto
          let { width: w, height: h } = img;
          const ratio = Math.min(1, maxWidth / w, maxHeight / h);
          const cw = Math.round(w * ratio);
          const ch = Math.round(h * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');

          // Optamos por JPEG para reducir tamaño (buena para fotos/productos).
          ctx.drawImage(img, 0, 0, cw, ch);

          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality); // calidad 0.75 por defecto
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // manejarArchivoSeleccionado actualizado para usar compressImageIfNeeded (evita redeclaraciones)
  const manejarArchivoSeleccionado = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validaciones básicas
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG o WEBP.');
      // limpiar input para evitar problemas al volver a seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxSize = 8 * 1024 * 1024; // 8MB como límite de archivo original (puedes ajustar)
    if (file.size > maxSize) {
      // intentar comprimirlo de todas formas, pero avisar al usuario
      const ok = window.confirm('El archivo es grande (>8MB). Intentar comprimirlo automáticamente?');
      if (!ok) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    try {
      // Comprimir y redimensionar antes de guardar como DataURL
      const compressedDataUrl = await compressImageIfNeeded(file, 1200, 1200, 0.75);
      // Guardar DataURL comprimida en el estado
      setNuevoProducto(prev => ({ ...prev, imagen: compressedDataUrl }));
      // Mensaje breve
      alert('Imagen comprimida y guardada en el nuevo producto (DataURL reducido).');
    } catch (err) {
      console.error('Error procesando imagen:', err);
      alert('Error procesando la imagen seleccionada. Intenta con otra imagen o reduce su tamaño.');
    } finally {
      // limpiar el input file para permitir volver a seleccionar el mismo archivo si se desea
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --------- FIN NUEVA LÓGICA ----------

  // --------- AÑADIDOS PARA EL PANEL DE AGREGAR PRODUCTO ----------
  // Mostrar/ocultar panel agregar
  const [mostrarPanelAgregar, setMostrarPanelAgregar] = useState(false);
  // Fuente de imagen: 'url' o 'archivo'
  const [imagenFuente, setImagenFuente] = useState('url');
  // Campo temporal para la URL de la imagen si el admin quiere pegar una URL
  const [imagenUrl, setImagenUrl] = useState('');

  // Abrir panel (prepara estado)
  const abrirPanelAgregar = () => {
    setNuevoProducto({ nombre: '', descripcion: '', precio: '', imagen: '', stock: 0, categoria: '' });
    setImagenFuente('url');
    setImagenUrl('');
    setMostrarPanelAgregar(true);
  };

  // Cerrar panel
  const cerrarPanelAgregar = () => {
    setMostrarPanelAgregar(false);
  };

  // Handler para cambios en inputs del formulario de agregar producto
  const handleNuevoProductoChange = (field, value) => {
    setNuevoProducto(prev => ({ ...prev, [field]: value }));
  };

  // Validación y normalización del campo precio: sólo números y un punto decimal
  const handlePrecioChange = (e) => {
    const val = e.target.value;
    // Permitir sólo dígitos y un punto decimal
    let cleaned = val.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // Evitar leading zeros innecesarios: permitir '0' o '0.xx'
    setNuevoProducto(prev => ({ ...prev, precio: cleaned }));
  };

  // Cuando el admin elige "usar URL" como fuente de imagen, aplicarla al producto antes de guardar
  useEffect(() => {
    if (imagenFuente === 'url') {
      // no sobrescribimos imagen real hasta guardar; usamos imagenUrl temporal
    }
  }, [imagenFuente, imagenUrl]);

  // Helper: convierte DataURL (base64) a Blob
  const dataURLtoBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (err) {
      console.error('dataURLtoBlob error:', err);
      return null;
    }
  };

  // FORM SUBMIT DEL PANEL: utiliza guardarProducto existente adaptándolo para la fuente de imagen
  // Reemplazar la función handleSubmitPanel existente por esta versión
const handleSubmitPanel = async (e) => {
  e.preventDefault();

  // Validaciones mínimas en cliente
  if (!nuevoProducto.nombre || !nuevoProducto.precio) {
    return alert('Completa al menos nombre y precio del producto.');
  }

  try {
    // Intentamos obtener token de Firebase (si aplica)
    let token = null;
    try {
      const user = auth && auth.currentUser;
      if (user && user.getIdToken) token = await user.getIdToken();
    } catch (tErr) {
      console.warn('No se pudo obtener idToken (no crítico):', tErr);
    }

// Normalizar/asegurar valores antes de enviar
    const nombre = String(nuevoProducto.nombre || '').trim();
    const descripcion = (nuevoProducto.descripcion || '').trim() || 'Sin descripción';
    const precioNum = Number(nuevoProducto.precio) || 0;
    const stockNum = Number(nuevoProducto.stock) || 0;
    const categoria = String(nuevoProducto.categoria || '').trim();

    // Seleccionar la fuente de imagen: URL o DataURL (base64)
    const imagenFinal = imagenFuente === 'url' ? (imagenUrl || '') : (nuevoProducto.imagen || '');

    const payload = {
      nombre,
      descripcion,
      precio: precioNum,
      imagen: imagenFinal,
      stock: stockNum,
      categoria
    };

    if (nuevoProducto.categoria === "custom" && nuevoProducto.categoriaPersonalizada) {
      agregarCategoriaExtra(nuevoProducto.categoriaPersonalizada);
    }

    // DEBUG: ver payload antes de enviar
    console.log('Payload JSON a enviar:', payload);

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await axios.post(API_URL, payload, { headers });

    // Si todo OK, actualizar lista local y resetear formulario
    setProductos([ ...(productos || []), res.data ]);
    setNuevoProducto({ nombre: '', descripcion: '', precio: '', imagen: '', stock: 0, categoria: '' });
    setImagenUrl('');
    setMostrarPanelAgregar(false);
    alert('Producto publicado');
  } catch (err) {
    // Log más detallado para ayudar a diagnosticar
    console.error('Error publicando producto (panel):', err);
    if (err.response) {
      console.error('RESPUESTA DEL SERVIDOR:', err.response.status, err.response.data);
      alert(`Error publicando producto: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else if (err.request) {
      console.error('NO HUBO RESPUESTA (request):', err.request);
      alert('Error publicando producto: no hubo respuesta del servidor (posible CORS o caída del servidor). Revisa la consola de red.');
    } else {
      console.error('ERROR:', err.message);
      alert('Error publicando producto: ' + err.message);
    }
  }
  };


  const handleSeleccionarCategoria = (cat) => {
  setFiltroCategoria(cat);
  setMostrarMenuCategorias(false); // opcional: cierras el menú
  };

   

  const agregarCategoriaExtra = nuevaCat => {
  if (
    !nuevaCat ||
    CATEGORIAS_PREDEFINIDAS.includes(nuevaCat) ||
    categoriasExtra.includes(nuevaCat)
  ) return;
  const nuevas = [...categoriasExtra, nuevaCat];
  setCategoriasExtra(nuevas);
  localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIAS, JSON.stringify(nuevas));
  };






  // --------- FIN AÑADIDOS PARA PANEL ----------

  // --- NUEVAS FUNCIONES: PANEL CARRITO (mostrar, actualizar cantidades, eliminar) ---
  const toggleCarritoPanel = () => setMostrarCarritoPanel(v => !v);

  const actualizarCantidad = (id, cantidad) => {
    const cant = Math.max(1, Number(cantidad) || 1);
    const nuevo = carrito.map(it => it._id === id ? { ...it, cantidad: cant } : it);
    guardarCarritoEnLocalStorage(nuevo);
  };

  const eliminarDelCarrito = (id) => {
    const nuevo = carrito.filter(it => it._id !== id);
    guardarCarritoEnLocalStorage(nuevo);
  };

  // --------- FUNCIONES DE SUGERENCIAS ----------
  const abrirSugerencias = () => setMostrarSugerencias(true);
  const cerrarSugerencias = () => setMostrarSugerencias(false);

  const guardarSugerenciasEnLocalStorage = (arr) => {
    setSugerencias(arr);
    try {
      localStorage.setItem('sugerencias', JSON.stringify(arr));
    } catch (e) {
      console.error('Error guardando sugerencias en localStorage', e);
    }
  };

  const enviarSugerencia = (e) => {
    e.preventDefault();
    if (!currentUser) return alert('Debes iniciar sesión para enviar sugerencias');
    if (!nuevoComentario || !nuevoComentario.trim()) return alert('Escribe un comentario');

    const nombreUsuario = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Usuario');

    const nueva = {
      id: Date.now().toString(),
      nombre: nombreUsuario, // solo nombre como solicitaste
      comentario: nuevoComentario.trim(),
      calificacion: Number(nuevaCalificacion) || 0,
      created_at: new Date().toISOString()
    };

    const nuevaLista = [nueva, ...sugerencias];
    guardarSugerenciasEnLocalStorage(nuevaLista);

    setNuevoComentario('');
    setNuevaCalificacion(5);
  };
  // --------------------------------------------

  // --- VISTA DE LOGIN (ESTILO PROGRAMA PREMIUM) ---
  if (esLogin) {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
        <style>{`
          .login-box { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 50px; border-radius: 30px; width: 100%; max-width: 450px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); position: relative; }
          .login-h1 { font-family: 'Montserrat', sans-serif; font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; text-align: center; }
          .login-p { color: #666; text-align: center; margin-bottom: 35px; font-size: 0.9rem; }
          .input-wrapper { margin-bottom: 20px; position: relative; }
          .input-icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #444; }
          .login-input { width: 100%; padding: 18px 20px 18px 50px; background: #111; border: 1px solid #222; border-radius: 15px; color: #fff; outline: none; transition: 0.3s; box-sizing: border-box; }
          .login-input:focus { border-color: #d4ff00; background: #151515; }
          .btn-entrar { width: 100%; background: #d4ff00; color: #000; border: none; padding: 18px; border-radius: 15px; font-weight: 800; cursor: pointer; transition: 0.3s; margin-top: 10px; }
          .btn-entrar:hover { background: #eaff00; transform: translateY(-3px); }
          .forgot-link { display: block; text-align: center; margin-top: 25px; color: #666; text-decoration: none; font-size: 0.85rem; cursor: pointer; transition: 0.3s; }
          .forgot-link:hover { color: #d4ff00; }
          .back-home { position: absolute; top: -50px; left: 0; color: #444; cursor: pointer; font-size: 0.9rem; transition: 0.3s; background: none; border: none; }
          .back-home:hover { color: #fff; }
        `}</style>

        <div className="login-box fade-in">
          <button className="back-home" onClick={() => setEsLogin(false)}>← Volver al inicio</button>
          <h1 className="login-h1">Bienvenido</h1>
          <p className="login-p">Ingresa tus credenciales para acceder a la tienda.</p>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css  " />



          <form onSubmit={manejarLogin}>
  <div className="input-wrapper">
    <i className="fa-solid fa-envelope input-icon"></i>
    <input 
      type="email" 
      className="login-input" 
      placeholder="Correo electrónico" 
      required 
      value={loginData.email}
      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
    />
  </div>
  
  <div className="input-wrapper" style={{ position: 'relative' }}>
    <i className="fa-solid fa-lock input-icon"></i>
    <input 
      type={mostrarPasswordLogin ? "text" : "password"}
      className="login-input" 
      placeholder="Contraseña" 
      required 
      value={loginData.password}
      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
      style={{ paddingRight: 50 }}
      autoComplete="current-password"
    />
    <span
      onClick={() => setMostrarPasswordLogin(v => !v)}
      style={{
        position: "absolute",
        right: 18,
        top: "50%",
        transform: "translateY(-50%)",
        cursor: "pointer",
        color: "#888",
        fontSize: 18
      }}
      role="button"
      aria-label={mostrarPasswordLogin ? "Ocultar contraseña" : "Mostrar contraseña"}
      tabIndex={0}
    >
      <i className={`fa-solid ${mostrarPasswordLogin ? "fa-eye-slash" : "fa-eye"}`}></i>
    </span>
  </div>
  <button type="submit" className="btn-entrar" disabled={cargando}>
    {cargando ? 'VALIDANDO...' : 'INICIAR SESIÓN'}
  </button>
</form>
          
   

          <span className="forgot-link" onClick={recuperarContrasena}>
            ¿Olvidaste la contraseña?
          </span>
        </div>
      </div>
    );
  }

  // --- VISTA DE LANDING PAGE ORIGINAL (CONEXIÓN LOGIN) ---
  if (!mostrarTienda && !esRegistro) {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', backgroundColor: '#0d0d0d' }}>
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400 ;700;900&display=swap');
            .waves-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
            .wave-svg { position: absolute; width: 200%; height: 130%; top: -15%; left: 0; fill: none; stroke-width: 1.5; opacity: 0.35; animation: moveWaves 25s linear infinite; }
            @keyframes moveWaves { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .w1 { stroke: #ff00ff; animation-duration: 15s; }
            .w2 { stroke: #00ffff; animation-duration: 22s; animation-direction: reverse; }
            .w3 { stroke: #e2ff00; animation-duration: 28s; }
            .ui-layer { position: relative; z-index: 10; height: 100vh; display: flex; flex-direction: column; font-family: 'Montserrat', sans-serif; color: white; }
            header { display: flex; justify-content: space-between; align-items: center; padding: 20px 60px; }
            .logo-frame { font-weight: 900; font-size: 1.6rem; letter-spacing: 2px; }
            nav ul { display: flex; list-style: none; gap: 20px; padding: 0; margin: 0; }
            nav ul li a { text-decoration: none; color: white; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
            .btn-registro { background-color: #e2ff00; color: black; border: none; padding: 10px 30px; border-radius: 50px; font-weight: 900; cursor: pointer; }
            .vibe-title { text-align: center; font-size: 5.5rem; font-weight: 900; margin-top: 5px; letter-spacing: 6px; position: relative; z-index: 30; line-height: 1; }
            .content-grid { display: grid; grid-template-columns: 0.5fr 3fr 0.5fr; align-items: center; padding: 0 40px; flex-grow: 1; margin-top: -60px; height: 100%; }
            .col-left h2 { font-size: 3.2rem; font-weight: 900; line-height: 0.9; margin-bottom: 20px; }
            .col-right h3 { font-size: 1.6rem; font-weight: 900; text-align: right; margin-bottom: 15px; }
            .phone-display { position: relative; height: 100%; display: flex; justify-content: center; align-items: flex-start; }
            .phone-main { width: 100%; max-width: 600px; z-index: 15; filter: drop-shadow(0 0 70px rgba(0,0,0,1)); position: relative; transform: translateY(-20px); height: auto; }
            .phone-echo { position: absolute; width: 80%; max-width: 400px; left: 70%; top: 50%; transform: translate(-50%, -50%); opacity: 0.18; z-index: 5; filter: blur(5px); }
            .btn-descubre { background-color: #e2ff00; color: black; border: none; padding: 15px 50px; border-radius: 50px; font-weight: 900; cursor: pointer; }
            .circular-logo { width: 140px; height: 140px; border-radius: 50%; background: #000; border: 1px solid #333; margin-left: auto; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .circular-logo img { width: 100%; height: 100%; object-fit: cover; }

            /* Responsive: ACTIVADO para adaptarse en móviles */
            @media (max-width: 1024px) {
              header { padding: 16px 24px; }
              .content-grid { grid-template-columns: 1fr; gap: 20px; padding: 20px; margin-top: -20px; align-items: start; height: auto; }
              .vibe-title { font-size: 3.2rem; letter-spacing: 2px; margin-top: 10px; }
              .col-left h2 { font-size: 2.2rem; }
              .col-right h3 { font-size: 1.2rem; text-align: left; }
              .phone-echo { display: none; }
            }

            @media (max-width: 768px) {
              .vibe-title { font-size: 2.8rem; letter-spacing: 2px; }
              .col-left h2 { font-size: 1.8rem; }
              .col-left p { font-size: 0.9rem; }
              .col-right h3 { font-size: 1rem; text-align: left; }
              .col-right p { font-size: 0.85rem; text-align: left; }
              .circular-logo { width: 100px; height: 100px; margin-left: 0; }
              .phone-main { max-width: 320px; width: 90%; transform: translateY(0); }
              .content-grid { padding: 12px; gap: 15px; }
              header { flex-direction: column; gap: 12px; align-items: center; padding: 12px; }
              nav ul { flex-wrap: wrap; gap: 10px; justify-content: center; }
              .btn-registro { padding: 8px 18px; font-size: 0.85rem; }
              .btn-descubre { padding: 12px 30px; font-size: 0.9rem; }
            }

            @media (max-width: 480px) {
              .vibe-title { font-size: 2.2rem; letter-spacing: 1px; margin-top: 5px; }
              .col-left h2 { font-size: 1.5rem; }
              .col-left p { font-size: 0.85rem; }
              .phone-main { max-width: 280px; }
              header { padding: 10px; }
              .logo-frame { font-size: 1.2rem; }
              nav ul li a { font-size: 0.75rem; }
            }
        `}</style>

        <div className="waves-bg">
            <svg className="wave-svg w1" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path d="M0,160 C320,300 420,0 720,160 C1020,320 1120,20 1440,160"></path>
                <path d="M0,180 C320,320 420,20 720,180 C1020,340 1120,40 1440,180"></path>
                <path d="M0,200 C320,340 420,40 720,200 C1020,360 1120,60 1440,200"></path>
            </svg>
        </div>

        <div className="ui-layer">
            <header>
                <div className="logo-frame">FRAME</div>
                <nav>
                    <ul>
                        <li><a href="#" style={{color:'#e2ff00', borderBottom: '2px solid #e2ff00'}}>INICIO</a></li>
                        <li><a href="#">SERVICIOS</a></li>
                        <li><a href="#">CONTACTO</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setEsLogin(true); }}>INICIAR SESIÓN</a></li>
                    </ul>
                </nav>
                <button className="btn-registro" onClick={() => setEsRegistro(true)}>REGISTRO</button>
            </header>

            <h1 className="vibe-title">VIBEMARKET</h1>

            <main className="content-grid">
                <div className="col-left">
                    <h2>A TU<br/>ALCANCE</h2>
                    <p>Ecosistema seguro donde la comunidad universitaria puede renovarse de forma inteligente, rápida y transparente.</p><br/>
                    <button className="btn-descubre" onClick={() => setEsLogin(true)}>DESCÚBRELO</button>
                </div>

                <div className="phone-display">
                    <img src={celularImg} alt="Celular Principal" className="phone-main" />
                    <img src={celularImg} alt="Celular Eco" className="phone-echo" />
                </div>

                <div className="col-right">
                    <h3>¿Tienes algo que no usas?<br/>¿Buscas algo que te falta?</h3>
                    <p style={{textAlign: 'right'}}>En VibeMarket conectamos necesidades con oportunidades en menos de 30 segundos.</p><br/>
                    <div className="circular-logo">
                        <img src={logoImg} alt="Logo" />
                    </div>
                </div>
            </main>
        </div>
        {/* --- MODAL CONTACTO --- */}
        {mostrarContacto && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: 20
            }}
            onClick={() => setMostrarContacto(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Contacto WhatsApp"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 420,
                background: '#0b1220',
                borderRadius: 16,
                padding: 20,
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#e6eef8',
                textAlign: 'center'
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Contactos</h2>
              <p style={{ color: '#94a3b8', marginBottom: 16 }}>Selecciona a quién contactar por WhatsApp</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <button
                  onClick={() => {
                    window.open('https://wa.me/584126553503 ', '_blank', 'noopener');
                  }}
                  style={{ padding: '12px 14px', borderRadius: 12, border: 'none', background: '#06b6d4', color: '#001219', fontWeight: 800, cursor: 'pointer' }}
                >
                  Vendedor • +58 412 655 3503
                </button>

                <button
                  onClick={() => {
                    window.open('https://wa.me/584246322487 ', '_blank', 'noopener');
                  }}
                  style={{ padding: '12px 14px', borderRadius: 12, border: 'none', background: '#25D366', color: '#001219', fontWeight: 800, cursor: 'pointer' }}
                >
                  Programador • +58 424 632 2487
                </button>
              </div>

              <button
                onClick={() => setMostrarContacto(false)}
                style={{ marginTop: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#e6eef8', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* --- PANEL SERVICIOS --- */}
        {mostrarServiciosPanel && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2100,
              padding: 20
            }}
            onClick={() => setMostrarServiciosPanel(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Cómo funcionaría en VibeMarket"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 640,
                background: '#0b1220',
                borderRadius: 12,
                padding: 22,
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#e6eef8',
                textAlign: 'left',
                lineHeight: 1.4
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>¿Cómo funcionaría en tu vibemarket?</h2>

              <ol style={{ marginLeft: 18, marginBottom: 12 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>seleccion de intereses:</strong> el usuario elije su producto y es se almacena en el carrito de compras.
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>administracion:</strong> al darle click en el carrito podrás ver la cantidad de productos que llevas incluyendo el monto y podrás eliminar los productos que no quieras comprar.
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>registro:</strong> solo los usuarios registrados podrán iniciar sesión a la página de lo contrario no podrán entrar ni comprar ni sugerir.
                </li>
              </ol>

              <p style={{ marginBottom: 16 }}>Espero le guste mucho nuestra tienda web ☺️☺️☺️</p>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setMostrarServiciosPanel(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: '#d4ff00', color: '#000', border: 'none', padding: '10px 14px', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA DE REGISTRO ORIGINAL (SIN CAMBIOS) ---
  if (esRegistro) {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css  " />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300  ;400;600&family=Montserrat:wght@700;800&display=swap');
          .fade-in { animation: fadeInUp 0.8s ease-out forwards; }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .reg-header { text-align: center; margin-bottom: 60px; }
          .reg-h1 { font-family: 'Montserrat', sans-serif; font-size: 3.5rem; font-weight: 800; margin-bottom: 15px; color: #fff; letter-spacing: -2px; }
          .reg-desc { color: #888; font-size: 1.1rem; max-width: 600px; margin: 0 auto; line-height: 1.5; font-weight: 300; }
          .content-wrapper { display: flex; justify-content: space-between; gap: 80px; flex-wrap: wrap; width: 100%; max-width: 1100px; }
          .info-side { flex: 1; min-width: 300px; }
          .form-side { flex: 1.2; min-width: 320px; }
          .intro-text { font-size: 1.2rem; color: #ddd; margin-bottom: 40px; line-height: 1.5; }
          .contact-item { margin-bottom: 30px; }
          .label-title { font-size: 0.75rem; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
          .label-title i { color: #d4ff00; }
          .contact-link { font-size: 1.3rem; color: #fff; text-decoration: none; font-weight: 700; transition: 0.3s; }
          .contact-link:hover { color: #d4ff00; padding-left: 5px; }
          .input-group { margin-bottom: 20px; }
          .reg-input, .reg-select { width: 100%; padding: 22px; background-color: #111; border: 1px solid #222; border-radius: 15px; color: #fff; font-size: 1rem; outline: none; transition: all 0.4s; font-family: 'Inter', sans-serif; }
          .reg-input:focus, .reg-select:focus { background-color: #fff; color: #000; transform: scale(1.02); border-color: #fff; box-shadow: 0 20px 40px rgba(255,255,255,0.1); }
          .phone-group { display: flex; gap: 10px; }
          .phone-code { width: 110px; padding: 22px 10px; cursor: pointer; }
          .btn-container { display: flex; justify-content: flex-end; margin-top: 10px; }
          .reg-btn { background-color: #d4ff00; color: #000; border: none; padding: 20px 50px; border-radius: 50px; font-weight: 800; font-size: 0.9rem; cursor: pointer; letter-spacing: 1px; transition: transform 0.2s, background-color 0.2s; }
          .reg-btn:hover { background-color: #eaff00; transform: translateY(-5px); box-shadow: 0 10px 25px rgba(212, 255, 0, 0.3); }
          .verify-box { background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 20px; padding: 50px; max-width: 550px; margin: 0 auto; text-align: center; width: 100%; }
          .verify-options { display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; }
          .option-btn { background: #000; border: 1px solid #333; color: #888; padding: 12px 25px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.3s; font-family: 'Inter', sans-serif; font-size: 0.9rem; }
          .option-btn:hover, .option-btn.active { border-color: #d4ff00; color: #fff; background: #111; }
          .code-input-style { text-align: center; font-family: 'Montserrat', sans-serif; font-size: 2rem; letter-spacing: 10px; font-weight: 700; color: #d4ff00; }
          .timer-area { margin-top: 30px; font-size: 0.9rem; color: #666; }
          .resend-link { color: #444; text-decoration: none; font-weight: bold; cursor: default; transition: 0.3s; }
          .resend-link.active { color: #d4ff00; cursor: pointer; }
          .reg-footer { text-align: center; margin-top: 80px; color: #444; font-size: 0.85rem; border-top: 1px solid #111; padding-top: 30px; width: 100%; }
          .btn-volver { position: absolute; top: 20px; left: 20px; color: #666; cursor: pointer; background: none; border: none; font-size: 1rem; z-index: 100; }
          .btn-volver:hover { color: #d4ff00; }
        `}</style>


        <button className="btn-volver" onClick={() => setEsRegistro(false)}>← Volver al Inicio</button>
        <div className="container fade-in" style={{maxWidth: '1100px'}}>
          {pasoRegistro === 1 && (
            <>
              <header className="reg-header">
                <h1 className="reg-h1">Registro</h1>
                <p className="reg-desc">Únete a la nueva era de VibeMarket. Crea tu cuenta ahora.</p>
              </header>
              <div className="content-wrapper">
                <div className="info-side">
                  <p className="intro-text">Utiliza las siguientes vías de contacto,<br/>o rellena el formulario de registro.</p>
                  <div className="contact-item">
                    <span className="label-title"><i className="fa-solid fa-envelope"></i> Vía Gmail</span>
                    <a href="mailto:marketvibe4@gmail.com" className="contact-link">marketvibe4@gmail.com</a>
                  </div>
                  <div className="contact-item">
                    <span className="label-title"><i className="fa-brands fa-whatsapp"></i> Whatsapp</span>
                    <a href="https://wa.me/584246322487  " target="_blank" rel="noreferrer" className="contact-link">+58 424-6322487</a>
                  </div>
                </div>
                <form className="form-side" onSubmit={handleRegistroSubmit}>
                  <div className="input-group"><input type="text" className="reg-input" placeholder="Tu nombre completo" required /></div>
                  <div className="input-group"><input type="email" name="email" className="reg-input" placeholder="Correo electrónico" required /></div>
                  <div className="input-group phone-group">
                    <select name="countryCode" className="reg-select phone-code" defaultValue="+58">
                      <option value="+58">🇻🇪 +58</option><option value="+57">🇨🇴 +57</option><option value="+1">🇺🇸 +1</option>
                    </select>
                    <input type="tel" name="telefono" className="reg-input" placeholder="Número telefónico" required />
                  </div>
                  <div className="input-group" style={{ position: "relative" }}>
                    <input 
                    type={mostrarPasswordRegistro ? "text" : "password"} 
                    className="reg-input" 
                    placeholder="Contraseña" 
                    required 
                    style={{ paddingRight: 50 }} // espacio para el icono
                    />
                    <span
                    onClick={() => setMostrarPasswordRegistro(v => !v)}
                    style={{
                      position: "absolute",
                      right: 18,
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#888",
                      fontSize: 18
                      }}
                      role="button"
                      aria-label={mostrarPasswordRegistro ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={0}
                      >
                        <i className={`fa-solid ${mostrarPasswordRegistro ? "fa-eye-slash" : "fa-eye"}`}></i>
                       </span>
                       </div>
                  <div className="btn-container"><button type="submit" className="reg-btn">SIGUIENTE</button></div>
                </form>
              </div>
            </>
          )}
          {pasoRegistro === 2 && (
  <div className="fade-in">
    <header className="reg-header">
      <h1 className="reg-h1">Verificación</h1>
      <p className="reg-desc">Hemos enviado un enlace de verificación a tu correo. Haz clic en él para confirmar tu cuenta.</p>
    </header>

    <div className="verify-box">
      <p style={{color: '#d4ff00', fontWeight: 'bold', marginBottom: '20px', minHeight: '20px', fontSize: '0.95rem'}}>
        {mensajeStatus || 'Revisa tu correo (y la carpeta de spam) para confirmar tu cuenta.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          className="reg-btn"
          onClick={reEnviarEnlaceVerificacion}
          style={{ width: '100%', maxWidth: 320, padding: '14px 20px' }}
        >
          Reenviar enlace de verificación
        </button>

        <button
          type="button"
          className="reg-btn"
          onClick={() => { setEsRegistro(false); }}
          style={{ width: '100%', maxWidth: 320, padding: '12px 20px', background: 'transparent', color: '#d4ff00', border: '1px solid #333' }}
        >
          Volver al inicio
        </button>
      </div>

      <div style={{ marginTop: 22, color: '#94a3b8', fontSize: 0.95 + 'rem', textAlign: 'center' }}>
        Si no recibiste el correo, espera unos minutos o usa "Reenviar enlace de verificación".
      </div>
    </div>
  </div>
)}
          <footer className="reg-footer"><p>Vibemarket — Agencia Creativa | Política de Privacidad</p></footer>
        </div>
      </div>
    );
  }

  // --- VISTA DE TIENDA PREMIUM (GLASSMORPHISM) ---
  // --- VISTA DE TIENDA PREMIUM (ADAPTADA DEL HTML PROPORCIONADO) ---
  // --- VISTA DE TIENDA PREMIUM ---
return (
  <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css " />
    <style>{`
      :root {
        --primary: #6366f1;
        --accent: #a855f7;
        --bg: #0f172a;
        --glass: rgba(255, 255, 255, 0.03);
        --glass-border: rgba(255, 255, 255, 0.1);
        --text: #f8fafc;
      }
      * { box-sizing: border-box; }
      body, #root { background: var(--bg); color: var(--text); }
      .bg-glow { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at 50% -20%, #312e81 0%, transparent 50%), radial-gradient(circle at 0% 100%, #1e1b4b 0%, transparent 40%); z-index: 0; }
      .navbar { display:flex; justify-content:space-between; align-items:center; padding:1.5rem 5%; background: rgba(15,23,42,0.8); backdrop-filter: blur(10px); position: sticky; top:0; z-index: 100; border-bottom: 1px solid var(--glass-border); }
      .logo { font-size: 1.5rem; font-weight: 800; letter-spacing: -1px; cursor: pointer; }
      .logo span { color: var(--primary); }
      .search-box { background: var(--glass); border: 1px solid var(--glass-border); padding: 0.5rem 1.5rem; border-radius: 50px; display:flex; align-items:center; gap:10px; width: 400px; max-width: 60%; }
      .search-box input { background: transparent; border: none; color: white; outline: none; width: 100%; }
      .cart-wrapper { position: relative; cursor: pointer; font-size: 1.2rem; display:flex; align-items:center; gap:8px; }
      .badge { position: absolute; top: -8px; right: -10px; background: var(--primary); font-size: 0.7rem; padding: 2px 6px; border-radius: 50%; transition: transform 0.2s; }
      .social-sidebar { position: fixed; left: 2rem; top: 50%; transform: translateY(-50%); display:flex; flex-direction:column; gap:1.5rem; z-index: 10; }
      .social-link { color: var(--text); font-size: 1.2rem; opacity: 0.5; transition: 0.3s; }
      .social-link:hover { opacity:1; color: var(--primary); transform: translateX(5px); }
      .container { max-width: 1200px; margin: 3rem auto; padding: 0 2rem; position: relative; z-index: 1; }
      .glass-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
      .glass-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 24px; overflow: hidden; transition: 0.4s cubic-bezier(0.4,0,0.2,1); cursor: pointer; position: relative; }
      .glass-card:hover { transform: translateY(-10px); background: rgba(255,255,255,0.05); border-color: var(--primary); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
      .card-image { height: 200px; overflow: hidden; background: #0b1220; display:flex; align-items:center; justify-content:center; }
      .card-image img { width:100%; height:100%; object-fit:cover; transition: 0.5s; }
      .glass-card:hover .card-image img { transform: scale(1.06); }
      .card-content { padding: 1.5rem; }
      .specs { font-size: 0.8rem; color: #94a3b8; margin: 0.5rem 0 1.5rem; }
      .card-footer { display:flex; justify-content:space-between; align-items:center; }
      .price { font-size: 1.2rem; font-weight:700; }
      .buy-btn { background: var(--primary); color:white; border:none; padding: 0.6rem 1.2rem; border-radius:12px; cursor:pointer; font-weight:600; transition: 0.3s; }
      .buy-btn:hover { background: var(--accent); box-shadow: 0 0 20px rgba(99,102,241,0.4); }
      .modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(15,23,42,0.9); backdrop-filter: blur(10px); display: flex; justify-content:center; align-items:center; z-index: 1000; opacity: 0; pointer-events: none; transition: 0.25s; }
      .modal-overlay.active { opacity: 1; pointer-events: auto; }
      .modal-content { background: #1e293b; width: 90%; max-width: 800px; border-radius: 30px; position: relative; padding: 2rem; border: 1px solid var(--glass-border); transform: translateY(20px); transition: 0.25s; }
      .modal-overlay.active .modal-content { transform: translateY(0); }
      .close-btn { position:absolute; right:20px; top:20px; font-size:2rem; cursor:pointer; opacity:0.6; }
      .modal-body { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; }
      .modal-image-container img { width:100%; border-radius: 20px; object-fit: cover; }
      .modal-details h2 { font-size: 2rem; margin-bottom: 1rem; }
      .modal-description { color:#94a3b8; line-height:1.6; margin-bottom: 2rem; }
      .modal-price-box { display:flex; align-items:center; gap:2rem; }
      .big-price { font-size:2rem; font-weight:800; color: var(--primary); }
      .buy-btn-large { background: white; color: black; border: none; padding: 1rem 2rem; border-radius: 15px; font-weight: 800; cursor: pointer; width: 100%; }
      
      /* Estilos para el panel de agregar producto (admin) */
      .panel-overlay { position: fixed; inset:0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:1500; }
      .panel-card { width: 95%; max-width: 720px; background: #0b1220; border: 1px solid rgba(255,255,255,0.06); padding: 1.8rem; border-radius: 18px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); color: #e6eef8; }
      .panel-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; }
      .panel-title { font-size: 1.4rem; font-weight: 800; }
      .panel-form { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .panel-form .full { grid-column: 1 / -1; }
      .panel-input { width:100%; padding:12px 14px; border-radius:10px; background:#071024; border:1px solid rgba(255,255,255,0.04); color:#e6eef8; outline:none; }
      .panel-textarea { min-height: 100px; resize: vertical; }
      .panel-actions { display:flex; gap:10px; justify-content:flex-end; margin-top: 12px; }
      .panel-btn { background: #d4ff00; color: #000; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 800; cursor:pointer; }
      .panel-secondary { background: transparent; color: #c6d2ff; border: 1px solid rgba(255,255,255,0.04); }
      .image-source { display:flex; gap:8px; align-items:center; }
      .image-preview-small { width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid rgba(255,255,255,0.06); }

      /* Estilos para el panel del carrito */
      .carrito-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.7); display:flex; align-items:flex-end; justify-content:center; z-index:1600; padding: 16px; }
      .carrito-panel { width: 100%; max-width: 900px; background: linear-gradient(180deg, rgba(14,20,33,0.98), rgba(12,16,28,0.98)); border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); padding: 18px; box-shadow: 0 30px 60px rgba(2,6,23,0.6); color: #e6eef8; }
      .carrito-header { display:flex; justify-content:space-between; align-items:center; gap: 12px; margin-bottom: 12px; }
      .carrito-title { font-weight: 800; font-size: 1.1rem; color: var(--text); }
      .carrito-list { max-height: 320px; overflow:auto; display:flex; flex-direction:column; gap: 12px; margin-bottom: 12px; }
      .carrito-item { display:flex; gap: 12px; align-items:center; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.02); }
      .carrito-item img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; }
      .carrito-item .meta { flex:1; display:flex; flex-direction:column; gap:6px; }
      .carrito-item .meta .name { font-weight: 700; }
      .carrito-item .meta .price { color: #94a3b8; font-size: 0.9rem; }
      .carrito-item .actions { display:flex; align-items:center; gap:8px; }
      .qty-input { width: 66px; padding:6px 8px; border-radius:8px; background:#071024; border:1px solid rgba(255,255,255,0.04); color:#e6eef8; text-align:center; }
      .remove-btn { background: transparent; border: none; color: #ff6b6b; cursor: pointer; font-weight: 800; padding: 6px 8px; border-radius: 8px; }
      .carrito-footer { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top: 8px; }
      .total-price { font-weight: 900; font-size: 1.2rem; color: var(--primary); }
      .carrito-actions { display:flex; gap:10px; }
      .carrito-btn { background: #d4ff00; color: #000; border: none; padding: 10px 14px; border-radius: 12px; font-weight: 800; cursor: pointer; }
      .carrito-btn.secondary { background: transparent; color: #e6eef8; border: 1px solid rgba(255,255,255,0.04); }

      /* NUEVO: Estilos para modal de QR de pago móvil */
      .qr-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.85); backdrop-filter: blur(8px); display:flex; align-items:center; justify-content:center; z-index:1700; padding: 16px; }
      .qr-card { width: 100%; max-width: 420px; background: linear-gradient(180deg, rgba(14,20,33,0.98), rgba(12,16,28,0.98)); border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); padding: 28px; box-shadow: 0 30px 60px rgba(2,6,23,0.7); color: #e6eef8; text-align: center; }
      .qr-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 8px; color: #d4ff00; }
      .qr-subtitle { color: #94a3b8; font-size: 0.95rem; margin-bottom: 20px; }
      .qr-container { background: white; padding: 20px; border-radius: 16px; margin-bottom: 20px; display: flex; justify-content: center; align-items: center; }
      .qr-placeholder { width: 200px; height: 200px; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #64748b; font-size: 0.9rem; }
      .qr-instructions { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: left; }
      .qr-instructions h4 { color: #d4ff00; margin: 0 0 10px 0; font-size: 0.95rem; }
      .qr-instructions ol { margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; }
      .qr-instructions li { margin-bottom: 6px; }
      .qr-close-btn { background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); padding: 10px 24px; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.3s; }
      .qr-close-btn:hover { background: rgba(255,255,255,0.05); color: #e6eef8; }

      /* NUEVO: Estilos para selección de métodos de pago */
      .payment-options { display: flex; flex-direction: column; gap: 12px; width: 100%; }
      .payment-option-btn { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 14px 18px; border-radius: 12px; cursor: pointer; transition: all 0.3s; color: #e6eef8; text-align: left; }
      .payment-option-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
      .payment-option-btn.selected { background: rgba(212,255,0,0.1); border-color: #d4ff00; }
      .payment-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
      .payment-icon.whatsapp { background: #25D366; color: white; }
      .payment-icon.qr { background: #6366f1; color: white; }
      .payment-info { flex: 1; }
      .payment-info .title { font-weight: 700; font-size: 1rem; }
      .payment-info .desc { font-size: 0.85rem; color: #94a3b8; margin-top: 2px; }

      /* Media queries ACTIVADOS para responsive en móvil */
      @media (max-width: 1024px) {
        .navbar { padding: 1rem 4%; flex-wrap: wrap; gap: 10px; }
        .search-box { max-width: 45%; width: 100%; }
        .glass-grid { gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
        .social-sidebar { display: none; }
      }
      
      @media (max-width: 768px) {
        .modal-body { grid-template-columns: 1fr; }
        .navbar { flex-direction: column; align-items: stretch; gap: 10px; padding: 1rem 3%; }
        .search-container { order: 3; width: 100%; margin-top: 10px; }
        .search-box { display: flex; max-width: 100%; width: 100%; }
        .nav-actions { justify-content: center; flex-wrap: wrap; order: 2; }
        .logo { order: 1; text-align: center; margin-bottom: 5px; }
        .glass-grid { grid-template-columns: 1fr; padding: 0 12px; }
        .card-image { height: 180px; }
        .modal-content { padding: 1rem; max-width: 95%; }
        .panel-card { padding: 1rem; max-width: 95%; }
        .carrito-panel { max-width: 100%; }
        .qr-card { padding: 20px; }
      }
      
      @media (max-width: 480px) {
        .navbar { padding: 12px 3%; }
        .logo { font-size: 1.1rem; }
        .cart-wrapper { font-size: 1rem; }
        .glass-grid { grid-template-columns: 1fr; }
        .card-image { height: 160px; }
        .panel-form { grid-template-columns: 1fr; }
        .bottom-cart { width: 95% !important; left: 50% !important; transform: translateX(-50%) !important; padding: 14px !important; flex-direction: column; gap: 10px; }
        .bottom-cart h3 { font-size: 1rem; }
        .payment-option-btn { padding: 12px 14px; }
        .payment-icon { width: 36px; height: 36px; font-size: 1.1rem; }
      }
    `}</style>

    <div className="bg-glow" />

    <nav className="navbar">
      <div className="logo" onClick={loginAdmin}>Vibe<span>Market</span></div>
      <div className="search-container" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>
      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => setMostrarTienda(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>SALIR</button>
        <div className="cart-wrapper" title="Carrito" onClick={toggleCarritoPanel} role="button" aria-label="Abrir carrito">
          <i className="fa-solid fa-cart-shopping" />
          <span className="badge" aria-live="polite">{totalItems}</span>
        </div>

        {/* --- BOTÓN PARA AGREGAR PRODUCTO (solo admin) - botón "Seleccionar imagen" eliminado según solicitud --- */}
        {esAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Nota: se eliminó intencionadamente el botón "Seleccionar imagen" junto al de "Agregar producto" */}
            {/* Previsualización mínima si hay imagen (puede ser URL o DataURL) */}
            {nuevoProducto.imagen && (
              <img src={nuevoProducto.imagen} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }} />
            )}

            {/* NUEVO: Botón para abrir el panel de agregar producto (visible sólo para admin) */}
            <button
              onClick={abrirPanelAgregar}
              style={{ background: '#06b6d4', color: '#001219', border: 'none', padding: '8px 12px', borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}
              title="Agregar producto"
            >
              Agregar producto
            </button>

            {/* NUEVO: Botón para desactivar el modo administrador (style del programa) */}
            <button
              onClick={() => { setEsAdmin(false); alert('Modo administrador desactivado'); }}
              style={{ background: '#d4ff00', color: '#000', border: 'none', padding: '8px 12px', borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}
              title="Desactivar modo administrador"
            >
              Salir admin
            </button>
          </div>
        )}

<div style={{ position: "relative", marginRight: 20 }}>
  <button
    onClick={() => setMostrarMenuCategorias(v => !v)}
    style={{
      background: '#d4ff00',
      color: '#000',
      border: 'none',
      padding: '10px 22px',
      borderRadius: '14px',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: '1rem'
    }}
    title="Elegir Categoría"
  >
    Categorías <i className="fa-solid fa-angle-down"></i>
  </button>
  {mostrarMenuCategorias && (
    <div style={{
      position: "absolute",
      top: "110%",
      left: 0,
      background: "#181e2f",
      border: "1px solid #d4ff00",
      borderRadius: 12,
      zIndex: 20,
      minWidth: 200,
      boxShadow: "0 4px 18px rgba(30,41,59,0.2)",
      padding: "6px 0"
    }}>
      {/* Opción: todos */}
      <button
        style={{
          width: "100%",
          background: "none",
          border: "none",
          color: filtroCategoria === "Todos" ? "#d4ff00" : "#fff",
          padding: "12px 20px",
          textAlign: "left",
          fontWeight: 700,
          cursor: "pointer"
        }}
        onClick={() => handleSeleccionarCategoria("Todos")}
      >
        Todos
      </button>
      {categoriasUnicas
        .filter(cat => cat !== "Todos")
        .map(cat => (
          <button
            key={cat}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: filtroCategoria === cat ? "#d4ff00" : "#fff",
              padding: "12px 20px",
              textAlign: "left",
              cursor: "pointer",
              fontWeight: 500
            }}
            onClick={() => handleSeleccionarCategoria(cat)}
          >
            {cat}
          </button>
      ))}
    </div>
  )}
</div>

{/* NUEVO: Botón Sugerencias — aparece solo dentro de la tienda y solo para usuarios autenticados */}
        {currentUser && (
          <button
            onClick={abrirSugerencias}
            style={{ background: '#fde047', color: '#08111a', border: 'none', padding: '8px 12px', borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}
            title="Abrir sugerencias"
          >
            Sugerencias
          </button>
        )}
      </div>
    </nav>

    {/* input file oculto compartido: lee imagen y la guarda en nuevoProducto.imagen como DataURL */}
    <input
      type="file"
      accept="image/*"
      ref={fileInputRef}
      style={{ display: 'none' }}
      onChange={manejarArchivoSeleccionado}
    />

    <aside className="social-sidebar" aria-hidden>
      <a className="social-link" href="#" onClick={(e)=>e.preventDefault()}><i className="fa-brands fa-instagram" /></a>
      <a className="social-link" href="#" onClick={(e)=>e.preventDefault()}><i className="fa-brands fa-twitter" /></a>
      <a className="social-link" href="https://wa.me/584246322487  " target="_blank" rel="noreferrer"><i className="fa-brands fa-whatsapp" /></a>
    </aside>

    <main className="container">
      <div className="glass-grid">
        {productosFiltrados.map(p => (
          <div key={p._id} className="glass-card" onClick={() => setProductoSeleccionado(p)}>
            {esAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); eliminarProducto(p._id); }}
                style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: '#ef4444', border: 'none', borderRadius: '50%', color: 'white', width: 30, height: 30, cursor: 'pointer' }}
                aria-label="Eliminar producto"
              >
                ×
              </button>
            )}
            <div className="card-image">
              <img src={p.imagen || "https://via.placeholder.com/300x200?text=VibeMarket  "} alt={p.nombre} />
            </div>
            <div className="card-content">
              <h3>{p.nombre}</h3>
              <p className="specs">{p.categoria || 'Producto'}</p>
              <div className="card-footer">
                <span className="price">${Number(p.precio).toFixed(2)}</span>
                <button
                  className="buy-btn"
                  onClick={(e) => { e.stopPropagation(); agregarAlCarrito(p); }}
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>

    {/* Panel modal de AGREGAR PRODUCTO (visible sólo si mostrarPanelAgregar = true) */}
    {mostrarPanelAgregar && (
      <div className="panel-overlay" role="dialog" aria-modal="true">
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">Agregar nuevo producto</div>
            <div>
              <button onClick={cerrarPanelAgregar} className="panel-btn panel-secondary" style={{ padding: '6px 10px' }}>Cerrar</button>
            </div>
          </div>

          <form onSubmit={handleSubmitPanel}>
            <div className="panel-form">
              <input
                className="panel-input full"
                placeholder="Nombre del producto"
                value={nuevoProducto.nombre}
                onChange={(e) => handleNuevoProductoChange('nombre', e.target.value)}
                required
              />

              {/* Selector de categoría categorias */}
<div className="full" style={{ marginBottom: 8 }}>
  {!agregandoCategoria ? (
    <>
      <select
        className="panel-input"
        value={nuevoProducto.categoria}
        onChange={e => {
          const val = e.target.value;
          if (val === "__AGREGAR__") {
            setAgregandoCategoria(true);
            setNuevaCategoriaInput("");
          } else {
            handleNuevoProductoChange('categoria', val);
          }
        }}
        required
      >
        <option value="">Elegir categoría</option>
        {[...CATEGORIAS_PREDEFINIDAS, ...categoriasExtra].map(cat =>
          <option key={cat} value={cat}>{cat}</option>
        )}
        <option value="__AGREGAR__">➕ Agregar nueva categoría...</option>
      </select>
    </>
  ) : (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        className="panel-input"
        placeholder="Nombre nueva categoría"
        value={nuevaCategoriaInput}
        onChange={e => setNuevaCategoriaInput(e.target.value)}
        autoFocus
      />
      <button
        type="button"
        className="panel-btn"
        style={{ padding: "10px 14px", background: "#d4ff00", color: "#08111a" }}
        disabled={!nuevaCategoriaInput.trim()}
        onClick={() => {
          const nueva = nuevaCategoriaInput.trim();
          if (
            !nueva ||
            CATEGORIAS_PREDEFINIDAS.includes(nueva) ||
            categoriasExtra.includes(nueva)
          ) {
            alert('La categoría ya existe o es inválida.');
            return;
          }
          setCategoriasExtra([...categoriasExtra, nueva]);
          localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIAS, JSON.stringify([...categoriasExtra, nueva]));
          handleNuevoProductoChange('categoria', nueva);
          setAgregandoCategoria(false);
        }}
      >Agregar</button>
      <button
        type="button"
        className="panel-btn panel-secondary"
        onClick={() => setAgregandoCategoria(false)}
      >Cancelar</button>
    </div>
  )}
</div>

              <input
                className="panel-input"
                placeholder="Precio (solo números)"
                value={nuevoProducto.precio}
                onChange={handlePrecioChange}
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                required
              />

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="image-source">
                  <label style={{ fontSize: 12, color: '#9aa4b8' }}>Imagen:</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="imgSource" checked={imagenFuente === 'url'} onChange={() => setImagenFuente('url')} /> URL
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="imgSource" checked={imagenFuente === 'archivo'} onChange={() => setImagenFuente('archivo')} /> Archivo
                  </label>
                </div>
              </div>

              {/* Campo para URL */}
              {imagenFuente === 'url' && (
                <div className="full">
                  <input
                    className="panel-input full"
                    placeholder="Pega la URL de la imagen aquí"
                    value={imagenUrl}
                    onChange={(e) => setImagenUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Botón para elegir archivo (usa el mismo fileInputRef) */}
              {imagenFuente === 'archivo' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={seleccionarImagenDesdeDispositivo} className="panel-btn panel-secondary" style={{ background: '#334155', color: '#e6eef8' }}>
                    Elegir archivo...
                  </button>
                  {nuevoProducto.imagen ? <img src={nuevoProducto.imagen} alt="preview" className="image-preview-small" /> : <div style={{ width: 60, height: 60, borderRadius: 8, background: '#071024', border: '1px solid rgba(255,255,255,0.02)' }} />}
                </div>
              )}

              <textarea
                className="panel-input panel-textarea full"
                placeholder="Descripción del producto"
                value={nuevoProducto.descripcion}
                onChange={(e) => handleNuevoProductoChange('descripcion', e.target.value)}
              />

              <div className="full" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Stock (opcional)</div>
                <input
                  className="panel-input"
                  type="number"
                  min="0"
                  value={nuevoProducto.stock}
                  onChange={(e) => handleNuevoProductoChange('stock', Number(e.target.value))}
                  style={{ width: 120 }}
                />
              </div>
            </div>

            <div className="panel-actions">
              <button type="button" className="panel-btn panel-secondary" onClick={cerrarPanelAgregar}>Cancelar</button>
              <button type="submit" className="panel-btn">Publicar producto</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Panel del carrito (nuevo) */}
    {mostrarCarritoPanel && (
      <div className="carrito-overlay" onClick={() => setMostrarCarritoPanel(false)}>
        <div className="carrito-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Panel del carrito">
          <div className="carrito-header">
            <div className="carrito-title">Tu carrito ({totalItems} items)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="carrito-btn secondary" onClick={() => setMostrarCarritoPanel(false)}>Cerrar</button>
            </div>
          </div>

          <div className="carrito-list">
            {carrito.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: 12 }}>Tu carrito está vacío</div>}
            {carrito.map(item => (
              <div className="carrito-item" key={item._id}>
                <img src={item.imagen || "https://via.placeholder.com/80x80?text=Vibe  "} alt={item.nombre} />
                <div className="meta">
                  <div className="name">{item.nombre}</div>
                  <div className="price">${Number(item.precio).toFixed(2)} • Subtotal: ${(Number(item.precio) * (item.cantidad || 1)).toFixed(2)}</div>
                </div>
                <div className="actions">
                  <input
                    className="qty-input"
                    type="number"
                    min="1"
                    value={item.cantidad || 1}
                    onChange={(e) => actualizarCantidad(item._id, e.target.value)}
                    aria-label={`Cantidad de ${item.nombre}`}
                  />
                  <button className="remove-btn" onClick={() => eliminarDelCarrito(item._id)} title="Eliminar del carrito">Eliminar</button>
                </div>
              </div>
            ))}
          </div>

         <div className="carrito-footer">
  {/* Selección de métodos de pago */}
  {!metodoPago && (
    <div className="payment-options">
      <p style={{ color: '#94a3b8', marginBottom: 12, fontSize: '0.95rem' }}>Selecciona un método de pago:</p>
      
      <button 
        onClick={() => setMetodoPago("whatsapp")} 
        className="payment-option-btn"
      >
        <div className="payment-icon whatsapp">
          <i className="fa-brands fa-whatsapp"></i>
        </div>
        <div className="payment-info">
          <div className="title">Pagar por WhatsApp</div>
          <div className="desc">Envía tu pedido directamente por WhatsApp</div>
        </div>
      </button>

      <button 
        onClick={() => setMetodoPago("qr")} 
        className="payment-option-btn"
      >
        <div className="payment-icon qr">
          <i className="fa-solid fa-qrcode"></i>
        </div>
        <div className="payment-info">
          <div className="title">Pago Móvil (QR)</div>
          <div className="desc">Escanea el código QR para pagar</div>
        </div>
      </button>
    </div>
  )}

  {/* Panel Pago WhatsApp */}
  {metodoPago === "whatsapp" && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <button 
        className="carrito-btn" 
        onClick={() => { enviarWhatsApp(); setMostrarCarritoPanel(false); setMetodoPago(""); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <i className="fa-brands fa-whatsapp"></i>
        Enviar pedido por WhatsApp
      </button>
      <button 
        className="carrito-btn secondary" 
        onClick={() => setMetodoPago("")}
      >
        ← Volver a métodos de pago
      </button>
    </div>
  )}

  {/* Panel Pago QR */}
  {metodoPago === "qr" && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <button 
        className="carrito-btn" 
        onClick={() => setMostrarModalQR(true)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <i className="fa-solid fa-qrcode"></i>
        Ver QR de Pago Móvil
      </button>
      <button 
        className="carrito-btn secondary" 
        onClick={() => setMetodoPago("")}
      >
        ← Volver a métodos de pago
      </button>
    </div>
  )}
</div>

        </div>
      </div>
    )}

    {/* NUEVO: Modal de QR de Pago Móvil */}
    {mostrarModalQR && (
      <div className="qr-overlay" onClick={() => setMostrarModalQR(false)}>
        <div className="qr-card" onClick={(e) => e.stopPropagation()}>
          <div className="qr-title">
            <i className="fa-solid fa-mobile-screen" style={{ marginRight: 8 }}></i>
            Pago Móvil
          </div>
          <div className="qr-subtitle">
            Total a pagar: <strong style={{ color: '#d4ff00' }}>${displayTotal.toFixed(2)}</strong>
          </div>
          
          <div className="qr-container">
            {/* Aquí puedes reemplazar el placeholder con tu imagen de QR real */}
            <div className="qr-container">
              <img
              src={qrPagoMovil}
              alt="QR de Pago Móvil"
              style={{ maxWidth: '280px', width: '100%', borderRadius: 12 }} 
              />
              </div>
            {/* Si tienes una imagen de QR real, usa esto en su lugar: */}
            {/* <img src="/ruta-a-tu-qr.png" alt="QR de Pago Móvil" style={{ maxWidth: '100%', borderRadius: 12 }} /> */}
          </div>

          <div className="qr-instructions">
            <h4><i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i> Instrucciones:</h4>
            <ol>
              <li>Abre tu aplicación de banco BDV en tu teléfono</li>
              <li>Selecciona la opción "Pago Móvil" o "Escanea QR"</li>
              <li>Apunta la cámara al código QR</li>
              <li>Verifica el monto y confirma el pago</li>
              <li>Envía el comprobante por WhatsApp al vendedor</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button 
              className="qr-close-btn" 
              onClick={() => setMostrarModalQR(false)}
            >
              Cerrar
            </button>
            <button 
              className="carrito-btn"
              onClick={() => {
                setMostrarModalQR(false);
                setMostrarCarritoPanel(false);
                setMetodoPago("");
                alert('¡Gracias por tu compra! Recuerda enviar el comprobante por WhatsApp.');
              }}
            >
              <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }}></i>
              Ya pagué
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Panel de SUGERENCIAS (nuevo) */}
    {mostrarSugerencias && (
      <div className="panel-overlay" role="dialog" aria-modal="true" onClick={cerrarSugerencias}>
        <div className="panel-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
          <div className="panel-header">
            <div className="panel-title">Sugerencias y opiniones</div>
            <div>
              <button onClick={cerrarSugerencias} className="panel-btn panel-secondary" style={{ padding: '6px 10px' }}>Cerrar</button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={{ color: '#9aa4b8' }}>Aquí puedes leer lo que otros usuarios opinan y dejar tu comentario o calificación sobre VibeMarket. Solo se muestra el nombre del usuario registrado (no su correo completo).</p>
          </div>

          {/* Formulario para enviar sugerencia (visible solo si el usuario está autenticado) */}
          <form onSubmit={enviarSugerencia} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <textarea
                className="panel-input panel-textarea full"
                placeholder={currentUser ? "Escribe tu sugerencia, opinión o comentario..." : "Inicia sesión para escribir una sugerencia"}
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                disabled={!currentUser}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ color: '#9aa4b8' }}>Calificación:</label>
                <select className="panel-input" value={nuevaCalificacion} onChange={(e) => setNuevaCalificacion(Number(e.target.value))} style={{ width: 120 }}>
                  <option value={5}>5 ⭐</option>
                  <option value={4}>4 ⭐</option>
                  <option value={3}>3 ⭐</option>
                  <option value={2}>2 ⭐</option>
                  <option value={1}>1 ⭐</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="panel-btn panel-secondary" onClick={() => { setNuevoComentario(''); setNuevaCalificacion(5); }} style={{ padding: '8px 10px' }}>Limpiar</button>
                <button type="submit" className="panel-btn" disabled={!currentUser} style={{ padding: '8px 12px' }}>{currentUser ? 'Enviar' : 'Iniciar sesión'}</button>
              </div>
            </div>
          </form>

          <hr style={{ borderColor: 'rgba(255,255,255,0.04)', margin: '12px 0' }} />

          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {sugerencias.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: 12 }}>Aún no hay sugerencias. Sé el primero en opinar.</div>}

            {sugerencias.map(s => (
              <div key={s.id} style={{ padding: 12, borderRadius: 10, marginBottom: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.02)' }}>
                {/* Solo mostramos el nombre del usuario, tal y como solicitaste */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800 }}>{s.nombre}</div>
                  <div style={{ color: '#94a3b8' }}>{s.calificacion} ⭐</div>
                </div>
                <div style={{ color: '#cbd5e1' }}>{s.comentario}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Modal */}
    <div
      className={`modal-overlay ${productoSeleccionado ? 'active' : ''}`}
      onClick={() => setProductoSeleccionado(null)}
      aria-hidden={!productoSeleccionado}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close-btn" onClick={() => setProductoSeleccionado(null)}>&times;</span>
        {productoSeleccionado && (
          <div className="modal-body">
            <div className="modal-image-container">
              <img src={productoSeleccionado.imagen || "https://via.placeholder.com/400?text=VibeMarket  "} alt={productoSeleccionado.nombre} />
            </div>
            <div className="modal-details">
              <h2>{productoSeleccionado.nombre}</h2>
              <p className="modal-description">{productoSeleccionado.descripcion || 'Sin descripción'}</p>
              <div className="modal-price-box">
                <span className="big-price">${Number(productoSeleccionado.precio).toFixed(2)}</span>
                <button
                  className="buy-btn-large"
                  onClick={() => { agregarAlCarrito(productoSeleccionado); setProductoSeleccionado(null); }}
                >
                  AGREGAR AL CARRITO
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Bottom cart summary (si hay items) */}
    {carrito.length > 0 && (
      <div className="bottom-cart" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '800px', background: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(15px)', padding: '20px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 500 }}>
        <h3 style={{ margin: 0 }}>Total: $<pre>{displayTotal.toFixed(2)}</pre></h3>
        {/*<pre>{JSON.stringify(carrito, null, 2)}</pre>*/}
        {/*<pre>{displayTotal}</pre>*/}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setMostrarCarritoPanel(true); }} style={{ background: '#06b6d4', color: '#001219', border: 'none', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 }}>Ver carrito</button>
          <button onClick={enviarWhatsApp} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>PEDIR POR WHATSAPP</button>
        </div>
      </div>
    )}
  </div>
);
}

export default App;
