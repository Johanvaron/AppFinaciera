# 💰 App Financiera - Proyecto Profesional

Una aplicación financiera completa y profesional construida con Vue 3, TypeScript, Pinia y Chart.js. Este proyecto demuestra las mejores prácticas de desarrollo frontend moderno.

![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Pinia](https://img.shields.io/badge/Pinia-3.0-FFD859)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)
![Tests](https://img.shields.io/badge/Tests-25/25-success)

## 📋 ¿Para qué sirve esta App Financiera?

Este proyecto es una **herramienta de gestión financiera personal** diseñada para ayudarte a tener el control total de tu dinero. Te permite:

### 💡 Control Financiero Total
- **📊 Visualiza tus finanzas**: Ten una vista clara de tus ingresos y gastos mensuales en tiempo real
- **💰 Conoce tu balance**: Sabe exactamente cuánto dinero te queda después de cubrir tus gastos
- **📈 Identifica patrones**: Descubre en qué categorías gastas más y optimiza tus finanzas
- **🎯 Toma mejores decisiones**: Con datos claros, puedes planificar mejor tus compras y ahorros

### 🔍 ¿Cómo funciona?

1. **Registra tus transacciones**: Agrega fácilmente cada ingreso o gasto con su monto, categoría y fecha
2. **Visualiza tu información**: El dashboard procesa automáticamente tus datos y los presenta en gráficos intuitivos
3. **Filtra y analiza**: Usa los filtros para ver transacciones específicas por tipo, categoría o fecha
4. **Entiende tus hábitos**: Los gráficos te muestran tendencias y patrones de gasto para que sepas dónde va tu dinero

### 🎁 Beneficios clave
- ✅ **Claridad financiera**: Nunca más te preguntarás "¿en qué gasté mi dinero?"
- ✅ **Control de gastos**: Identifica gastos innecesarios y ajusta tu presupuesto
- ✅ **Planificación inteligente**: Proyecta tus finanzas y establece metas realistas
- ✅ **Ahorro consciente**: Al ver tus números, es más fácil encontrar oportunidades de ahorro

## ✨ Características Principales

### 🎯 Funcionalidades Core
- ✅ **Autenticación**: Sistema de login con JWT mock
- ✅ **Dashboard Interactivo**: Visualización de ingresos, gastos y balance
- ✅ **Gráficos Reactivos**: Chart.js con evolución mensual y análisis por categorías
- ✅ **Gestión de Transacciones**: Filtros avanzados y vista detallada
- ✅ **Análisis de Tendencias**: Comparación con períodos anteriores
- ✅ **Navegación por Meses**: Selector de período temporal

### 🎨 UI/UX Premium
- 🎨 **Diseño Moderno**: UI limpia y profesional con Tailwind CSS
- 📱 **100% Responsive**: Optimizado para móvil, tablet y desktop
- ✨ **Animaciones Fluidas**: Transiciones suaves en todas las interacciones
- 🌈 **Iconos Heroicons**: Librería profesional de iconos
- 🎭 **Temas y Colores**: Paleta profesional con estados visuales claros

### 🏗️ Arquitectura Robusta
- 📦 **Pinia Store**: Gestión de estado global eficiente
- 🧩 **Componentes Reutilizables**: Arquitectura modular y escalable
- 🔄 **Lazy Loading**: Carga optimizada de rutas
- 🧪 **Testing Completo**: 25 tests unitarios (100% pasados)
- 🔐 **Guards de Navegación**: Protección de rutas autenticadas
- 📊 **Datos Mock Realistas**: Generación de transacciones para demo

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ o superior
- pnpm (recomendado) o npm

### Instalación

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm run dev

# Abrir en el navegador
# http://localhost:5173
```

### Credenciales de Demo
```
Email: demo@alegra.com
Password: demo123
```

## 🛠️ Stack Tecnológico

### Core
- **Vue 3.5** - Framework progresivo con Composition API
- **TypeScript 5.0** - Tipado estático para mayor confiabilidad
- **Vite 7** - Build tool ultra rápido
- **Pinia 3.0** - State management oficial de Vue

### UI & Styling
- **Tailwind CSS 4.0** - Framework CSS utility-first
- **@heroicons/vue** - Iconos SVG optimizados
- **Chart.js** - Librería de gráficos interactivos
- **vue-chartjs** - Wrapper de Chart.js para Vue

### Utilidades
- **date-fns** - Manipulación de fechas moderna y ligera
- **Vue Router** - Enrutamiento oficial con lazy loading

### Testing
- **Vitest** - Framework de testing rápido
- **@vue/test-utils** - Utilidades para testing de componentes
- **happy-dom** - DOM environment para tests

## 📁 Estructura del Proyecto

```
app-financiera/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── BaseButton.vue
│   │   ├── BaseCard.vue
│   │   ├── BaseInput.vue
│   │   ├── StatCard.vue
│   │   ├── ChartCard.vue
│   │   ├── AppLayout.vue
│   │   └── __tests__/    # Tests de componentes
│   ├── router/           # Configuración de rutas
│   ├── stores/           # Stores de Pinia
│   │   ├── auth.ts
│   │   ├── transactions.ts
│   │   └── __tests__/    # Tests de stores
│   ├── views/            # Vistas principales
│   │   ├── LoginView.vue
│   │   ├── DashboardView.vue
│   │   └── TransactionsView.vue
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── public/
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tailwind.config.js
```

## 🧪 Testing

El proyecto incluye **25 tests unitarios** que cubren:

- ✅ Autenticación (login, logout, persistencia)
- ✅ Transacciones (CRUD, cálculos, filtros)
- ✅ Componentes (renderizado, props, eventos)

### Ejecutar Tests

```bash
# Ejecutar todos los tests
pnpm run test

# Tests con UI interactiva
pnpm run test:ui

# Tests con coverage
pnpm run test:coverage
```

## 📊 Funcionalidades Detalladas

### 1. Sistema de Autenticación
- Login con validación de credenciales
- Persistencia de sesión en localStorage
- Protección de rutas privadas
- Redirección automática según estado de auth

### 2. Dashboard Principal
- **Tarjetas Estadísticas**: Ingresos, Gastos, Balance
- **Indicadores de Tendencia**: Comparación con mes anterior
- **Gráfico de Línea**: Evolución últimos 6 meses
- **Gráfico de Barras**: Gastos por categoría
- **Tabla de Transacciones**: Últimas 10 transacciones

### 3. Gestión de Transacciones
- Lista completa de transacciones
- Filtros por tipo (Ingresos/Gastos)
- Filtros por categoría
- Orden cronológico
- Visualización detallada con iconos

## 🎨 Diseño Responsive

### Mobile (< 640px)
- Sidebar colapsable
- Tarjetas en columna única
- Menú hamburguesa

### Tablet (640px - 1024px)
- Grid de 2 columnas
- Sidebar visible

### Desktop (> 1024px)
- Grid de 3 columnas
- Sidebar fijo

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm run dev          # Servidor de desarrollo

# Build
pnpm run build        # Compilar para producción
pnpm run preview      # Preview del build

# Testing
pnpm run test         # Tests en watch mode
pnpm run test:ui      # UI de tests
pnpm run test:coverage # Coverage report
```

## 📈 Métricas del Proyecto

- **Componentes Reutilizables**: 7
- **Vistas**: 3
- **Stores**: 2
- **Tests Unitarios**: 25 (100% passing)
- **TypeScript**: 100% tipado
- **Responsive**: 100% compatible

## 🎯 Buenas Prácticas Implementadas

✅ **Composition API**: Uso consistente de setup script  
✅ **TypeScript Estricto**: Tipado completo en todo el proyecto  
✅ **Componentes Modulares**: Alta reutilización de código  
✅ **Testing Completo**: Coverage de funcionalidades críticas  
✅ **Performance**: Lazy loading y optimizaciones  
✅ **Accesibilidad**: Semántica HTML correcta  

## 🌟 Destacados para Entrevistas

Este proyecto demuestra:

1. **Dominio de Vue 3**: Composition API, Reactivity System
2. **TypeScript Avanzado**: Interfaces, Generics, Type Safety
3. **Arquitectura Escalable**: Store patterns, Component composition
4. **Testing**: Unit tests con Vitest
5. **UI/UX**: Diseño responsive y animaciones fluidas
6. **Performance**: Code splitting y lazy loading

---

⭐ **Desarrollado con ❤️ como proyecto de portfolio profesional**
