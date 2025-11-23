export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">BaseSplit 💸</h1>
        <p className="text-xl text-gray-600 mb-8">
          Split bills easily using XMTP and Base
        </p>

        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <ol className="text-left space-y-3">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Send a receipt image in your XMTP chat</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>
                Our AI agent parses the receipt and creates a split bill
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Click the link to select your items</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <span>Pay with USDC on Base - done! ✅</span>
            </li>
          </ol>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Powered by XMTP • Base • Ollama</p>
        </div>
      </div>
    </div>
  );
}
