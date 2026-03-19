import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveColtPicks } from '@/lib/colt-tracking';
import { createChatCompletion, getAiModels } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const aiModels = getAiModels();

export async function POST(request: NextRequest) {
  try {
    const { fixtureId, fixture, odds, statistics, h2h, forceNew } = await request.json();

    if (!fixtureId || !fixture) {
      return NextResponse.json(
        { error: 'Fixture data is required' },
        { status: 400 }
      );
    }

    const matchId = String(fixtureId);

    // ── STEP 1: Check ColtAnalysis table for permanent cache ──
    if (!forceNew) {
      const existingAnalysis = await prisma.coltAnalysis.findUnique({
        where: { matchId },
      }).catch(() => null);

      if (existingAnalysis && existingAnalysis.rawResult) {
        console.log(`[Cache HIT] Returning saved ColtAnalysis for match ${matchId}`);
        const cachedResult = existingAnalysis.rawResult as any;
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const data = JSON.stringify({ status: 'completed', result: cachedResult, cached: true });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
      }

      // Also check ColtPick as fallback (picks exist but no analysis record)
      const existingPicks = await prisma.coltPick.findMany({
        where: { matchId },
        include: { result: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);

      if (existingPicks.length > 0) {
        console.log(`[Cache HIT] Rebuilding response from ${existingPicks.length} ColtPicks for match ${matchId}`);
        const rebuiltResult = {
          veredito: existingPicks[0].reasoning.substring(0, 100) + '...',
          confianca: existingPicks[0].confidence,
          dicas: existingPicks.map(p => ({
            mercado: p.marketType,
            aposta: p.selection,
            odd_minima: Number(p.recommendedOddsMin).toFixed(2),
            stake: p.stakeUnits,
            risco: p.riskLevel === 'LOW' ? 'Baixo' : p.riskLevel === 'HIGH' ? 'Alto' : 'Médio',
            motivo: p.reasoning,
          })),
          analise_colt: existingPicks[0].reasoning,
          alerta: null,
          placar_provavel: null,
          resumo_rapido: null,
        };

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const data = JSON.stringify({ status: 'completed', result: rebuiltResult, cached: true });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });
        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
      }
    }

    // ── STEP 2: No cache — call IA ──
    const homeTeam = fixture?.teams?.home?.name;
    const awayTeam = fixture?.teams?.away?.name;
    const leagueName = fixture?.league?.name;
    const matchDate = fixture?.fixture?.date;
    const homeStats = statistics?.[0];
    const awayStats = statistics?.[1];

    const oddsText = odds?.length > 0
      ? odds.map((o: any) => `${o.bookmaker}: Casa ${o.homeOdd} | Empate ${o.drawOdd} | Fora ${o.awayOdd}`).join('\n')
      : 'Odds não disponíveis';

    const h2hText = h2h?.length > 0
      ? h2h.slice(0, 8).map((m: any) => {
          const home = m?.teams?.home?.name;
          const away = m?.teams?.away?.name;
          const hg = m?.goals?.home;
          const ag = m?.goals?.away;
          const date = m?.fixture?.date?.split('T')?.[0];
          return `${date}: ${home} ${hg} x ${ag} ${away}`;
        }).join('\n')
      : 'Sem histórico de confrontos';

    const extractStats = (stats: any) => {
      if (!stats?.statistics) return 'Sem dados';
      return stats.statistics.filter((s: any) => s?.value !== null).map((s: any) => `${s.type}: ${s.value}`).join(', ');
    };

    const prompt = `Você é o COLT — o maior especialista em apostas esportivas de futebol do Brasil. Você é conhecido por dar dicas certeiras, diretas e lucrativas. Você não enrola, vai direto ao ponto.

Seu estilo:
- Fala como um apostador profissional brasileiro
- Dá dicas ESPECÍFICAS de apostas (mercado exato, odd mínima)
- Indica nível de risco e stake sugerida (1-10 unidades)
- Identifica VALUE BETS com precisão
- Explica o raciocínio de forma clara e convincente
- Usa linguagem acessível mas profissional

═══════════════════════════════════════
🏟️ JOGO: ${homeTeam} vs ${awayTeam}
📋 Liga: ${leagueName}
📅 Data: ${matchDate}
═══════════════════════════════════════

📊 ODDS DAS CASAS:
${oddsText}

📈 ESTATÍSTICAS DO JOGO (se disponível):
Time da Casa (${homeTeam}): ${extractStats(homeStats)}
Time de Fora (${awayTeam}): ${extractStats(awayStats)}

⚔️ CONFRONTOS DIRETOS (H2H):
${h2hText}

═══════════════════════════════════════

Com base em TODOS os dados acima, dê suas dicas como o COLT.

Responda APENAS com JSON puro (sem markdown, sem blocos de código) no formato:
{
  "veredito": "Frase curta e direta do veredito principal",
  "confianca": 82,
  "dicas": [
    {
      "mercado": "Nome do mercado",
      "aposta": "Descrição exata da aposta",
      "odd_minima": "1.85",
      "stake": 7,
      "risco": "Médio",
      "motivo": "Explicação curta e direta do porquê dessa aposta"
    }
  ],
  "analise_colt": "Análise completa do Colt.",
  "alerta": "Algum alerta importante ou null",
  "placar_provavel": "2 x 1",
  "resumo_rapido": "Uma frase resumindo tudo"
}`;

    const response = await createChatCompletion({
      model: aiModels.recommendation,
      messages: [
        { role: 'system', content: 'Você é o COLT, o maior consultor de apostas esportivas do Brasil. Responda SEMPRE em JSON válido puro, sem markdown. Seja direto, agressivo e certeiro nas suas dicas. Dê no mínimo 2 e no máximo 5 dicas de apostas por jogo, cobrindo diferentes mercados (resultado, gols, handicap, etc).' },
        { role: 'user', content: prompt }
      ],
      stream: true,
      maxTokens: 3000,
      temperature: 0.7,
      responseFormat: { type: 'json_object' },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response?.body?.getReader();
        if (!reader) { controller.error(new Error('No reader available')); return; }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';
        let closed = false;

        const safeEnqueue = (chunk: Uint8Array) => {
          if (!closed) { try { controller.enqueue(chunk); } catch (e) { /* closed */ } }
        };
        const safeClose = () => {
          if (!closed) { closed = true; try { controller.close(); } catch (e) { /* closed */ } }
        };

        const storePrediction = async (result: any) => {
          try {
            // Save to ColtAnalysis (permanent cache)
            await prisma.coltAnalysis.upsert({
              where: { matchId },
              create: {
                matchId,
                league: leagueName || 'Unknown',
                homeTeam: homeTeam || 'Unknown',
                awayTeam: awayTeam || 'Unknown',
                kickoff: matchDate ? new Date(matchDate) : new Date(),
                veredito: result.veredito || '',
                confianca: result.confianca || 50,
                analiseColt: result.analise_colt || '',
                alerta: result.alerta || null,
                placarProvavel: result.placar_provavel || null,
                resumoRapido: result.resumo_rapido || null,
                dicas: result.dicas || [],
                rawResult: result,
              },
              update: {
                veredito: result.veredito || '',
                confianca: result.confianca || 50,
                analiseColt: result.analise_colt || '',
                alerta: result.alerta || null,
                placarProvavel: result.placar_provavel || null,
                resumoRapido: result.resumo_rapido || null,
                dicas: result.dicas || [],
                rawResult: result,
              },
            });

            // Also keep ApiCache for backward compat
            await prisma.apiCache.upsert({
              where: { cacheKey: `prediction_v2_${fixtureId}` },
              create: { cacheKey: `prediction_v2_${fixtureId}`, data: result as any, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) },
              update: { data: result as any, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) },
            });

            // Save ColtPicks
            if (result?.dicas && Array.isArray(result.dicas) && result.dicas.length > 0) {
              try {
                await saveColtPicks({
                  matchId,
                  league: leagueName || 'Unknown',
                  homeTeam: homeTeam || 'Unknown',
                  awayTeam: awayTeam || 'Unknown',
                  kickoff: matchDate ? new Date(matchDate) : new Date(),
                  dicas: result.dicas,
                  confianca: result.confianca || 50,
                  analise: result.analise_colt || '',
                  odds: odds,
                });
                console.log(`Saved ${result.dicas.length} ColtPicks for match ${matchId}`);
              } catch (pickError: any) {
                console.error('Error saving ColtPicks:', pickError);
              }
            }
          } catch (dbError: any) {
            console.error('Error storing prediction:', dbError);
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  try {
                    const finalResult = JSON.parse(buffer);
                    await storePrediction(finalResult);
                    const finalData = JSON.stringify({ status: 'completed', result: finalResult });
                    safeEnqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (parseError: any) {
                    console.error('Error parsing final result:', parseError);
                    const errorData = JSON.stringify({ status: 'error', message: 'Erro ao processar recomendação' });
                    safeEnqueue(encoder.encode(`data: ${errorData}\n\n`));
                  }
                  safeEnqueue(encoder.encode('data: [DONE]\n\n'));
                  safeClose();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed?.choices?.[0]?.delta?.content || '';
                  const progressData = JSON.stringify({ status: 'processing', message: 'O Colt está analisando...' });
                  safeEnqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch (e) { /* skip invalid JSON */ }
              }
            }
          }
          if (buffer && buffer.trim()) {
            try {
              const finalResult = JSON.parse(buffer);
              await storePrediction(finalResult);
              const finalData = JSON.stringify({ status: 'completed', result: finalResult });
              safeEnqueue(encoder.encode(`data: ${finalData}\n\n`));
              safeEnqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (e) { console.error('Failed to parse buffer after stream end:', e); }
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({ status: 'error', message: error?.message || 'Stream error' });
          safeEnqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error: any) {
    console.error('Recommendation API error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate recommendation' }, { status: 500 });
  }
}
