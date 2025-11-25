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
  author: ReservationArtist
  products: ReservationProduct[]
  unavailable_dates: string[]
}

export default function ReservationLanding() {
  const { token } = useParams<{ token: string }>()
  const [products, setProducts] = useState<{ id: string; name: string }[] | null>(null)
  const [authorId, setAuthorId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!token) {
          throw new Error('유효하지 않은 링크입니다.')
        }
        // 예약 링크 토큰을 localStorage에 저장 (채팅 메시지 요청 시 인증에 사용)
        try {
          localStorage.setItem('reservationToken', token)
        } catch {}
        const res = await networkManager.get<ReservationLinkResponse>(`/v1/reservations/links/${token}`)
        if (!mounted) return
        // 서버 응답 로깅
        try {
          console.log('[ReservationLanding] link response:', res)
        } catch {}

        // 링크 응답 내 products 배열에서 상품명 추출(표시 순서 정렬)
        const names =
          Array.isArray(res.products)
            ? [...res.products].sort(
                (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
              )
            : []
        if (mounted) {
          setProducts(names.map((p) => ({ id: p.id, name: p.name })))
          setAuthorId(res.author?.id ?? null)
          // 작가 정보를 localStorage에 저장 (채팅 화면에서 사용)
          if (res.author) {
            try {
              localStorage.setItem('artistInfo', JSON.stringify({
                id: res.author.id,
                name: res.author.name,
                brand_name: res.author.brand_name,
                email: res.author.email,
              }))
            } catch {}
          }
          try {
            console.log('[ReservationLanding] product options:', names.map((p) => p.name))
          } catch {}
        }
      } catch (e: any) {
        // 실패 시 폼은 기본 상태로 노출
        try {
          console.error('[ReservationLanding] link fetch error:', e)
        } catch {}
      }
    })()
    return () => {
      mounted = false
    }
  }, [token])

  // 로딩/오류 여부와 관계없이 폼만 렌더링(레이아웃 불변)

  const defaultProduct = useMemo(() => {
    // 초기에는 선택하지 않은 상태 유지
    return ''
  }, [])

  // 폼만 단독 표시: API에서 받은 상품명 1개를 옵션으로 주입하고 기본 선택 설정
  return (
    <BookingForm
      products={products ?? undefined}
      authorId={authorId ?? undefined}
      defaultProduct={defaultProduct}
    />
  )
}

