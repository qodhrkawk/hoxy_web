import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { networkManager } from '../utils/NetworkManager'
import './BookingDetail.css'

// Supabase 클라이언트 초기화
const supabase = createClient(
  'https://yhqtlluugbhmuqpwfmtg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlocXRsbHV1Z2JobXVxcHdmbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjc4NTYsImV4cCI6MjA3MDc0Mzg1Nn0.q0x91m_KX5GTvDyONnJd18i0bvE1x8Qy4TqQHA6G9M8'
)

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
  type?: string
  content?: any
  isRead?: boolean
  imageUrls?: string[]
  isUploading?: boolean
}

export default function BookingDetail() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [artistName, setArtistName] = useState<string>('작가님')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    // 작가 정보 로드
    const artistInfoStr = localStorage.getItem('artistInfo')
    if (artistInfoStr) {
      try {
        const artistInfo = JSON.parse(artistInfoStr)
        setArtistName(artistInfo.brand_name || artistInfo.name || '작가님')
      } catch {
        // 파싱 실패 시 기본값 유지
      }
    }

    // 예약 생성 시 저장해 둔 chatId로 메시지 조회
    const storedChatId = localStorage.getItem('chatId')
    console.log('[BookingDetail] loaded chatId from localStorage:', storedChatId)

    if (storedChatId) {
      ;(async () => {
        try {
          // phone number를 localStorage에서 직접 가져와서 Authorization 헤더에 사용
          const bookingDataStr = localStorage.getItem('bookingData')
          let phoneWithoutHyphens = ''
          if (bookingDataStr) {
            try {
              const bookingData = JSON.parse(bookingDataStr)
              phoneWithoutHyphens = bookingData?.phone?.replace(/-/g, '') || ''
            } catch (e) {
              console.error('[BookingDetail] failed to parse bookingData:', e)
            }
          }
          
          // phone number가 없으면 에러
          if (!phoneWithoutHyphens) {
            console.error('[BookingDetail] phone number not found in bookingData')
            return
          }
          
          // GET 요청에 phone number를 쿼리 파라미터로 추가 (서버가 phone으로 인증)
          const params = { phone: phoneWithoutHyphens }
          
          console.log('[BookingDetail] fetching messages for chatId:', storedChatId, 'with phone:', phoneWithoutHyphens ? 'present' : 'missing')
          console.log('[BookingDetail] GET request params:', JSON.stringify(params, null, 2))
          const res: any = await networkManager.get(`/v1/chats/${storedChatId}/messages`, params, undefined)
          console.log('[BookingDetail] messages response:', JSON.stringify(res, null, 2))
          const apiMessages: any[] = Array.isArray(res?.messages) ? res.messages : []

          // timestamp 기준으로 정렬 (오래된 것부터)
          const sortedMessages = apiMessages.sort((a, b) => {
            const timeA = new Date(a.created_at).getTime()
            const timeB = new Date(b.created_at).getTime()
            return timeA - timeB
          })

          const mapped: ChatMessage[] = sortedMessages.map((m) => {
            const created = m.created_at ? new Date(m.created_at) : new Date()
            const hours = created.getHours()
            const minutes = created.getMinutes()
            const period = hours >= 12 ? '오후' : '오전'
            const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
            const time = `${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`

            // 메시지 텍스트 추출
            let text = m.text ?? ''
            let parsedContent = null

            // reservationInquiry 타입은 content를 파싱해서 저장
            if (m.type === 'reservationInquiry' && m.content) {
              try {
                parsedContent = typeof m.content === 'string' ? JSON.parse(m.content) : m.content
              } catch {
                parsedContent = null
              }
            }

            if (!text && m.content && m.type !== 'reservationInquiry') {
              try {
                const content = typeof m.content === 'string' ? JSON.parse(m.content) : m.content
                if (m.type === 'confirmReservation') {
                  text = `예약 확인: ${content.productName || '상품'} - ${content.confirmedDate || '날짜'}`
                } else {
                  text = typeof content === 'string' ? content : JSON.stringify(content)
                }
              } catch {
                text = String(m.content)
              }
            }

            // 이미지 URL 파싱
            let imageUrls: string[] = []
            if (m.media_url) {
              console.log('[BookingDetail] parsing media_url:', m.media_url, 'type:', typeof m.media_url)
              if (Array.isArray(m.media_url)) {
                // 이미 배열인 경우
                imageUrls = m.media_url
              } else if (typeof m.media_url === 'string') {
                // 문자열인 경우
                if (m.media_url.startsWith('[')) {
                  // JSON 배열 문자열
                  try {
                    imageUrls = JSON.parse(m.media_url)
                  } catch (e) {
                    console.error('[BookingDetail] failed to parse JSON array:', e)
                    imageUrls = []
                  }
                } else {
                  // 단일 URL 문자열
                  imageUrls = [m.media_url]
                }
              }
              console.log('[BookingDetail] parsed imageUrls:', imageUrls)
            }

            return {
              id: String(m.id),
              text: text || '',
              timestamp: time,
              isUser: m.sender === 'customer',
              type: m.type,
              content: parsedContent,
              isRead: m.isRead || false,
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            }
          })
          console.log('[BookingDetail] mapped messages:', mapped)
          setMessages(mapped)

          // 메시지 로드 완료 후 읽음 처리
          markMessagesAsRead()
        } catch (err) {
          console.error('[BookingDetail] failed to load chat messages:', err)
        }
      })()
    } else {
      console.warn('[BookingDetail] chatId not found in localStorage')
    }
  }, [])

  // Supabase 실시간 구독
  useEffect(() => {
    const storedChatId = localStorage.getItem('chatId')
    if (!storedChatId) return

    console.log('[BookingDetail] setting up realtime subscription for chatId:', storedChatId)

    // messages 테이블의 INSERT 이벤트 구독
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${storedChatId}`,
        },
        (payload) => {
          console.log('[BookingDetail] realtime message received:', payload)
          const newMsg = payload.new as any

          // 메시지 포맷 변환
          const created = newMsg.created_at ? new Date(newMsg.created_at) : new Date()
          const hours = created.getHours()
          const minutes = created.getMinutes()
          const period = hours >= 12 ? '오후' : '오전'
          const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
          const time = `${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`

          let text = newMsg.text ?? ''
          let parsedContent = null

          // reservationInquiry 타입은 content를 파싱
          if (newMsg.type === 'reservationInquiry' && newMsg.content) {
            try {
              parsedContent = typeof newMsg.content === 'string' ? JSON.parse(newMsg.content) : newMsg.content
            } catch {
              parsedContent = null
            }
          }

          if (!text && newMsg.content && newMsg.type !== 'reservationInquiry') {
            try {
              const content = typeof newMsg.content === 'string' ? JSON.parse(newMsg.content) : newMsg.content
              if (newMsg.type === 'confirmReservation') {
                text = `예약 확인: ${content.productName || '상품'} - ${content.confirmedDate || '날짜'}`
              } else {
                text = typeof content === 'string' ? content : JSON.stringify(content)
              }
            } catch {
              text = String(newMsg.content)
            }
          }

          // 이미지 URL 파싱 (실시간)
          let imageUrls: string[] = []
          if (newMsg.media_url) {
            console.log('[BookingDetail] realtime parsing media_url:', newMsg.media_url, 'type:', typeof newMsg.media_url)
            if (Array.isArray(newMsg.media_url)) {
              // 이미 배열인 경우
              imageUrls = newMsg.media_url
            } else if (typeof newMsg.media_url === 'string') {
              // 문자열인 경우
              if (newMsg.media_url.startsWith('[')) {
                // JSON 배열 문자열
                try {
                  imageUrls = JSON.parse(newMsg.media_url)
                } catch (e) {
                  console.error('[BookingDetail] realtime failed to parse JSON array:', e)
                  imageUrls = []
                }
              } else {
                // 단일 URL 문자열
                imageUrls = [newMsg.media_url]
              }
            }
            console.log('[BookingDetail] realtime parsed imageUrls:', imageUrls)
          }

          const chatMessage: ChatMessage = {
            id: String(newMsg.id),
            text: text || '',
            timestamp: time,
            isUser: newMsg.sender === 'customer',
            type: newMsg.type,
            content: parsedContent,
            isRead: newMsg.isRead || false,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          }

          // 중복 방지: 이미 존재하는 메시지는 추가하지 않음
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === chatMessage.id)
            if (exists) return prev
            return [...prev, chatMessage]
          })

          // 새 메시지 수신 시 읽음 처리
          markMessagesAsRead()
        }
      )
      .subscribe()

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[BookingDetail] unsubscribing from realtime channel')
      supabase.removeChannel(channel)
    }
  }, [])


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

  // 메시지 읽음 처리
  const markMessagesAsRead = async () => {
    const storedChatId = localStorage.getItem('chatId')
    const bookingDataStr = localStorage.getItem('bookingData')

    if (!storedChatId) return

    let phone = ''
    if (bookingDataStr) {
      try {
        const bookingData = JSON.parse(bookingDataStr)
        phone = bookingData?.phone?.replace(/-/g, '') || ''
      } catch (e) {
        console.error('[BookingDetail] failed to parse bookingData for read:', e)
        return
      }
    }

    if (!phone) {
      console.error('[BookingDetail] phone number not found for read')
      return
    }

    try {
      await networkManager.post(`/v1/chats/${storedChatId}/read`, { phone }, undefined)
      console.log('[BookingDetail] marked messages as read')
    } catch (err) {
      console.error('[BookingDetail] failed to mark messages as read:', err)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 최대 10개 제한
    if (files.length > 10) {
      alert('이미지는 최대 10개까지 선택할 수 있습니다.')
      return
    }

    // 각 파일 크기 확인 (10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        alert(`파일 크기는 10MB를 초과할 수 없습니다: ${files[i].name}`)
        return
      }
    }

    const storedChatId = localStorage.getItem('chatId')
    const bookingDataStr = localStorage.getItem('bookingData')
    let phone = ''
    if (bookingDataStr) {
      try {
        const bookingData = JSON.parse(bookingDataStr)
        phone = bookingData?.phone?.replace(/-/g, '') || ''
      } catch (e) {
        console.error('[BookingDetail] failed to parse bookingData:', e)
      }
    }

    if (!storedChatId) {
      console.error('[BookingDetail] chatId not found')
      alert('채팅방 정보를 찾을 수 없습니다.')
      return
    }

    if (!phone) {
      console.error('[BookingDetail] phone number not found')
      alert('전화번호 정보를 찾을 수 없습니다.')
      return
    }

    // 로컬 이미지를 Data URL로 읽기
    const readFilesAsDataURL = async (files: FileList): Promise<string[]> => {
      const promises = Array.from(files).map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      })
      return Promise.all(promises)
    }

    // tempId를 try 밖에서 선언 (catch 블록에서도 접근 가능하도록)
    const tempId = `temp-${Date.now()}`

    try {
      // 임시 이미지 URL 생성
      const tempImageUrls = await readFilesAsDataURL(files)

      // 낙관적 업데이트: 로컬에 먼저 표시 (업로딩 상태)
      const tempMessage: ChatMessage = {
        id: tempId,
        text: '',
        timestamp: getCurrentTime(),
        isUser: true,
        type: 'image',
        imageUrls: tempImageUrls,
        isUploading: true,
        isRead: false,
      }
      setMessages((prev) => [...prev, tempMessage])

      const formData = new FormData()
      formData.append('sender', 'customer')
      formData.append('phone', phone)

      // 모든 이미지를 images 필드에 추가
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      console.log('[BookingDetail] uploading images:', files.length, 'files')

      // multipart/form-data로 전송
      const response = await fetch(`${networkManager.getBaseURL()}/v1/chats/${storedChatId}/messages/image`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('[BookingDetail] image upload response:', JSON.stringify(result, null, 2))

      // 업로드 성공: 임시 메시지 제거 (서버 응답이 realtime으로 올 것)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } catch (err) {
      console.error('[BookingDetail] failed to upload images:', err)
      alert('이미지 전송에 실패했습니다. 다시 시도해 주세요.')

      // 실패 시 임시 메시지 제거
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      // file input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const messageText = message.trim()
    setMessage('') // 입력 필드 먼저 비우기

    // 로컬에 먼저 표시 (낙관적 업데이트)
    const tempId = String(Date.now())
    const newMessage: ChatMessage = {
      id: tempId,
      text: messageText,
      timestamp: getCurrentTime(),
      isUser: true,
      type: 'text',
      isRead: false, // 전송한 메시지는 초기에 안읽음 상태
    }
    setMessages([...messages, newMessage])

    // 서버로 메시지 전송
    const storedChatId = localStorage.getItem('chatId')

    // phone number를 localStorage에서 직접 가져오기
    const bookingDataStr = localStorage.getItem('bookingData')
    let phone = ''
    if (bookingDataStr) {
      try {
        const bookingData = JSON.parse(bookingDataStr)
        phone = bookingData?.phone?.replace(/-/g, '') || ''
      } catch (e) {
        console.error('[BookingDetail] failed to parse bookingData:', e)
      }
    }

    if (!storedChatId) {
      console.error('[BookingDetail] chatId not found')
      return
    }

    if (!phone) {
      console.error('[BookingDetail] phone number not found')
      alert('전화번호 정보를 찾을 수 없습니다.')
      return
    }

    try {
      const body: any = {
        text: messageText,
        sender: 'customer',
        type: 'text',
      }

      // sender가 customer인 경우 phone 필수
      if (phone) {
        body.phone = phone
      }

      console.log('[BookingDetail] sending message:', body)
      const response: any = await networkManager.post(`/v1/chats/${storedChatId}/messages`, body, undefined)
      console.log('[BookingDetail] message sent response:', JSON.stringify(response, null, 2))

      // 서버 응답으로 메시지 ID 업데이트 (필요시)
      if (response?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: String(response.id) } : m))
        )
      }
    } catch (err) {
      console.error('[BookingDetail] failed to send message:', err)
      // 실패 시 로컬 메시지 제거 또는 에러 표시
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert('메시지 전송에 실패했습니다. 다시 시도해 주세요.')
      setMessage(messageText) // 입력 필드에 다시 넣기
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-content">
        <h1 className="chat-header">{artistName}</h1>

        <div className="welcome-message">
          <p>
            <strong>HOXY</strong>에서 검증한 작가님이 직접 응대하고 있습니다.
            <br />
            촬영 서비스의 품질·이행 책임은 전적으로 작가에게 있습니다.
          </p>
        </div>

        <div className="date-separator">{formatDateSeparator()}</div>

        {messages.map((msg) => {
          // 이미지 메시지: imageUrls가 있으면 이미지로 표시
          if (msg.imageUrls && msg.imageUrls.length > 0) {
            const renderImageLayout = () => {
              const count = msg.imageUrls!.length
              const rows: JSX.Element[] = []

              if (count === 1) {
                // 1개: 200x200
                rows.push(
                  <div key="row-0" className="image-row">
                    <div className="image-item image-single">
                      <img src={msg.imageUrls![0]} alt="이미지" />
                    </div>
                  </div>
                )
              } else {
                // 2개 이상: 2개씩 묶기
                let index = 0
                let rowIndex = 0

                while (index < count) {
                  const remainingCount = count - index
                  const currentRow: JSX.Element[] = []

                  if (remainingCount === 1) {
                    // 마지막 1개: 282x140 (가로로 길게)
                    currentRow.push(
                      <div key={`img-${index}`} className="image-item image-wide">
                        <img src={msg.imageUrls![index]} alt="이미지" />
                      </div>
                    )
                    index++
                  } else {
                    // 2개: 140x140 두 개
                    for (let i = 0; i < 2; i++) {
                      currentRow.push(
                        <div key={`img-${index}`} className="image-item image-double">
                          <img src={msg.imageUrls![index]} alt="이미지" />
                        </div>
                      )
                      index++
                      if (index >= count) break
                    }
                  }

                  rows.push(
                    <div key={`row-${rowIndex}`} className="image-row">
                      {currentRow}
                    </div>
                  )
                  rowIndex++
                }
              }

              return rows
            }

            return (
              <div key={msg.id} className={`message-group ${msg.isUser ? 'right' : 'left'}`}>
                {msg.isUser ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div className="read-status">{msg.isRead ? '읽음' : '안읽음'}</div>
                      <div className="timestamp">{msg.timestamp}</div>
                    </div>
                    <div className="image-message-container">
                      {renderImageLayout()}
                      {msg.isUploading && (
                        <div className="upload-overlay">
                          <div className="spinner"></div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="image-message-container">
                      {renderImageLayout()}
                      {msg.isUploading && (
                        <div className="upload-overlay">
                          <div className="spinner"></div>
                        </div>
                      )}
                    </div>
                    <div className="timestamp">{msg.timestamp}</div>
                  </>
                )}
              </div>
            )
          }

          // reservationInquiry 타입 메시지: 예약 접수 카드만 표시
          if (msg.type === 'reservationInquiry') {
            // content가 없으면 렌더링하지 않음 (오류 방지)
            if (!msg.content) return null

            const content = msg.content
            const dateCandidates = content.dateCandidates || []

            // 날짜 포맷 함수 (YYYY-MM-DD -> YYYY. M. D(요일))
            const formatDateFromString = (dateStr: string) => {
              const d = new Date(dateStr)
              const days = ['일', '월', '화', '수', '목', '금', '토']
              return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}(${days[d.getDay()]})`
            }

            return (
              <div key={msg.id} className="message-group right">
                <div className="timestamp">{msg.timestamp}</div>
                <div className="booking-card">
                  <h3 className="card-title">
                    <img src="/images/hoxy.png" alt="HOXY" className="card-icon" />
                    예약 접수
                  </h3>
                  <div className="card-content">
                    <div className="info-row">
                      <span className="label">희망 스냅 상품</span>
                      <span className="value">{content.productName || '상품'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">희망 촬영 날짜</span>
                      <div className="value dates">
                        {dateCandidates[0] && <div>1순위  {formatDateFromString(dateCandidates[0])}</div>}
                        {dateCandidates[1] && <div>2순위  {formatDateFromString(dateCandidates[1])}</div>}
                        {dateCandidates[2] && <div>3순위  {formatDateFromString(dateCandidates[2])}</div>}
                      </div>
                    </div>
                    <div className="info-row">
                      <span className="label">이름</span>
                      <span className="value">{bookingData?.name || '-'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">휴대폰 번호</span>
                      <span className="value">{bookingData?.phone || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // 일반 텍스트 타입 사용자 메시지: 오른쪽
          if (msg.isUser && msg.type === 'text') {
            return (
              <div key={msg.id} className="message-group right">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <div className="read-status">{msg.isRead ? '읽음' : '안읽음'}</div>
                  <div className="timestamp">{msg.timestamp}</div>
                </div>
                <div className="user-message">
                  <p>{msg.text}</p>
                </div>
              </div>
            )
          }

          // system 타입 메시지 (AI): 왼쪽 HOXY AI 카드
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="message-group left">
                <div className="ai-card">
                  <h3 className="card-title">
                    <img src="/images/hoxy.png" alt="HOXY" className="card-icon" />
                    HOXY AI
                  </h3>
                  <div className="card-content">
                    <p>{msg.text}</p>
                  </div>
                </div>
                <div className="timestamp">{msg.timestamp}</div>
              </div>
            )
          }

          // author 메시지: 왼쪽 일반 버블 (타이틀/이미지 없음)
          if (!msg.isUser) {
            return (
              <div key={msg.id} className="message-group left">
                <div className="author-message">
                  <p>{msg.text}</p>
                </div>
                <div className="timestamp">{msg.timestamp}</div>
              </div>
            )
          }

          // 그 외 타입은 렌더링하지 않음
          return null
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        <button
          className="add-button"
          onClick={() => fileInputRef.current?.click()}
        >
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
