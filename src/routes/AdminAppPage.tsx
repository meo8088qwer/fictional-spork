import React, { useState } from 'react';
import { Student, JumpRecord, DisplayTab, TimeFilter, GradeCategoryFilter, EventKey, EventMeta } from '../types';
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
} from '../lib/storage';
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

// NOTE: this page is still localStorage-backed (via lib/storage.ts), same as
// the original single-gym app. It is only reachable while authenticated
// (see ProtectedRoute), so the old client-side admin-password gate is gone.
// The Supabase-backed, gym-scoped data layer replaces lib/storage.ts in the
// next milestone -- this step is deliberately scoped to auth + routing only.
export default function AdminAppPage() {
  const { gym } = useAuth();
  const gymName = gym?.name || '내 체육관';

  const [students, setStudents] = useState<Student[]>(() => getLocalStudents());
  const [records, setRecords] = useState<JumpRecord[]>(() => getLocalRecords());
  const [events, setEvents] = useState<Record<string, EventMeta>>(() => getLocalEvents());

  const [activeView, setActiveView] = useState<'LEADERBOARD' | 'ADMIN_BATCH' | 'TV_MODE' | 'TIMER'>('LEADERBOARD');
  const [activeTab, setActiveTab] = useState<DisplayTab>('30s_alternate');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);

  React.useEffect(() => {
    saveLocalStudents(students);
  }, [students]);

  React.useEffect(() => {
    saveLocalRecords(records);
  }, [records]);

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

  const leaderboardItems = getLeaderboardData(students, records, activeTab, gradeFilter, searchQuery, events);
  const topThree = leaderboardItems.slice(0, 3);

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
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        gymName={gymName}
        studentCount={students.length}
        totalRecordCount={records.length}
        onResetData={handleResetData}
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
