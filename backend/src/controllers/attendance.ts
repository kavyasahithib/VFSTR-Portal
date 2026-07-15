import { Router, Request, Response } from 'express';
import { dbQuery } from '../db';

const router = Router();

// Submit attendance
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, records, subject } = req.body; // date: YYYY-MM-DD, records: Array of { student_id, status: 'Present' | 'Absent' }, subject: string

    if (!date || !records || !Array.isArray(records) || !subject) {
      return res.status(400).json({ message: 'Date, records array, and subject name are required.' });
    }

    // Generate single UTC timestamp (format: YYYY-MM-DD HH:MM:SS) for this submission session
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Insert new records in bulk for high performance
    if (records.length > 0) {
      const placeholders = records.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const sql = `INSERT INTO attendance (date, student_id, status, created_at, subject) VALUES ${placeholders}`;
      const params: any[] = [];
      for (const record of records) {
        params.push(date, record.student_id, record.status, timestamp, subject);
      }
      await dbQuery.run(sql, params);
    }

    // Get statistics for confirmation response
    const stats = await dbQuery.get<{ present: number; absent: number }>(
      `SELECT 
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
       FROM attendance WHERE created_at = ?`,
      [timestamp]
    );

    res.json({
      message: 'Attendance saved successfully.',
      date,
      timestamp,
      present: stats?.present || 0,
      absent: stats?.absent || 0
    });
  } catch (err) {
    console.error('Submit attendance error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Fetch attendance for a date (returns ALL students with their status if exists)
router.get('/date', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD).' });
    }

    // Get only the latest status for each student on this date to prevent duplicate student rows
    const sql = `
      SELECT 
        s.id as student_id,
        s.reg_no,
        s.name,
        s.department,
        s.section,
        s.roll_no,
        (SELECT status FROM attendance WHERE student_id = s.id AND date = ? ORDER BY created_at DESC LIMIT 1) as status
      FROM students s
      ORDER BY s.roll_no ASC
    `;

    const records = await dbQuery.all(sql, [date]);
    
    // Check if attendance has been taken for this date at all
    const hasBeenTakenRow = await dbQuery.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM attendance WHERE date = ?',
      [date]
    );
    const hasBeenTaken = (hasBeenTakenRow?.count || 0) > 0;

    res.json({
      date,
      hasBeenTaken,
      records
    });
  } catch (err) {
    console.error('Fetch attendance by date error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Fetch attendance history (list of dates with counts)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT 
        created_at,
        date,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
        COUNT(*) as total
      FROM attendance
      GROUP BY created_at
      ORDER BY created_at DESC
    `;
    const history = await dbQuery.all(sql);
    res.json(history);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Fetch single student statistics & detailed logs
router.get('/student/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Student profile
    const student = await dbQuery.get('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Attendance stats
    const stats = await dbQuery.get<{ present: number; absent: number; total: number }>(
      `SELECT 
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
        COUNT(*) as total
       FROM attendance WHERE student_id = ?`,
      [id]
    );

    // Logs
    const logs = await dbQuery.all(
      'SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC',
      [id]
    );

    res.json({
      student,
      stats: {
        present: stats?.present || 0,
        absent: stats?.absent || 0,
        total: stats?.total || 0,
        percentage: stats?.total ? Math.round(((stats.present || 0) / stats.total) * 100) : 100
      },
      logs
    });
  } catch (err) {
    console.error('Fetch student stats error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Fetch overall dashboard analytics
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const totalStudentsRow = await dbQuery.get<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const totalStudents = totalStudentsRow?.count || 0;

    // Total marked days
    const totalDaysRow = await dbQuery.get<{ count: number }>('SELECT COUNT(DISTINCT date) as count FROM attendance');
    const totalDays = totalDaysRow?.count || 0;

    // Overall Present / Absent count
    const overallStats = await dbQuery.get<{ present: number; absent: number }>(
      `SELECT 
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
       FROM attendance`
    );

    const presentCount = overallStats?.present || 0;
    const absentCount = overallStats?.absent || 0;
    const totalRecordCount = presentCount + absentCount;
    const overallPercentage = totalRecordCount ? Math.round((presentCount / totalRecordCount) * 100) : 100;

    // Last 10 days of attendance for bar chart
    const dailyTrend = await dbQuery.all(`
      SELECT 
        date,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
      FROM attendance
      GROUP BY date
      ORDER BY date ASC
      LIMIT 10
    `);

    res.json({
      totalStudents,
      totalDays,
      overall: {
        present: presentCount,
        absent: absentCount,
        percentage: overallPercentage
      },
      dailyTrend
    });
  } catch (err) {
    console.error('Fetch analytics overview error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
