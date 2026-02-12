#include <emscripten.h>
#include <cstddef>

extern "C" {

EMSCRIPTEN_KEEPALIVE
double calcularTotalArrays(const double* precios, const int* cantidades, int n) {
    if (precios == NULL || cantidades == NULL || n <= 0) {
        return 0.0;
    }
    double total = 0.0;
    for (int i = 0; i < n; i++) {
        int c = (cantidades[i] > 0) ? cantidades[i] : 1;
        total += precios[i] * (double)c;
    }
    return total;
}

}
