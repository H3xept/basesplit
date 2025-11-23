export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Bill Not Found</h2>
        <p className="text-gray-600 mb-6">
          The bill you're looking for doesn't exist or has been removed.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
