# Backend JSON Mock

Este proyecto usa un archivo JSON estático como backend simulado.

## Estructura

```
public/
  └── api/
      └── data.json    # Base de datos mock
```

## Archivo data.json

Contiene:
- **users**: Usuarios del sistema con credenciales
- **transactions**: Transacciones financieras

## Servicio API

Ubicación: `src/services/api.ts`

### Funciones disponibles:

1. **loginApi(email, password)** - Autenticar usuario
2. **getTransactions()** - Obtener todas las transacciones
3. **addTransaction(transaction)** - Agregar nueva transacción
4. **deleteTransaction(id)** - Eliminar transacción

## Credenciales

```
Email: demo@alegra.com
Password: demo123
```

## Uso en los Stores

### Auth Store
```typescript
import { loginApi } from '@/services/api'
const userData = await loginApi(email, password)
```

### Transactions Store
```typescript
import { getTransactions } from '@/services/api'
const transactions = await getTransactions()
```

## Ventajas

✅ No requiere servidor backend
✅ Datos persistentes durante la sesión
✅ Fácil de modificar y extender
✅ Simula delays de red realistas
✅ Listo para producción con API real
