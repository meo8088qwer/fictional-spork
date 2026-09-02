import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Student, DisplayTab, TimeFilter, GradeCategoryFilter } from '../types';
import { getLeaderboardData } from '../lib/scoring';
import { parseClassLabels } from '../lib/classLabels';
import { Header } from '../components/Header';
import { EventSelector } from '../components/EventSelector';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';
import { RightRail } from '../components/RightRail';
import { AdminBatchEntry } from '../components/AdminBatchEntry';
import { LiveCountEntry } from '../components/LiveCountEntry';
import { PricingPage } from '../components/PricingPage';
import { UserGuidePage } from '../components/UserGuidePage';
import { GlobalLeaderboard } from '../components/GlobalLeaderboard';
import { MyPage } from '../components/MyPage';
import { BroadcastTVMode } from '../components/BroadcastTVMode';
import { StudentProfileModal } from '../components/StudentProfileModal';
import { CertificateModal } from '../components/CertificateModal';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useEvents, useRecords } from '../hooks/useGymData';

export default function AdminAppPage() {
  const { gym, user, gymLoading, gymError, refreshGym, signOut, updateGymName, updateGymSlug, updatePassword } =
    useAuth();
  const gymName = gym?.name || '내 체육관';

  useEffect(() => {
    document.title = `${gymName} 관리자 | 줄넘기 실시간 랭킹보드`;
  }, [gymName]);

  const {
    students,
    isLoading: studentsLoading,
    addStudent,
    deleteStudent,
    updateStudentClass,
  } = useStudents();
  const {
    events,
    isLoading: eventsLoading,
    addCustomEvent,
    deleteCustomEvent,
    resetDefaultEvents,
  } = useEvents();
  const { records, isLoading: recordsLoading, batchSaveRecords, deleteRecord } = useRecords();

  type AdminView =
    | 'LEADERBOARD'
    | 'ADMIN_BATCH'
    | 'LIVE_COUNT'
    | 'EVENT_MANAGE'
    | 'STUDENT_MANAGE'
    | 'TV_MODE'
    | 'GLOBAL_RANKING'
    | 'PRICING'
    | 'GUIDE'
    | 'MYPAGE';

  // Tab switches go through the URL (?view=...) instead of plain useState so
  // each one pushes a browser history entry -- otherwise the browser back
  // button skips straight past the whole admin panel to whatever page was
  // open before (usually /login), since in-app tab changes never touched
  // history at all.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') as AdminView | null) ?? 'LEADERBOARD';
  const setActiveView = (view: AdminView) => {
    setSearchParams(view === 'LEADERBOARD' ? {} : { view });
  };
  const [activeTab, setActiveTab] = useState<DisplayTab>('30s_basic');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeCategoryFilter>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Only gyms that actually assign 반/수업시간 to students see the filter.
  const classOptions = Array.from(
    new Set(students.flatMap((s) => parseClassLabels(s.classLabel)))
  ).sort();

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

  const leaderboardItems = getLeaderboardData(
    students,
    records,
    activeTab,
    gradeFilter,
    searchQuery,
    events,
    classFilter
  );
  const topThree = leaderboardItems.slice(0, 3);

  const handleDeleteStudent = async (studentId: string) => {
    await deleteStudent(studentId);
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f4f5f8] text-slate-900 font-sans antialiased selection:bg-[#1B5E20] selection:text-white">
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

        {(activeView === 'ADMIN_BATCH' || activeView === 'EVENT_MANAGE' || activeView === 'STUDENT_MANAGE') && (
          <AdminBatchEntry
            gym={gym}
            students={students}
            records={records}
            events={events}
            initialSubTab={
              activeView === 'EVENT_MANAGE' ? 'EVENTS' : activeView === 'STUDENT_MANAGE' ? 'STUDENTS' : 'BATCH'
            }
            onBatchSaveRecords={batchSaveRecords}
            onAddStudent={addStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudentClass={updateStudentClass}
            onAddCustomEvent={addCustomEvent}
            onDeleteCustomEvent={deleteCustomEvent}
            onResetDefaultEvents={resetDefaultEvents}
            onDeleteRecord={deleteRecord}
            onClose={(lastEventKey) => {
              if (lastEventKey) setActiveTab(lastEventKey);
              setActiveView('LEADERBOARD');
            }}
            onNavigateToPricing={() => setActiveView('PRICING')}
          />
        )}

        {activeView === 'LIVE_COUNT' && (
          <LiveCountEntry
            gym={gym}
            students={students}
            events={events}
            onBatchSaveRecords={batchSaveRecords}
            onClose={() => setActiveView('LEADERBOARD')}
          />
        )}

        {activeView === 'GLOBAL_RANKING' && (
          <GlobalLeaderboard gym={gym} onNavigateToPricing={() => setActiveView('PRICING')} />
        )}

        {activeView === 'PRICING' && <PricingPage gym={gym} />}

        {activeView === 'GUIDE' && <UserGuidePage />}

        {activeView === 'MYPAGE' && (
          <MyPage
            email={user?.email}
            gym={gym}
            onSaveName={updateGymName}
            onSaveSlug={updateGymSlug}
            onSavePassword={updatePassword}
            onNavigateToPricing={() => setActiveView('PRICING')}
          />
        )}

        {activeView === 'LEADERBOARD' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Trophy className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">랭킹보드</h1>
            </div>

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
                  classFilter={classFilter}
                  setClassFilter={setClassFilter}
                  classOptions={classOptions}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSelectStudent={(studentId) => {
                    const s = students.find((st) => st.id === studentId);
                    if (s) setSelectedStudent(s);
                  }}
                  onOpenBatchEntry={() => setActiveView('ADMIN_BATCH')}
                />
              </div>

              <RightRail
                students={students}
                records={records}
                onOpenBatchEntry={() => setActiveView('ADMIN_BATCH')}
                onOpenStudentManage={() => setActiveView('STUDENT_MANAGE')}
              />
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
          gymPlan={gym.plan}
          initialEventKey={activeTab !== 'OVERALL' ? activeTab : undefined}
          onUpgradeRequired={() => {
            setSelectedStudent(null);
            setActiveView('PRICING');
          }}
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
