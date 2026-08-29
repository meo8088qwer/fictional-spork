import React, { useRef, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { PaymentRecord } from '../data/api/billing';

interface ReceiptModalProps {
  payment: PaymentRecord;
  gymName: string;
  payerEmail: string | undefined;
  onClose: () => void;
}

// Same html2canvas + jsPDF pattern as CertificateModal -- render the
// receipt as a real DOM node, snapshot it, drop it on an A4 page.
export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, gymName, payerEmail, onClose }) => {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 20, pageWidth, imgHeight, undefined, 'FAST');
      pdf.save(`ROPERANK_영수증_${payment.orderId}.pdf`);
    } catch (err) {
      console.error('Receipt PDF generation error:', err);
      alert('PDF 생성 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs grid place-items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">영수증</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div ref={receiptRef} className="bg-white p-6 border border-slate-200 rounded-xl">
            <div className="text-center mb-5">
              <h4 className="text-lg font-bold text-slate-900">영수증</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{payment.orderId}</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">공급자</span>
                <span className="font-bold text-slate-800">ROPERANK (대표 정승현)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">공급받는자</span>
                <span className="font-bold text-slate-800">{gymName}</span>
              </div>
              {payerEmail && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">이메일</span>
                  <span className="font-bold text-slate-800">{payerEmail}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">결제일시</span>
                <span className="font-bold text-slate-800">{new Date(payment.paidAt).toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">상품명</span>
                <span className="font-bold text-slate-800">
                  {payment.plan.toUpperCase()} 플랜 ({payment.billingCycle === 'yearly' ? '연간' : '월간'})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">결제수단</span>
                <span className="font-bold text-slate-800">신용카드</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-slate-700 font-bold">결제금액</span>
                <span className="text-base font-bold text-slate-900">{payment.amount.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownload}
            className="w-full mt-4 py-3 rounded-xl bg-[#1B5E20] hover:bg-[#1B5E20]/90 disabled:opacity-60 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isDownloading ? 'PDF 생성 중...' : 'PDF로 다운로드'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
