export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-400">
      <p className="text-6xl font-bold text-gray-700 mb-4">404</p>
      <p className="text-sm">Page not found.</p>
      <a href="/" className="mt-4 text-indigo-400 hover:underline text-sm">Go home</a>
    </div>
  )
}
