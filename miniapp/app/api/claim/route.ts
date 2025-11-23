import { NextRequest, NextResponse } from 'next/server';
import { updateLineItemClaim } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/claim] Received POST request');
    const body = await request.json();
    console.log('[API /api/claim] Request body:', body);
    const { itemIds, claimedBy, txHash } = body;

    // Validate inputs
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      console.error('[API /api/claim] Invalid itemIds:', itemIds);
      return NextResponse.json(
        { error: 'Item IDs array is required' },
        { status: 400 }
      );
    }

    if (!claimedBy || typeof claimedBy !== 'string') {
      console.error('[API /api/claim] Invalid claimedBy:', claimedBy);
      return NextResponse.json(
        { error: 'Claimed by address is required' },
        { status: 400 }
      );
    }

    if (!txHash || typeof txHash !== 'string') {
      console.error('[API /api/claim] Invalid txHash:', txHash);
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Update each item
    console.log('[API /api/claim] Updating items in database...');
    for (const itemId of itemIds) {
      updateLineItemClaim(itemId, claimedBy, txHash);
    }

    console.log('[API /api/claim] Successfully claimed', itemIds.length, 'items');
    return NextResponse.json({
      success: true,
      itemsClaimed: itemIds.length,
    });
  } catch (error) {
    console.error('[API /api/claim] Error:', error);
    return NextResponse.json(
      { error: 'Failed to claim items', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
