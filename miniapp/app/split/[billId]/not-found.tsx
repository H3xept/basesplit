export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        <div className="text-7xl mb-6 animate-scale-in">🔍</div>
        <h1 className="text-7xl font-bold mb-4 text-gradient">404</h1>
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Bill Not Found</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          The bill you're looking for doesn't exist or has been removed.
        </p>
        <a
          href="/"
          className="inline-block px-8 py-4 bg-primary dark:bg-primary-light text-white rounded-xl hover:bg-opacity-90 font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
