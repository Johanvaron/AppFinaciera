-- ============================================
-- App Financiera - MySQL Database Schema
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS app_financiera
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE app_financiera;

-- ============================================
-- Tabla: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tabla: transactions
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_date (date),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insertar usuario de prueba
-- ============================================
INSERT INTO users (id, email, password, name, avatar) VALUES
('1', 'demo@alegra.com', 'demo123', 'Usuario Demo', 'https://ui-avatars.com/api/?name=Usuario+Demo&background=0ea5e9&color=fff');

-- ============================================
-- Insertar transacciones de prueba
-- ============================================
INSERT INTO transactions (id, user_id, description, amount, type, category, date, created_at) VALUES
-- Diciembre 2025
('txn-001', '1', 'Salario Diciembre', 3500000.00, 'income', 'Salario', '2025-12-01', '2025-12-01 08:00:00'),
('txn-002', '1', 'Mercado del mes', 450000.00, 'expense', 'Alimentación', '2025-12-05', '2025-12-05 10:30:00'),
('txn-003', '1', 'Transporte público', 120000.00, 'expense', 'Transporte', '2025-12-07', '2025-12-07 07:15:00'),
('txn-004', '1', 'Freelance - Diseño web', 800000.00, 'income', 'Freelance', '2025-12-10', '2025-12-10 16:20:00'),
('txn-005', '1', 'Luz y agua', 180000.00, 'expense', 'Servicios Públicos', '2025-12-12', '2025-12-12 09:00:00'),
('txn-006', '1', 'Netflix y Spotify', 45000.00, 'expense', 'Entretenimiento', '2025-12-15', '2025-12-15 12:00:00'),
('txn-007', '1', 'Arriendo', 1200000.00, 'expense', 'Arriendo', '2025-12-01', '2025-12-01 08:00:00'),
('txn-008', '1', 'Gimnasio', 150000.00, 'expense', 'Salud', '2025-12-18', '2025-12-18 14:30:00'),
('txn-009', '1', 'Compras navideñas', 380000.00, 'expense', 'Compras', '2025-12-20', '2025-12-20 11:45:00'),
('txn-010', '1', 'Bono navideño', 500000.00, 'income', 'Bonos', '2025-12-22', '2025-12-22 10:00:00'),
('txn-011', '1', 'Restaurante fin de año', 220000.00, 'expense', 'Alimentación', '2025-12-25', '2025-12-25 20:00:00'),

-- Noviembre 2025
('txn-012', '1', 'Salario Noviembre', 3500000.00, 'income', 'Salario', '2025-11-01', '2025-11-01 08:00:00'),
('txn-013', '1', 'Mercado noviembre', 420000.00, 'expense', 'Alimentación', '2025-11-03', '2025-11-03 10:30:00'),
('txn-014', '1', 'Arriendo noviembre', 1200000.00, 'expense', 'Arriendo', '2025-11-01', '2025-11-01 08:00:00'),
('txn-015', '1', 'Gasolina', 200000.00, 'expense', 'Transporte', '2025-11-05', '2025-11-05 07:15:00'),
('txn-016', '1', 'Consulta médica', 120000.00, 'expense', 'Salud', '2025-11-08', '2025-11-08 14:30:00'),
('txn-017', '1', 'Freelance - App móvil', 1200000.00, 'income', 'Freelance', '2025-11-12', '2025-11-12 16:20:00'),
('txn-018', '1', 'Luz y agua noviembre', 165000.00, 'expense', 'Servicios Públicos', '2025-11-15', '2025-11-15 09:00:00'),
('txn-019', '1', 'Cine y palomitas', 75000.00, 'expense', 'Entretenimiento', '2025-11-18', '2025-11-18 19:00:00'),
('txn-020', '1', 'Ropa', 350000.00, 'expense', 'Compras', '2025-11-22', '2025-11-22 15:30:00'),

-- Octubre 2025
('txn-021', '1', 'Salario Octubre', 3500000.00, 'income', 'Salario', '2025-10-01', '2025-10-01 08:00:00'),
('txn-022', '1', 'Arriendo octubre', 1200000.00, 'expense', 'Arriendo', '2025-10-01', '2025-10-01 08:00:00'),
('txn-023', '1', 'Supermercado', 480000.00, 'expense', 'Alimentación', '2025-10-04', '2025-10-04 11:00:00'),
('txn-024', '1', 'Internet fibra óptica', 95000.00, 'expense', 'Servicios Públicos', '2025-10-08', '2025-10-08 10:00:00'),
('txn-025', '1', 'Tanqueo moto', 85000.00, 'expense', 'Transporte', '2025-10-10', '2025-10-10 07:30:00'),
('txn-026', '1', 'Freelance - E-commerce', 950000.00, 'income', 'Freelance', '2025-10-15', '2025-10-15 17:00:00'),
('txn-027', '1', 'Farmacia medicamentos', 180000.00, 'expense', 'Salud', '2025-10-18', '2025-10-18 16:00:00'),
('txn-028', '1', 'Electrodomésticos', 420000.00, 'expense', 'Compras', '2025-10-20', '2025-10-20 14:00:00'),
('txn-029', '1', 'Curso online programación', 280000.00, 'expense', 'Educación', '2025-10-25', '2025-10-25 11:00:00'),

-- Septiembre 2025
('txn-030', '1', 'Salario Septiembre', 3500000.00, 'income', 'Salario', '2025-09-01', '2025-09-01 08:00:00'),
('txn-031', '1', 'Arriendo septiembre', 1200000.00, 'expense', 'Arriendo', '2025-09-01', '2025-09-01 08:00:00'),
('txn-032', '1', 'Mercado quincenal', 390000.00, 'expense', 'Alimentación', '2025-09-05', '2025-09-05 10:00:00'),
('txn-033', '1', 'Servicios públicos', 175000.00, 'expense', 'Servicios Públicos', '2025-09-10', '2025-09-10 09:00:00'),
('txn-034', '1', 'Taxi y Uber', 145000.00, 'expense', 'Transporte', '2025-09-12', '2025-09-12 18:00:00'),
('txn-035', '1', 'Venta producto usado', 250000.00, 'income', 'Otros Ingresos', '2025-09-14', '2025-09-14 13:00:00'),
('txn-036', '1', 'Salón de belleza', 95000.00, 'expense', 'Cuidado Personal', '2025-09-16', '2025-09-16 15:00:00'),
('txn-037', '1', 'Cena romántica', 180000.00, 'expense', 'Alimentación', '2025-09-20', '2025-09-20 21:00:00'),
('txn-038', '1', 'Freelance - Landing page', 600000.00, 'income', 'Freelance', '2025-09-22', '2025-09-22 10:00:00'),
('txn-039', '1', 'Videojuegos', 120000.00, 'expense', 'Entretenimiento', '2025-09-25', '2025-09-25 16:00:00'),

-- Agosto 2025
('txn-040', '1', 'Salario Agosto', 3500000.00, 'income', 'Salario', '2025-08-01', '2025-08-01 08:00:00'),
('txn-041', '1', 'Arriendo agosto', 1200000.00, 'expense', 'Arriendo', '2025-08-01', '2025-08-01 08:00:00'),
('txn-042', '1', 'Compras supermercado', 510000.00, 'expense', 'Alimentación', '2025-08-03', '2025-08-03 12:00:00'),
('txn-043', '1', 'Gimnasio agosto', 150000.00, 'expense', 'Salud', '2025-08-05', '2025-08-05 09:00:00'),
('txn-044', '1', 'Recarga celular', 50000.00, 'expense', 'Servicios Públicos', '2025-08-08', '2025-08-08 14:00:00'),
('txn-045', '1', 'Freelance - Sistema contable', 1500000.00, 'income', 'Freelance', '2025-08-12', '2025-08-12 18:00:00'),
('txn-046', '1', 'Mantenimiento vehículo', 320000.00, 'expense', 'Transporte', '2025-08-15', '2025-08-15 11:00:00'),
('txn-047', '1', 'Libros técnicos', 180000.00, 'expense', 'Educación', '2025-08-18', '2025-08-18 16:00:00'),
('txn-048', '1', 'Concierto', 250000.00, 'expense', 'Entretenimiento', '2025-08-22', '2025-08-22 20:00:00'),
('txn-049', '1', 'Zapatos', 280000.00, 'expense', 'Compras', '2025-08-25', '2025-08-25 14:00:00'),

-- Julio 2025
('txn-050', '1', 'Salario Julio', 3500000.00, 'income', 'Salario', '2025-07-01', '2025-07-01 08:00:00'),
('txn-051', '1', 'Arriendo julio', 1200000.00, 'expense', 'Arriendo', '2025-07-01', '2025-07-01 08:00:00'),
('txn-052', '1', 'Compras del mes', 465000.00, 'expense', 'Alimentación', '2025-07-04', '2025-07-04 11:00:00'),
('txn-053', '1', 'Luz, agua, gas', 195000.00, 'expense', 'Servicios Públicos', '2025-07-08', '2025-07-08 09:00:00'),
('txn-054', '1', 'Transporte julio', 160000.00, 'expense', 'Transporte', '2025-07-10', '2025-07-10 07:00:00'),
('txn-055', '1', 'Freelance - Consultoría', 700000.00, 'income', 'Freelance', '2025-07-15', '2025-07-15 15:00:00'),
('txn-056', '1', 'Dentista', 220000.00, 'expense', 'Salud', '2025-07-18', '2025-07-18 10:00:00'),
('txn-057', '1', 'Restaurantes', 310000.00, 'expense', 'Alimentación', '2025-07-20', '2025-07-20 20:00:00'),
('txn-058', '1', 'Streaming servicios', 65000.00, 'expense', 'Entretenimiento', '2025-07-22', '2025-07-22 12:00:00'),
('txn-059', '1', 'Regalos cumpleaños', 180000.00, 'expense', 'Compras', '2025-07-25', '2025-07-25 16:00:00'),
('txn-060', '1', 'Bono especial', 400000.00, 'income', 'Bonos', '2025-07-28', '2025-07-28 09:00:00');

-- ============================================
-- Verificar datos insertados
-- ============================================
SELECT 'Usuarios creados:' as Info, COUNT(*) as Total FROM users;
SELECT 'Transacciones creadas:' as Info, COUNT(*) as Total FROM transactions;
SELECT 'Transacciones por tipo:' as Info, type, COUNT(*) as Total FROM transactions GROUP BY type;
