import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ 
    nombre: '', descripcion: '', precio: '', imagen: '', stock: 0, categoria: '' 
  }); 
  const [carrito, setCarrito] = useState([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');

  // --- CARGAR DATOS AL INICIAR ---
  useEffect(() => {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      try {
        setCarrito(JSON.parse(carritoGuardado));
      } catch (e) {
        setCarrito([]);
      }
    }
    obtenerProductos();
  }, []);

  // --- GUARDAR CARRITO AUTOMÁTICAMENTE ---
  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  const obtenerProductos = () => {
    axios.get('https://prueba-online.onreder.com/api/productos')
      .then(res => setProductos(res.data))
      .catch(err => console.error("Error al obtener productos:", err));
  };

  const loginAdmin = () => {
    const pass = prompt("Introduce la contraseña de administrador:");
    if (pass === "1234") setEsAdmin(true);
    else alert("Contraseña incorrecta");
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://prueba-online.onreder.com/api/productos', nuevoProducto);
      setNuevoProducto({ nombre: '', descripcion: '', precio: '', imagen: '', stock: 0, categoria: '' });
      obtenerProductos();
      alert("Producto guardado con éxito");
    } catch (error) {
      alert("Error al guardar producto");
    }
  };

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Eliminar producto?")) {
      await axios.delete(`https://prueba-online.onreder.com/api/productos${id}`);
      obtenerProductos();
    }
  };

  // --- LÓGICA DEL CARRITO CORREGIDA ---
  const agregarAlCarrito = (producto) => {
    const stockDisponible = Number(producto.stock);
    if (stockDisponible <= 0) return alert("¡Producto agotado!");

    setCarrito(prevCarrito => {
      const existe = prevCarrito.find(item => item._id === producto._id);
      
      if (existe) {
        if (existe.cantidad >= stockDisponible) {
          alert("No hay más unidades en stock");
          return prevCarrito;
        }
        return prevCarrito.map(item => 
          item._id === producto._id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      // Aseguramos que el precio sea número al entrar al carrito
      return [...prevCarrito, { ...producto, precio: Number(producto.precio), cantidad: 1 }];
    });
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item._id !== id));
  };

  // --- CÁLCULOS (Convertimos a número explícitamente) ---
  const totalDinero = carrito.reduce((sum, item) => sum + (Number(item.precio) * item.cantidad), 0);
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  // --- COMPRA POR WHATSAPP CORREGIDA ---
  const enviarWhatsApp = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    try {
      // 1. Actualizar stock en la base de datos para cada producto
      for (const item of carrito) {
        await axios.put(`https://prueba-online.onreder.com/api/productos${item._id}`, {
          stock: Number(item.stock) - item.cantidad
        });
      }

      // 2. Crear mensaje
      const telefono = "584246322487"; 
      const listaProductos = carrito.map(p => `- ${p.cantidad}x ${p.nombre} ($${Number(p.precio).toFixed(2)} c/u)`).join('\n');
      const mensaje = `¡Hola! Quisiera realizar este pedido:\n\n${listaProductos}\n\n*Total a pagar: $${totalDinero.toFixed(2)}*`;
      
      // 3. Abrir link
      const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
      
      // 4. Limpiar carrito y refrescar UI
      setCarrito([]); 
      obtenerProductos(); 
    } catch (error) {
      console.error(error);
      alert("Error al procesar la compra o actualizar el stock");
    }
  };

  const productosFiltrados = filtroCategoria === 'Todos' 
    ? productos 
    : productos.filter(p => p.categoria === filtroCategoria);

  const categoriasUnicas = ['Todos', ...new Set(productos.map(p => p.categoria).filter(c => c))];

  return (
    <div className="container py-5 bg-light min-vh-100">
      {/* CABECERA */}
      <div className="row mb-4 align-items-center">
        <div className="col-md-8 text-center text-md-start">
          <h1 className="fw-bold text-primary" onClick={loginAdmin} style={{cursor: 'pointer'}}>⚡ TechStore Pro</h1>
          <div className="mt-3">
            {categoriasUnicas.map(cat => (
              <button 
                key={cat} 
                className={`btn btn-sm me-2 mb-2 rounded-pill shadow-sm ${filtroCategoria === cat ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFiltroCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="col-md-4 text-center text-md-end">
          <div className="bg-dark text-white p-3 rounded shadow d-inline-block">
            <span className="h5 mb-0">🛒 Mi Carrito: <strong>{totalItems}</strong></span>
          </div>
        </div>
      </div>

      <div className="row">
        {/* PANEL ADMIN */}
        {esAdmin && (
          <div className="col-md-4">
            <div className="card shadow border-0 p-4 mb-4 sticky-top" style={{top: '20px'}}>
              <h4 className="fw-bold text-danger">Panel Admin</h4>
              <form onSubmit={guardarProducto}>
                <input type="text" className="form-control mb-2" placeholder="Nombre del producto" value={nuevoProducto.nombre} onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} required />
                <input type="text" className="form-control mb-2" placeholder="Categoría" value={nuevoProducto.categoria} onChange={(e) => setNuevoProducto({...nuevoProducto, categoria: e.target.value})} required />
                <textarea className="form-control mb-2" placeholder="Descripción corta" value={nuevoProducto.descripcion} onChange={(e) => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})} required />
                <input type="text" className="form-control mb-2" placeholder="URL de imagen" value={nuevoProducto.imagen} onChange={(e) => setNuevoProducto({...nuevoProducto, imagen: e.target.value})} />
                <div className="row">
                  <div className="col"><input type="number" className="form-control mb-2" placeholder="Precio $" value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})} required /></div>
                  <div className="col"><input type="number" className="form-control mb-2" placeholder="Stock" value={nuevoProducto.stock} onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})} required /></div>
                </div>
                <button type="submit" className="btn btn-success w-100 fw-bold shadow">＋ PUBLICAR PRODUCTO</button>
                <button type="button" onClick={() => setEsAdmin(false)} className="btn btn-link btn-sm w-100 mt-2 text-muted">Cerrar Sesión</button>
              </form>
            </div>
          </div>
        )}

        {/* LISTA DE PRODUCTOS */}
        <div className={esAdmin ? "col-md-8" : "col-md-12"}>
          <div className="row">
            {productosFiltrados.length === 0 ? (
              <div className="text-center py-5"><h3>No hay productos disponibles 📦</h3></div>
            ) : (
              productosFiltrados.map(p => (
                <div key={p._id} className="col-lg-4 col-md-6 mb-4">
                  <div className="card h-100 shadow-sm border-0 product-card">
                    {esAdmin && (
                      <button onClick={() => eliminarProducto(p._id)} className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 shadow">Eliminar</button>
                    )}
                    <img src={p.imagen || "https://via.placeholder.com/300x200?text=Sin+Imagen"} className="card-img-top" alt={p.nombre} style={{height: '180px', objectFit: 'cover'}}/>
                    <div className="card-body d-flex flex-column">
                      <div className="mb-2">
                        <span className="badge bg-soft-primary text-primary border border-primary mb-1">{p.categoria}</span>
                        <h5 className="fw-bold mb-0">{p.nombre}</h5>
                      </div>
                      <p className="text-muted small flex-grow-1">{p.descripcion}</p>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <span className="h4 text-primary mb-0 font-monospace">${Number(p.precio).toFixed(2)}</span>
                        <small className={`fw-bold ${p.stock > 0 ? "text-success" : "text-danger"}`}>
                          {p.stock > 0 ? `Stock: ${p.stock}` : "Agotado"}
                        </small>
                      </div>
                      <button 
                        onClick={() => agregarAlCarrito(p)} 
                        className="btn btn-primary w-100 mt-3 rounded-pill fw-bold shadow-sm" 
                        disabled={p.stock <= 0}
                      >
                        {p.stock > 0 ? 'AGREGAR AL CARRITO' : 'SIN STOCK'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER DE COMPRA (SOLO SI HAY PRODUCTOS) */}
      {carrito.length > 0 && (
        <div className="fixed-bottom p-4 bg-white shadow-lg border-top">
          <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center">
            <div className="mb-3 mb-md-0 text-center text-md-start">
              <p className="text-muted mb-0 small text-uppercase fw-bold">Resumen del pedido</p>
              <h3 className="mb-0">Total: <span className="text-primary fw-bold">${totalDinero.toFixed(2)}</span></h3>
              <small className="text-muted">{totalItems} productos seleccionados</small>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-danger px-4 rounded-pill" onClick={() => setCarrito([])}>Vaciar Carrito</button>
              <button className="btn btn-success fw-bold px-5 rounded-pill shadow" onClick={enviarWhatsApp}>
                PEDIR POR WHATSAPP ✅
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Espacio extra al final para que el footer no tape productos */}
      <div style={{height: '120px'}}></div>
    </div>
  );
}

export default App;