import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

const DEFAULT_USER_ID = 'default-user';

// GET: Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Auto-create profile if not exists
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId,
          riskProfile: 'MODERATE',
          favoriteLeagues: [],
          preferredMarkets: [],
        },
      });
    }

    return NextResponse.json({
      profile: {
        ...profile,
        bankrollEstimate: profile.bankrollEstimate ? Number(profile.bankrollEstimate) : null,
        minOdds: profile.minOdds ? Number(profile.minOdds) : null,
        maxOdds: profile.maxOdds ? Number(profile.maxOdds) : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT: Update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || DEFAULT_USER_ID;

    const updateData: any = {};
    if (body.bankrollEstimate !== undefined) updateData.bankrollEstimate = body.bankrollEstimate ? new Decimal(body.bankrollEstimate) : null;
    if (body.riskProfile) updateData.riskProfile = body.riskProfile;
    if (body.favoriteLeagues) updateData.favoriteLeagues = body.favoriteLeagues;
    if (body.preferredMarkets) updateData.preferredMarkets = body.preferredMarkets;
    if (body.minOdds !== undefined) updateData.minOdds = body.minOdds ? new Decimal(body.minOdds) : null;
    if (body.maxOdds !== undefined) updateData.maxOdds = body.maxOdds ? new Decimal(body.maxOdds) : null;
    if (body.maxPicksPerDay !== undefined) updateData.maxPicksPerDay = body.maxPicksPerDay;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
        riskProfile: updateData.riskProfile || 'MODERATE',
        favoriteLeagues: updateData.favoriteLeagues || [],
        preferredMarkets: updateData.preferredMarkets || [],
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        bankrollEstimate: profile.bankrollEstimate ? Number(profile.bankrollEstimate) : null,
        minOdds: profile.minOdds ? Number(profile.minOdds) : null,
        maxOdds: profile.maxOdds ? Number(profile.maxOdds) : null,
      },
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update profile' }, { status: 500 });
  }
}
