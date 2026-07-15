import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { dbQuery } from '../db';

const router = Router();

// Export Excel report for a specific date
router.get('/excel', async (req: Request, res: Response) => {
  try {
    const timestamp = req.query.timestamp as string;
    const date = req.query.date as string;

    if (!timestamp && !date) {
      return res.status(400).json({ message: 'Either date or timestamp parameter is required.' });
    }

    // Fetch records based on timestamp or date
    let sql: string;
    let params: any[];

    if (timestamp) {
      sql = `
        SELECT 
          s.reg_no,
          s.name,
          s.department,
          s.section,
          s.roll_no,
          a.subject,
          COALESCE(a.status, 'Present') as status
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.created_at = ?
        ORDER BY s.roll_no ASC
      `;
      params = [timestamp];
    } else {
      sql = `
        SELECT 
          s.reg_no,
          s.name,
          s.department,
          s.section,
          s.roll_no,
          a.subject,
          COALESCE(a.status, 'Present') as status
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
        ORDER BY s.roll_no ASC
      `;
      params = [date];
    }

    const records = await dbQuery.all<{
      reg_no: string;
      name: string;
      department: string;
      section: string;
      roll_no: string;
      subject: string | null;
      status: string;
    }>(sql, params);

    if (records.length === 0) {
      return res.status(404).json({ message: 'No students found to generate report.' });
    }

    const presentCount = records.filter((r) => r.status === 'Present').length;
    const absentCount = records.filter((r) => r.status === 'Absent').length;
    const totalCount = records.length;
    const rate = Math.round((presentCount / totalCount) * 100);

    // Format date for title (e.g. 2026-07-15 -> 15 July 2026)
    const dateStr = timestamp ? timestamp.slice(0, 10) : date;
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Enable grid lines explicitly
    worksheet.views = [{ showGridLines: true }];

    // Column setups
    worksheet.columns = [
      { header: 'Roll No', key: 'roll_no', width: 12 },
      { header: 'Reg No', key: 'reg_no', width: 15 },
      { header: 'Student Name', key: 'name', width: 30 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Style Title Row (Row 2)
    worksheet.mergeCells('A2:F2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'CLASS ATTENDANCE REPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Dark Blue
    };
    worksheet.getRow(2).height = 40;

    // Style Subject Row (Row 3)
    const rawSubject = records.find((r) => r.subject)?.subject;
    const formattedSubject = rawSubject
      ? rawSubject.trim().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
      : 'General';

    worksheet.mergeCells('A3:F3');
    const subjectCell = worksheet.getCell('A3');
    subjectCell.value = `Subject: ${formattedSubject}`;
    subjectCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    subjectCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subjectCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' } // Lighter Blue
    };
    worksheet.getRow(3).height = 25;

    // Subheader/Summary Row (Row 4)
    worksheet.mergeCells('A4:F4');
    const subtitleCell = worksheet.getCell('A4');
    subtitleCell.value = `Date: ${formattedDate}  |  Total: ${totalCount}  |  Present: ${presentCount}  |  Absent: ${absentCount}  |  Rate: ${rate}%`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' } // Slate-600
    };
    worksheet.getRow(4).height = 25;

    // Empty separator row
    worksheet.getRow(5).height = 15;

    // Set header row index (Row 6)
    const headerRow = worksheet.getRow(6);
    headerRow.values = ['Roll No', 'Reg No', 'Student Name', 'Department', 'Section', 'Status'];
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate-800
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 25;

    // Data rows start at Row 7
    let currentRowIdx = 7;
    for (const record of records) {
      const row = worksheet.getRow(currentRowIdx);
      row.values = [
        record.roll_no,
        record.reg_no,
        record.name,
        record.department,
        record.section,
        record.status
      ];
      row.height = 20;

      // Formatting for data cells
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alignments
        if (colNumber === 1 || colNumber === 2 || colNumber === 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          // Color code Status column
          if (cell.value === 'Present') {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF15803D' } }; // Dark Green
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFDCFCE7' } // Light Green
            };
          } else {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB91C1C' } }; // Dark Red
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' } // Light Red
            };
          }
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      currentRowIdx++;
    }

    // Add totals summary footer
    const footerRowIdx = currentRowIdx + 1;
    worksheet.mergeCells(`A${footerRowIdx}:C${footerRowIdx}`);
    const summaryLabelCell = worksheet.getCell(`A${footerRowIdx}`);
    summaryLabelCell.value = 'Summary Totals';
    summaryLabelCell.font = { name: 'Arial', size: 11, bold: true };
    summaryLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.getCell(`D${footerRowIdx}`).value = `Present: ${presentCount}`;
    worksheet.getCell(`D${footerRowIdx}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF15803D' } };

    worksheet.getCell(`E${footerRowIdx}`).value = `Absent: ${absentCount}`;
    worksheet.getCell(`E${footerRowIdx}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFB91C1C' } };

    worksheet.getCell(`F${footerRowIdx}`).value = `Rate: ${rate}%`;
    worksheet.getCell(`F${footerRowIdx}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

    const footerRow = worksheet.getRow(footerRowIdx);
    footerRow.height = 25;
    footerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'double' },
        bottom: { style: 'thin' }
      };
    });

    // Write to response
    const filename = `Attendance_${date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
