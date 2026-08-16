import React, { useState, useEffect } from 'react';
import { Student, DisplayTab, TimeFilter, GradeCategoryFilter } from '../types';
import { getLeaderboardData } from '../lib/scoring';
import { Header } from '../components/Header';
import { EventSelector } from '../components/EventSelector';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';
import { RightRail } from '../components/RightRail';
import { AdminBatchEntry } from '../components/AdminBatchEntry';
import { BroadcastTVMode } from '../components/BroadcastTVMode';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CertificateModal } from '../components/CertificateModal';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useEvents, useRecords } from '../hooks/useGymData';

export default function AdminAppPage() {
  const { gym, gymLoading, gymError, refreshGym, signOut } = useAuth();
  const gymName = gym?.name || '내 체육관';

  useEffect(() => {
    document.title = `${gymName} 관리자 | 줄넘기 실시간 랭킹보드`;
  }, [gymName]);

  const { students, isLoading: studentsLoading, addStudent, deleteStudent } = useStudents();
  const {
    events,
    isLoading: eventsLoading,
    addCustomEvent,
    deleteCustomEvent,
    resetDefaultEvents,
  } = useEvents();
  const { records, isLoading: recordsLoading, batchSaveRecords, deleteRecord } = useRecords();

  const [activeView, setActiveView] = useState<'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE'>('LEADERBOARD');
  const [activeTab, setActiveTab] = useState<DisplayTab>('30s_alternate');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);

  if (!gym && gymError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8] p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
          <h2 className="text-lg font-black text-slate-900 mb-2">체육관 정보를 불러오지 못했어요</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{gymError}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => refreshGym()}
              className="w-full py-3 rounded-2xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white font-bold text-sm shadow-sm"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gym || gymLoading || studentsLoading || eventsLoading || recordsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
        <span className="w-8 h-8 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const leaderboardItems = getLeaderboardData(students, records, activeTab, gradeFilter, searchQuery, events);
  const topThree = leaderboardItems.slice(0, 3);

  const handleDeleteStudent = async (studentId: string) => {
    await deleteStudent(studentId);
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f4f5f8] text-slate-900 font-sans antialiased selection:bg-[#1B5E20] selection:text-white">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        gymName={gymName}
        studentCount={students.length}
        totalRecordCount={records.length}
      />

      <main className="flex-1 min-w-0 p-4 lg:p-8">
        {activeView === 'TV_MODE' && (
          <BroadcastTVMode
            gymName={gymName}
            students={students}
            records={records}
            events={events}
            onClose={() => setActiveView('LEADERBOARD')}
          />
        )}

        {activeView === 'ADMIN_BATCH' && (
          <AdminBatchEntry
            gym={gym}
            students={students}
            records={records}
            events={events}
            onBatchSaveRecords={batchSaveRecords}
            onAddStudent={addStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddCustomEvent={addCustomEvent}
            onDeleteCustomEvent={deleteCustomEvent}
            onResetDefaultEvents={resetDefaultEvents}
            onClose={() => setActiveView('LEADERBOARD')}
          />
        )}

        {activeView === 'LEADERBOARD' && (
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-4">랭킹보드</h1>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0 w-full">
                <EventSelector
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  timeFilter={timeFilter}
                  setTimeFilter={setTimeFilter}
                  events={events}
                />

                <Podium
                  topThree={topThree}
                  activeTab={activeTab}
                  onSelectStudent={(studentId) => {
                    const s = students.find((st) => st.id === studentId);
                    if (s) setSelectedStudent(s);
                  }}
                />

                <Leaderboard
                  items={leaderboardItems}
                  events={events}
                  activeTab={activeTab}
                  gradeFilter={gradeFilter}
                  setGradeFilter={setGradeFilter}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSelectStudent={(studentId) => {
                    const s = students.find((st) => st.id === studentId);
                    if (s) setSelectedStudent(s);
                  }}
                  onOpenBatchEntry={() => setActiveView('ADMIN_BATCH')}
                />
              </div>

              <RightRail students={students} records={records} />
            </div>
          </div>
        )}
      </main>

      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          records={records}
          events={events}
          isAdmin
          onDeleteStudent={handleDeleteStudent}
          onDeleteRecord={deleteRecord}
          onOpenCertificate={(st) => {
            setSelectedStudent(null);
            setCertificateStudent(st);
          }}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {certificateStudent && (
        <CertificateModal
          gymName={gymName}
          student={certificateStudent}
          records={records}
          events={events}
          onClose={() => setCertificateStudent(null)}
        />
      )}
    </div>
  );
}
