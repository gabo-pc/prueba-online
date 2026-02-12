import { useEffect, useRef, useState } from 'react';

export default function useTotalWasm() {
  const ModuleRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {

        //const modulePath = `$ {window.location.origin}/total_module`;

        // Asume que total_module.js está en public/ y se sirve como /total_module.js
        const factoryModule = await import (/* webpackIgnore: true */ './total_module.js');
        const factory = factoryModule.default || factoryModule;
        const Module = await factory();
        if (!mounted) return;
        ModuleRef.current = Module;
        setLoaded(true);
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

    const bytesD = n * 8; // double
    const bytesI = n * 4; // int32
    const ptrD = Module._malloc(bytesD);
    const ptrI = Module._malloc(bytesI);

    try {
      const precios = new Float64Array(n);
      const cantidades = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        precios[i] = Number(prices[i]) || 0;
        cantidades[i] = Math.max(1, parseInt(counts[i]) || 1);
      }

      Module.HEAPF64.set(precios, ptrD >> 3);
      Module.HEAP32.set(cantidades, ptrI >> 2);

      const result = Module._calcularTotalArrays(ptrD, ptrI, n);
      return Number(result);
    } finally {
      Module._free(ptrD);
      Module._free(ptrI);
    }
  };

  return { calcularConWasm, loaded };
}