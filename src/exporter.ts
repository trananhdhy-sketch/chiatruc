import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import type { AssignedShift } from './scheduler';

export async function exportToExcel(
  shifts: AssignedShift[],
  departmentName: string,
  fileName: string = 'Lich_Truc.xlsx'
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Lịch Trực');

  // Title Row (optional padding or merged)
  // Let's add 3 empty rows at the top to give space like the screenshot if needed, 
  // but wait, the screenshot shows data starting at row 5. So title can be at row 1-3.
  worksheet.mergeCells('A1:D3');
  const titleCell = worksheet.getCell('A1');
  
  const dep = departmentName.toLowerCase().startsWith('khoa') ? departmentName : `Khoa ${departmentName}`;
  titleCell.value = `LỊCH TRỰC ${dep.toUpperCase()}`;
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Note: the screenshot shows headers aren't clearly marked, it just starts with data. 
  // But let's put headers at row 4
  worksheet.getRow(4).values = ['Ngày', 'Thứ', 'Họ và tên', 'Ghi chú'];
  const headerRow = worksheet.getRow(4);
  headerRow.font = { name: 'Arial', size: 11, bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // Data Rows
  let currentRowIndex = 5;
  shifts.forEach((shift) => {
    const row = worksheet.getRow(currentRowIndex);
    const dateStr = format(shift.date, 'dd/MM/yyyy');
    
    // Format day string
    let dayStr = '';
    const dayOfWeek = shift.date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const days = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
      dayStr = days[dayOfWeek];
    } else if (dayOfWeek === 6) {
      dayStr = shift.type === 'Ngày' ? 'Ngày thứ Bảy' : 'Tối thứ Bảy';
    } else if (dayOfWeek === 0) {
      dayStr = shift.type === 'Ngày' ? 'Ngày chủ nhật' : 'Tối chủ nhật';
    }

    row.values = [
      dateStr,
      dayStr,
      shift.member ? shift.member.name : '(Trống)',
      '' // Ghi chú
    ];

    // Alignments
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' }; // Date often right aligned or center
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };

    // Set height
    row.height = 20;

    // Apply styles and borders
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
      };
      
      // Background colors & Font Bolding
      if (dayOfWeek === 6) {
        // Saturday: Brighter Light Yellow
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5BA' } };
        if (colNumber === 1 || colNumber === 2) {
           cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
        }
      } else if (dayOfWeek === 0) {
        // Sunday: Brighter Light Pink/Orange
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE0D0' } };
        if (colNumber === 1 || colNumber === 2) {
           cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
        }
      } else {
        // Mon-Fri: Light blue/gray
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F9FC' } };
      }

      // Name column text color (col 3)
      if (colNumber === 3) {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF102A5C' }, bold: true };
      } else if (dayOfWeek !== 6 && dayOfWeek !== 0 || (colNumber !== 1 && colNumber !== 2)) {
        // Ensure other cells are normal font (unless already set to bold by weekend condition)
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
      }
    });

    currentRowIndex++;
  });

  // Adjust column widths
  worksheet.getColumn(1).width = 12;
  worksheet.getColumn(2).width = 18;
  worksheet.getColumn(3).width = 25;
  worksheet.getColumn(4).width = 15;

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}
