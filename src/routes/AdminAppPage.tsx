import React, { useState, useEffect } from 'react';
import { Student, DisplayTab, TimeFilter, GradeCategoryFilter, EventKey } from '../types';
import { getLeaderboardData } from '../lib/scoring';
import { Header } from '../components/Header';
import { EventSelector } from '../components/EventSelector';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';
import { AdminBatchEntry } from '../components/AdminBatchEntry';
import { BroadcastTVMode } from '../components/BroadcastTVMode';
import { SpeedTimer } from '../components/SpeedTimer';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CertificateModal } from '../components/CertificateModal';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useEvents, useRecords } from '../hooks/useGymData';

export default function AdminAppPage() {
  const { gym } = useAuth();
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

  const [activeView, setActiveView] = useState<'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER'>('LEADERBOARD');
  const [activeTab, setActiveTab] = useState<DisplayTab>('30s_alternate');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);

  if (!gym || studentsLoading || eventsLoading || recordsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
        <span className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const leaderboardItems = getLeaderboardData(students, records, activeTab, gradeFilter, searchQuery, events);
  const topThree = leaderboardItems.slice(0, 3);

  const handleAddSingleRecord = async (entry: {
    studentId: string;
    studentName: string;
    eventKey: EventKey;
    count: number;
    date: string;
  }) => {
    await batchSaveRecords([entry]);
  };

  const handleDeleteStudent = async (studentId: string) => {
    await deleteStudent(studentId);
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        gymName={gymName}
        studentCount={students.length}
        totalRecordCount={records.length}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {activeView === 'TV_MODE' && (
          <BroadcastTVMode
            gymName={gymName}
            students={students}
            records={records}
            events={events}
            onClose={() => setActiveView('LEADERBOARD')}
          />
        )}

        {activeView === 'TIMER' && (
          <SpeedTimer
            students={students}
            events={events}
            onSaveRecord={handleAddSingleRecord}
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
            <EventSelector
              gymName={gymName}
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
