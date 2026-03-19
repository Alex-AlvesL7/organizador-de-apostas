import { NextRequest, NextResponse } from 'next/server';
import { getMatchById } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await context?.params;
    const matchId = resolvedParams?.id;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    const fixture = await getMatchById(parseInt(matchId));

    return NextResponse.json({ fixture });
  } catch (error: any) {
    console.error('Fixture detail API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch fixture details' },
      { status: 500 }
    );
  }
}
