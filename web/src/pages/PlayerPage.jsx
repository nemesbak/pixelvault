import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api.js'

function fmt(sec) {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

const INCOMPATIBLE = new Set(['ac3', 'eac3', 'dts', 'dca', 'truehd', 'mlp', 'dts-hd'])

export default function PlayerPage({ mediaId, userId, onClose }) {
  const videoRef = useRef(null)
  const hideTimer = useRef(null)
  const saveTimer = useRef(null)

  const [media, setMedia] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)          // current playback position (seconds)
  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [subsEnabled, setSubsEnabled] = useState(true)

  const isTranscode = INCOMPATIBLE.has(media?.audio_codec?.toLowerCase())
  // Always use DB duration — avoids fMP4 stream reporting wrong/growing duration
  const totalDuration = media?.duration ?? 0

  // Load media metadata
  useEffect(() => {
    api.getMediaItem(mediaId).then(m => {
      setMedia(m)
      if (!userId) return
      api.getProgress(userId, mediaId).then(p => {
        if (!p?.position || p.position < 10) return
        const v = videoRef.current
        if (!v) return
        const needsT = INCOMPATIBLE.has(m.audio_codec?.toLowerCase())
        if (needsT) {
          v.src = api.streamUrl(mediaId, p.position)
        } else {
          v.currentTime = p.position
        }
      }).catch(() => {})
    })
  }, [mediaId, userId])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      switch(e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break
        case 'ArrowRight': e.preventDefault(); skip(10); break
        case 'ArrowLeft':  e.preventDefault(); skip(-10); break
        case 'ArrowUp':    e.preventDefault(); { const v=videoRef.current; if(v){const nv=Math.min(1,v.volume+0.1); v.volume=nv; setVolume(nv)} } break
        case 'ArrowDown':  e.preventDefault(); { const v=videoRef.current; if(v){const nv=Math.max(0,v.volume-0.1); v.volume=nv; setVolume(nv)} } break
        case 'KeyM': toggleMute(); break
        case 'KeyF': toggleFullscreen(); break
        case 'Escape': onClose(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])  // eslint-disable-line

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      setPos(v.currentTime)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (!userId) return
        const dur = v.duration && isFinite(v.duration) ? v.duration : media?.duration ?? 0
        api.saveProgress(userId, mediaId, Math.floor(v.currentTime), dur > 0 && v.currentTime / dur > 0.9).catch(() => {})
      }, 5000)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [mediaId, userId, media])

  function showCtrl() {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play() : v.pause()
    showCtrl()
  }

  function seekTo(targetTime) {
    const v = videoRef.current
    if (!v) return
    const clamped = Math.max(0, Math.min(targetTime, totalDuration))
    if (isTranscode) {
      const wasPlaying = !v.paused
      v.src = api.streamUrl(mediaId, clamped)
      setPos(clamped)
      v.oncanplay = () => { if (wasPlaying) v.play(); v.oncanplay = null }
    } else {
      v.currentTime = clamped
    }
  }

  function handleTimelineClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo(((e.clientX - rect.left) / rect.width) * totalDuration)
  }

  function skip(sec) {
    seekTo((videoRef.current?.currentTime ?? pos) + sec)
    showCtrl()
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !muted
    setMuted(!muted)
  }

  function onVolumeSlider(e) {
    const val = parseFloat(e.target.value)
    if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0 }
    setVolume(val)
    setMuted(val === 0)
  }

  function toggleFullscreen() {
    const el = document.querySelector('.player-page')
    if (document.fullscreenElement) document.exitFullscreen()
    else el?.requestFullscreen()
  }

  const progress = totalDuration > 0 ? Math.min(100, (pos / totalDuration) * 100) : 0

  return (
    <div className="player-page" onMouseMove={showCtrl} onClick={togglePlay}>
      <video
        ref={videoRef}
        className="player-video"
        src={api.streamUrl(mediaId)}
        playsInline
        onCanPlay={() => videoRef.current?.play()}
        style={{ cursor: showControls ? 'default' : 'none' }}
      >
        {media?.has_subtitles && (
          <track
            kind="subtitles"
            src={api.subtitleUrl(mediaId, 0)}
            srcLang={media.subtitle_tracks?.[0]?.language ?? 'es'}
            label={media.subtitle_tracks?.[0]?.title ?? 'Español'}
            default={subsEnabled}
          />
        )}
      </video>

      {/* Transcode badge — top right, absolute so title length doesn't affect it */}
      {isTranscode && (
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          background: '#ffff00', color: '#000',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9, padding: '4px 8px',
          pointerEvents: 'none'
        }}>
          ⚡ AC3→AAC
        </div>
      )}

      <div
        className={`player-controls${showControls ? '' : ' hidden'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Title — truncated if too long */}
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 9,
          color: 'var(--green)', marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          &gt; {media?.title ?? '...'}
        </div>

        {/* Seek bar */}
        <div className="player-timeline" onClick={handleTimelineClick}>
          <div className="player-timeline-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Controls row */}
        <div className="player-buttons">
          <button className="player-btn" onClick={() => skip(-30)}>«30</button>
          <button className="player-btn" onClick={() => skip(-10)}>«10</button>
          <button className="player-btn" style={{ fontSize: 14, padding: '4px 12px' }} onClick={togglePlay}>
            {playing ? '⏸' : '▶'}
          </button>
          <button className="player-btn" onClick={() => skip(10)}>10»</button>
          <button className="player-btn" onClick={() => skip(30)}>30»</button>
          <button className="player-btn" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
          {media?.has_subtitles && (
            <button
              className="player-btn"
              style={{ borderColor: subsEnabled ? 'var(--cyan)' : '#444', color: subsEnabled ? 'var(--cyan)' : '#555' }}
              onClick={() => {
                const v = videoRef.current
                if (!v) return
                const tracks = v.textTracks
                if (tracks[0]) tracks[0].mode = subsEnabled ? 'hidden' : 'showing'
                setSubsEnabled(!subsEnabled)
              }}
            >
              SUB
            </button>
          )}
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume} onChange={onVolumeSlider}
            style={{ width: 60, accentColor: 'var(--green)', cursor: 'pointer' }}
          />
          <div className="player-time" style={{ marginLeft: 'auto' }}>
            {fmt(pos)} / {fmt(totalDuration)}
          </div>
          <button className="player-btn" onClick={toggleFullscreen}>⛶</button>
          <button className="player-btn danger" onClick={onClose}>✕</button>
        </div>
      </div>

      {showControls && (
        <button
          className="pixel-btn player-back"
          onClick={e => { e.stopPropagation(); onClose() }}
          style={{ fontSize: 8, padding: '6px 10px' }}
        >
          ← BACK
        </button>
      )}
    </div>
  )
}
