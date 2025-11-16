import { useEffect, useMemo, useState } from 'react'
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

        // 아티스트 상품 목록을 추가로 시도해서 불러옴(성공한 첫 엔드포인트 사용)
        try {
          const artistId = res.artist_id
          const candidates = [
            `/v1/artists/${artistId}/products`,
            `/v1/products?artist_id=${artistId}`,
            `/products?artist_id=${artistId}`,
          ]
          let names: string[] | null = null
          for (const ep of candidates) {
            try {
              const list: any = await networkManager.get<any>(ep)
              if (Array.isArray(list)) {
                const n = list
                  .map((it) => (it && typeof it.name === 'string' ? it.name : null))
                  .filter((x: string | null) => !!x) as string[]
                if (n.length > 0) {
                  names = Array.from(new Set(n))
                  break
                }
              }
            } catch {
              // 다음 후보 시도
            }
          }
          if (mounted) {
            setProductOptions(names ?? (res.product?.name ? [res.product.name] : []))
          }
        } catch {
          if (mounted) {
            setProductOptions(res.product?.name ? [res.product.name] : [])
          }
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

  const product = data.product ?? null
  const defaultProduct = useMemo(() => {
    if (product?.name) return product.name
    if (productOptions && productOptions.length > 0) return productOptions[0]
    return ''
  }, [product?.name, productOptions])

  // 폼만 단독 표시: API에서 받은 상품명 1개를 옵션으로 주입하고 기본 선택 설정
  return <BookingForm productOptions={productOptions ?? undefined} defaultProduct={defaultProduct} />
}

