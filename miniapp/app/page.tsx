export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 animate-fade-in">
      <div className="max-w-3xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-block mb-6">
            <div className="text-7xl mb-4 animate-scale-in">💸</div>
          </div>
          <h1 className="text-6xl font-bold mb-6 text-gradient">
            BaseSplit
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-4 max-w-2xl mx-auto">
            Split bills effortlessly with friends using AI and blockchain
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Powered by XMTP, Base, and Google Vision
          </p>
        </div>

        {/* How it Works Card */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-2xl border border-gray-100 dark:border-dark-border transition-all duration-300 hover:shadow-3xl animate-slide-up">
          <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">
            How it works
          </h2>
          <div className="space-y-6">
            {[
              {
                number: '1',
                icon: '📸',
                title: 'Send a Receipt',
                description: 'Share a receipt image in your XMTP chat',
              },
              {
                number: '2',
                icon: '🤖',
                title: 'AI Processing',
                description: 'Our AI agent parses the receipt and creates a split bill',
              },
              {
                number: '3',
                icon: '✅',
                title: 'Select Items',
                description: 'Click the link and choose which items you ordered',
              },
              {
                number: '4',
                icon: '💳',
                title: 'Pay Instantly',
                description: 'Pay with USDC on Base - done!',
              },
            ].map((step, index) => (
              <div
                key={step.number}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-200 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 dark:bg-primary-light/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-primary dark:text-primary-light">
                      Step {step.number}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 dark:bg-dark-hover rounded-full text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border">
            <span className="font-medium">Built with</span>
            <span className="text-primary dark:text-primary-light font-semibold">XMTP</span>
            <span>•</span>
            <span className="text-primary dark:text-primary-light font-semibold">Base</span>
            <span>•</span>
            <span className="text-primary dark:text-primary-light font-semibold">Google Vision</span>
          </div>
        </div>
      </div>
    </div>
  );
}
