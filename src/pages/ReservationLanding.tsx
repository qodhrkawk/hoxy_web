import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { networkManager } from '../utils/NetworkManager'
import './BookingDetail.css'
import BookingForm from './BookingForm'

interface ReservationArtist {
  id: string
  name: string
  email?: string
  brand_name: string
  contact_link: string
}

interface ReservationProduct {
  id: string
  name: string
  sale_start_date: string
  sale_end_date: string | null
  display_order?: number
  created_at?: string
  updated_at?: string
}

interface ReservationLinkResponse {
  artist: ReservationArtist
  products: ReservationProduct[]
  unavailable_dates: string[]
}

export default function ReservationLanding() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReservationLinkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productOptions, setProductOptions] = useState<string[] | null>(null)

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

        // 링크 응답 내 products 배열에서 상품명 추출(표시 순서 정렬)
        const names =
          Array.isArray(res.products)
            ? [...res.products]
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                .map((p) => p.name)
                .filter((n) => !!n)
            : []
        if (mounted) {
          setProductOptions(names)
        }
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

  // 오류가 있어도 폼은 계속 노출(경고 배너만 표시)
  if (error || !data) {
    console.error('[ReservationLanding] 링크 조회 오류:', error)
    return (
      <div className="booking-container">
        <div className="booking-form">
          <div className="date-separator" style={{ marginBottom: 16 }}>
            <span role="img" aria-label="warning">⚠️</span> {error || '예약 정보를 불러오지 못했습니다.'}
          </div>
          <BookingForm />
        </div>
      </div>
    )
  }

  const defaultProduct = useMemo(() => {
    if (productOptions && productOptions.length > 0) return productOptions[0]
    return ''
  }, [productOptions])

  // 폼만 단독 표시: API에서 받은 상품명 1개를 옵션으로 주입하고 기본 선택 설정
  return <BookingForm productOptions={productOptions ?? undefined} defaultProduct={defaultProduct} />
}

