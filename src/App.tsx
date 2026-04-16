import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold text-emerald-600">OpenPlate</h1></div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
