import React, { useState, useEffect } from 'react';
import { Student, JumpRecord, DisplayTab, TimeFilter, GradeCategoryFilter, EventKey, EventMeta } from './types';
import {
  getLocalStudents,
  saveLocalStudents,
  getLocalRecords,
  saveLocalRecords,
  getLocalEvents,
  addCustomEvent,
  deleteCustomEvent,
  resetDefaultEvents,
  getLeaderboardData,
  batchSaveRecords,
  resetToDefaultData,
} from './lib/storage';
import { Header } from './components/Header';
import { EventSelector } from './components/EventSelector';
import { Podium } from './components/Podium';
import { Leaderboard } from './components/Leaderboard';
import { AdminBatchEntry } from './components/AdminBatchEntry';
import { BroadcastTVMode } from './components/BroadcastTVMode';
import { SpeedTimer } from './components/SpeedTimer';
import { StudentProfileModal } from './components/StudentProfileModal';
import { CertificateModal } from './components/CertificateModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminPasswordChangeModal } from './components/AdminPasswordChangeModal';

export default function App() {
  const [students, setStudents] = useState<Student[]>(() => getLocalStudents());
  const [records, setRecords] = useState<JumpRecord[]>(() => getLocalRecords());
  const [events, setEvents] = useState<Record<string, EventMeta>>(() => getLocalEvents());

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER'>('LEADERBOARD');
  const [activeTab, setActiveTab] = useState<DisplayTab>('30s_alternate');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);

  // Sync state changes with persistence
  useEffect(() => {
    saveLocalStudents(students);
  }, [students]);

  useEffect(() => {
    saveLocalRecords(records);
  }, [records]);

  // Dynamic Custom Event Handlers
  const handleAddCustomEvent = (eventMeta: EventMeta) => {
    const updated = addCustomEvent(eventMeta);
    setEvents(updated);
  };

  const handleDeleteCustomEvent = (eventKey: string) => {
    const updated = deleteCustomEvent(eventKey);
    setEvents(updated);
    if (activeTab === eventKey) {
      const firstRemainingKey = Object.keys(updated)[0] || '30s_alternate';
      setActiveTab(firstRemainingKey);
    }
  };

  const handleResetDefaultEvents = () => {
    const updated = resetDefaultEvents();
    setEvents(updated);
    setActiveTab('30s_alternate');
  };

  // Compute Leaderboard Ranking
  const leaderboardItems = getLeaderboardData(
    students,
    records,
    activeTab,
    gradeFilter,
    searchQuery,
    events
  );

  const topThree = leaderboardItems.slice(0, 3);

  // Handlers
  const handleBatchSaveRecords = (
    entries: Array<{ studentId: string; studentName: string; eventKey: EventKey; count: number; date: string }>
  ) => {
    const updated = batchSaveRecords(records, entries);
    setRecords(updated);
  };

  const handleAddSingleRecord = (entry: {
    studentId: string;
    studentName: string;
    eventKey: EventKey;
    count: number;
    date: string;
  }) => {
    handleBatchSaveRecords([entry]);
  };

  const handleAddStudent = (newStudentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `s-${Date.now()}`,
    };
    setStudents((prev) => [...prev, newStudent]);
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setRecords((prev) => prev.filter((r) => r.studentId !== studentId));
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  };

  const handleResetData = () => {
    const { students: defStudents, records: defRecords } = resetToDefaultData();
    setStudents(defStudents);
    setRecords(defRecords);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeView={activeView}
        setActiveView={(view) => {
          if (view === 'ADMIN_BATCH' && !isAdmin) {
            setShowAdminAuthModal(true);
          } else {
            setActiveView(view);
          }
        }}
        studentCount={students.length}
        totalRecordCount={records.length}
        isAdmin={isAdmin}
        onAdminLoginReq={() => setShowAdminAuthModal(true)}
        onAdminLogout={() => {
          setIsAdmin(false);
          if (activeView === 'ADMIN_BATCH') {
            setActiveView('LEADERBOARD');
          }
        }}
        onOpenPasswordChange={() => setShowPasswordChangeModal(true)}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Fullscreen Broadcast TV Mode */}
        {activeView === 'TV_MODE' && (
          <BroadcastTVMode
            students={students}
            records={records}
            events={events}
            onClose={() => setActiveView('LEADERBOARD')}
          />
        )}

        {/* Speed Timer Tool View */}
        {activeView === 'TIMER' && (
          <SpeedTimer
            students={students}
            events={events}
            onSaveRecord={handleAddSingleRecord}
            onClose={() => setActiveView('LEADERBOARD')}
          />
        )}

        {/* Admin Batch Entry Dashboard View */}
        {activeView === 'ADMIN_BATCH' && (
          isAdmin ? (
            <AdminBatchEntry
              students={students}
              records={records}
              events={events}
              onBatchSaveRecords={handleBatchSaveRecords}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
              onAddCustomEvent={handleAddCustomEvent}
              onDeleteCustomEvent={handleDeleteCustomEvent}
              onResetDefaultEvents={handleResetDefaultEvents}
              onClose={() => setActiveView('LEADERBOARD')}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto text-center shadow-lg my-12">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">관장님 전용 관리자 메뉴</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                일괄등록 및 수련생/종목 관리는 학부모님 및 일반 수련생이 변경할 수 없도록 관장님 인증으로 보호되어 있습니다.
              </p>
              <button
                type="button"
                onClick={() => setShowAdminAuthModal(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                관장님 비밀번호 입력 및 인증
              </button>
            </div>
          )
        )}

        {/* Primary Leaderboard Board View */}
        {activeView === 'LEADERBOARD' && (
          <div>
            {/* Event Category Tabs */}
            <EventSelector
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              events={events}
            />

            {/* Top 3 Podium Highlights */}
            <Podium
              topThree={topThree}
              activeTab={activeTab}
              onSelectStudent={(studentId) => {
                const s = students.find((st) => st.id === studentId);
                if (s) setSelectedStudent(s);
              }}
            />

            {/* Full Filterable Leaderboard Table */}
            <Leaderboard
              items={leaderboardItems}
              activeTab={activeTab}
              gradeFilter={gradeFilter}
              setGradeFilter={setGradeFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectStudent={(studentId) => {
                const s = students.find((st) => st.id === studentId);
                if (s) setSelectedStudent(s);
              }}
              onOpenBatchEntry={() => {
                if (isAdmin) {
                  setActiveView('ADMIN_BATCH');
                } else {
                  setShowAdminAuthModal(true);
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          records={records}
          events={events}
          isAdmin={isAdmin}
          onRequestAdminAuth={() => setShowAdminAuthModal(true)}
          onDeleteStudent={handleDeleteStudent}
          onDeleteRecord={handleDeleteRecord}
          onOpenCertificate={(st) => {
            setSelectedStudent(null);
            setCertificateStudent(st);
          }}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {certificateStudent && (
        <CertificateModal
          student={certificateStudent}
          records={records}
          events={events}
          onClose={() => setCertificateStudent(null)}
        />
      )}

      {/* Admin Login Auth Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onSuccess={() => {
          setIsAdmin(true);
          setShowAdminAuthModal(false);
          setActiveView('ADMIN_BATCH');
        }}
        onClose={() => setShowAdminAuthModal(false)}
      />

      {/* Password Change Modal */}
      <AdminPasswordChangeModal
        isOpen={showPasswordChangeModal}
        onSuccess={() => {
          setShowPasswordChangeModal(false);
        }}
        onClose={() => setShowPasswordChangeModal(false)}
      />
    </div>
  );
}
