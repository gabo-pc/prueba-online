require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// ---- NUEVO: Socket.io y PDF ----
const http = require('http');
const { Server } = require('socket.io');
const PDFDocument = require('pdfkit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Conexión a MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('¡Conectado a MongoDB con éxito! ✅'))
    .catch(err => console.error('Error de conexión a la base de datos ❌:', err));

// Importar el modelo
const Producto = require('./models/Producto');

// --- RUTAS API PRODUCTOS ---

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

// --- RUTAS PAGO MÓVIL Y SOCKET.IO ---

// 1. Enviar datos de pago móvil al frontend
app.get('/api/pagomovil-data', (req, res) => {
    res.json({
        telefono: process.env.MERCANTIL_COMMERCE_PHONE || '04121234567',
        rif: process.env.MERCANTIL_COMMERCE_RIF || 'J123456789'
    });
});

// 2. Confirmar pago móvil
app.post('/api/pagomovil-confirm', async (req, res) => {
    const { nombre, cedula, telefono, referencia, monto } = req.body;

    // Aquí deberías consultar el API de Mercantil para validar pago.
    // SIMULA un pago exitoso con delay de 4 segundos por demo (puedes conectar el real luego).
    setTimeout(() => {
        const facturaId = Date.now();

        io.emit('pagomovil-success', {
            referencia,
            facturaId,
            nombre,
            cedula,
            monto
        });

        res.json({
            ok: true,
            referencia: referencia,
            facturaId
        });
    }, 4000);
});

// 3. Descargar Factura como PDF
app.get('/api/factura/:id', (req, res) => {
    const doc = new PDFDocument();
    const fileName = `factura_${req.params.id}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-type', 'application/pdf');

    doc.fontSize(24).text('Factura de Pago Móvil', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Factura: ${req.params.id}`);
    doc.text('Gracias por su compra en VibeMarket');
    doc.end();
    doc.pipe(res);
});

// --- RUTA ROOT ---
app.get('/', (req, res) => {
    res.send('El servidor está vivo y conectado');
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo con Socket.io en http://localhost:${PORT}`);
});