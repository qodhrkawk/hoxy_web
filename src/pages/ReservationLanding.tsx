import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { networkManager } from '../utils/NetworkManager'
import './BookingDetail.css'
import BookingForm from './BookingForm'

interface Artist {
  id: string
  name: string
  brand_name: string
  contact_link: string
}

interface Product {
  id: string
  name: string
  sale_start_date: string
  sale_end_date: string | null
}

interface ReservationLinkResponse {
  id: string
  artist_id: string
  token: string
  product_id: string
  expires_at: string | null
  is_active: boolean
  artist?: Artist | null
  product?: Product | null
}

export default function ReservationLanding() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReservationLinkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!token) {
          throw new Error('유효하지 않은 링크입니다.')
        }
        setLoading(true)
        const res = await networkManager.get<ReservationLinkResponse>(`/v1/reservations/links/${token}`)
        if (!mounted) return
        setData(res)
        setError(null)
      } catch (e: any) {
        setError(e?.message || '예약 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [token])

  // (예약 화면에서 현재는 사용하지 않음) 날짜 포맷터가 필요해지면 복원

  if (loading) {
    return <div className="date-separator" style={{ padding: 24, textAlign: 'center' }}>예약 정보를 불러오는 중...</div>
  }

  if (error || !data) {
    return (
      <div className="chat-container">
        <div className="chat-content">
          <div className="message-group left">
            <div className="ai-card">
              <h3 className="card-title">
                <span className="icon">⚠️</span> 링크 오류
              </h3>
              <div className="card-content">
                <p>{error || '예약 정보를 불러오지 못했습니다.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const product = data.product ?? null

  // 폼만 단독 표시: API에서 받은 상품명 1개를 옵션으로 주입하고 기본 선택 설정
  return <BookingForm productOptions={product?.name ? [product.name] : undefined} defaultProduct={product?.name ?? ''} />
}

