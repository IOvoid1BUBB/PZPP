'use client'

import * as React from 'react'
import { Clock3, Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00'
  const seconds = Math.floor(totalSeconds)
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function CourseYouTubePlayer({
  youtubeId,
  ariaLabel = 'Odtwarzacz wideo',
}: {
  youtubeId: string
  ariaLabel?: string
}) {
  const playerRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const fullscreenTargetRef = React.useRef<HTMLDivElement | null>(null)

  const [isReady, setIsReady] = React.useState(false)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [isScrubbing, setIsScrubbing] = React.useState(false)
  const [scrubValue, setScrubValue] = React.useState(0)
  const [volume, setVolume] = React.useState(100)
  const lastNonZeroVolumeRef = React.useRef<number>(100)

  const isScrubbingRef = React.useRef(isScrubbing)
  const isMutedRef = React.useRef(isMuted)

  React.useEffect(() => {
    isScrubbingRef.current = isScrubbing
  }, [isScrubbing])

  React.useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  React.useEffect(() => {
    let tick: number | undefined

    const load = async () => {
      if (window.YT?.Player) return true

      await new Promise<void>((resolve) => {
        const existing = document.getElementById('youtube-iframe-api')
        if (existing) {
          const poll = window.setInterval(() => {
            if (window.YT?.Player) {
              window.clearInterval(poll)
              resolve()
            }
          }, 150)
          return
        }

        const script = document.createElement('script')
        script.id = 'youtube-iframe-api'
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.body.appendChild(script)

        window.onYouTubeIframeAPIReady = () => resolve()
      })

      return true
    }

    const init = async () => {
      await load()
      if (!containerRef.current) return
      if (!window.YT?.Player) return

      // Jeżeli wcześniej inicjalizowaliśmy gracza, zniszcz go.
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          // Ukrywamy natywne UI, bo robimy własne przyciski poniżej.
          controls: 0,
          rel: 0,
          modestbranding: 1,
          // API needed for programmatic control.
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true)
            setIsMuted(Boolean(event?.target?.isMuted?.()) ? true : false)
            // Startujemy z paused (domyślnie).
          },
          onStateChange: (event: any) => {
            // https://developers.google.com/youtube/iframe_api_reference#onStateChange
            const YTState = window.YT?.PlayerState
            setIsPlaying(event.data === YTState?.PLAYING)
          },
        },
      })

      tick = window.setInterval(() => {
        const p = playerRef.current
        if (!p?.getCurrentTime) return
        const t = p.getCurrentTime()
        if (!isScrubbingRef.current) setCurrentTime(Number(t) || 0)

        const d = p.getDuration?.()
        setDuration(Number.isFinite(Number(d)) ? Number(d) : 0)

        // Synchronizujemy mute także z prawdziwym stanem gracza.
        try {
          const muted =
            typeof p.isMuted === 'function'
              ? Boolean(p.isMuted())
              : typeof p.getVolume === 'function'
                ? p.getVolume?.() === 0
                : isMutedRef.current
          setIsMuted(Boolean(muted))

          if (typeof p.getVolume === 'function') {
            const v = Number(p.getVolume?.() ?? 0)
            if (Number.isFinite(v)) {
              setVolume(v)
              if (v > 0) lastNonZeroVolumeRef.current = v
            }
          }
        } catch {
          // ignore
        }
      }, 500)
    }

    init()

    return () => {
      if (tick) window.clearInterval(tick)
    }
  }, [youtubeId])

  const handlePlayPause = () => {
    const p = playerRef.current
    if (!p?.playVideo || !p?.pauseVideo) return
    if (isPlaying) p.pauseVideo()
    else p.playVideo()
  }

  const handleToggleMute = () => {
    const p = playerRef.current
    if (!p) return
    try {
      const muted =
        typeof p.isMuted === 'function'
          ? Boolean(p.isMuted())
          : typeof p.getVolume === 'function'
            ? p.getVolume?.() === 0
            : isMuted

      if (muted) {
        if (typeof p.unMute === 'function') p.unMute()
        const restoreTo = Math.max(1, lastNonZeroVolumeRef.current || 100)
        if (typeof p.setVolume === 'function') p.setVolume(restoreTo)
        setVolume(restoreTo)
        lastNonZeroVolumeRef.current = restoreTo
      } else {
        if (typeof p.mute === 'function') p.mute()
        if (typeof p.setVolume === 'function') p.setVolume(0)
        setVolume(0)
      }

      const newMuted =
        typeof p.isMuted === 'function'
          ? Boolean(p.isMuted())
          : typeof p.getVolume === 'function'
            ? p.getVolume?.() === 0
            : muted
      setIsMuted(Boolean(newMuted))
    } catch {
      // ignore (np. player nie jest w stanie gotowym)
    }
  }

  const handleSetVolume = (nextVolume: number) => {
    const p = playerRef.current
    if (!p) return

    const v = Math.max(0, Math.min(100, Math.round(nextVolume)))
    setVolume(v)
    if (v > 0) lastNonZeroVolumeRef.current = v

    if (typeof p.setVolume === 'function') {
      try {
        p.setVolume(v)
      } catch {
        // ignore
      }
    }

    setIsMuted(v === 0)
  }

  const handleSeek = (seconds: number) => {
    const p = playerRef.current
    if (!p?.seekTo || !Number.isFinite(seconds)) return
    p.seekTo(seconds, true)
  }

  const handleFullscreen = () => {
    const p = playerRef.current

    // Preferuj fullscreen na elemencie z refem (gwarantowanym i “połączonym” w DOM).
    const preferredEl = fullscreenTargetRef.current
    const isPreferredConnected =
      preferredEl && typeof document !== 'undefined' && document.contains(preferredEl)

    const el =
      isPreferredConnected
        ? preferredEl
        : // fallback: próbuj fullscreen na iframe YouTube
          typeof p?.getIframe === 'function'
          ? p.getIframe()
          : null

    if (!el || typeof document === 'undefined' || !document.contains(el)) return

    const req =
      // @ts-ignore
      el.requestFullscreen ||
      // @ts-ignore
      el.webkitRequestFullscreen ||
      // @ts-ignore
      el.msRequestFullscreen

    if (typeof req === 'function') {
      req.call(el)
    }
  }

  return (
    <div ref={fullscreenTargetRef} className="rounded-lg bg-black">
      <div className="relative aspect-video">
        <div
          ref={containerRef}
          aria-label={ariaLabel}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {/* Kontrolki zsynchronizowane z YouTube */}
      <div className="border-t border-white/10 bg-black/80 px-4 py-3">
        {/* Timeline: przewijanie */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xs font-medium text-white/90 w-[50px] text-right">
            {formatTime(isScrubbing ? scrubValue : currentTime)}
          </span>
          <div className="flex-1">
            <input
              aria-label="Timeline"
              type="range"
              min={0}
              max={duration > 0 ? duration : 0}
              step={0.5}
              value={isScrubbing ? scrubValue : currentTime}
              disabled={!isReady || duration <= 0}
              onMouseDown={() => {
                setIsScrubbing(true)
                setScrubValue(currentTime)
              }}
              onMouseUp={() => {
                setIsScrubbing(false)
                handleSeek(scrubValue)
              }}
              onTouchStart={() => {
                setIsScrubbing(true)
                setScrubValue(currentTime)
              }}
              onTouchEnd={() => {
                setIsScrubbing(false)
                handleSeek(scrubValue)
              }}
              onChange={(e) => {
                const v = Number(e.target.value)
                setScrubValue(Number.isFinite(v) ? v : 0)
              }}
              className="h-2 w-full cursor-pointer appearance-none bg-transparent"
            />

            <div className="relative -mt-1 h-1 w-full rounded bg-white/10">
              <div
                className="absolute left-0 top-0 h-1 rounded bg-primary"
                style={{
                  width:
                    duration > 0
                      ? `${Math.min(
                          100,
                          ((isScrubbing ? scrubValue : currentTime) / duration) * 100,
                        )}%`
                      : '0%',
                }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-white/90 w-[60px]">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={!isReady}
              className="inline-flex size-9 items-center justify-center rounded-md bg-[#0b1220] disabled:opacity-50"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              disabled={!isReady}
              className="inline-flex size-9 items-center justify-center rounded-md bg-[#0b1220] disabled:opacity-50"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            <div className="flex items-center gap-2">
              <input
                aria-label="Głośność"
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                disabled={!isReady}
                onChange={(e) => handleSetVolume(Number(e.target.value))}
                className="h-2 w-28 cursor-pointer accent-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center rounded-md bg-[#0b1220] px-2 py-2">
              <Clock3 className="size-4" />
              <span className="ml-2 text-xs font-medium text-white/90">
                {formatTime(currentTime)}
              </span>
            </span>

            <button
              type="button"
              onClick={handleFullscreen}
              disabled={!isReady}
              className="inline-flex items-center justify-center rounded-md bg-[#0b1220] px-2 py-2 disabled:opacity-50"
              aria-label="Fullscreen"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

