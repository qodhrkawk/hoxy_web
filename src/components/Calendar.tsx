import { useState } from 'react'
import './Calendar.css'

interface CalendarProps {
  selectedDates: {
    date1: Date | null
    date2: Date | null
    date3: Date | null
  }
  onDateSelect: (priority: 1 | 2 | 3, date: Date | null) => void
  onDateRemove: (priority: 1 | 2 | 3) => void
}

export default function Calendar({ selectedDates, onDateSelect, onDateRemove }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // 이전 달 날짜들
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1)
      days.push(prevDate)
    }

    // 현재 달 날짜들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    // 다음 달 날짜들
    const remainingDays = 42 - days.length // 6주 x 7일
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }

  const formatMonth = (date: Date) => {
    return `${date.getFullYear()}. ${date.getMonth() + 1}`
  }

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return null
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${year}. ${month}. ${day}(${dayOfWeek})`
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isSelected = (date: Date) => {
    const dateStr = date.toDateString()
    return (
      selectedDates.date1?.toDateString() === dateStr ||
      selectedDates.date2?.toDateString() === dateStr ||
      selectedDates.date3?.toDateString() === dateStr
    )
  }

  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate < today
  }

  const handleDateClick = (date: Date) => {
    if (!isCurrentMonth(date)) return
    if (isPastDate(date)) return

    const dateStr = date.toDateString()

    // 이미 선택된 날짜인지 확인하고, 해당 순위 찾기
    let selectedPriority: 1 | 2 | 3 | null = null
    if (selectedDates.date1?.toDateString() === dateStr) selectedPriority = 1
    else if (selectedDates.date2?.toDateString() === dateStr) selectedPriority = 2
    else if (selectedDates.date3?.toDateString() === dateStr) selectedPriority = 3

    // 이미 선택된 날짜를 다시 클릭하면 해당 날짜 제거 및 순위 재정렬
    if (selectedPriority !== null) {
      onDateRemove(selectedPriority)
      return
    }

    // 새로운 날짜 선택 - 비어있는 첫 번째 순위에 할당
    if (!selectedDates.date1) {
      onDateSelect(1, date)
    } else if (!selectedDates.date2) {
      onDateSelect(2, date)
    } else if (!selectedDates.date3) {
      onDateSelect(3, date)
    } else {
      // 모두 차있으면 3순위 교체
      onDateSelect(3, date)
    }
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const days = getDaysInMonth(currentMonth)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="calendar-wrapper">
      <div className="calendar-container">
        <div className="calendar-header">
          <button type="button" className="month-nav" onClick={handlePrevMonth}>
            ‹
          </button>
          <div className="month-label">{formatMonth(currentMonth)}</div>
          <button type="button" className="month-nav" onClick={handleNextMonth}>
            ›
          </button>
        </div>

        <div className="weekdays">
          {weekDays.map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="days-grid">
          {days.map((date, index) => {
            if (!date) return <div key={index} className="day empty"></div>
            const isCurrentMonthDate = isCurrentMonth(date)
            const isSelectedDate = isSelected(date)
            const isPast = isPastDate(date)

            return (
              <button
                key={index}
                type="button"
                className={`day ${!isCurrentMonthDate ? 'other-month' : ''} ${
                  isSelectedDate ? 'selected' : ''
                } ${isPast ? 'disabled' : ''}`}
                onClick={() => handleDateClick(date)}
                disabled={isPast}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="date-selection-summary">
        <div className="summary-header">3순위까지 선택 가능 (1·2순위 필수)</div>
        <div className="selected-dates">
          <div className="selected-date-item">
            <span className="priority-label">1순위</span>
            <span className="selected-date-value">
              {formatSelectedDate(selectedDates.date1) || '날짜를 선택해 주세요'}
            </span>
          </div>
          <div className="selected-date-item">
            <span className="priority-label">2순위</span>
            <span className="selected-date-value">
              {formatSelectedDate(selectedDates.date2) || '날짜를 선택해 주세요'}
            </span>
          </div>
          <div className="selected-date-item">
            <span className="priority-label">3순위</span>
            <span className="selected-date-value">
              {formatSelectedDate(selectedDates.date3) || '날짜를 선택해 주세요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
