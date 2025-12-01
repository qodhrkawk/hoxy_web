import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar'
import './BookingForm.css'
import { networkManager } from '../utils/NetworkManager'

interface BookingFormProps {
  products?: { id: string; name: string }[]
  defaultProduct?: string
  authorId?: string
}

interface BookingData {
  name: string
  phone: string
  product: string
  date1: Date | null
  date2: Date | null
  date3: Date | null
  privacyAgreed: boolean
  termsAgreed: boolean
}

export default function BookingForm({ products, defaultProduct, authorId }: BookingFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<BookingData>({
    name: '',
    phone: '',
    product: defaultProduct ?? '',
    date1: null,
    date2: null,
    date3: null,
    privacyAgreed: false,
    termsAgreed: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 필수 필드 모두 채워졌는지 확인
  const isFormValid =
    formData.name.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.product !== '' &&
    formData.date1 !== null &&
    formData.date2 !== null &&
    formData.privacyAgreed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || isSubmitting) return
    
    setIsSubmitting(true)

    // 매핑: 선택한 상품명 -> 상품 ID
    const selectedProductId =
      products?.find((p) => p.name === formData.product)?.id ?? null

    // 날짜 후보 포맷(YYYY-MM-DD)
    const toYMD = (d: Date | null) =>
      d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : null
    const dateCandidates = [toYMD(formData.date1), toYMD(formData.date2), toYMD(formData.date3)].filter(
      (x): x is string => !!x
    )

    // 서버 요청 본문
    const body = {
      author_id: authorId ?? undefined,
      title: formData.product || '',
      customer_name: formData.name,
      phone_number: formData.phone,
      date_candidates: dateCandidates,
      product_id: selectedProductId ?? undefined,
    }

    try {
      const response: any = await networkManager.post('/v1/reservations', body)
      console.log('[BookingForm] reservation created - full response:', JSON.stringify(response, null, 2))

      // 응답에서 chat id 추출: response.chat.id 또는 response.reservation.chat_id
      const chatId: string | undefined = response?.chat?.id || response?.reservation?.chat_id
      console.log('[BookingForm] extracted chatId:', chatId, 'from chat.id:', response?.chat?.id, 'or reservation.chat_id:', response?.reservation?.chat_id)

      if (chatId) {
        localStorage.setItem('chatId', chatId)
        console.log('[BookingForm] chatId saved to localStorage:', chatId)

        // 예약 응답에서 토큰 추출 (token, access_token, reservation_token 등 가능한 필드 확인)
        const token = response?.token || response?.access_token || response?.reservation_token
        if (token) {
          localStorage.setItem('reservationToken', token)
          console.log('[BookingForm] reservation token saved from response:', token ? 'present' : 'missing')
        } else {
          console.warn('[BookingForm] no token found in reservation response. Available keys:', Object.keys(response || {}))
        }

        // 예약 시간 추출 및 저장
        const reservationTime = response?.reservation?.reservation_time || response?.reservation_time || response?.reservationTime
        if (reservationTime) {
          localStorage.setItem('reservationTime', reservationTime)
          console.log('[BookingForm] reservationTime saved to localStorage:', reservationTime)
        } else {
          console.warn('[BookingForm] no reservationTime found in response')
        }
      } else {
        console.error('[BookingForm] chatId not found in response. Response structure:', {
          hasChat: !!response?.chat,
          chatId: response?.chat?.id,
          hasReservation: !!response?.reservation,
          reservationChatId: response?.reservation?.chat_id,
          fullResponse: response,
        })
        alert('예약은 생성되었지만 채팅방 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요.')
        setIsSubmitting(false)
        return
      }
    } catch (err: any) {
      // 네트워크 실패 시에도 사용자 경험 유지
      console.error('[BookingForm] reservation create error:', err)
      alert('예약 전송 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      setIsSubmitting(false)
      return // 에러 발생 시 네비게이션 중단
    }

    // 예약 데이터를 localStorage에 저장(기존 동작 유지)
    localStorage.setItem('bookingData', JSON.stringify(formData))
    navigate('/loading')
  }

  const handleDateSelect = (priority: 1 | 2 | 3, date: Date | null) => {
    if (priority === 1) {
      setFormData({ ...formData, date1: date })
    } else if (priority === 2) {
      setFormData({ ...formData, date2: date })
    } else if (priority === 3) {
      setFormData({ ...formData, date3: date })
    }
  }

  const handleDateRemove = (priority: 1 | 2 | 3) => {
    if (priority === 1) {
      // 1순위 제거: 2순위 → 1순위, 3순위 → 2순위
      setFormData({
        ...formData,
        date1: formData.date2,
        date2: formData.date3,
        date3: null,
      })
    } else if (priority === 2) {
      // 2순위 제거: 3순위 → 2순위
      setFormData({
        ...formData,
        date2: formData.date3,
        date3: null,
      })
    } else if (priority === 3) {
      // 3순위 제거
      setFormData({
        ...formData,
        date3: null,
      })
    }
  }

  return (
    <div className="booking-container">
      <div className="booking-form">
        <img src="/images/LOGO.png" alt="HOXY" className="logo" />
        <h2>
          원하는 예약 정보를
          <br />
          입력해 주세요
        </h2>
        <p className="subtitle">
          예약 희망 내용을 양식에 맞게 작성해주시면,
          <br />
          작가님과 1:1 상담방으로 이동해요.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              이름 <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder="이름을 입력해 주세요"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>
              휴대폰 번호 <span className="required">*</span>
            </label>
            <input
              type="tel"
              placeholder="휴대폰 번호를 입력해 주세요"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>
              스냅 상품 <span className="required">*</span>
            </label>
            <select
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              required
            >
              {/* 항상 placeholder를 제공해 초기값이 선택되지 않도록 유지 */}
              <option value="">스냅 상품을 선택해 주세요</option>
              {products && products.length > 0
                ? products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))
                : ['상품 1', '상품 2', '상품 3'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              촬영 희망 날짜 <span className="required">*</span>
            </label>
            <Calendar
              selectedDates={{
                date1: formData.date1,
                date2: formData.date2,
                date3: formData.date3,
              }}
              onDateSelect={handleDateSelect}
              onDateRemove={handleDateRemove}
            />
          </div>

          <div className="agreements">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.privacyAgreed}
                onChange={(e) =>
                  setFormData({ ...formData, privacyAgreed: e.target.checked })
                }
                required
              />
              개인정보 수집 및 활용 고지에 동의합니다.
            </label>
            <div className="agreement-box">
              <p className="agreement-text">
                <strong>작가님의 답변이 도착하는 즉시 알려드릴게요!</strong>
                <br />
                HOXY에서 직접 검증한 작가님입니다.
                <br />
                취합한 고객님의 개인정보는
                <br />
                답변 알림 목적으로만 이용되며,
                <br />
                삭제 요청을 주시기 전까지 보유합니다.
                <br />
                미동의시, 작가님의 답변 알림을 받을 수 없어요.
              </p>
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? '전송 중...' : '예약 문의하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
