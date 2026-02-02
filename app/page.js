'use client'

import { BackgroundMusic } from './BackgroundMusic'
import { useState, useCallback, useRef, useEffect } from 'react'
import { lotoPhrases } from '@/data/lotoPhrases'

const MIN_SPEED_MS = 400
const MAX_SPEED_MS = 2000

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getVietnameseVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return { male: null, female: null }
  const voices = window.speechSynthesis.getVoices()
  const viVoices = voices.filter((v) => v.lang.startsWith('vi'))
  
  if (viVoices.length === 0) {
    // Không có giọng Việt, dùng giọng mặc định
    const defaultVoice = voices.find((v) => v.default) || voices[0] || null
    return { male: defaultVoice, female: defaultVoice }
  }
  
  // Tìm giọng nữ: ưu tiên có "female", "nữ", "female voice", "Microsoft Zira" (thường là nữ)
  const female = viVoices.find((v) => {
    const name = v.name.toLowerCase()
    return name.includes('female') || 
           name.includes('nữ') || 
           name.includes('zira') ||
           name.includes('mai') ||
           name.includes('linh')
  }) || viVoices.find((v) => {
    // Nếu không tìm thấy, thử tìm giọng không phải nam
    const name = v.name.toLowerCase()
    return !name.includes('male') && !name.includes('nam') && !name.includes('david')
  }) || viVoices[viVoices.length > 1 ? 1 : 0] // Fallback: giọng thứ 2 hoặc đầu tiên
  
  // Tìm giọng nam: ưu tiên có "male", "nam", "Microsoft David" (thường là nam)
  const male = viVoices.find((v) => {
    const name = v.name.toLowerCase()
    return name.includes('male') || 
           name.includes('nam') || 
           name.includes('david') ||
           name.includes('male voice')
  }) || viVoices[0] // Fallback: giọng đầu tiên
  
  return { male, female }
}

function speakLoto(num, phrase, enabled, shortForLyCayBong, voiceGender = 'female', onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !enabled || !phrase) {
    // Nếu TTS tắt, gọi onEnd ngay để hiện lời bài hát
    if (onEnd) onEnd()
    return
  }
  window.speechSynthesis.cancel()
  const { male, female } = getVietnameseVoices()
  // Đảm bảo luôn có giọng để dùng
  const selectedVoice = voiceGender === 'male' 
    ? (male || female || null)
    : (female || male || null)
  const say = (text) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'vi-VN'
    u.rate = 0.95
    u.pitch = voiceGender === 'female' ? 1.2 : 0.9 // Điều chỉnh pitch để phân biệt nam/nữ
    if (selectedVoice) {
      u.voice = selectedVoice
    }
    // Khi đọc xong, gọi callback để hiện lời bài hát
    u.onend = () => {
      if (onEnd) onEnd()
    }
    u.onerror = () => {
      // Nếu có lỗi, vẫn hiện lời bài hát
      if (onEnd) onEnd()
    }
    window.speechSynthesis.speak(u)
  }
  // Đọc câu trước, rồi mới đọc số
  const isLongVerse = num >= 1 && num <= 20 && phrase.includes('Con số')
  const textToSpeak = shortForLyCayBong && isLongVerse
    ? `Con số ${num}, con số ${num}. Số ${num}.`
    : `${phrase}. Số ${num}.`
  say(textToSpeak)
}

export default function LotoHoiChoPage() {
  const [pool, setPool] = useState(() => shuffle(Array.from({ length: 90 }, (_, i) => i + 1)))
  const [currentNumber, setCurrentNumber] = useState(null)
  const [currentPhrase, setCurrentPhrase] = useState('')
  const [numberHighlighted, setNumberHighlighted] = useState(false) // Số đã được highlight sau khi TTS đọc xong
  const [isTtsReading, setIsTtsReading] = useState(false) // TTS đang đọc (hiện loading)
  const [pendingDrawnNumber, setPendingDrawnNumber] = useState(null) // Số đang chờ hiện trong danh sách
  const [drawnList, setDrawnList] = useState([])
  const [rolling, setRolling] = useState(false)
  const [speed, setSpeed] = useState(50) // 0 = nhanh, 100 = chậm → delay ms
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [ttsShortLyCayBong, setTtsShortLyCayBong] = useState(true) // Số 1–20: chỉ đọc "Con số X"
  const [ttsVoiceGender, setTtsVoiceGender] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loto-voice-gender')
      return saved === 'male' ? 'male' : 'female'
    }
    return 'female'
  })
  const rollIntervalRef = useRef(null)
  const ttsEnabledRef = useRef(ttsEnabled)
  const ttsShortRef = useRef(ttsShortLyCayBong)
  const ttsVoiceGenderRef = useRef(ttsVoiceGender)
  ttsEnabledRef.current = ttsEnabled
  ttsShortRef.current = ttsShortLyCayBong
  ttsVoiceGenderRef.current = ttsVoiceGender

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loto-voice-gender', ttsVoiceGender)
    }
  }, [ttsVoiceGender])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const loadVoices = () => window.speechSynthesis.getVoices()
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.cancel()
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const delayMs = MIN_SPEED_MS + ((100 - speed) / 100) * (MAX_SPEED_MS - MIN_SPEED_MS)

  const bocSo = useCallback(() => {
    if (pool.length === 0 || rolling) return
    setRolling(true)
    setCurrentPhrase('')
    setNumberHighlighted(false)
    setIsTtsReading(false)
    let count = 0
    const maxRoll = 12 + Math.floor(8 * (speed / 100))
    rollIntervalRef.current = setInterval(() => {
      const fake = Math.floor(Math.random() * 90) + 1
      setCurrentNumber(fake)
      count++
      if (count >= maxRoll) {
        clearInterval(rollIntervalRef.current)
        const nextPool = [...pool]
        const drawn = nextPool.splice(Math.floor(Math.random() * nextPool.length), 1)[0]
        const phrase = lotoPhrases[drawn] ?? `Số ${drawn} ra rồi nè bà con ơi~`
        setPool(nextPool)
        setCurrentNumber(null) // Ẩn số, đợi TTS đọc xong mới hiện
        setCurrentPhrase('') // Chưa hiện lời bài hát, đợi TTS đọc xong
        setNumberHighlighted(false)
        setPendingDrawnNumber(drawn) // Lưu số đang chờ, chưa thêm vào danh sách
        setRolling(false)
        
        // Nếu TTS bật → hiện loading và đọc, nếu tắt → hiện số ngay
        if (ttsEnabledRef.current) {
          setIsTtsReading(true)
          // Gọi TTS với callback: khi đọc xong → hiện số → highlight → hiện lời bài hát
          speakLoto(
            drawn, 
            phrase, 
            true, 
            ttsShortRef.current, 
            ttsVoiceGenderRef.current,
            () => {
              // Callback: TTS đọc xong → hiện số với animation
              setIsTtsReading(false)
              setCurrentNumber(drawn)
              // Sau 100ms highlight số và thêm vào danh sách
              setTimeout(() => {
                setNumberHighlighted(true)
                // Thêm số vào danh sách sau khi số đã hiện
                setDrawnList((prev) => [drawn, ...prev].slice(0, 24))
                setPendingDrawnNumber(null)
                // Sau 600ms (đợi animation highlight xong) mới hiện lời bài hát
                setTimeout(() => {
                  setCurrentPhrase(phrase)
                }, 600)
              }, 100)
            }
          )
        } else {
          // TTS tắt → hiện số và lời ngay, thêm vào danh sách ngay
          setIsTtsReading(false)
          setCurrentNumber(drawn)
          setCurrentPhrase(phrase)
          setDrawnList((prev) => [drawn, ...prev].slice(0, 24))
          setPendingDrawnNumber(null)
        }
      }
    }, delayMs / (maxRoll / 2))
  }, [pool, rolling, speed, delayMs])

  const vanMoi = useCallback(() => {
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current)
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setPool(shuffle(Array.from({ length: 90 }, (_, i) => i + 1)))
    setCurrentNumber(null)
    setCurrentPhrase('')
    setDrawnList([])
    setPendingDrawnNumber(null)
    setRolling(false)
    setIsTtsReading(false)
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-6 pt-8 pb-12 carnival-bg">
      <BackgroundMusic />
      {/* Banner hội chợ */}
      <header className="w-full max-w-2xl text-center mb-6 md:mb-8">
        <div className="carnival-banner inline-block px-6 py-3 rounded-2xl mb-3 shadow-xl">
          <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-md tracking-tight">
            🎪 LÔ TÔ HỘI CHỢ 🎪
          </h1>
        </div>
        <p className="text-amber-100/90 text-sm md:text-base font-medium">
          Bốc số 1–90 không trùng • Câu kêu soạn sẵn
        </p>
      </header>

      <div className="w-full max-w-2xl space-y-6">
        {/* Khối LED số + câu kêu */}
        <section className="led-panel rounded-3xl p-6 md:p-8 text-center shadow-2xl border-4 border-amber-400/30 relative overflow-hidden">
          {/* Trang trí góc: trống lô tô */}
          <span className="absolute top-4 left-4 text-3xl opacity-40" aria-hidden>🥁</span>
          <span className="absolute top-4 right-4 text-3xl opacity-40" aria-hidden>🥁</span>
          {rolling && (
            <p className="text-amber-400/90 text-sm font-bold animate-pulse mb-1" aria-live="polite">
              Tùng tùng tùng…
            </p>
          )}
          <p className="text-amber-200/80 text-sm font-semibold mb-2 uppercase tracking-wider">
            Số vừa ra
          </p>
          {isTtsReading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="loading-spinner mb-4"></div>
              <p className="text-amber-300/80 text-sm font-medium animate-pulse">Đang đọc...</p>
            </div>
          ) : (
            <div
              className={`led-number ${rolling ? 'led-rolling' : ''} ${numberHighlighted ? 'led-highlight' : ''} ${currentNumber != null ? 'led-appear' : ''}`}
              aria-live="polite"
            >
              {currentNumber != null ? currentNumber : '--'}
            </div>
          )}
          {currentPhrase && (
            <p className="cau-keu mt-4 text-amber-50 leading-relaxed text-base md:text-lg max-w-xl mx-auto whitespace-pre-line text-left">
              "{currentPhrase}"
            </p>
          )}
          {!currentPhrase && !rolling && !isTtsReading && currentNumber == null && (
            <p className="text-amber-200/60 mt-4 text-sm">Bấm <strong>Bốc số</strong> để quay</p>
          )}
        </section>

        {/* Điều khiển: tốc độ + nút */}
        <section className="control-panel rounded-2xl p-6 border-2 border-amber-500/40 bg-amber-950/40 shadow-xl">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-amber-100 text-sm font-semibold">Âm thanh đọc câu</span>
              <button
                type="button"
                role="switch"
                aria-checked={ttsEnabled}
                onClick={() => {
                  setTtsEnabled((v) => {
                    if (v && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
                    return !v
                  })
                }}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-stone-900 ${
                  ttsEnabled ? 'border-amber-500 bg-amber-500' : 'border-stone-600 bg-stone-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition ${
                    ttsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-amber-200/80 text-sm font-medium w-12">
                {ttsEnabled ? 'Bật' : 'Tắt'}
              </span>
            </div>
            {ttsEnabled && (
              <div className="text-amber-200/60 text-xs -mt-3 space-y-2">
                <p>Đọc câu kêu rồi &quot;Số X&quot; khi ra số (giọng trình duyệt).</p>
                <div className="flex items-center gap-4">
                  <span className="text-amber-100/80 text-xs font-medium">Giọng đọc:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="voice-gender"
                      value="female"
                      checked={ttsVoiceGender === 'female'}
                      onChange={(e) => setTtsVoiceGender(e.target.value)}
                      className="accent-amber-500"
                    />
                    <span>👩 Nữ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="voice-gender"
                      value="male"
                      checked={ttsVoiceGender === 'male'}
                      onChange={(e) => setTtsVoiceGender(e.target.value)}
                      className="accent-amber-500"
                    />
                    <span>👨 Nam</span>
                  </label>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ttsShortLyCayBong}
                    onChange={(e) => setTtsShortLyCayBong(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>Đọc ngắn số 1–20 (Lý cây bông: chỉ &quot;Con số X, con số X&quot;)</span>
                </label>
              </div>
            )}
            <div>
              <label className="flex justify-between text-amber-100 text-sm font-semibold mb-2">
                <span>Tốc độ ra số</span>
                <span>{speed <= 33 ? 'Nhanh' : speed <= 66 ? 'Vừa' : 'Chậm'}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-3 rounded-full accent-amber-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={bocSo}
                disabled={rolling || pool.length === 0}
                className="flex-1 btn-boc py-4 rounded-xl font-bold text-lg text-stone-900 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {rolling ? '🥁 Đang quay...' : '🥁 Bốc số'}
              </button>
              <button
                onClick={vanMoi}
                disabled={rolling}
                className="px-6 py-4 rounded-xl font-bold bg-stone-700/80 text-amber-100 border-2 border-amber-500/50 hover:bg-stone-600/80 disabled:opacity-50 transition-all"
              >
                Ván mới
              </button>
            </div>
            <p className="text-amber-200/70 text-sm text-center">
              Còn <strong>{pool.length}</strong> số trong lồng (1–90, không trùng)
            </p>
          </div>
        </section>

        {/* Danh sách số đã ra */}
        <section className="drawn-panel rounded-2xl p-4 border border-amber-600/30 bg-stone-900/60">
          <h2 className="text-amber-200/90 text-sm font-bold mb-3 flex items-center gap-2">
            <span className="text-lg">📋</span> Số đã ra (mới nhất trước)
          </h2>
          <div className="flex flex-wrap gap-2">
            {drawnList.length === 0 && !pendingDrawnNumber ? (
              <span className="text-stone-500 text-sm">Chưa bốc số nào</span>
            ) : (
              <>
                {/* Số đang chờ (loading) */}
                {pendingDrawnNumber && (
                  <span
                    key={`pending-${pendingDrawnNumber}`}
                    className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-sm animate-pulse"
                  >
                    <div className="w-4 h-4 border-2 border-amber-400/50 border-t-amber-400 rounded-full animate-spin"></div>
                  </span>
                )}
                {/* Danh sách số đã ra */}
                {drawnList.map((n) => (
                  <span
                    key={n}
                    className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-200 font-bold flex items-center justify-center text-sm border border-amber-500/40 number-appear"
                  >
                    {n}
                  </span>
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      <p className="text-center text-stone-500 text-xs mt-6">
        Chỉ mang tính giải trí • Không khuyến khích cờ bạc
      </p>
    </main>
  )
}
