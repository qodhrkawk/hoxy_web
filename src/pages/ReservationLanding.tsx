import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { networkManager } from '../utils/NetworkManager'
import './BookingDetail.css'

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

  const formatDate = (iso?: string | null) => {
    if (!iso) return '상시'
    const d = new Date(iso)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}(${days[d.getDay()]})`
  }

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-content">
          <div className="date-separator">예약 정보를 불러오는 중...</div>
        </div>
      </div>
    )
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

  const artist = data.artist ?? null
  const product = data.product ?? null
  const saleRange = product
    ? (product.sale_start_date || product.sale_end_date
        ? `${formatDate(product.sale_start_date)} ~ ${formatDate(product.sale_end_date)}`
        : '상시 판매')
    : '정보 없음'

  return (
    <div className="chat-container">
      <div className="chat-content">
        <h1 className="chat-header">{artist?.brand_name || artist?.name || '작가 정보'}</h1>

        <div className="message-group left">
          <div className="ai-card">
            <h3 className="card-title">
              <span className="icon">📋</span> 예약 안내
            </h3>
            <div className="card-content">
              <div className="info-row">
                <span className="label">작가</span>
                <span className="value">{artist?.name ?? '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">브랜드</span>
                <span className="value">{artist?.brand_name ?? '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">연락처 링크</span>
                <a className="value" href={artist?.contact_link ?? '#'} target="_blank" rel="noreferrer">
                  {artist?.contact_link ?? '-'}
                </a>
              </div>
              <div className="info-row">
                <span className="label">상품명</span>
                <span className="value">{product?.name ?? '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">판매 기간</span>
                <span className="value">{saleRange}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="message-group right">
          <div className="booking-card">
            <h3 className="card-title">
              <span className="icon">📝</span> 예약 진행
            </h3>
            <div className="card-content">
              <div className="info-row">
                <span className="label">예약 링크 토큰</span>
                <span className="value">{data.token}</span>
              </div>
              <div className="info-row">
                <span className="label">상태</span>
                <span className="value">{data.is_active ? '활성' : '비활성'}</span>
              </div>
              <div className="info-row">
                <span className="label">만료</span>
                <span className="value">{data.expires_at ? formatDate(data.expires_at) : '만료 없음'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="message-group right">
          <Link className="user-message" to="/detail">
            예약 상세 보기로 이동
          </Link>
        </div>
      </div>
    </div>
  )
}

