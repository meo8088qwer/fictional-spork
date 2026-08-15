import React, { useState, useRef } from 'react';
import { Student, JumpRecord, EventKey, EventMeta } from '../types';
import { getStudentPersonalBest } from '../lib/storage';
import { Trophy, Printer, Download, X, CheckCircle2, Award, Loader2, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CertificateModalProps {
  student: Student;
  records: JumpRecord[];
  events: Record<string, EventMeta>;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  student,
  records,
  events,
  onClose,
}) => {
  const eventKeys = Object.keys(events);
  const certificateRef = useRef<HTMLDivElement | null>(null);
  const [selectedEventKey, setSelectedEventKey] = useState<string>('OVERALL');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<string>('');

  // Find overall best record or selected event record
  let bestEventName = '30초 번갈아뛰기';
  let bestCount = 0;
  let bestDate = new Date().toISOString().split('T')[0];

  if (selectedEventKey === 'OVERALL') {
    eventKeys.forEach((key) => {
      const pb = getStudentPersonalBest(records, student.id, key);
      if (pb && pb.count > bestCount) {
        bestCount = pb.count;
        bestEventName = events[key]?.title || '측정 종목';
        bestDate = pb.date;
      }
    });
  } else {
    const key = selectedEventKey as EventKey;
    const pb = getStudentPersonalBest(records, student.id, key);
    bestEventName = events[key]?.title || '측정 종목';
    if (pb) {
      bestCount = pb.count;
      bestDate = pb.date;
    }
  }

  // Format date to Korean "2026년 08월 02일"
  const formatDateKorean = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
      }
    } catch {
      // fallback
    }
    const today = new Date();
    return `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
  };

  const todayKorean = formatDateKorean(new Date().toISOString().split('T')[0]);

  // Generate and download high resolution PDF
  const handleDownloadPdf = async () => {
    if (!certificateRef.current) return;
    setIsGeneratingPdf(true);
    setPdfSuccess('');

    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // A4 dimensions in mm: 210 x 297
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save(`${student.name}_줄넘기_기록인증상장.pdf`);

      setPdfSuccess('🎉 PDF 파일이 정상적으로 다운로드되었습니다!');
      setTimeout(() => setPdfSuccess(''), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
      // Fallback: trigger print dialog where user can save as PDF
      alert('PDF 변환 중 오류가 발생하여 인쇄 창으로 연결합니다. 인쇄 창에서 "PDF로 저장"을 선택해 주세요.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download high quality PNG Image
  const handleDownloadImage = async () => {
    if (!certificateRef.current) return;
    setIsGeneratingImage(true);
    setPdfSuccess('');

    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${student.name}_줄넘기_기록인증상장.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPdfSuccess('🎉 상장 이미지(PNG)가 성공적으로 저장되었습니다!');
      setTimeout(() => setPdfSuccess(''), 4000);
    } catch (err) {
      console.error('Image generation error:', err);
      alert('이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Trigger browser print dialog (Works in all browsers & handles Save to PDF natively)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-100 border border-slate-300 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl relative my-auto">
        {/* Header Controls (Hidden during print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Trophy className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                {student.name} 수련생 A4 공식 상장
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                A4 규격 비율로 바로 인쇄하거나 PDF/PNG 파일로 다운로드합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF 생성 중...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>📥 PDF 저장</span>
                </>
              )}
            </button>

            {/* Download PNG Image Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>이미지 저장</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ 상장 인쇄 (A4)</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Event Selector bar inside modal (Hidden during print) */}
        <div className="no-print mb-4 flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-amber-200/90 text-xs shadow-2xs">
          <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            상장 발급 기준 종목:
          </span>
          <select
            value={selectedEventKey}
            onChange={(e) => setSelectedEventKey(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 font-extrabold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="OVERALL">🏆 종합 최고 기록 (가장 높은 기록 자동선택)</option>
            {eventKeys.map((k) => (
              <option key={k} value={k}>
                {events[k]?.title || k}
              </option>
            ))}
          </select>
        </div>

        {/* Success Alert Banner (Hidden during print) */}
        {pdfSuccess && (
          <div className="no-print mb-4 bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pdfSuccess}</span>
          </div>
        )}

        {/* Scrollable Preview Wrapper */}
        <div className="overflow-x-auto flex justify-center py-2 bg-slate-200/60 rounded-2xl p-2 sm:p-4">
          {/* Printable A4 Certificate Frame */}
          <div
            id="certificate-print-area"
            ref={certificateRef}
            style={{ width: '680px', minHeight: '960px', boxSizing: 'border-box' }}
            className="bg-white p-10 sm:p-12 text-center relative shadow-lg mx-auto flex flex-col justify-between font-serif"
          >
            {/* Outer Double Gold Decorative Border Frame */}
            <div className="absolute inset-4 border-2 border-[#c59b27] pointer-events-none p-1 rounded-sm">
              <div className="w-full h-full border border-[#c59b27] p-1 relative">
                {/* Decorative Corner Filigrees */}
                <svg
                  width="32"
                  height="32"
                  className="absolute top-2 left-2 text-[#c59b27]"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M 0,20 Q 20,20 20,0" />
                  <path d="M 0,12 Q 12,12 12,0" />
                  <circle cx="6" cy="6" r="2" fill="currentColor" />
                </svg>

                <svg
                  width="32"
                  height="32"
                  className="absolute top-2 right-2 text-[#c59b27]"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M 40,20 Q 20,20 20,0" />
                  <path d="M 40,12 Q 28,12 28,0" />
                  <circle cx="34" cy="6" r="2" fill="currentColor" />
                </svg>

                <svg
                  width="32"
                  height="32"
                  className="absolute bottom-2 left-2 text-[#c59b27]"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M 0,20 Q 20,20 20,40" />
                  <path d="M 0,28 Q 12,28 12,40" />
                  <circle cx="6" cy="34" r="2" fill="currentColor" />
                </svg>

                <svg
                  width="32"
                  height="32"
                  className="absolute bottom-2 right-2 text-[#c59b27]"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M 40,20 Q 20,20 20,40" />
                  <path d="M 40,28 Q 28,28 28,40" />
                  <circle cx="34" cy="34" r="2" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Inner Content Container */}
            <div className="relative z-10 px-8 py-6 flex flex-col justify-between h-full min-h-[880px]">
              {/* Header Title */}
              <div className="mt-4 mb-8">
                <h1 className="text-4xl sm:text-5xl font-black text-[#0f1d3a] tracking-[0.25em] mb-3 font-serif">
                  기 록 인 증 상 장
                </h1>
                <div className="text-[11px] font-bold text-[#c59b27] tracking-[0.2em] font-sans uppercase">
                  POWER JUMPING ROPE CERTIFICATE OF EXCELLENCE
                </div>
              </div>

              {/* Student Info Table List */}
              <div className="max-w-md mx-auto w-full space-y-3.5 my-6 text-left font-sans text-sm sm:text-base">
                <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
                  <span className="text-slate-700 font-bold w-28 shrink-0 tracking-wider">성 명 :</span>
                  <span className="font-extrabold text-slate-900 text-lg sm:text-xl text-right flex-1">
                    {student.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
                  <span className="text-slate-700 font-bold w-28 shrink-0 tracking-wider">소 속 :</span>
                  <span className="font-bold text-slate-800 text-sm sm:text-base text-right flex-1">
                    용인대 파워점핑줄넘기 ({student.grade})
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
                  <span className="text-slate-700 font-bold w-28 shrink-0 tracking-wider">인증 종목 :</span>
                  <span className="font-bold text-slate-800 text-sm sm:text-base text-right flex-1">
                    {bestEventName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
                  <span className="text-slate-700 font-bold w-28 shrink-0 tracking-wider">공식 최고기록 :</span>
                  <span className="font-black text-[#ea580c] text-lg sm:text-2xl text-right flex-1">
                    {bestCount > 0 ? (
                      <>
                        <span>{bestCount}회</span>{' '}
                        <span className="text-xs sm:text-sm font-bold text-slate-500">({bestDate})</span>
                      </>
                    ) : (
                      <span className="text-slate-400">기록 없음</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Center Diamond Ornament Separator */}
              <div className="my-6 flex items-center justify-center gap-3">
                <div className="h-[1px] bg-slate-200 w-32"></div>
                <div className="text-[#c59b27] text-xs">◆</div>
                <div className="h-[1px] bg-slate-200 w-32"></div>
              </div>

              {/* Citation Body Text */}
              <div className="my-6 space-y-2 text-slate-800 font-serif leading-relaxed text-sm sm:text-base tracking-normal text-center">
                <p>위 수련생은 용인대 파워점핑줄넘기 체육관의</p>
                <p>스피드 측정 훈련에서 불굴의 의지와 탁월한 집중력으로</p>
                <p>위와 같이 우수한 줄넘기 최고 기록을 달성하였으므로</p>
                <p className="pt-1 font-semibold">이 상장을 수여합니다.</p>
              </div>

              {/* Bottom Date and Signature */}
              <div className="mt-8 pt-4 space-y-6">
                <div className="text-sm sm:text-base font-bold text-slate-700 font-serif tracking-widest text-center">
                  {todayKorean}
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  {/* Seal Stamp Badge Icon */}
                  <div className="w-8 h-8 rounded-full bg-[#fef3c7] border-2 border-[#d97706] flex items-center justify-center text-[#d97706] shrink-0">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-[#0f1d3a] font-serif tracking-tight">
                    용인대 파워점핑줄넘기 관장 (직인)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
