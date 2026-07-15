import { Router, Request, Response } from 'express';
import { dbQuery } from '../db';

const router = Router();

// Get all students (supports search and sorting)
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string; // 'name', 'roll_no', 'reg_no'
    const order = req.query.order as string || 'ASC'; // 'ASC' or 'DESC'

    let sql = 'SELECT * FROM students';
    const params: any[] = [];

    if (search) {
      sql += ' WHERE name LIKE ? OR reg_no LIKE ? OR roll_no LIKE ? OR department LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (sortBy && ['name', 'roll_no', 'reg_no', 'department'].includes(sortBy)) {
      sql += ` ORDER BY ${sortBy} ${order === 'DESC' ? 'DESC' : 'ASC'}`;
    } else {
      sql += ' ORDER BY roll_no ASC';
    }

    const students = await dbQuery.all(sql, params);
    res.json(students);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Add a student
router.post('/', async (req: Request, res: Response) => {
  try {
    const { reg_no, name, department, section, roll_no } = req.body;

    if (!reg_no || !name || !department || !section || !roll_no) {
      return res.status(400).json({ message: 'All student fields are required.' });
    }

    // Check if reg_no exists
    const existing = await dbQuery.get('SELECT id FROM students WHERE reg_no = ?', [reg_no]);
    if (existing) {
      return res.status(400).json({ message: 'A student with this registration number already exists.' });
    }

    const result = await dbQuery.run(
      'INSERT INTO students (reg_no, name, department, section, roll_no) VALUES (?, ?, ?, ?, ?)',
      [reg_no, name, department, section, roll_no]
    );

    res.status(201).json({
      id: result.lastID,
      reg_no,
      name,
      department,
      section,
      roll_no
    });
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Bulk import students (expects array of students)
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { students } = req.body; // Array of { reg_no, name, department, section, roll_no }

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ message: 'Invalid bulk data format.' });
    }

    let inserted = 0;
    let skipped = 0;

    for (const student of students) {
      const { reg_no, name, department, section, roll_no } = student;
      if (!reg_no || !name || !department || !section || !roll_no) {
        skipped++;
        continue;
      }

      try {
        const existing = await dbQuery.get('SELECT id FROM students WHERE reg_no = ?', [reg_no]);
        if (existing) {
          skipped++;
          continue;
        }

        await dbQuery.run(
          'INSERT INTO students (reg_no, name, department, section, roll_no) VALUES (?, ?, ?, ?, ?)',
          [reg_no, name, department, section, roll_no]
        );
        inserted++;
      } catch (e) {
        skipped++;
      }
    }

    res.json({
      message: `Bulk import completed. Imported: ${inserted}, Skipped: ${skipped}`,
      inserted,
      skipped
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Update student
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reg_no, name, department, section, roll_no } = req.body;

    if (!reg_no || !name || !department || !section || !roll_no) {
      return res.status(400).json({ message: 'All student fields are required.' });
    }

    // Check if updating to a duplicate reg_no
    const existing = await dbQuery.get<{ id: number }>('SELECT id FROM students WHERE reg_no = ? AND id != ?', [
      reg_no,
      id
    ]);
    if (existing) {
      return res.status(400).json({ message: 'A student with this registration number already exists.' });
    }

    const result = await dbQuery.run(
      'UPDATE students SET reg_no = ?, name = ?, department = ?, section = ?, roll_no = ? WHERE id = ?',
      [reg_no, name, department, section, roll_no, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    res.json({ id: Number(id), reg_no, name, department, section, roll_no });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Delete student
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dbQuery.run('DELETE FROM students WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
