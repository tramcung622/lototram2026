'use client'

import { useRef, useState, useEffect } from 'react'
import lotoAudio from './loto.mp3'

// Đường dẫn file nhạc nền (bundled qua Webpack, dùng file trong thư mục `app`)
const AUDIO_SRC = lotoAudio
const STORAGE_KEY_VOLUME = 'loto-bg-music-volume' // 0–100

export function BackgroundMusic() {
  const [enabled, setEnabled] = useState(false)
  const [volume, setVolume] = useState(() => {
    if (typeof window === 'undefined') return 50
    const v = Number(window.localStorage.getItem(STORAGE_KEY_VOLUME))
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50
  })

  // Ref trỏ thẳng vào thẻ <audio> trong DOM
  const audioRef = useRef(null)

  // Đồng bộ volume mỗi khi state thay đổi
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!enabled) {
      try {
        // Đặt lại volume theo state hiện tại
        audio.volume = volume / 100
        // Gọi play trực tiếp trong handler click → iOS cho phép
        await audio.play()
        setEnabled(true)
      } catch {
        // Thường do iOS/Safari hoặc user chặn tự động phát
      }
    } else {
      audio.pause()
      setEnabled(false)
    }
  }

  const onChangeVolume = (v) => {
    const vol = Math.min(100, Math.max(0, Number(v)))
    setVolume(vol)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_VOLUME, String(vol))
    }
    if (audioRef.current) {
      audioRef.current.volume = vol / 100
    }
  }

  return (
    <>
      {/* Thẻ audio ẩn – iOS thường ổn định hơn khi dùng DOM element thay vì new Audio() */}
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        loop
        preload="auto"
      />

      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        <button
          type="button"
          onClick={toggle}
          className="px-4 py-2 rounded-full bg-stone-900/80 border border-amber-500/60 text-amber-100 text-xs md:text-sm font-semibold shadow-lg hover:bg-stone-800/90 transition-colors"
        >
          {enabled ? '🔊 Nhạc nền: Bật' : '🔈 Nhạc nền: Tắt'}
        </button>

        <div className="px-4 py-3 rounded-2xl bg-stone-900/80 border border-amber-500/40 shadow-lg w-[220px]">
          <div className="flex items-center justify-between text-xs text-amber-100/90 mb-2">
            <span>Âm lượng</span>
            <span className="tabular-nums">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onChangeVolume(e.target.value)}
            className="w-full accent-amber-500"
          />
          <div className="text-[11px] text-amber-200/60 mt-2">
            Nhạc chạy sau khi bạn bấm nút (hỗ trợ iOS).
          </div>
        </div>
      </div>
    </>
  )
}

