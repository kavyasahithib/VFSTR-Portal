-- Database Schema Reference for CR Attendance Management System
-- Compatible with local SQLite and easily migratable to Supabase (PostgreSQL)

-- 1. Users Table (System Administrators/CRs)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, -- In SQLite: INTEGER PRIMARY KEY AUTOINCREMENT
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'cr'
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY, -- In SQLite: INTEGER PRIMARY KEY AUTOINCREMENT
  reg_no VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  section VARCHAR(50) NOT NULL,
  roll_no VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, -- In SQLite: INTEGER PRIMARY KEY AUTOINCREMENT
  date DATE NOT NULL, -- Format: YYYY-MM-DD
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK(status IN ('Present', 'Absent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, student_id)
);

-- Indexing for high-performance searches
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students(reg_no);
CREATE INDEX IF NOT EXISTS idx_students_roll_no ON students(roll_no);
