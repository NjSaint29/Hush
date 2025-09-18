export default function ExpiredRoom() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Room Expired</h1>
        <p className="text-gray-400 mb-8">
          This chatroom has expired and all messages have been deleted.
        </p>
        <a
          href="/create"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
        >
          Create New Room
        </a>
      </div>
    </div>
  )
}