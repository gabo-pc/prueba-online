require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Conexión a MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('¡Conectado a MongoDB con éxito! ✅'))
    .catch(err => console.error('Error de conexión a la base de datos ❌:', err));

// Importar el modelo
const Producto = require('./models/Producto');

// --- RUTAS API ---

// 1. OBTENER TODOS LOS PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener productos" });
    }
});

// 2. CREAR UN PRODUCTO
app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProducto = new Producto(req.body);
        const productoGuardado = await nuevoProducto.save();
        res.status(201).json(productoGuardado);
    } catch (error) {
        res.status(400).json({ mensaje: "Error al guardar", error });
    }
});

// 3. ACTUALIZAR STOCK (Ruta crítica para que funcione la compra)
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;

        // Validación simple: asegurar que el stock no sea negativo
        const nuevoStock = Number(stock) < 0 ? 0 : Number(stock);

        const actualizado = await Producto.findByIdAndUpdate(
            id, 
            { stock: nuevoStock }, 
            { new: true, runValidators: true } 
        );

        if (!actualizado) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        res.json(actualizado);
    } catch (error) {
        console.error("Error en PUT /api/productos:", error);
        res.status(500).json({ mensaje: "Error al actualizar stock" });
    }
});

// 4. ELIMINAR UN PRODUCTO
app.delete('/api/productos/:id', async (req, res) => {
    try {
        const eliminado = await Producto.findByIdAndDelete(req.params.id);
        if (!eliminado) return res.status(404).json({ mensaje: "No se encontró el producto" });
        res.json({ mensaje: "Producto eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar" });
    }
});

app.get('/', (req, res) => {
    res.send('El servidor está vivo y conectado');
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});