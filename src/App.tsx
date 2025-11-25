import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BookingForm from './pages/BookingForm'
import LoadingPage from './pages/LoadingPage'
import BookingDetail from './pages/BookingDetail'
import ReservationLanding from './pages/ReservationLanding'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookingForm />} />
        <Route path="/reservation/:token" element={<ReservationLanding />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/detail" element={<BookingDetail />} />
        <Route path="/chat/:chatId" element={<BookingDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
