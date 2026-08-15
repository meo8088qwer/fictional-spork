import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicBoard } from '../data/api/publicBoard';
import { BroadcastTVMode } from '../components/BroadcastTVMode';

export default function PublicTvPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['publicBoard', slug],
    queryFn: () => fetchPublicBoard(slug!),
    enabled: !!slug,
    refetchInterval: 15000,
  });

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8]">
        <span className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8] p-4">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 shadow-lg text-center">
          <h2 className="text-lg font-black text-slate-900 mb-2">체육관을 찾을 수 없습니다</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            주소를 다시 확인해 주세요. (/g/체육관주소/tv)
          </p>
        </div>
      </div>
    );
  }

  const board = query.data;

  return (
    <BroadcastTVMode
      gymName={board.gymName}
      students={board.students}
      records={board.records}
      events={board.events}
      onClose={() => navigate(`/g/${board.gymSlug}`)}
    />
  );
}
