const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    categoria: { type: String },
    // Mantenemos tu campo de imagen con un valor por defecto para evitar errores
    imagen: { type: String, default: "https://via.placeholder.com/300x200?text=Sin+Imagen" } 
});

module.exports = mongoose.model('Producto', ProductoSchema);