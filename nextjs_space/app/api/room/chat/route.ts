import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createChatCompletion, getAiModels, type AiMessage } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const aiModels = getAiModels();

export async function POST(request: NextRequest) {
  try {
    const { matchId, message, userId } = await request.json();

    if (!matchId || !message) {
      return NextResponse.json({ error: 'matchId and message are required' }, { status: 400 });
    }

    // Save user message
    await prisma.conversationLog.create({
      data: { matchId, userId: userId || null, role: 'USER', message },
    });

    // Get context: analysis + picks + conversation history
    const [analysis, picks, history] = await Promise.all([
      prisma.coltAnalysis.findUnique({ where: { matchId } }).catch(() => null),
      prisma.coltPick.findMany({
        where: { matchId },
        include: { result: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.conversationLog.findMany({
        where: { matchId },
        orderBy: { createdAt: 'asc' },
        take: 30, // last 30 messages for context
      }).catch(() => []),
    ]);

    // Build system prompt with match context
    const picksContext = picks.length > 0
      ? picks.map(p => {
          const resultStr = p.result
            ? ` → ${p.result.result} (${Number(p.result.profitUnits) >= 0 ? '+' : ''}${Number(p.result.profitUnits).toFixed(2)}u)`
            : ` → ${p.status}`;
          return `- ${p.selection} (${p.marketType}) | Odd mín: ${Number(p.recommendedOddsMin)} | Stake: ${p.stakeUnits}u | Risco: ${p.riskLevel}${resultStr}`;
        }).join('\n')
      : 'Nenhuma pick registrada para este jogo.';

    const analysisContext = analysis
      ? `Veredito: ${analysis.veredito}\nConfiança: ${analysis.confianca}%\nAnálise: ${analysis.analiseColt}\nPlacar provável: ${analysis.placarProvavel || 'N/A'}\nResumo: ${analysis.resumoRapido || 'N/A'}${analysis.alerta ? '\nAlerta: ' + analysis.alerta : ''}`
      : 'Análise ainda não gerada para este jogo.';

    const systemPrompt = `Você é o COLT, o maior especialista em apostas esportivas do Brasil. Você está dentro da "Sala do Colt" para um jogo específico.

JOGO: ${analysis?.homeTeam || 'Time Casa'} vs ${analysis?.awayTeam || 'Time Fora'}
Liga: ${analysis?.league || 'N/A'}
Kickoff: ${analysis?.kickoff || 'N/A'}

SUA ANÁLISE ANTERIOR:
${analysisContext}

SUAS PICKS:
${picksContext}

Responda SEMPRE em português brasileiro, de forma direta e profissional. Você pode:
- Responder perguntas sobre o jogo, times, estratégias
- Detalhar suas picks e raciocínio
- Discutir riscos e cenários
- Dar informações sobre os times
- Sugerir ajustes nas apostas

Seja conciso mas completo. Use dados concretos quando possível.`;

    // Build messages for LLM
    const llmMessages: AiMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (skip last entry which is the current user message we just saved)
    for (const entry of history) {
      if (entry.role === 'USER') {
        llmMessages.push({ role: 'user', content: entry.message });
      } else {
        llmMessages.push({ role: 'assistant', content: entry.message });
      }
    }

    // Call LLM
    const response = await createChatCompletion({
      model: aiModels.chat,
      messages: llmMessages,
      maxTokens: 1500,
      temperature: 0.7,
    });

    const data = await response.json();
    const assistantMessage = data?.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta. Tente novamente.';

    // Save assistant message
    await prisma.conversationLog.create({
      data: { matchId, userId: null, role: 'ASSISTANT', message: assistantMessage },
    });

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Room chat error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process chat' }, { status: 500 });
  }
}
