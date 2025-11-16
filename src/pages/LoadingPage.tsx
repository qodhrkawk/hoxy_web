import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoadingPage.css'

export default function LoadingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // 2초 후 예약 상세 페이지로 이동
    const timer = setTimeout(() => {
      navigate('/detail')
    }, 2000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="spinner"></div>
        <p className="loading-text">작가님께 예약 정보를 보내는 중이에요</p>
      </div>
    </div>
  )
}
