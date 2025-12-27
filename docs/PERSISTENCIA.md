# Sistema de Persistencia de Datos

## ¿Cómo funciona?

El dashboard utiliza **localStorage** del navegador para guardar permanentemente todas las transacciones que agregues.

### Flujo de Datos

1. **Primera carga**: Los datos se cargan desde `/public/api/data.json` (60 transacciones de ejemplo)
2. **Se guardan en localStorage**: Una copia se guarda automáticamente en `localStorage` con la key `dashboard-financiero-transactions`
3. **Cargas posteriores**: Los datos se cargan desde `localStorage` en lugar del JSON
4. **Nuevas transacciones**: Se agregan a `localStorage` permanentemente

### Ventajas

✅ **Persistencia real**: Tus datos se mantienen incluso si recargas la página o cierras el navegador
✅ **No requiere backend**: Funciona completamente en el navegador
✅ **Rápido**: No necesita conexión a internet después de la primera carga

### Limitaciones

⚠️ **Por navegador**: Los datos solo están disponibles en el navegador donde los creaste
⚠️ **Por dominio**: Cada dominio tiene su propio localStorage
⚠️ **Límite de 5-10MB**: El navegador tiene un límite de almacenamiento

## Operaciones Disponibles

### ✅ Agregar Transacciones
- Ve a "Nueva Transacción" en el sidebar
- Completa el formulario
- Los datos se guardan automáticamente en localStorage
- Te redirige a la lista de transacciones

### 🔄 Ver Transacciones
- Dashboard: Muestra estadísticas y resumen
- Transacciones: Lista completa con filtros y búsqueda
- Todos cargan desde localStorage

### 🗑️ Eliminar Transacciones
- Función preparada en el API
- Se puede implementar en futuras versiones

## Resetear Datos

Si quieres volver a los datos originales del JSON:

```javascript
// En la consola del navegador:
localStorage.removeItem('dashboard-financiero-transactions')
// Luego recarga la página
location.reload()
```

## Estructura de Datos en localStorage

```json
{
  "users": [...],
  "transactions": [
    {
      "id": "txn-1735234567890",
      "description": "Salario enero",
      "amount": 5000000,
      "type": "income",
      "category": "Salario",
      "date": "2024-12-01",
      "createdAt": "2024-12-27T10:30:00.000Z"
    }
  ]
}
```

## Código Técnico

### api.ts
```typescript
const STORAGE_KEY = 'dashboard-financiero-transactions'

// Cargar: primero localStorage, luego JSON
async function loadData(): Promise<ApiData> {
  const storedData = localStorage.getItem(STORAGE_KEY)
  if (storedData) {
    return JSON.parse(storedData)
  }
  // Cargar desde JSON y guardar en localStorage
  const data = await fetch('/api/data.json')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

// Guardar cambios
function saveData(data: ApiData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
```

### Flujo de Agregar Transacción

1. Usuario llena formulario en `AddTransactionView.vue`
2. Se llama `transactionsStore.addTransaction()`
3. Store llama `addTransactionApi()` en `services/api.ts`
4. API agrega transacción al array y llama `saveData()`
5. Datos se guardan en localStorage
6. Store recarga datos con `loadTransactions({ force: true })`
7. Vista se actualiza automáticamente

## Migración Futura a Backend

Cuando tengas un backend real, solo necesitas modificar `src/services/api.ts`:

```typescript
// En lugar de localStorage:
export async function addTransaction(transaction) {
  const response = await fetch('https://tu-api.com/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction)
  })
  return response.json()
}
```

¡El resto del código funcionará sin cambios! 🎉
