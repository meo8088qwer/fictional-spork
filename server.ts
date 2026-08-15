import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialiser for Gemini API
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Jump Rope Coach Feedback Endpoint
app.post('/api/ai/coach', async (req, res) => {
  try {
    const { studentName, grade, gender, records, overallStats } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not configured yet
      return res.json({
        advice: `${studentName} 학생은 꾸준한 훈련으로 성장하고 있습니다! 30초 및 10초 스피드 종목에서 자세와 박자를 다듬으면 다음 측정에서 최고 기록 경신이 가능합니다. 화이팅!`,
        strengths: ['자세 안정성', '지속적인 참여'],
        targetTips: ['발끝으로 가볍게 뛰며 리듬 유지하기', '시선은 정면 유지하기'],
      });
    }

    const prompt = `
당신은 대한민국 최고의 열정적인 줄넘기 체육관 전문 Head Coach (점프파이어 AI 코치)입니다.
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const parsedData = JSON.parse(responseText);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('AI Coach Error:', error);
    return res.json({
      advice: `대단한 열정입니다! 기본기가 탄탄하여 조금만 집중 연습하면 스피드가 비약적으로 상승할 잠재력을 가지고 있습니다!`,
      strengths: ['뛰어난 도약력', '우수한 리듬감'],
      targetTips: ['손목을 작게 돌리는 스피드 테크닉 연습', '10초 단거리 구간 폭발적 스퍼트'],
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JumpFire Speed Leaderboard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
