import { useState, useEffect, useRef } from 'react'
import { networkManager } from '../utils/NetworkManager'
import './BookingDetail.css'

interface BookingData {
  name: string
  phone: string
  product: string
  date1: Date | null
  date2: Date | null
  date3: Date | null
}

interface ChatMessage {
  id: string
  text: string
  timestamp: string
  isUser: boolean
}

export default function BookingDetail() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const data = localStorage.getItem('bookingData')
    if (data) {
      const parsed = JSON.parse(data)
      // Date 문자열을 Date 객체로 변환
      if (parsed.date1) parsed.date1 = new Date(parsed.date1)
      if (parsed.date2) parsed.date2 = new Date(parsed.date2)
      if (parsed.date3) parsed.date3 = new Date(parsed.date3)
      setBookingData(parsed)
    }

    // 예약 생성 시 저장해 둔 chatId로 메시지 조회
    const storedChatId = localStorage.getItem('chatId')
    console.log('[BookingDetail] loaded chatId from localStorage:', storedChatId)
    
    // 예약 응답에 포함된 첫 메시지 먼저 표시
    const initialMessageStr = localStorage.getItem('initialMessage')
    if (initialMessageStr) {
      try {
        const initialMsg: any = JSON.parse(initialMessageStr)
        console.log('[BookingDetail] initial message from reservation response:', initialMsg)
        
        const created = initialMsg.created_at ? new Date(initialMsg.created_at) : new Date()
        const time = `${created.getHours().toString().padStart(2, '0')}:${created.getMinutes().toString().padStart(2, '0')}`
        
        // confirmReservation 타입 메시지는 content를 파싱해서 표시
        let displayText = ''
        if (initialMsg.type === 'confirmReservation' && initialMsg.content) {
          try {
            const content = JSON.parse(initialMsg.content)
            displayText = `예약 확인: ${content.productName || '상품'} - ${content.confirmedDate || '날짜'}`
          } catch {
            displayText = initialMsg.content
          }
        } else {
          displayText = initialMsg.text || initialMsg.content || '예약이 접수되었습니다.'
        }
        
        const initialChatMessage: ChatMessage = {
          id: String(initialMsg.id),
          text: displayText,
          timestamp: time,
          isUser: initialMsg.sender === 'customer',
        }
        setMessages([initialChatMessage])
        // 표시 후 localStorage에서 제거 (중복 방지)
        localStorage.removeItem('initialMessage')
      } catch (err) {
        console.error('[BookingDetail] failed to parse initial message:', err)
      }
    }
    
    if (storedChatId) {
      ;(async () => {
        try {
          console.log('[BookingDetail] fetching messages for chatId:', storedChatId)
          const res: any = await networkManager.get(`/v1/chats/${storedChatId}/messages`)
          console.log('[BookingDetail] messages response:', res)
          const apiMessages: any[] = Array.isArray(res?.messages) ? res.messages : []
          const mapped: ChatMessage[] = apiMessages.map((m) => {
            const created = m.created_at ? new Date(m.created_at) : new Date()
            const time = `${created.getHours().toString().padStart(2, '0')}:${created
              .getMinutes()
              .toString()
              .padStart(2, '0')}`
            return {
              id: String(m.id),
              text: m.text ?? m.content ?? '',
              timestamp: time,
              isUser: m.sender === 'customer',
            }
          })
          console.log('[BookingDetail] mapped messages:', mapped)
          // 초기 메시지가 있으면 그 뒤에 추가, 없으면 전체 교체
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const newMessages = mapped.filter((m) => !existingIds.has(m.id))
            return [...prev, ...newMessages]
          })
        } catch (err) {
          console.error('[BookingDetail] failed to load chat messages:', err)
        }
      })()
    } else {
      console.warn('[BookingDetail] chatId not found in localStorage')
    }
  }, [])

  const formatDate = (date: Date | null) => {
    if (!date) return '날짜 미정'
    const d = new Date(date)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}(${days[d.getDay()]})`
  }

  const formatDateSeparator = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const dayName = days[today.getDay()]
    return `${year}년 ${month}월 ${day}일 ${dayName}`
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getCurrentTime = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: ChatMessage = {
        id: String(Date.now()),
        text: message,
        timestamp: getCurrentTime(),
        isUser: true,
      }
      setMessages([...messages, newMessage])
      setMessage('')
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-content">
        <h1 className="chat-header">{'{'}작가명{'}'}</h1>

        <div className="welcome-message">
          <p>
            <strong>HOXY</strong>에서 검증한 작가님이 직접 응대하고 있습니다.
            <br />
            촬영 서비스의 품질·이행 책임은 전적으로 작가에게 있습니다.
          </p>
        </div>

        <div className="date-separator">{formatDateSeparator()}</div>

        <div className="message-group right">
          <div className="timestamp">안읽음<br />오후 8:35</div>
          <div className="booking-card">
            <h3 className="card-title">
              <span className="icon">📋</span> 예약 접수
            </h3>
            <div className="card-content">
              <div className="info-row">
                <span className="label">희망 스냅 상품</span>
                <span className="value">{bookingData?.product || '제주 야외 스냅'}</span>
              </div>
              <div className="info-row">
                <span className="label">희망 촬영 날짜</span>
                <div className="value dates">
                  <div>1순위  {formatDate(bookingData?.date1 ?? null)}</div>
                  <div>2순위  {formatDate(bookingData?.date2 ?? null)}</div>
                  {bookingData?.date3 && <div>3순위  {formatDate(bookingData?.date3)}</div>}
                </div>
              </div>
              <div className="info-row">
                <span className="label">이름</span>
                <span className="value">{bookingData?.name || '정다비'}</span>
              </div>
              <div className="info-row">
                <span className="label">휴대폰 번호</span>
                <span className="value">{bookingData?.phone || '010-9483-4031'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="message-group left">
          <div className="ai-card">
            <h3 className="card-title">
              <span className="icon">🤖</span> HOXY AI
            </h3>
            <div className="card-content">
              <p>
                작가님 일정을 확인해보니, 희망하시는 모든 날짜에 촬영이 가능할 것 같아요! ✨
                <br />
                작가님의 확인 후 빠르게 답장 주실 거예요.
                <br />
                답장이 도착하면 카카오 알림톡으로 바로 안내드릴게요! 💌
              </p>
              <p>
                원하시는 시간대/촬영지역/컨셉도 함께 남겨 주시면 상담진행에 큰 도움이 될 수 있어요!
              </p>
            </div>
          </div>
          <div className="timestamp">읽음<br />오후 8:35</div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className="message-group right">
            <div className="timestamp">읽음<br />{msg.timestamp}</div>
            <div className="user-message">
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <button className="add-button">
          <img src="/images/plus.png" alt="추가" />
        </button>
        <div className="input-wrapper">
          <input
            type="text"
            className="message-input"
            placeholder="메시지를 입력해 주세요"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && message.trim() && handleSendMessage()}
          />
          <button
            className={`send-button ${message.trim() ? 'active' : ''}`}
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <img src="/images/send.png" alt="전송" />
          </button>
        </div>
      </div>
    </div>
  )
}
