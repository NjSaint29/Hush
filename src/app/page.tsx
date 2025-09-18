export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Hush</h1>
        <p className="text-gray-400 mb-8">
          Anonymous 24-hour chatrooms. Messages and media disappear forever.
        </p>

        <div className="space-y-4">
          <a
            href="/create"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            Create Room
          </a>
          <a
            href="/join"
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            Join Room
          </a>
        </div>

        <div className="text-sm text-gray-500 mt-8">
          No accounts required. Completely anonymous.
        </div>
      </div>
    </div>
  )
}
