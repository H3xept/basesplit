import { NextRequest, NextResponse } from 'next/server';
import { updateLineItemClaim } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds, claimedBy, txHash } = body;

    // Validate inputs
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs array is required' },
        { status: 400 }
      );
    }

    if (!claimedBy || typeof claimedBy !== 'string') {
      return NextResponse.json(
        { error: 'Claimed by address is required' },
        { status: 400 }
      );
    }

    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Update each item
    for (const itemId of itemIds) {
      updateLineItemClaim(itemId, claimedBy, txHash);
    }

    return NextResponse.json({
      success: true,
      itemsClaimed: itemIds.length,
    });
  } catch (error) {
    console.error('Error claiming items:', error);
    return NextResponse.json(
      { error: 'Failed to claim items' },
      { status: 500 }
    );
  }
}
