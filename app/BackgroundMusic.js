'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const VIDEO_ID = 'vaBpLhFJUh0'
const STORAGE_KEY_ENABLED = 'loto-bg-music-enabled'
const STORAGE_KEY_VOLUME = 'loto-bg-music-volume' // 0-100

export function BackgroundMusic() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY_ENABLED) === '1'
  })
  const [volume, setVolume] = useState(() => {
    if (typeof window === 'undefined') return 50
    const v = Number(localStorage.getItem(STORAGE_KEY_VOLUME))
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50
  })
  const [ready, setReady] = useState(false)
  const playerRef = useRef(null)
  const mountId = useMemo(() => `yt-bg-${Math.random().toString(16).slice(2)}`, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? '1' : '0')
  }, [enabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume))
    const p = playerRef.current
    if (p && typeof p.setVolume === 'function') {
      p.setVolume(volume)
    }
  }, [volume])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Chỉ tạo player khi enabled (autoplay cần thao tác người dùng)
    if (!enabled) {
      setReady(false)
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy() } catch {}
      }
      playerRef.current = null
      return
    }

    const ensureApi = () =>
      new Promise((resolve) => {
        if (window.YT && window.YT.Player) return resolve()
        const existing = document.querySelector('script[data-yt-iframe-api="1"]')
        if (existing) {
          const iv = setInterval(() => {
            if (window.YT && window.YT.Player) {
              clearInterval(iv)
              resolve()
            }
          }, 50)
          return
        }
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        s.async = true
        s.dataset.ytIframeApi = '1'
        document.body.appendChild(s)
        const iv = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(iv)
            resolve()
          }
        }, 50)
      })

    let cancelled = false
    ;(async () => {
      await ensureApi()
      if (cancelled) return

      // eslint-disable-next-line no-new
      const player = new window.YT.Player(mountId, {
        width: '0',
        height: '0',
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          playsinline: 1,
          loop: 1,
          playlist: VIDEO_ID,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return
            playerRef.current = e.target
            setReady(true)
            try {
              e.target.setVolume(volume)
              e.target.playVideo()
            } catch {}
          },
          onStateChange: (e) => {
            // Safety: nếu hết bài mà loop không kick, play lại
            if (cancelled) return
            if (e.data === window.YT.PlayerState.ENDED) {
              try { e.target.playVideo() } catch {}
            }
          },
        },
      })

      playerRef.current = player
    })()

    return () => {
      cancelled = true
      setReady(false)
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy() } catch {}
      }
      playerRef.current = null
    }
  }, [enabled, mountId, volume])

  return (
    <>
      {/* UI điều khiển */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className="px-4 py-2 rounded-full bg-stone-900/80 border border-amber-500/60 text-amber-100 text-xs md:text-sm font-semibold shadow-lg hover:bg-stone-800/90 transition-colors"
        >
          {enabled ? '🔊 Nhạc nền: Bật' : '🔈 Nhạc nền: Tắt'}
        </button>

        {enabled && (
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
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="text-[11px] text-amber-200/60 mt-2">
              {ready ? 'Đang phát' : 'Đang tải… (cần thao tác để autoplay)'}
            </div>
          </div>
        )}
      </div>

      {/* Mount point cho YouTube player (ẩn) */}
      {enabled && <div id={mountId} className="fixed -z-10 opacity-0 pointer-events-none" />}
    </>
  )
}

