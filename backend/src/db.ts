import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const isPostgres = !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

if (isPostgres) {
  console.log('Using PostgreSQL database connection for production persistence.');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for hosted databases like Supabase/Neon on free plans
    }
  });
} else {
  console.log('Using local SQLite database.');
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  
  // Ensure parent directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
    } else {
      console.log(`SQLite database connected at ${dbPath}`);
    }
  });
}

// Convert SQLite style ? parameters to Postgres $1, $2, etc.
function convertSql(sql: string, isPg: boolean): string {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Adapt schema queries for Postgres dialect
function adaptSchemaSql(sql: string, isPg: boolean): string {
  if (!isPg) return sql;
  return sql
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
}

// Wrapped DB query interface
export const dbQuery = {
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (isPostgres && pgPool) {
        const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        let pgSql = convertSql(sql, true);
        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
          pgSql += ' RETURNING id';
        }
        pgPool.query(pgSql, params)
          .then((res) => {
            const lastID = res.rows[0]?.id || 0;
            const changes = res.rowCount ?? 0;
            resolve({ lastID, changes });
          })
          .catch(reject);
      } else if (sqliteDb) {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      } else {
        reject(new Error('No database connected'));
      }
    });
  },

  get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (isPostgres && pgPool) {
        const pgSql = convertSql(sql, true);
        pgPool.query(pgSql, params)
          .then((res) => {
            resolve(res.rows[0] as T);
          })
          .catch(reject);
      } else if (sqliteDb) {
        sqliteDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row as T);
        });
      } else {
        reject(new Error('No database connected'));
      }
    });
  },

  all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (isPostgres && pgPool) {
        const pgSql = convertSql(sql, true);
        pgPool.query(pgSql, params)
          .then((res) => {
            resolve(res.rows as T[]);
          })
          .catch(reject);
      } else if (sqliteDb) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows as T[]);
        });
      } else {
        reject(new Error('No database connected'));
      }
    });
  }
};

// Initialize schema
initializeDatabase();

async function initializeDatabase() {
  try {
    // 1. Create Users Table
    await dbQuery.run(adaptSchemaSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cr'
      )
    `, isPostgres));

    // 2. Create Students Table
    await dbQuery.run(adaptSchemaSql(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reg_no TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        section TEXT NOT NULL,
        roll_no TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, isPostgres));

    // 3. Create Attendance Table
    await dbQuery.run(adaptSchemaSql(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        student_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
        subject TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `, isPostgres));

    // Create indexes for performance optimization
    await dbQuery.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date)');
    await dbQuery.run('CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance (created_at)');
    await dbQuery.run('CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance (student_id)');

    // 4. Seed Default Admin CR User (only if users table is empty)
    const adminCount = await dbQuery.get<{ count: string | number }>(
      isPostgres ? 'SELECT COUNT(*) as count FROM users' : 'SELECT COUNT(*) as count FROM users'
    );
    const countVal = adminCount ? Number(adminCount.count) : 0;
    
    if (countVal === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await dbQuery.run(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        ['cr@attendance.com', hashedPassword, 'cr']
      );
      console.log('Seeded default admin user: cr@attendance.com / password123');
    }

    // 5. Seed Mock Students (only if students table is empty)
    const studentCount = await dbQuery.get<{ count: string | number }>(
      isPostgres ? 'SELECT COUNT(*) as count FROM students' : 'SELECT COUNT(*) as count FROM students'
    );
    const sCountVal = studentCount ? Number(studentCount.count) : 0;
    
    if (sCountVal === 0) {
      const mockStudents = [
        { reg_no: '231FA04035', name: 'BANDARU KOUSHIK HEMANTH', department: 'CSE', section: '17', roll_no: '01' },
        { reg_no: '231FA04052', name: 'CHANNAMALLU LOKESH', department: 'CSE', section: '17', roll_no: '02' },
        { reg_no: '231FA04054', name: 'SHAIK ABDUL KALAM', department: 'CSE', section: '17', roll_no: '03' },
        { reg_no: '231FA04067', name: 'ADDEPALLI SHANMUKHA PAVAN', department: 'CSE', section: '17', roll_no: '04' },
        { reg_no: '231FA04107', name: 'BHOOMIREDDY SUHITHA', department: 'CSE', section: '17', roll_no: '05' },
        { reg_no: '231FA04116', name: 'THIRUMALA NAGA JYOTHI', department: 'CSE', section: '17', roll_no: '06' },
        { reg_no: '231FA04202', name: 'KARIMIKONDA SOBHASRI', department: 'CSE', section: '17', roll_no: '07' },
        { reg_no: '231FA04220', name: 'YARRAGUNTLA SRIKANTH', department: 'CSE', section: '17', roll_no: '08' },
        { reg_no: '231FA04303', name: 'KOLLIPARA NAGA SRUTHIKA', department: 'CSE', section: '17', roll_no: '09' },
        { reg_no: '231FA04322', name: 'SHAIK JASMINE', department: 'CSE', section: '17', roll_no: '10' },
        { reg_no: '231FA04352', name: 'DILEEP KUMAR BALE', department: 'CSE', section: '17', roll_no: '11' },
        { reg_no: '231FA04377', name: 'TUPAKULA DINAKAR', department: 'CSE', section: '17', roll_no: '12' },
        { reg_no: '231FA04379', name: 'PATHAN AFROZ', department: 'CSE', section: '17', roll_no: '13' },
        { reg_no: '231FA04382', name: 'VUYYURU PAVANA BINDU', department: 'CSE', section: '17', roll_no: '14' },
        { reg_no: '231FA04391', name: 'KOLLI HEMA SAI DURGA', department: 'CSE', section: '17', roll_no: '15' },
        { reg_no: '231FA04394', name: 'BALUSUPATI KAVYA SAHITHI', department: 'CSE', section: '17', roll_no: '16' },
        { reg_no: '231FA04398', name: 'REPALLE SHANMUKH NAGA TEJA', department: 'CSE', section: '17', roll_no: '17' },
        { reg_no: '231FA04461', name: 'BOLAGANI DINESH KUMAR', department: 'CSE', section: '17', roll_no: '18' },
        { reg_no: '231FA04524', name: 'GUBBA VENKAT', department: 'CSE', section: '17', roll_no: '19' },
        { reg_no: '231FA04526', name: 'MEKALA SWATHI SRI', department: 'CSE', section: '17', roll_no: '20' },
        { reg_no: '231FA04529', name: 'PODAPATI SYAM VISHNU VARDHAN', department: 'CSE', section: '17', roll_no: '21' },
        { reg_no: '231FA04538', name: 'THOTA RAJESH', department: 'CSE', section: '17', roll_no: '22' },
        { reg_no: '231FA04539', name: 'SURE VEERA VENKATA SATYA BHARGHAV', department: 'CSE', section: '17', roll_no: '23' },
        { reg_no: '231FA04544', name: 'USIRIKAYALA SARUP VENKAT', department: 'CSE', section: '17', roll_no: '24' },
        { reg_no: '231FA04549', name: 'DANTLA AKSHITHA', department: 'CSE', section: '17', roll_no: '25' },
        { reg_no: '231FA04599', name: 'GOGINENI BHARATH TEJA', department: 'CSE', section: '17', roll_no: '26' },
        { reg_no: '231FA04607', name: 'YENUGANTI YUVARAJU', department: 'CSE', section: '17', roll_no: '27' },
        { reg_no: '231FA04608', name: 'PRATHI SUMANTH', department: 'CSE', section: '17', roll_no: '28' },
        { reg_no: '231FA04614', name: 'SAYED NAYEEM', department: 'CSE', section: '17', roll_no: '29' },
        { reg_no: '231FA04622', name: 'ANNAPAREDDY ROHITHA', department: 'CSE', section: '17', roll_no: '30' },
        { reg_no: '231FA04642', name: 'VEERLA DEEPAK', department: 'CSE', section: '17', roll_no: '31' },
        { reg_no: '231FA04648', name: 'SURAJ KUMAR', department: 'CSE', section: '17', roll_no: '32' },
        { reg_no: '231FA04698', name: 'KAMANA MAHITHA', department: 'CSE', section: '17', roll_no: '33' },
        { reg_no: '231FA04703', name: 'TIYYAGURA VENKATA AJAY REDDY', department: 'CSE', section: '17', roll_no: '34' },
        { reg_no: '231FA04709', name: 'GADEE JESHMITHA', department: 'CSE', section: '17', roll_no: '35' },
        { reg_no: '231FA04756', name: 'SAKALABHAKTULA KOUSHIK', department: 'CSE', section: '17', roll_no: '36' },
        { reg_no: '231FA04782', name: 'TIRUMALASETTY MOHAN SATYA', department: 'CSE', section: '17', roll_no: '37' },
        { reg_no: '231FA04787', name: 'PUNUGUPATI VENKATA SAI TARUN', department: 'CSE', section: '17', roll_no: '38' },
        { reg_no: '231FA04797', name: 'THUMMALA KISHORE', department: 'CSE', section: '17', roll_no: '39' },
        { reg_no: '231FA04845', name: 'DAVU GNANENDRA KUMAR', department: 'CSE', section: '17', roll_no: '40' },
        { reg_no: '231FA04849', name: 'KOTRA CHAITANYA VENKATESH', department: 'CSE', section: '17', roll_no: '41' },
        { reg_no: '231FA04872', name: 'MURIKIPUDI JOHN WESLY', department: 'CSE', section: '17', roll_no: '42' },
        { reg_no: '231FA04951', name: 'SANGU VENKATA SAHITHI', department: 'CSE', section: '17', roll_no: '43' },
        { reg_no: '231FA04953', name: 'MADALA HARSHITHA', department: 'CSE', section: '17', roll_no: '44' },
        { reg_no: '231FA04956', name: 'DONTHALA SRI HARI KRISHNA', department: 'CSE', section: '17', roll_no: '45' },
        { reg_no: '231FA04972', name: 'RAHUL DAS', department: 'CSE', section: '17', roll_no: '46' },
        { reg_no: '231FA04A11', name: 'GOLAKARAM VINAY RAM KUMAR', department: 'CSE', section: '17', roll_no: '47' },
        { reg_no: '231FA04A19', name: 'ANAGANI SATYA SAI KRISHNA', department: 'CSE', section: '17', roll_no: '48' },
        { reg_no: '231FA04A53', name: 'KARRI YUVA NAGENDRA REDDY', department: 'CSE', section: '17', roll_no: '49' },
        { reg_no: '231FA04A74', name: 'VARANASI SIDDHU', department: 'CSE', section: '17', roll_no: '50' },
        { reg_no: '231FA04A93', name: 'NAKIRIKANTI SRUTHI', department: 'CSE', section: '17', roll_no: '51' },
        { reg_no: '231FA04B58', name: 'VADUPU PURNA SAI', department: 'CSE', section: '17', roll_no: '52' },
        { reg_no: '231FA04B85', name: 'GALI TIRUMALA SRI MANIKANTA', department: 'CSE', section: '17', roll_no: '53' },
        { reg_no: '231FA04B93', name: 'KALLEM LAXMINARAYANA', department: 'CSE', section: '17', roll_no: '54' },
        { reg_no: '231FA04B95', name: 'SHAIK MUZEEF', department: 'CSE', section: '17', roll_no: '55' },
        { reg_no: '231FA04B97', name: 'KONAKALLA SAI VIVEK', department: 'CSE', section: '17', roll_no: '56' },
        { reg_no: '231FA04D42', name: 'MATCHA NAGA VENKATA VAMSSI', department: 'CSE', section: '17', roll_no: '57' },
        { reg_no: '231FA04D60', name: 'GATTUPALLI GIRISH VENKATA GUPTHA', department: 'CSE', section: '17', roll_no: '58' },
        { reg_no: '231FA04E12', name: 'PAMIDI VENKATA RUPESH CHOWDARY', department: 'CSE', section: '17', roll_no: '59' },
        { reg_no: '231FA04E28', name: 'ADUSUMALLI SAI', department: 'CSE', section: '17', roll_no: '60' },
        { reg_no: '231FA04E41', name: 'MUSALA UPENDRA', department: 'CSE', section: '17', roll_no: '61' },
        { reg_no: '231FA04E46', name: 'BHAVANAM SRI JAYA SATHWIKA', department: 'CSE', section: '17', roll_no: '62' },
        { reg_no: '231FA04E48', name: 'KURRA RUTHVIKA', department: 'CSE', section: '17', roll_no: '63' },
        { reg_no: '231FA04E93', name: 'PAGADALA VEDA VARSHINI', department: 'CSE', section: '17', roll_no: '64' },
        { reg_no: '231FA04F14', name: 'MUKKAMALLA SNEHA REDDY', department: 'CSE', section: '17', roll_no: '65' },
        { reg_no: '231FA04F19', name: 'KOTARI AMULYA', department: 'CSE', section: '17', roll_no: '66' },
        { reg_no: '231FA04F37', name: 'SATYAM SHRIVASTAV', department: 'CSE', section: '17', roll_no: '67' },
        { reg_no: '231FA04F46', name: 'THOTA GURU CHANDRA SEKHAR', department: 'CSE', section: '17', roll_no: '68' },
        { reg_no: '231FA04F61', name: 'NARALASETTY VENKATA HANUMATH SAI YASWANTH', department: 'CSE', section: '17', roll_no: '69' },
        { reg_no: '231FA04F78', name: 'SHAIK MOHAMMAD IMRAN', department: 'CSE', section: '17', roll_no: '70' },
        { reg_no: '231FA04F86', name: 'AYUSH KUMAR VERMA', department: 'CSE', section: '17', roll_no: '71' },
        { reg_no: '231FA04G38', name: 'MD RIZWAN', department: 'CSE', section: '17', roll_no: '72' }
      ];

      for (const student of mockStudents) {
        await dbQuery.run(
          'INSERT INTO students (reg_no, name, department, section, roll_no) VALUES (?, ?, ?, ?, ?)',
          [student.reg_no, student.name, student.department, student.section, student.roll_no]
        );
      }
      console.log(`Seeded ${mockStudents.length} class roster students`);
    }

    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

export default isPostgres ? pgPool : sqliteDb;
