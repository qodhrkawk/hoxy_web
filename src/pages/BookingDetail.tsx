import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
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
  dateString?: string // YYYY-MM-DD 형식
}

export default function BookingDetail() {
  const { chatId: urlChatId } = useParams<{ chatId: string }>()
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [artistName, setArtistName] = useState<string>('작가님')
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [showCustomerInfoForm, setShowCustomerInfoForm] = useState(!!urlChatId)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isPhoneValid, setIsPhoneValid] = useState(true)
  const [linkResponseData, setLinkResponseData] = useState<any>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // URL에서 token이 온 경우 서버에서 정보 조회
    if (urlChatId) {
      console.log('[BookingDetail] token from URL:', urlChatId)

      // 이미 검증된 토큰인지 확인
      const verifiedDataStr = localStorage.getItem(`verified_chat_${urlChatId}`)
      if (verifiedDataStr) {
        try {
          const verifiedData = JSON.parse(verifiedDataStr)
          console.log('[BookingDetail] ✓ Found verified chat data:', verifiedData)

          // chatId와 작가 정보 복원
          if (verifiedData.chatId) {
            localStorage.setItem('chatId', verifiedData.chatId)
          }
          if (verifiedData.artistInfo) {
            localStorage.setItem('artistInfo', JSON.stringify(verifiedData.artistInfo))
            setArtistName(verifiedData.artistInfo.brand_name || verifiedData.artistInfo.name || '작가님')
          }
          if (verifiedData.bookingData) {
            localStorage.setItem('bookingData', JSON.stringify(verifiedData.bookingData))
            setBookingData(verifiedData.bookingData)
          }

          // 바로 채팅 로드
          console.log('[BookingDetail] → Auto-loading chat (already verified)')
          setShowCustomerInfoForm(false)
          ;(async () => {
            await loadChatMessages()
          })()
          return
        } catch (e) {
          console.error('[BookingDetail] failed to parse verified data:', e)
          // 파싱 실패 시 계속 진행 (아래 API 호출)
        }
      }

      ;(async () => {
        try {
          // 토큰으로 링크 정보 조회
          const linkResponse: any = await networkManager.get(`/v1/chats/links/${urlChatId}`, {}, undefined)
          console.log('[BookingDetail] ===== Link Response =====')
          console.log('[BookingDetail] Full response:', JSON.stringify(linkResponse, null, 2))

          // response 저장 (나중에 검증에 사용)
          setLinkResponseData(linkResponse)

          // chatId 저장
          const chatId = linkResponse.chat?.id
          if (chatId) {
            localStorage.setItem('chatId', chatId)
            console.log('[BookingDetail] ✓ Saved chatId:', chatId)
          } else {
            console.warn('[BookingDetail] ✗ No chatId in response')
          }

          // 작가 정보 저장
          if (linkResponse.author) {
            const authorInfo = {
              id: linkResponse.author.id,
              name: linkResponse.author.name,
              brand_name: linkResponse.author.brand_name,
              email: linkResponse.author.email,
            }
            localStorage.setItem('artistInfo', JSON.stringify(authorInfo))
            setArtistName(authorInfo.brand_name || authorInfo.name || '작가님')
            console.log('[BookingDetail] ✓ Saved author info:')
            console.log('  - ID:', authorInfo.id)
            console.log('  - Name:', authorInfo.name)
            console.log('  - Brand Name:', authorInfo.brand_name)
            console.log('  - Email:', authorInfo.email)
            console.log('  - Display Name:', authorInfo.brand_name || authorInfo.name)
          } else {
            console.warn('[BookingDetail] ✗ No author info in response')
          }

          // 전화번호 정보 로깅
          if (linkResponse.chat?.phone) {
            console.log('[BookingDetail] ✓ Phone number exists in response:', linkResponse.chat.phone)
          } else {
            console.log('[BookingDetail] ✗ No phone number in response')
          }

          // 고객 이름 정보 로깅
          if (linkResponse.customer_name) {
            console.log('[BookingDetail] ✓ Customer name exists in response:', linkResponse.customer_name)
          } else {
            console.log('[BookingDetail] ✗ No customer name in response')
          }

          // 고객 정보 입력 폼 표시
          console.log('[BookingDetail] → Showing customer info form')
          setShowCustomerInfoForm(true)
        } catch (err) {
          console.error('[BookingDetail] failed to load link info:', err)
          // 에러 발생 시에도 폼 표시
          setShowCustomerInfoForm(true)
        }
      })()
      return
    }

    const data = localStorage.getItem('bookingData')
    let phoneWithoutHyphens = ''

    if (data) {
      const parsed = JSON.parse(data)
      // Date 문자열을 Date 객체로 변환
      if (parsed.date1) parsed.date1 = new Date(parsed.date1)
      if (parsed.date2) parsed.date2 = new Date(parsed.date2)
      if (parsed.date3) parsed.date3 = new Date(parsed.date3)
      setBookingData(parsed)
      phoneWithoutHyphens = parsed?.phone?.replace(/-/g, '') || ''
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

    // phone number가 없으면 고객 정보 입력 폼 표시
    if (!phoneWithoutHyphens) {
      console.log('[BookingDetail] no phone number found, showing customer info form')
      setShowCustomerInfoForm(true)
      return
    }

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

            // 날짜 문자열 (YYYY-MM-DD)
            const dateString = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`

            // 메시지 텍스트 추출
            let text = m.text ?? ''
            let parsedContent = null

            // reservationInquiry, confirmReservation 타입은 content를 파싱해서 저장
            if ((m.type === 'reservationInquiry' || m.type === 'confirmReservation') && m.content) {
              try {
                parsedContent = typeof m.content === 'string' ? JSON.parse(m.content) : m.content
                if (m.type === 'confirmReservation') {
                  console.log('[BookingDetail] confirmReservation content:', JSON.stringify(parsedContent, null, 2))
                }
              } catch {
                parsedContent = null
              }
            }

            if (!text && m.content && m.type !== 'reservationInquiry' && m.type !== 'confirmReservation') {
              try {
                const content = typeof m.content === 'string' ? JSON.parse(m.content) : m.content
                text = typeof content === 'string' ? content : JSON.stringify(content)
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
              dateString,
            }
          })
          console.log('[BookingDetail] mapped messages:', mapped)
          setMessages(mapped)

          // 메시지 로드 완료 후 읽음 처리
          markMessagesAsRead()

          // 상대방 메시지 이전의 내 메시지를 읽음 처리
          setTimeout(() => markPreviousMessagesAsRead(), 100)
        } catch (err) {
          console.error('[BookingDetail] failed to load chat messages:', err)
        }
      })()
    } else {
      console.warn('[BookingDetail] chatId not found in localStorage')
    }
  }, [urlChatId])

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

          // 날짜 문자열 (YYYY-MM-DD)
          const dateString = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`

          let text = newMsg.text ?? ''
          let parsedContent = null

          // reservationInquiry, confirmReservation 타입은 content를 파싱
          if ((newMsg.type === 'reservationInquiry' || newMsg.type === 'confirmReservation') && newMsg.content) {
            try {
              parsedContent = typeof newMsg.content === 'string' ? JSON.parse(newMsg.content) : newMsg.content
              if (newMsg.type === 'confirmReservation') {
                console.log('[BookingDetail] realtime confirmReservation content:', JSON.stringify(parsedContent, null, 2))
              }
            } catch {
              parsedContent = null
            }
          }

          if (!text && newMsg.content && newMsg.type !== 'reservationInquiry' && newMsg.type !== 'confirmReservation') {
            try {
              const content = typeof newMsg.content === 'string' ? JSON.parse(newMsg.content) : newMsg.content
              text = typeof content === 'string' ? content : JSON.stringify(content)
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
            dateString,
          }

          // 중복 방지: 이미 존재하는 메시지는 추가하지 않음
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === chatMessage.id)
            if (exists) return prev
            return [...prev, chatMessage]
          })

          // 새 메시지 수신 시 읽음 처리
          markMessagesAsRead()

          // 상대방 메시지인 경우 이전 내 메시지를 읽음 처리
          if (!chatMessage.isUser) {
            setTimeout(() => markPreviousMessagesAsRead(), 100)
          }
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

  // 상대방 메시지 이전의 내 메시지를 읽음 처리
  const markPreviousMessagesAsRead = () => {
    setMessages((prev) => {
      // 가장 마지막 상대방 메시지를 찾기
      let lastOpponentIndex = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i].isUser) {
          lastOpponentIndex = i
          break
        }
      }

      // 상대방 메시지가 없으면 처리 안함
      if (lastOpponentIndex === -1) return prev

      // 그 이전의 내 메시지들을 읽음 처리
      const updated = [...prev]
      for (let i = lastOpponentIndex - 1; i >= 0; i--) {
        if (updated[i].isUser) {
          // 이미 읽음 상태면 중단 (최적화)
          if (updated[i].isRead) break
          updated[i] = { ...updated[i], isRead: true }
        }
      }
      return updated
    })
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
      const now = new Date()
      const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const tempMessage: ChatMessage = {
        id: tempId,
        text: '',
        timestamp: getCurrentTime(),
        isUser: true,
        type: 'image',
        imageUrls: tempImageUrls,
        isUploading: true,
        isRead: false,
        dateString,
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

  // 이미지 클릭 시 모달 열기
  const handleImageClick = (images: string[], index: number) => {
    setSelectedImages(images)
    setSelectedImageIndex(index)
    setIsImageModalOpen(true)
  }

  // 모달 닫기
  const closeImageModal = () => {
    setIsImageModalOpen(false)
  }

  // 이전 이미지
  const showPreviousImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : selectedImages.length - 1))
  }

  // 다음 이미지
  const showNextImage = () => {
    setSelectedImageIndex((prev) => (prev < selectedImages.length - 1 ? prev + 1 : 0))
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isImageModalOpen) return
      if (e.key === 'Escape') {
        closeImageModal()
      } else if (e.key === 'ArrowLeft') {
        showPreviousImage()
      } else if (e.key === 'ArrowRight') {
        showNextImage()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isImageModalOpen, selectedImages.length])

  // 고객 정보 확인 처리
  const handleCustomerInfoSubmit = async () => {
    if (!customerName.trim()) {
      alert('이름을 입력해 주세요.')
      return
    }
    if (!customerPhone.trim()) {
      alert('휴대폰 번호를 입력해 주세요.')
      return
    }

    // 전화번호 형식 검증 (숫자만)
    const phoneDigits = customerPhone.replace(/-/g, '')
    if (!/^\d{10,11}$/.test(phoneDigits)) {
      alert('올바른 휴대폰 번호를 입력해 주세요.')
      return
    }

    // linkResponseData가 있으면 검증 수행
    if (linkResponseData) {
      const serverName = linkResponseData.customer_name || ''
      const serverPhone = linkResponseData.chat?.phone || ''

      console.log('[BookingDetail] Verifying customer info:')
      console.log('  - Input name:', customerName)
      console.log('  - Server name:', serverName)
      console.log('  - Input phone:', phoneDigits)
      console.log('  - Server phone:', serverPhone)

      // 이름과 전화번호 검증
      if (customerName !== serverName || phoneDigits !== serverPhone) {
        console.log('[BookingDetail] ✗ Verification failed')
        setShowErrorModal(true)
        return
      }

      console.log('[BookingDetail] ✓ Verification successful')

      // 검증 성공 시 verified 데이터 저장
      const verifiedData = {
        chatId: linkResponseData.chat?.id,
        artistInfo: {
          id: linkResponseData.author?.id,
          name: linkResponseData.author?.name,
          brand_name: linkResponseData.author?.brand_name,
          email: linkResponseData.author?.email,
        },
        bookingData: {
          name: customerName,
          phone: customerPhone,
          product: '',
          date1: null,
          date2: null,
          date3: null,
        },
        verifiedAt: new Date().toISOString(),
      }
      localStorage.setItem(`verified_chat_${urlChatId}`, JSON.stringify(verifiedData))
      console.log('[BookingDetail] ✓ Saved verified chat data for token:', urlChatId)
    }

    // localStorage에 저장
    const bookingData = {
      name: customerName,
      phone: customerPhone,
      product: '',
      date1: null,
      date2: null,
      date3: null,
    }
    localStorage.setItem('bookingData', JSON.stringify(bookingData))
    setBookingData(bookingData)

    // 폼 숨기기
    setShowCustomerInfoForm(false)

    // linkResponseData가 있으면 직접 메시지 로드, 없으면 페이지 새로고침
    if (linkResponseData) {
      // 메시지 로드 로직 실행
      await loadChatMessages()
    } else {
      // 페이지 새로고침하여 채팅 로드
      window.location.reload()
    }
  }

  // 채팅 메시지 로드 함수
  const loadChatMessages = async () => {
    const storedChatId = localStorage.getItem('chatId')
    if (!storedChatId) {
      console.error('[BookingDetail] chatId not found')
      return
    }

    const bookingDataStr = localStorage.getItem('bookingData')
    let phoneWithoutHyphens = ''
    if (bookingDataStr) {
      try {
        const bookingData = JSON.parse(bookingDataStr)
        phoneWithoutHyphens = bookingData?.phone?.replace(/-/g, '') || ''
      } catch (e) {
        console.error('[BookingDetail] failed to parse bookingData:', e)
        return
      }
    }

    if (!phoneWithoutHyphens) {
      console.error('[BookingDetail] phone number not found')
      return
    }

    try {
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

        // 날짜 문자열 (YYYY-MM-DD)
        const dateString = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`

        // 메시지 텍스트 추출
        let text = m.text ?? ''
        let parsedContent = null

        // reservationInquiry, confirmReservation 타입은 content를 파싱해서 저장
        if ((m.type === 'reservationInquiry' || m.type === 'confirmReservation') && m.content) {
          try {
            parsedContent = typeof m.content === 'string' ? JSON.parse(m.content) : m.content
            if (m.type === 'confirmReservation') {
              console.log('[BookingDetail] confirmReservation content:', JSON.stringify(parsedContent, null, 2))
            }
          } catch {
            parsedContent = null
          }
        }

        if (!text && m.content && m.type !== 'reservationInquiry' && m.type !== 'confirmReservation') {
          try {
            const content = typeof m.content === 'string' ? JSON.parse(m.content) : m.content
            text = typeof content === 'string' ? content : JSON.stringify(content)
          } catch {
            text = String(m.content)
          }
        }

        // 이미지 URL 파싱
        let imageUrls: string[] = []
        if (m.media_url) {
          console.log('[BookingDetail] parsing media_url:', m.media_url, 'type:', typeof m.media_url)
          if (Array.isArray(m.media_url)) {
            imageUrls = m.media_url
          } else if (typeof m.media_url === 'string') {
            if (m.media_url.startsWith('[')) {
              try {
                imageUrls = JSON.parse(m.media_url)
              } catch (e) {
                console.error('[BookingDetail] failed to parse JSON array:', e)
                imageUrls = []
              }
            } else {
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
          dateString,
        }
      })
      console.log('[BookingDetail] mapped messages:', mapped)
      setMessages(mapped)

      // 메시지 로드 완료 후 읽음 처리
      markMessagesAsRead()

      // 상대방 메시지 이전의 내 메시지를 읽음 처리
      setTimeout(() => markPreviousMessagesAsRead(), 100)
    } catch (err) {
      console.error('[BookingDetail] failed to load chat messages:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const messageText = message.trim()
    setMessage('') // 입력 필드 먼저 비우기

    // 로컬에 먼저 표시 (낙관적 업데이트)
    const tempId = String(Date.now())
    const now = new Date()
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const newMessage: ChatMessage = {
      id: tempId,
      text: messageText,
      timestamp: getCurrentTime(),
      isUser: true,
      type: 'text',
      isRead: false, // 전송한 메시지는 초기에 안읽음 상태
      dateString,
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

  // 고객 정보 입력 폼 표시
  if (showCustomerInfoForm) {
    return (
      <div className="customer-info-container">
        <div className="customer-info-content">
          <img src="/images/LOGO.png" alt="HOXY" className="logo-image" />
          <h1 className="info-title">확인을 위해 본인 인증을<br />진행해 주세요</h1>
          <p className="info-description">예약자 이름과 전화번호를 입력해 주세요.</p>

          <div className="info-form">
            <div className="form-group">
              <label className="form-label">예약자명</label>
              <input
                type="text"
                className="form-input"
                placeholder="이름을 입력해 주세요"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">휴대폰 번호</label>
              <input
                type="tel"
                className={`form-input ${!isPhoneValid ? 'error' : ''}`}
                placeholder="휴대폰 번호를 입력해 주세요"
                value={customerPhone}
                onChange={(e) => {
                  const value = e.target.value
                  setCustomerPhone(value)

                  // 휴대폰 번호 유효성 검증 (입력된 값이 있을 때만)
                  if (value.trim()) {
                    const phoneDigits = value.replace(/-/g, '')
                    const isValid = /^01[0-9]\d{7,8}$/.test(phoneDigits)
                    setIsPhoneValid(isValid)
                  } else {
                    // 빈 값이면 valid로 처리 (에러 표시 안함)
                    setIsPhoneValid(true)
                  }
                }}
              />
            </div>
          </div>

          <button
            className="submit-button"
            onClick={handleCustomerInfoSubmit}
            disabled={!customerName.trim() || !customerPhone.trim() || !isPhoneValid}
          >
            확인
          </button>
        </div>

        {/* 에러 모달 */}
        {showErrorModal && (
          <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
            <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="error-modal-title">예약 정보가 없어요</h2>
              <p className="error-modal-description">
                올바른 예약자명과 휴대폰 번호인지<br />다시 확인해 주세요.
              </p>
              <button className="error-modal-button" onClick={() => setShowErrorModal(false)}>
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    )
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

        {messages.map((msg, index) => {
          // 날짜 구분자 표시: 첫 메시지이거나 이전 메시지와 날짜가 다른 경우
          const showDateSeparator = index === 0 || (messages[index - 1]?.dateString !== msg.dateString)

          // 날짜 포맷 함수
          const formatDateSeparatorForMessage = (dateStr?: string) => {
            if (!dateStr) return formatDateSeparator() // 기본값 (오늘)
            const [year, month, day] = dateStr.split('-').map(Number)
            const date = new Date(year, month - 1, day)
            const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
            const dayName = days[date.getDay()]
            return `${year}년 ${month}월 ${day}일 ${dayName}`
          }

          // 이미지 메시지: imageUrls가 있으면 이미지로 표시
          if (msg.imageUrls && msg.imageUrls.length > 0) {
            const renderImageLayout = () => {
              const count = msg.imageUrls!.length
              const rows: JSX.Element[] = []

              if (count === 1) {
                // 1개: 200x200
                rows.push(
                  <div key="row-0" className="image-row">
                    <div className="image-item image-single" onClick={() => handleImageClick(msg.imageUrls!, 0)}>
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
                    const currentIndex = index
                    currentRow.push(
                      <div key={`img-${index}`} className="image-item image-wide" onClick={() => handleImageClick(msg.imageUrls!, currentIndex)}>
                        <img src={msg.imageUrls![index]} alt="이미지" />
                      </div>
                    )
                    index++
                  } else {
                    // 2개: 140x140 두 개
                    for (let i = 0; i < 2; i++) {
                      const currentIndex = index
                      currentRow.push(
                        <div key={`img-${index}`} className="image-item image-double" onClick={() => handleImageClick(msg.imageUrls!, currentIndex)}>
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
              <>
                {showDateSeparator && (
                  <div className="date-separator">{formatDateSeparatorForMessage(msg.dateString)}</div>
                )}
                <div className={`message-group ${msg.isUser ? 'right' : 'left'}`}>
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
              </>
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
              <>
                {showDateSeparator && (
                  <div className="date-separator">{formatDateSeparatorForMessage(msg.dateString)}</div>
                )}
                <div className="message-group right">
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
              </>
            )
          }

          // confirmReservation 타입 메시지: 예약금 안내 카드 (왼쪽)
          if (msg.type === 'confirmReservation' && !msg.isUser) {
            // content 파싱
            let reservationContent: any = null
            try {
              reservationContent = msg.content || (typeof msg.text === 'string' && msg.text.includes('{') ? JSON.parse(msg.text) : null)
            } catch {
              // 파싱 실패 시 일반 텍스트로 표시
            }

            if (reservationContent) {
              const confirmedDate = reservationContent.confirmedDate || ''
              const bankName = reservationContent.bank_name || reservationContent.bankName || ''
              const accountNumber = reservationContent.bank_account_number || reservationContent.accountNumber || ''
              const accountHolder = reservationContent.account_holder_name || ''

              // 날짜 포맷 (YYYY-MM-DD -> YYYY. M. D(요일))
              const formatConfirmedDate = (dateStr: string) => {
                if (!dateStr) return ''
                const d = new Date(dateStr)
                const days = ['일', '월', '화', '수', '목', '금', '토']
                return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}(${days[d.getDay()]})`
              }

              return (
                <>
                  {showDateSeparator && (
                    <div className="date-separator">{formatDateSeparatorForMessage(msg.dateString)}</div>
                  )}
                  <div className="message-group left">
                    <div className="confirmation-card">
                      <h3 className="card-title">
                        <img src="/images/hoxy.png" alt="HOXY" className="card-icon" />
                        예약금 안내
                      </h3>
                      <div className="confirmation-content">
                        <div className="confirmation-date">
                          📅 {formatConfirmedDate(confirmedDate)}로 예약이 진행될 예정이에요.
                        </div>
                        <div className="confirmation-description">
                          아래의 계좌로 예약금을 이체해주세요.<br />
                          작가님이 직접 입금을 확인한 후<br />
                          예약이 최종 확정됩니다.
                        </div>
                        <div
                          className="account-info"
                          onClick={() => {
                            navigator.clipboard.writeText(`${bankName} ${accountNumber}`)
                            alert('계좌번호가 복사되었습니다.')
                          }}
                        >
                          <div className="account-text">
                            <div className="bank-name">{bankName}</div>
                            <div className="account-number">{accountNumber} ({accountHolder})</div>
                          </div>
                          <div className="copy-icon">
                            📋
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="timestamp">{msg.timestamp}</div>
                  </div>
                </>
              )
            }
          }

          // 일반 텍스트 타입 사용자 메시지: 오른쪽
          if (msg.isUser && msg.type === 'text') {
            return (
              <>
                {showDateSeparator && (
                  <div className="date-separator">{formatDateSeparatorForMessage(msg.dateString)}</div>
                )}
                <div className="message-group right">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <div className="read-status">{msg.isRead ? '읽음' : '안읽음'}</div>
                  <div className="timestamp">{msg.timestamp}</div>
                </div>
                <div className="user-message">
                  <p>{msg.text}</p>
                </div>
                </div>
              </>
            )
          }

          // system 타입 메시지 (AI): 왼쪽 HOXY AI 카드
          if (msg.type === 'system') {
            return (
              <>
                {showDateSeparator && (
                  <div className="date-separator">{formatDateSeparatorForMessage(msg.dateString)}</div>
                )}
                <div className="message-group left">
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
              </>
            )
          }

          // author 메시지: 왼쪽 일반 버블 (타이틀/이미지 없음, confirmReservation 포함)
          if (!msg.isUser) {
            return (
              <>
                {showDateSeparator && (
                  <div className="date-separator">{formatDateSeparatorForMessage(msg.dateString)}</div>
                )}
                <div className="message-group left">
                  <div className="author-message">
                    <p>{msg.text}</p>
                  </div>
                  <div className="timestamp">{msg.timestamp}</div>
                </div>
              </>
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

      {/* 이미지 상세보기 모달 */}
      {isImageModalOpen && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeImageModal}>
              ✕
            </button>

            {selectedImages.length > 1 && (
              <>
                <button className="modal-nav-button modal-prev-button" onClick={showPreviousImage}>
                  ‹
                </button>
                <button className="modal-nav-button modal-next-button" onClick={showNextImage}>
                  ›
                </button>
              </>
            )}

            <img
              src={selectedImages[selectedImageIndex]}
              alt="확대 이미지"
              className="modal-image"
            />

            {selectedImages.length > 1 && (
              <div className="modal-image-counter">
                {selectedImageIndex + 1} / {selectedImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
