import { useEffect, useRef, useState } from 'react';

export default function useTotalWasm() {
  const ModuleRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const modulePath = `${window.location.origin}/prueba-online/total_module.js`;
        const factoryModule = await import(/* webpackIgnore: true */ modulePath);
        const factory = factoryModule.default || factoryModule;
        
        // Crear el módulo con un callback para saber cuándo está listo
        let moduleReady = false;
        const Module = await factory({
          onRuntimeInitialized: () => {
            moduleReady = true;
            console.log('WASM runtime inicializado');
          }
        });
        
        // Esperar un poco para asegurar que el runtime esté listo
        // o verificar si ya está inicializado
        let attempts = 0;
        while (!moduleReady && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        
        if (!mounted) return;
        
        // Verificar que el módulo tenga las funciones necesarias
        if (!Module._malloc || !Module._free || !Module._calcularTotalArrays) {
          console.warn('WASM module no tiene las funciones esperadas');
          return;
        }
        
        // Intentar obtener la memoria de diferentes formas
        let wasmMemory = Module.wasmMemory || Module.memory;
        
        // Si aún no hay memoria, intentar acceder a través de HEAPF64
        if (!wasmMemory && Module.HEAPF64) {
          // HEAPF64 existe, extraer el buffer
          wasmMemory = { buffer: Module.HEAPF64.buffer };
        }
        
        if (!wasmMemory || !wasmMemory.buffer) {
          console.warn('WASM memory no inicializada. Funciones disponibles:', Object.keys(Module));
          return;
        }
        
        ModuleRef.current = Module;
        setLoaded(true);
        console.log('WASM cargado correctamente');
      } catch (err) {
        console.error('Error cargando WASM module:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const calcularConWasm = async (prices, counts) => {
    const Module = ModuleRef.current;
    if (!Module) throw new Error('WASM module no cargado');

    const n = prices.length;
    if (n === 0) return 0.0;

    // Obtener la memoria del módulo (varias formas posibles)
    let buffer;
    if (Module.wasmMemory) {
      buffer = Module.wasmMemory.buffer;
    } else if (Module.memory) {
      buffer = Module.memory.buffer;
    } else if (Module.HEAPF64) {
      buffer = Module.HEAPF64.buffer;
    } else {
      throw new Error('No se pudo acceder a la memoria WASM');
    }
    
    // Crear vistas de la memoria
    const HEAPF64 = new Float64Array(buffer);
    const HEAP32 = new Int32Array(buffer);

    const bytesD = n * 8; // double
    const bytesI = n * 4; // int32
    const ptrD = Module._malloc(bytesD);
    const ptrI = Module._malloc(bytesI);

    if (!ptrD || !ptrI) {
      throw new Error('No se pudo asignar memoria en WASM');
    }

    try {
      // Preparar arrays
      for (let i = 0; i < n; i++) {
        const precio = Number(prices[i]) || 0;
        const cantidad = Math.max(1, parseInt(counts[i]) || 1);
        
        // Escribir directamente en la memoria
        HEAPF64[(ptrD >> 3) + i] = precio;
        HEAP32[(ptrI >> 2) + i] = cantidad;
      }

      // Llamar a la función WASM
      const result = Module._calcularTotalArrays(ptrD, ptrI, n);
      return Number(result);
    } finally {
      Module._free(ptrD);
      Module._free(ptrI);
    }
  };

  return { calcularConWasm, loaded };
}