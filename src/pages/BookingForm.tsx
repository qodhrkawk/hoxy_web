import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar'
import './BookingForm.css'

interface BookingFormProps {
  productOptions?: string[]
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

export default function BookingForm({ productOptions }: BookingFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<BookingData>({
    name: '',
    phone: '',
    product: '',
    date1: null,
    date2: null,
    date3: null,
    privacyAgreed: false,
    termsAgreed: false,
  })

  // 필수 필드 모두 채워졌는지 확인
  const isFormValid =
    formData.name.trim() !== '' &&
    formData.phone.trim() !== '' &&
    formData.product !== '' &&
    formData.date1 !== null &&
    formData.date2 !== null &&
    formData.privacyAgreed

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      return
    }

    // 예약 데이터를 localStorage에 저장
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
              <option value="">스냅 상품을 선택해 주세요</option>
              {(productOptions && productOptions.length > 0
                ? productOptions
                : ['상품 1', '상품 2', '상품 3']
              ).map((p) => (
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
                <img src="/images/LOGO.png" alt="HOXY" className="inline-logo" />
                에서 검증한 작가님으로
                <br />
                고객님의 개인정보는 상담 답변 알림 목적으로만 이용되며,
                <br />
                삭제 요청을 주시기 전까지 보유합니다.
                <br />
                제휴하시지 않으면 상담 답변 알림을 받을 수 없어요.
              </p>
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={!isFormValid}>
            예약 문의하기
          </button>
        </form>
      </div>
    </div>
  )
}
