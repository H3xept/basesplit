import { getBillWithItems } from '@/lib/db';
import { BillSplitter } from '@/components/BillSplitter';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ billId: string }>;
}

export default async function SplitBillPage({ params }: PageProps) {
  const { billId } = await params;

  // Fetch bill and items from database
  const data = await getBillWithItems(billId);

  if (!data) {
    notFound();
  }

  const { bill, items } = data;

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 mb-6 border border-gray-100 dark:border-dark-border animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gradient">Split the Bill 💸</h1>
            {bill.is_settled && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-2 rounded-full text-sm font-semibold border border-green-200 dark:border-green-800 animate-scale-in">
                Settled ✓
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 dark:bg-dark-hover rounded-xl p-4 border border-gray-200 dark:border-dark-border">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${bill.total_amount?.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-hover rounded-xl p-4 border border-gray-200 dark:border-dark-border">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Payer Address</p>
              <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {bill.payer_address.substring(0, 6)}...
                {bill.payer_address.substring(bill.payer_address.length - 4)}
              </p>
            </div>
          </div>
        </div>

        {/* Bill Splitter Component */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BillSplitter
            billId={bill.id}
            items={items}
            payerAddress={bill.payer_address}
            totalAmount={bill.total_amount || 0}
          />
        </div>
      </div>
    </div>
  );
}
