import { getBillWithItems } from '@/lib/db';
import { BillSplitter } from '@/components/BillSplitter';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ billId: string }>;
}

export default async function SplitBillPage({ params }: PageProps) {
  const { billId } = await params;

  // Fetch bill and items from database
  const data = getBillWithItems(billId);

  if (!data) {
    notFound();
  }

  const { bill, items } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h1 className="text-3xl font-bold mb-2">Split the Bill 💸</h1>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600">
                Total: <span className="font-semibold">${bill.total_amount?.toFixed(2)}</span>
              </p>
              <p className="text-sm text-gray-500">
                Payer: {bill.payer_address.substring(0, 6)}...
                {bill.payer_address.substring(bill.payer_address.length - 4)}
              </p>
            </div>
            {bill.is_settled && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Settled ✓
              </span>
            )}
          </div>
        </div>

        {/* Bill Splitter Component */}
        <BillSplitter
          billId={bill.id}
          items={items}
          payerAddress={bill.payer_address}
          totalAmount={bill.total_amount || 0}
        />
      </div>
    </div>
  );
}
