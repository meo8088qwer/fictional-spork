// Supabase Edge Function: AI jump-rope coaching feedback.
//
// Moved off the old unauthenticated Express route (POST /api/ai/coach)
// deliberately, not just for hosting convenience: that route had zero auth
// check, so anyone who found the endpoint could burn a gym owner's Gemini
// quota for free. This function requires a valid Supabase session (any
// logged-in gym owner) before calling Gemini at all.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const FALLBACK_REPORT = {
  advice: '대단한 열정입니다! 기본기가 탄탄하여 조금만 집중 연습하면 스피드가 비약적으로 상승할 잠재력을 가지고 있습니다!',
  strengths: ['뛰어난 도약력', '우수한 리듬감'],
  targetTips: ['손목을 작게 돌리는 스피드 테크닉 연습', '10초 단거리 구간 폭발적 스퍼트'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const { studentName, grade, gender, records, overallStats } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return jsonResponse({
        advice: `${studentName} 학생은 꾸준한 훈련으로 성장하고 있습니다! 30초 및 10초 스피드 종목에서 자세와 박자를 다듬으면 다음 측정에서 최고 기록 경신이 가능합니다. 화이팅!`,
        strengths: ['자세 안정성', '지속적인 참여'],
        targetTips: ['발끝으로 가볍게 뛰며 리듬 유지하기', '시선은 정면 유지하기'],
      });
    }

    const prompt = `
당신은 대한민국 최고의 열정적인 줄넘기 체육관 전문 Head Coach입니다.
줄넘기 수련생 아이의 스피드 기록 데이터 분석을 바탕으로 아이와 학부모님께 전달할 격려와 유익한 기술 팁 리포트를 작성해주세요.

[학생 정보]
- 이름: ${studentName}
- 학년/부: ${grade} (${gender === 'M' ? '남학생' : '여학생'})

[종목별 최고 기록]
${JSON.stringify(records, null, 2)}

[종합 평가 요약]
${JSON.stringify(overallStats, null, 2)}

[요청 사항]
1. 따뜻하고 칭찬 중심의 칭찬 문장 (2~3문장)
2. 가장 강점인 종목과 부분 2가지
3. 다음 랭킹 상승을 위한 원포인트 실전 코칭 팁 2가지

응답은 반드시 JSON 형식으로만 작성해 주세요. Schema:
{
  "advice": "아이를 위한 칭찬 및 격려 메시지",
  "strengths": ["강점1", "강점2"],
  "targetTips": ["코칭팁1", "코칭팁2"]
}
`;

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' +
        geminiApiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(responseText);
    return jsonResponse(parsed);
  } catch (error) {
    console.error('AI Coach Error:', error);
    return jsonResponse(FALLBACK_REPORT);
  }
});
