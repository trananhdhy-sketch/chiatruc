import { eachDayOfInterval, getDay } from 'date-fns';

export interface Member {
  id: string;
  name: string;
}

export type ShiftType = 'Cả ngày' | 'Ngày' | 'Đêm';

export type ShiftCategory = 'hard' | 'weekendDay' | 'normal';

export interface ShiftInfo {
  date: Date;
  type: ShiftType;
  isWeekend: boolean;
  category: ShiftCategory;
}

export interface AssignedShift extends ShiftInfo {
  member: Member | null;
}

export interface ScheduleResult {
  shifts: AssignedShift[];
  success: boolean;
  message?: string;
  stats?: Record<string, { hard: number; weekendDay: number; normal: number }>;
}

// Hàm xáo trộn mảng (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function generateSchedule(
  startDate: Date,
  endDate: Date,
  members: Member[],
  minRestShifts: number
): ScheduleResult {
  if (members.length === 0) {
    return { shifts: [], success: false, message: 'Danh sách người trực trống.' };
  }

  // 1. Generate all shifts
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const shifts: ShiftInfo[] = [];

  days.forEach((day) => {
    const dayOfWeek = getDay(day);
    
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      shifts.push({ date: day, type: 'Ngày', isWeekend: true, category: 'weekendDay' });
      shifts.push({ date: day, type: 'Đêm', isWeekend: true, category: 'hard' });
    } else if (dayOfWeek === 5) {
      shifts.push({ date: day, type: 'Cả ngày', isWeekend: false, category: 'hard' });
    } else {
      shifts.push({ date: day, type: 'Cả ngày', isWeekend: false, category: 'normal' });
    }
  });

  const assignedShifts: AssignedShift[] = new Array(shifts.length);
  
  // Track states for each member
  const counts = new Map<string, { hard: number; weekendDay: number; normal: number }>();
  const assignedIndices = new Map<string, number[]>();
  const slotCounts = new Map<string, Record<string, number>>();

  members.forEach((m) => {
    counts.set(m.id, { hard: 0, weekendDay: 0, normal: 0 });
    assignedIndices.set(m.id, []);
    slotCounts.set(m.id, {});
  });

  const getPoints = (stats: { hard: number; weekendDay: number; normal: number }) => {
    return stats.hard * 1.5 + stats.weekendDay * 1.2 + stats.normal * 1.0;
  };

  const getAvailableMembers = (targetIndex: number, restThreshold: number) => {
    return members.filter((m) => {
      const indices = assignedIndices.get(m.id)!;
      // Khoảng cách giữa 2 ca bất kỳ phải > restThreshold
      return !indices.some(j => Math.abs(targetIndex - j) <= restThreshold);
    });
  };

  const assignShiftsForCategory = (categoryIndices: number[]) => {
    for (const i of categoryIndices) {
      const shift = shifts[i];
      const dayOfWeek = getDay(shift.date);
      const slotId = `${dayOfWeek}-${shift.type}`;

      let availableMembers = getAvailableMembers(i, minRestShifts);

      if (availableMembers.length === 0) {
        // Nới lỏng dần luật khoảng cách
        for (let r = minRestShifts - 1; r >= 0; r--) {
          availableMembers = getAvailableMembers(i, r);
          if (availableMembers.length > 0) break;
        }
      }

      if (availableMembers.length === 0) {
        assignedShifts[i] = { ...shift, member: null };
        continue;
      }

      availableMembers = shuffleArray(availableMembers);
      
      availableMembers.sort((a, b) => {
        const statsA = counts.get(a.id)!;
        const statsB = counts.get(b.id)!;
        
        const pointsA = getPoints(statsA);
        const pointsB = getPoints(statsB);
        
        // 1. Ưu tiên người có Điểm Vất Vả thấp hơn
        if (Math.abs(pointsA - pointsB) > 0.01) {
          return pointsA - pointsB;
        }
        
        // 2. Nếu điểm bằng nhau, ưu tiên người TRỰC BUỔI NÀY ÍT NHẤT
        const slotCountA = slotCounts.get(a.id)![slotId] || 0;
        const slotCountB = slotCounts.get(b.id)![slotId] || 0;
        return slotCountA - slotCountB;
      });

      const selectedMember = availableMembers[0];
      assignedShifts[i] = { ...shift, member: selectedMember };
      
      // Update stats
      counts.get(selectedMember.id)![shift.category]++;
      assignedIndices.get(selectedMember.id)!.push(i);
      const sCounts = slotCounts.get(selectedMember.id)!;
      sCounts[slotId] = (sCounts[slotId] || 0) + 1;
    }
  };

  // QUÉT 3 VÒNG (MULTI-PASS)
  
  // Vòng 1: Ca Cực
  const hardIndices = shifts.map((s, i) => s.category === 'hard' ? i : -1).filter(i => i !== -1);
  assignShiftsForCategory(hardIndices);

  // Vòng 2: Ca Ngày Cuối Tuần
  const weekendDayIndices = shifts.map((s, i) => s.category === 'weekendDay' ? i : -1).filter(i => i !== -1);
  assignShiftsForCategory(weekendDayIndices);

  // Vòng 3: Ca Thường
  const normalIndices = shifts.map((s, i) => s.category === 'normal' ? i : -1).filter(i => i !== -1);
  assignShiftsForCategory(normalIndices);


  const hasUnassigned = assignedShifts.some((s) => s.member === null);
  
  const finalStats: Record<string, { hard: number; weekendDay: number; normal: number }> = {};
  counts.forEach((val, key) => {
    finalStats[key] = val;
  });
  
  return {
    shifts: assignedShifts,
    success: !hasUnassigned,
    message: hasUnassigned 
      ? 'Có một số ca không thể xếp do thiếu người. Hãy giảm Khoảng cách nghỉ.' 
      : 'Tạo lịch thành công! Số lượng các ca (Cực, Cuối tuần, Thường) đã được đền bù cực kỳ công bằng dựa trên Điểm Vất Vả.',
    stats: finalStats
  };
}
