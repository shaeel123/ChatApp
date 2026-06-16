import React, { useEffect, useRef, useState, useCallback } from 'react'
import './VideoCall.css'
import { supabase } from '../../config/supabase'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

// ── Filters ──────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'none',      label: 'Normal',  emoji: '😐', css: 'none' },
  { id: 'grayscale', label: 'B&W',     emoji: '🎞️', css: 'grayscale(1)' },
  { id: 'sepia',     label: 'Vintage', emoji: '🕰️', css: 'sepia(0.85)' },
  { id: 'warm',      label: 'Warm',    emoji: '🌅', css: 'saturate(1.6) hue-rotate(-20deg) brightness(1.1)' },
  { id: 'cold',      label: 'Icy',     emoji: '🧊', css: 'saturate(0.8) hue-rotate(160deg) brightness(1.05)' },
  { id: 'neon',      label: 'Neon',    emoji: '🌈', css: 'saturate(3) contrast(1.4) brightness(1.1)' },
  { id: 'blur',      label: 'Dreamy',  emoji: '💭', css: 'blur(2px) brightness(1.1)' },
  { id: 'invert',    label: 'Invert',  emoji: '🔄', css: 'invert(0.85)' },
  { id: 'comic',     label: 'Comic',   emoji: '💥', css: 'contrast(2) saturate(2.5)' },
  { id: 'pink',      label: 'Pink',    emoji: '🌸', css: 'sepia(0.4) saturate(2.5) hue-rotate(300deg)' },
  { id: 'horror',    label: 'Horror',  emoji: '👹', css: 'grayscale(0.6) contrast(2) brightness(0.7) hue-rotate(340deg)' },
  { id: 'dark',      label: 'Dark',    emoji: '🌑', css: 'brightness(0.45) contrast(1.6)' },
]

// ── Backgrounds ───────────────────────────────────────────────────────────────
const BACKGROUNDS = [
  { id: 'none',      label: 'None',      emoji: '🚫',  type: 'none' },
  { id: 'blur',      label: 'Blur BG',   emoji: '🌫️',  type: 'blur' },
  { id: 'beach',     label: 'Beach',     emoji: '🏖️',  type: 'image', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80' },
  { id: 'mountains', label: 'Mountains', emoji: '🏔️',  type: 'image', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=80' },
  { id: 'city',      label: 'City',      emoji: '🌆',  type: 'image', value: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&q=80' },
  { id: 'forest',    label: 'Forest',    emoji: '🌲',  type: 'image', value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280&q=80' },
  { id: 'office',    label: 'Office',    emoji: '🏢',  type: 'image', value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80' },
  { id: 'galaxy',    label: 'Galaxy',    emoji: '🌌',  type: 'image', value: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1280&q=80' },
  { id: 'cafe',      label: 'Café',      emoji: '☕',  type: 'image', value: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1280&q=80' },
  { id: 'space',     label: 'Space',     emoji: '🚀',  type: 'color', value: ['#0f0c29', '#302b63', '#24243e'] },
  { id: 'purple',    label: 'Purple',    emoji: '💜',  type: 'color', value: ['#6a11cb', '#2575fc'] },
  { id: 'sunset',    label: 'Sunset',    emoji: '🌇',  type: 'color', value: ['#f7797d', '#FBD786', '#C6FFDD'] },
]

// ── Load MediaPipe via CDN script tag ─────────────────────────────────────────
const loadMediaPipe = () => new Promise((resolve, reject) => {
  if (window.SelfieSegmentation) { resolve(window.SelfieSegmentation); return }

  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'
  script.crossOrigin = 'anonymous'
  script.onload = () => {
    if (window.SelfieSegmentation) resolve(window.SelfieSegmentation)
    else reject(new Error('SelfieSegmentation not found after script load'))
  }
  script.onerror = () => reject(new Error('Failed to load MediaPipe script'))
  document.head.appendChild(script)
})

const VideoCall = ({ currentUser, chatUser, onClose }) => {
  const localVideoRef      = useRef(null)   // hidden raw camera
  const remoteVideoRef     = useRef(null)
  const canvasRef          = useRef(null)   // processed output (PiP + stream)
  const bgCanvasRef        = useRef(null)   // offscreen: blurred bg for blur mode
  const segmentationRef    = useRef(null)   // MediaPipe instance
  const bgImageRef         = useRef(null)   // preloaded bg Image
  const pcRef              = useRef(null)
  const localStreamRef     = useRef(null)
  const processedStreamRef = useRef(null)
  const channelRef         = useRef(null)
  const makingOfferRef     = useRef(false)
  const ignoreOfferRef     = useRef(false)
  const politeRef          = useRef(false)
  const rafRef             = useRef(null)
  const segReadyRef        = useRef(false)
  const activeFilterRef    = useRef(FILTERS[0])
  const activeBgRef        = useRef(BACKGROUNDS[0])
  const timerRef           = useRef(null)

  const [callStatus, setCallStatus]     = useState('connecting')
  const [micOn, setMicOn]               = useState(true)
  const [camOn, setCamOn]               = useState(true)
  const [duration, setDuration]         = useState(0)
  const [showPanel, setShowPanel]       = useState(null)
  const [activeFilter, setActiveFilter] = useState(FILTERS[0])
  const [activeBg, setActiveBg]         = useState(BACKGROUNDS[0])
  const [segLoading, setSegLoading]     = useState(false)
  const [segError, setSegError]         = useState(false)

  const roomId = [currentUser.id, chatUser.id].sort().join('_')

  const W = 640, H = 480

  // ── Keep refs in sync with state ─────────────────────────────────────────
  useEffect(() => { activeFilterRef.current = activeFilter }, [activeFilter])
  useEffect(() => { activeBgRef.current = activeBg }, [activeBg])

  // ── Preload background image ──────────────────────────────────────────────
  useEffect(() => {
    if (activeBg.type === 'image') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = activeBg.value
      img.onload  = () => { bgImageRef.current = img }
      img.onerror = () => { bgImageRef.current = null }
    } else {
      bgImageRef.current = null
    }
  }, [activeBg])

  // ── MediaPipe segmentation result handler ─────────────────────────────────
  const onSegmentationResults = useCallback((results) => {
    const canvas = canvasRef.current
    const video  = localVideoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    ctx.save()

    // Mirror (selfie)
    ctx.scale(-1, 1)
    ctx.translate(-W, 0)

    const bg = activeBgRef.current
    const filter = activeFilterRef.current

    if (bg.type === 'none') {
      // No background replacement — just draw video with filter
      ctx.filter = filter.css
      ctx.drawImage(video, 0, 0, W, H)
      ctx.restore()
      return
    }

    // ── Step 1: Draw background ──────────────────────────────
    ctx.filter = 'none'
    if (bg.type === 'blur') {
      // Use the blurred bg canvas
      const bgC = bgCanvasRef.current
      if (bgC) ctx.drawImage(bgC, 0, 0, W, H)
      else {
        ctx.filter = 'blur(20px) brightness(0.7)'
        ctx.drawImage(video, 0, 0, W, H)
        ctx.filter = 'none'
      }
    } else if (bg.type === 'image' && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, W, H)
    } else if (bg.type === 'color') {
      const grad = ctx.createLinearGradient(0, 0, W, H)
      const colors = bg.value
      colors.forEach((c, i) => grad.addColorStop(i / Math.max(colors.length - 1, 1), c))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    }

    // ── Step 2: Use segmentation mask to cut out person ──────
    // globalCompositeOperation 'destination-in' keeps only the overlap
    // with the mask — i.e. the person silhouette
    ctx.filter = filter.css
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(results.segmentationMask, 0, 0, W, H)

    // ── Step 3: Draw the person (camera) on top of the mask ──
    ctx.globalCompositeOperation = 'destination-over'
    ctx.filter = filter.css
    ctx.drawImage(video, 0, 0, W, H)

    ctx.restore()
  }, [])

  // ── Build blurred bg canvas (updated every ~500ms) ────────────────────────
  useEffect(() => {
    if (activeBg.type !== 'blur') return
    const video = localVideoRef.current
    if (!video) return

    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = W; bgCanvas.height = H
    bgCanvasRef.current = bgCanvas
    const bgCtx = bgCanvas.getContext('2d')

    const updateBg = () => {
      if (video.readyState >= 2) {
        bgCtx.filter = 'blur(24px) brightness(0.65)'
        bgCtx.drawImage(video, 0, 0, W, H)
      }
    }
    const id = setInterval(updateBg, 500)
    return () => clearInterval(id)
  }, [activeBg.type])

  // ── Init MediaPipe when a bg-replacement mode is first needed ─────────────
  useEffect(() => {
    if (activeBg.type === 'none') return
    if (segReadyRef.current || segmentationRef.current) return
    if (!localStreamRef.current) return

    const init = async () => {
      setSegLoading(true)
      try {
        const SelfieSegmentation = await loadMediaPipe()
        const seg = new SelfieSegmentation({ locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
        })
        seg.setOptions({ modelSelection: 1, selfieMode: false })
        seg.onResults(onSegmentationResults)
        await seg.initialize()
        segmentationRef.current = seg
        segReadyRef.current = true
        setSegLoading(false)
        startSegLoop()
      } catch (err) {
        console.error('MediaPipe load error:', err)
        setSegError(true)
        setSegLoading(false)
      }
    }
    init()
  }, [activeBg, onSegmentationResults])

  // ── Segmentation loop (sends frames to MediaPipe) ─────────────────────────
  const startSegLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const loop = async () => {
      const video = localVideoRef.current
      const seg   = segmentationRef.current

      if (video && video.readyState >= 2 && seg && segReadyRef.current) {
        try { await seg.send({ image: video }) } catch (_) {}
      } else if (!segReadyRef.current) {
        // Fallback render when seg not ready
        drawFallback()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // ── Fallback: draw raw video with filter (no bg removal) ─────────────────
  const drawFallback = useCallback(() => {
    const canvas = canvasRef.current
    const video  = localVideoRef.current
    if (!canvas || !video || video.readyState < 2) return
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-W, 0)
    ctx.filter = activeFilterRef.current.css
    ctx.drawImage(video, 0, 0, W, H)
    ctx.restore()
  }, [])

  // ── When bg changes: restart loop appropriately ───────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    if (activeBg.type === 'none') {
      // Just run a simple draw loop (no MediaPipe)
      const simpleLoop = () => {
        drawFallback()
        rafRef.current = requestAnimationFrame(simpleLoop)
      }
      rafRef.current = requestAnimationFrame(simpleLoop)
    } else if (segReadyRef.current) {
      startSegLoop()
    }
    // else: init effect above will call startSegLoop once MediaPipe loads
  }, [activeBg, activeFilter, drawFallback, startSegLoop])

  // ── Main call setup ───────────────────────────────────────────────────────
  useEffect(() => {
    startCall()
    return () => cleanup()
  }, [])

  useEffect(() => {
    if (callStatus === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [callStatus])

  const formatDuration = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H, facingMode: 'user' },
        audio: true
      })
      localStreamRef.current = stream

      // Attach raw stream to hidden video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        await localVideoRef.current.play().catch(() => {})
      }

      // Setup canvas
      const canvas = canvasRef.current
      canvas.width = W; canvas.height = H

      // Start simple fallback loop immediately
      const simpleLoop = () => {
        drawFallback()
        rafRef.current = requestAnimationFrame(simpleLoop)
      }
      rafRef.current = requestAnimationFrame(simpleLoop)

      // Capture canvas as WebRTC stream
      const canvasStream = canvas.captureStream(25)
      // Add audio from real mic
      stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
      processedStreamRef.current = canvasStream

      // WebRTC peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc
      canvasStream.getTracks().forEach(track => pc.addTrack(track, canvasStream))

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0]
          setCallStatus('active')
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setCallStatus('ended')
        }
      }

      const channel = supabase.channel(`videocall-${roomId}`, {
        config: { broadcast: { self: false } }
      })
      channelRef.current = channel
      politeRef.current = currentUser.id > chatUser.id

      channel
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.to !== currentUser.id) return
          const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable'
          ignoreOfferRef.current = !politeRef.current && offerCollision
          if (ignoreOfferRef.current) return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'answer', payload: { sdp: answer, to: payload.from, from: currentUser.id } })
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to !== currentUser.id) return
          if (pc.signalingState !== 'have-local-offer') return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.to !== currentUser.id) return
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) }
          catch (err) { if (!ignoreOfferRef.current) console.error('ICE:', err) }
        })
        .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
          if (payload.to !== currentUser.id) return
          setCallStatus('ended')
          setTimeout(() => onClose(), 1500)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const callerCh = supabase.channel(`incoming-call-${chatUser.id}`)
            await callerCh.subscribe()
            await callerCh.send({
              type: 'broadcast', event: 'incoming-call',
              payload: { from: currentUser.id, callerName: currentUser.email, roomId }
            })
            supabase.removeChannel(callerCh)
            if (!politeRef.current) await sendOffer(pc, channel)
          }
        })

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) channel.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { candidate, to: chatUser.id, from: currentUser.id }
        })
      }

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current = true
          await sendOffer(pc, channelRef.current)
        } catch (err) { console.error('Negotiation:', err) }
        finally { makingOfferRef.current = false }
      }

    } catch (err) {
      console.error('startCall error:', err)
      setCallStatus('ended')
    }
  }

  const sendOffer = async (pc, channel) => {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    channel.send({ type: 'broadcast', event: 'offer',
      payload: { sdp: offer, to: chatUser.id, from: currentUser.id } })
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (segmentationRef.current) { segmentationRef.current.close?.(); segmentationRef.current = null }
    segReadyRef.current = false
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    processedStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
  }

  const endCall = async () => {
    if (channelRef.current) await channelRef.current.send({
      type: 'broadcast', event: 'call-ended',
      payload: { to: chatUser.id, from: currentUser.id }
    })
    setCallStatus('ended')
    setTimeout(() => { cleanup(); onClose() }, 800)
  }

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled) }
  }

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled) }
  }

  const handleFilterSelect = (f) => { setActiveFilter(f); setShowPanel(null) }
  const handleBgSelect = (b) => {
    setActiveBg(b)
    setShowPanel(null)
    // If switching to a bg-removal mode and MediaPipe not loaded yet
    if (b.type !== 'none' && !segReadyRef.current && localStreamRef.current) {
      const init = async () => {
        setSegLoading(true)
        try {
          const SelfieSegmentation = await loadMediaPipe()
          const seg = new SelfieSegmentation({ locateFile: (f) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
          })
          seg.setOptions({ modelSelection: 1, selfieMode: false })
          seg.onResults(onSegmentationResults)
          await seg.initialize()
          segmentationRef.current = seg
          segReadyRef.current = true
          setSegLoading(false)
          startSegLoop()
        } catch (err) {
          console.error(err)
          setSegError(true)
          setSegLoading(false)
        }
      }
      init()
    }
  }

  return (
    <div className="vc-overlay" onClick={() => setShowPanel(null)}>
      <div className="vc-container" onClick={e => e.stopPropagation()}>

        {/* Remote video */}
        <video ref={remoteVideoRef} className="vc-remote" autoPlay playsInline />

        {/* Hidden raw camera video — MediaPipe reads from this */}
        <video ref={localVideoRef} className="vc-hidden-raw" autoPlay playsInline muted />

        {/* Status overlay */}
        {callStatus !== 'active' && (
          <div className="vc-status-overlay">
            <div className="vc-avatar">
              {chatUser?.avatar_url
                ? <img src={chatUser.avatar_url} alt="" />
                : <span>{(chatUser?.name || '?')[0].toUpperCase()}</span>
              }
            </div>
            <p className="vc-name">{chatUser?.name || chatUser?.email || 'User'}</p>
            <p className="vc-status-text">
              {callStatus === 'connecting' ? 'Calling…' : 'Call ended'}
            </p>
          </div>
        )}

        {/* Duration */}
        {callStatus === 'active' && (
          <div className="vc-duration">{formatDuration(duration)}</div>
        )}

        {/* Active labels top-left */}
        {callStatus === 'active' && (activeFilter.id !== 'none' || activeBg.id !== 'none') && (
          <div className="vc-active-labels">
            {activeFilter.id !== 'none' && (
              <span className="vc-label">{activeFilter.emoji} {activeFilter.label}</span>
            )}
            {activeBg.id !== 'none' && (
              <span className="vc-label">
                {segLoading ? '⏳ Loading AI…' : segError ? '⚠️ BG failed' : `${activeBg.emoji} ${activeBg.label}`}
              </span>
            )}
          </div>
        )}

        {/* ── Filter panel ── */}
        {showPanel === 'filters' && (
          <div className="vc-panel" onClick={e => e.stopPropagation()}>
            <p className="vc-panel-title">🎭 Filters</p>
            <div className="vc-panel-grid">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  className={`vc-panel-item ${activeFilter.id === f.id ? 'active' : ''}`}
                  onClick={() => handleFilterSelect(f)}
                >
                  <span className="vc-panel-emoji">{f.emoji}</span>
                  <span className="vc-panel-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Background panel ── */}
        {showPanel === 'backgrounds' && (
          <div className="vc-panel" onClick={e => e.stopPropagation()}>
            <p className="vc-panel-title">🖼️ Backgrounds <span style={{ fontSize: 11, opacity: 0.6 }}>(AI powered)</span></p>
            <div className="vc-panel-grid">
              {BACKGROUNDS.map(b => (
                <button
                  key={b.id}
                  className={`vc-panel-item ${activeBg.id === b.id ? 'active' : ''}`}
                  onClick={() => handleBgSelect(b)}
                  style={
                    b.type === 'color'
                      ? { backgroundImage: `linear-gradient(135deg, ${b.value.join(',')})`, backgroundSize: 'cover' }
                      : b.type === 'image'
                      ? { backgroundImage: `url(${b.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : {}
                  }
                >
                  <span className="vc-panel-emoji">{b.emoji}</span>
                  <span className="vc-panel-label" style={b.type !== 'none' ? { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } : {}}>
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="vc-panel-note">Uses AI to separate you from your real background</p>
          </div>
        )}

        {/* Local PiP — canvas with filter + bg removal */}
        <div className="vc-local-wrapper">
          {camOn
            ? <canvas ref={canvasRef} className="vc-local-canvas" />
            : <div className="vc-cam-off-pip">📷 Off</div>
          }
        </div>

        {/* Controls */}
        <div className="vc-controls">
          <button
            className={`vc-btn ${micOn ? '' : 'vc-btn-off'}`}
            onClick={toggleMic}
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? '🎙️' : '🔇'}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>

          <button
            className={`vc-btn ${showPanel === 'filters' ? 'vc-btn-active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowPanel(p => p === 'filters' ? null : 'filters') }}
            title="Filters"
          >
            🎭
            <span>Filters</span>
          </button>

          <button className="vc-btn vc-btn-end" onClick={endCall} title="End call">
            📵
            <span>End</span>
          </button>

          <button
            className={`vc-btn ${showPanel === 'backgrounds' ? 'vc-btn-active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowPanel(p => p === 'backgrounds' ? null : 'backgrounds') }}
            title="Backgrounds"
          >
            🖼️
            <span>BG</span>
          </button>

          <button
            className={`vc-btn ${camOn ? '' : 'vc-btn-off'}`}
            onClick={toggleCam}
            title={camOn ? 'Camera off' : 'Camera on'}
          >
            {camOn ? '📹' : '🚫'}
            <span>{camOn ? 'Camera' : 'Cam off'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}

export default VideoCall