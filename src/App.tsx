import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  Calendar, 
  Users, 
  Settings,
  Plus,
  Trash2,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

import type { Member, ScheduleResult } from './scheduler';
import { generateSchedule } from './scheduler';
import { exportToExcel } from './exporter';
import './index.css';

function App() {
  const [departmentName, setDepartmentName] = useState('C1');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 14));
  const [minRestShifts, setMinRestShifts] = useState<number | ''>(3);
  
  const [members, setMembers] = useState<Member[]>([]);
  
  const [newMemberName, setNewMemberName] = useState('');
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    
    // Tách chuỗi theo dấu phẩy, loại bỏ khoảng trắng thừa và lọc các tên rỗng
    const names = newMemberName.split(',').map(n => n.trim()).filter(n => n.length > 0);
    
    if (names.length === 0) return;

    const newMembersList = names.map(name => ({
      id: Math.random().toString(36).substr(2, 9), 
      name: name
    }));

    setMembers([...members, ...newMembersList]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };



  const handleGenerate = () => {
    if (members.length === 0) {
      alert("Vui lòng thêm ít nhất một người trực!");
      return;
    }

    const minRest = typeof minRestShifts === 'number' ? minRestShifts : 0;
    const result = generateSchedule(startDate, endDate, members, minRest);
    setScheduleResult(result);
  };

  const handleExport = () => {
    if (scheduleResult && scheduleResult.shifts.length > 0) {
      exportToExcel(
        scheduleResult.shifts, 
        departmentName, 
        `lich_truc_khoa_${departmentName.toLowerCase().replace(/\s+/g, '_')}.xlsx`
      );
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Ứng dụng Phân Lịch Trực</h1>
        <p>Tự động hóa lịch trực công bằng, thông minh và xuất file Excel cực đẹp.</p>
      </header>

      <div className="grid-2">
        {/* Cấu hình chung */}
        <div className="card">
          <h2 className="card-title">
            <Settings size={20} className="text-primary" />
            Cấu hình chung
          </h2>
          
          <div className="form-group">
            <label>Tên khoa/phòng (Tiêu đề lịch)</label>
            <input 
              type="text" 
              className="form-control" 
              value={departmentName}
              onChange={e => setDepartmentName(e.target.value)}
              placeholder="VD: C1"
            />
          </div>

          <div className="flex-row">
            <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label>Ngày bắt đầu</label>
                <DatePicker 
                  selected={startDate} 
                  onChange={(date: Date | null) => date && setStartDate(date)} 
                  dateFormat="dd/MM/yyyy"
                  className="form-control"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Ngày kết thúc</label>
                <DatePicker 
                  selected={endDate} 
                  onChange={(date: Date | null) => date && setEndDate(date)} 
                  dateFormat="dd/MM/yyyy"
                  minDate={startDate}
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Khoảng cách nghỉ tối thiểu (số ca)</label>
            <input 
              type="number" 
              className="form-control" 
              min={0}
              value={minRestShifts === '' ? '' : minRestShifts}
              onChange={e => setMinRestShifts(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
            />
            <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
              VD: Đặt 3 nghĩa là sau khi trực, người đó phải nghỉ ít nhất 3 ca mới đến ca tiếp theo.
            </small>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} /> Nguyên tắc xếp lịch tự động
            </h4>
            <ul style={{ margin: '0', paddingLeft: '1.25rem', color: 'var(--text-color)', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li><strong>Đảm bảo sức khoẻ:</strong> Tuyệt đối tuân thủ "Khoảng cách nghỉ tối thiểu" giữa 2 ca trực. Nếu bế tắc (do quá ít người), máy tính sẽ tự động nới lỏng dần khoảng cách này xuống thay vì xếp bừa.</li>
              <li><strong>Quét 3 vòng:</strong> Máy tính sẽ ưu tiên xếp hết Ca Cực, rồi đến Ca Ngày T7/CN, cuối cùng mới xếp Ca Thường.</li>
              <li><strong>Hệ số tính điểm:</strong> 
                <br/>• 1 Ca cực (Tối T6, T7, CN) = <strong>1.2 điểm</strong>
                <br/>• 1 Ca ngày T7/CN = <strong>1.1 điểm</strong>
                <br/>• 1 Ca thường = <strong>1.0 điểm</strong>
              </li>
              <li><strong>Bù trừ công bằng:</strong> Khi xếp ca, người có <strong>Điểm vất vả thấp nhất</strong> sẽ bị gọi đi trực. Nhờ đó, người phải trực nhiều Ca Cực sẽ nhanh chóng "đầy điểm" và được tự động <strong>giảm bớt số buổi trực thường</strong> so với người khác.</li>
              <li><strong>Đa dạng ngày trực:</strong> Nếu 2 người có số điểm bằng nhau, máy tính sẽ ưu tiên người chưa từng (hoặc ít) trực vào "thứ" đó (VD: Thứ 2) để luân phiên ngày trực cho mọi người.</li>
            </ul>
          </div>
        </div>

        {/* Quản lý nhân sự */}
        <div className="card">
          <h2 className="card-title">
            <Users size={20} className="text-primary" />
            Danh sách người trực ({members.length})
          </h2>
          
          <form onSubmit={handleAddMember} className="flex-row" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="VD: Anh CK30, Hoa CH33,..."
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn">
              <Plus size={18} /> Thêm
            </button>
          </form>

          <div className="member-list">
            {members.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có ai trong danh sách.</p>
            ) : (
              members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-info">
                    <span className="member-name">{member.name}</span>

                  </div>
                  <button 
                    className="btn-icon btn-danger" 
                    onClick={() => handleRemoveMember(member.id)}
                    title="Xóa người này"
                  >
                    <Trash2 size={16} color="#fff" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '2rem 0' }}>
        <button 
          className="btn" 
          style={{ fontSize: '1.25rem', padding: '1rem 3rem', borderRadius: '50px' }}
          onClick={handleGenerate}
        >
          <CalendarDays size={24} />
          Tạo Lịch Trực Ngay
        </button>
      </div>

      {/* Kết quả */}
      {scheduleResult && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 className="card-title" style={{ justifyContent: 'space-between', border: 'none', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} className="text-primary" />
              Kết quả xem trước
            </div>
            {scheduleResult.success && (
              <button className="btn" onClick={handleExport}>
                <FileSpreadsheet size={18} />
                Tải file Excel
              </button>
            )}
          </h2>
          
          <p style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            borderRadius: '8px',
            backgroundColor: scheduleResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: scheduleResult.success ? '#059669' : '#dc2626',
            fontWeight: 500
          }}>
            {scheduleResult.message}
          </p>

          {scheduleResult.stats && scheduleResult.success && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>📊 Thống kê phân bổ ca trực:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {[...members].sort((a, b) => {
                  const sA = scheduleResult.stats![a.id];
                  const sB = scheduleResult.stats![b.id];
                  if (!sA || !sB) return 0;
                  const totalA = sA.hard + sA.weekendDay + sA.normal;
                  const totalB = sB.hard + sB.weekendDay + sB.normal;
                  if (totalA !== totalB) return totalB - totalA;
                  const ptsA = sA.hard * 1.2 + sA.weekendDay * 1.1 + sA.normal;
                  const ptsB = sB.hard * 1.2 + sB.weekendDay * 1.1 + sB.normal;
                  return ptsB - ptsA;
                }).map(m => {
                  const s = scheduleResult.stats![m.id];
                  if (!s) return null;
                  return (
                    <div key={m.id} style={{ padding: '0.5rem 1rem', background: 'var(--surface-color)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <strong>{m.name}</strong>
                        <span style={{ fontWeight: 'bold', backgroundColor: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                          Tổng ca: {s.hard + s.weekendDay + s.normal}
                        </span>
                        <span style={{ fontWeight: 'bold', backgroundColor: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '0.25rem' }} title="Hệ số: Ca cực x1.2, T7/CN x1.1, Ca thường x1">
                          Điểm: {(s.hard * 1.2 + s.weekendDay * 1.1 + s.normal).toFixed(1)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--danger-color)', marginTop: '0.5rem' }}>Ca cực (tối T6, T7, CN): {s.hard}</div>
                      <div style={{ color: 'var(--primary-color)' }}>Ngày T7, CN: {s.weekendDay}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>Ca thường: {s.normal}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {scheduleResult.shifts.length > 0 && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Thứ</th>
                    <th>Họ và tên</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleResult.shifts.map((shift, idx) => {
                    let dayStr = format(shift.date, 'EEEE', { locale: vi });
                    dayStr = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
                    if (shift.isWeekend) dayStr += ` (${shift.type})`;

                    return (
                      <tr key={idx} className={shift.isWeekend ? 'weekend-row' : ''}>
                        <td>{format(shift.date, 'dd/MM/yyyy')}</td>
                        <td>{dayStr}</td>
                        <td style={{ fontWeight: 600 }}>
                          {shift.member ? shift.member.name : <span style={{ color: 'var(--danger-color)' }}>Chưa có người trực</span>}
                        </td>
                        <td></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
