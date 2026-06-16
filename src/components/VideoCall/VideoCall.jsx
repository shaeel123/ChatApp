import React, { useEffect, useRef, useState, useCallback } from 'react'
import './VideoCall.css'
import { supabase } from '../../config/supabase'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

const FILTERS = [
  { id: 'none',      label: 'Normal',  emoji: '😐', css: 'none' },
  { id: 'grayscale', label: 'B&W',     emoji: '🎞️', css: 'grayscale(1)' },
  { id: 'sepia',     label: 'Vintage', emoji: '🕰️', css: 'sepia(0.85)' },
  { id: 'warm',      label: 'Warm',    emoji: '🌅', css: 'saturate(1.6) hue-rotate(-20deg) brightness(1.1)' },
  { id: 'cold',      label: 'Icy',     emoji: '🧊', css: 'saturate(0.8) hue-rotate(160deg) brightness(1.05)' },
  { id: 'neon',      label: 'Neon',    emoji: '🌈', css: 'saturate(3) contrast(1.4) brightness(1.1)' },
  { id: 'dreamy',    label: 'Dreamy',  emoji: '💭', css: 'blur(2px) brightness(1.1)' },
  { id: 'invert',    label: 'Invert',  emoji: '🔄', css: 'invert(0.85)' },
  { id: 'comic',     label: 'Comic',   emoji: '💥', css: 'contrast(2) saturate(2.5)' },
  { id: 'pink',      label: 'Pink',    emoji: '🌸', css: 'sepia(0.4) saturate(2.5) hue-rotate(300deg)' },
  { id: 'horror',    label: 'Horror',  emoji: '👹', css: 'grayscale(0.6) contrast(2) brightness(0.7) hue-rotate(340deg)' },
  { id: 'dark',      label: 'Dark',    emoji: '🌑', css: 'brightness(0.45) contrast(1.6)' },
]

const BACKGROUNDS = [
  { id: 'none',      label: 'None',      emoji: '🚫', type: 'none' },
  { id: 'blur',      label: 'Blur',      emoji: '🌫️', type: 'blur',  blurAmount: 16 },
  { id: 'beach',     label: 'Beach',     emoji: '🏖️', type: 'image', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80' },
  { id: 'mountains', label: 'Mountains', emoji: '🏔️', type: 'image', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=80' },
  { id: 'city',      label: 'City',      emoji: '🌆', type: 'image', value: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&q=80' },
  { id: 'forest',    label: 'Forest',    emoji: '🌲', type: 'image', value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280&q=80' },
  { id: 'office',    label: 'Office',    emoji: '🏢', type: 'image', value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80' },
  { id: 'galaxy',    label: 'Galaxy',    emoji: '🌌', type: 'image', value: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1280&q=80' },
  { id: 'cafe',      label: 'Café',      emoji: '☕', type: 'image', value: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1280&q=80' },
  { id: 'space',     label: 'Space',     emoji: '🚀', type: 'gradient', colors: ['#0f0c29', '#302b63', '#24243e'] },
  { id: 'purple',    label: 'Purple',    emoji: '💜', type: 'gradient', colors: ['#6a11cb', '#2575fc'] },
  { id: 'sunset',    label: 'Sunset',    emoji: '🌇', type: 'gradient', colors: ['#f7797d', '#FBD786', '#C6FFDD'] },
]

const W = 640, H = 480

const VideoCall = ({ currentUser, chatUser, onClose }) => {
  // Refs
  const localVideoRef      = useRef(null)
  const remoteVideoRef     = useRef(null)
  const mainCanvasRef      = useRef(null)   // final output shown & streamed
  const bgCanvasRef        = useRef(null)   // offscreen: holds the background frame
  const rafRef             = useRef(null)
  const pcRef              = useRef(null)
  const localStreamRef     = useRef(null)
  const processedStreamRef = useRef(null)
  const channelRef         = useRef(null)
  const makingOfferRef     = useRef(false)
  const ignoreOfferRef     = useRef(false)
  const politeRef          = useRef(false)
  const timerRef           = useRef(null)
  const bgImageRef         = useRef(null)
  const bgLoadedRef        = useRef(false)
  const activeFilterRef    = useRef(FILTERS[0])
  const activeBgRef        = useRef(BACKGROUNDS[0])
  const segWorkerRef       = useRef(null)   // BodyPix worker
  const maskRef            = useRef(null)   // latest segmentation mask
  const segActiveRef       = useRef(false)

  // State
  const [callStatus, setCallStatus]     = useState('connecting')
  const [micOn, setMicOn]               = useState(true)
  const [camOn, setCamOn]               = useState(true)
  const [duration, setDuration]         = useState(0)
  const [showPanel, setShowPanel]       = useState(null)
  const [activeFilter, setActiveFilter] = useState(FILTERS[0])
  const [activeBg, setActiveBg]         = useState(BACKGROUNDS[0])
  const [segStatus, setSegStatus]       = useState('idle') // idle | loading | ready | error

  const roomId = [currentUser.id, chatUser.id].sort().join('_')

  // Keep refs in sync
  useEffect(() => { activeFilterRef.current = activeFilter }, [activeFilter])
  useEffect(() => { activeBgRef.current = activeBg }, [activeBg])

  // ── Load bg image whenever bg changes ────────────────────────────────────
  useEffect(() => {
    bgLoadedRef.current = false
    bgImageRef.current = null
    if (activeBg.type === 'image') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = activeBg.value
      img.onload  = () => { bgImageRef.current = img; bgLoadedRef.current = true }
      img.onerror = () => { bgLoadedRef.current = false }
    }
  }, [activeBg])

  // ── BodyPix segmentation via tf.js (lazy loaded) ─────────────────────────
  const loadBodyPix = useCallback(async () => {
    if (segActiveRef.current) return
    setSegStatus('loading')
    try {
      // Dynamically import tf + bodypix
      const tf = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js').catch(() => null)
      const bp = await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0/dist/body-pix.min.js').catch(() => null)

      if (!window.bodyPix) throw new Error('BodyPix not available')

      const net = await window.bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      })

      segActiveRef.current = true
      setSegStatus('ready')

      // Run segmentation loop independently — never blocks the draw loop
      const segLoop = async () => {
        const video = localVideoRef.current
        if (video && video.readyState >= 2 && segActiveRef.current) {
          try {
            const seg = await net.segmentPerson(video, {
              internalResolution: 'medium',
              segmentationThreshold: 0.7,
              maxDetections: 1,
            })
            maskRef.current = seg
          } catch (_) {}
        }
        if (segActiveRef.current) setTimeout(segLoop, 80) // ~12fps segmentation
      }
      segLoop()

    } catch (err) {
      console.error('BodyPix load error:', err)
      setSegStatus('error')
    }
  }, [])

  // ── Main canvas draw loop — NEVER stops, always draws camera ─────────────
  const startDrawLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const draw = () => {
      const video  = localVideoRef.current
      const canvas = mainCanvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }

      const ctx = canvas.getContext('2d')
      const bg  = activeBgRef.current
      const filter = activeFilterRef.current

      ctx.save()
      ctx.scale(-1, 1)           // mirror selfie
      ctx.translate(-W, 0)

      if (!video || video.readyState < 2) {
        // Camera not ready yet — draw black
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      if (bg.type === 'none') {
        // ── No background: just draw video with filter ───────────────────
        ctx.filter = filter.css
        ctx.drawImage(video, 0, 0, W, H)

      } else if (maskRef.current && segActiveRef.current) {
        // ── Segmentation ready: real background removal ──────────────────
        const mask = maskRef.current
        const maskData = mask.data // Uint8Array, 1 per pixel, 1=person 0=bg

        // Step 1 — draw background
        ctx.filter = 'none'
        drawBackground(ctx, bg, video)

        // Step 2 — draw person pixels only using mask
        // Use a temp canvas to isolate person
        const tmp = document.createElement('canvas')
        tmp.width = W; tmp.height = H
        const tCtx = tmp.getContext('2d')
        tCtx.filter = filter.css
        tCtx.drawImage(video, 0, 0, W, H)

        // Get person pixels and blank out background
        const imgData = tCtx.getImageData(0, 0, W, H)
        const pixels  = imgData.data

        // maskRef data is at segmentation resolution — scale indices
        const mW = mask.width, mH = mask.height
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const mx = Math.floor((x / W) * mW)
            const my = Math.floor((y / H) * mH)
            const mi = my * mW + mx
            if (!maskData[mi]) {
              // Background pixel — make transparent
              pixels[(y * W + x) * 4 + 3] = 0
            }
          }
        }
        tCtx.putImageData(imgData, 0, 0)

        // Step 3 — composite person over background
        ctx.filter = 'none'
        ctx.drawImage(tmp, 0, 0, W, H)

      } else {
        // ── Segmentation loading/unavailable: show background behind video
        // as a subtle preview (split: bg left, video right with opacity)
        ctx.filter = 'none'
        drawBackground(ctx, bg, video)
        ctx.filter = filter.css
        ctx.globalAlpha = 0.85
        ctx.drawImage(video, 0, 0, W, H)
        ctx.globalAlpha = 1
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  const drawBackground = (ctx, bg, video) => {
    if (bg.type === 'blur') {
      ctx.filter = `blur(${bg.blurAmount}px) brightness(0.7)`
      ctx.drawImage(video, 0, 0, W, H)
      ctx.filter = 'none'
    } else if (bg.type === 'image' && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, W, H)
    } else if (bg.type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, W, H)
      bg.colors.forEach((c, i) => grad.addColorStop(i / Math.max(bg.colors.length - 1, 1), c))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.fillStyle = '#1a1a2a'
      ctx.fillRect(0, 0, W, H)
    }
  }

  // ── When bg changes, trigger segmentation loading if needed ──────────────
  useEffect(() => {
    if (activeBg.type !== 'none' && segStatus === 'idle' && localStreamRef.current) {
      loadSegmentation()
    }
  }, [activeBg])

  const loadSegmentation = useCallback(async () => {
    if (segActiveRef.current || segStatus === 'loading') return
    setSegStatus('loading')
    try {
      // Load scripts sequentially
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0/dist/body-pix.min.js')

      if (!window.bodyPix) throw new Error('bodyPix not on window')

      const net = await window.bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      })

      segActiveRef.current = true
      segWorkerRef.current = net
      setSegStatus('ready')

      const segLoop = async () => {
        const video = localVideoRef.current
        if (video && video.readyState >= 2 && segActiveRef.current) {
          try {
            const seg = await net.segmentPerson(video, {
              internalResolution: 'medium',
              segmentationThreshold: 0.65,
              maxDetections: 1,
            })
            maskRef.current = seg
          } catch (_) {}
        }
        if (segActiveRef.current) setTimeout(segLoop, 80)
      }
      segLoop()

    } catch (err) {
      console.error('Segmentation load failed:', err)
      setSegStatus('error')
    }
  }, [segStatus])

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })

  // ── Call setup ────────────────────────────────────────────────────────────
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

  const formatDuration = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${m}:${sec}`
  }

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H, facingMode: 'user' },
        audio: true,
      })
      localStreamRef.current = stream

      const video = localVideoRef.current
      video.srcObject = stream
      video.onloadedmetadata = () => video.play().catch(() => {})

      // Setup output canvas
      const canvas = mainCanvasRef.current
      canvas.width = W
      canvas.height = H

      // Start draw loop immediately — camera shows right away
      startDrawLoop()

      // Capture canvas stream for WebRTC
      const canvasStream = canvas.captureStream(25)
      stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
      processedStreamRef.current = canvasStream

      // WebRTC
      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc
      canvasStream.getTracks().forEach(t => pc.addTrack(t, canvasStream))

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0]
          setCallStatus('active')
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (['disconnected', 'failed'].includes(pc.iceConnectionState)) {
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
          const collision = makingOfferRef.current || pc.signalingState !== 'stable'
          ignoreOfferRef.current = !politeRef.current && collision
          if (ignoreOfferRef.current) return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'answer',
            payload: { sdp: answer, to: payload.from, from: currentUser.id } })
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
          if (status !== 'SUBSCRIBED') return
          const callerCh = supabase.channel(`incoming-call-${chatUser.id}`)
          await callerCh.subscribe()
          await callerCh.send({
            type: 'broadcast', event: 'incoming-call',
            payload: { from: currentUser.id, callerName: currentUser.email, roomId }
          })
          supabase.removeChannel(callerCh)
          if (!politeRef.current) await sendOffer(pc, channel)
        })

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) channel.send({ type: 'broadcast', event: 'ice-candidate',
          payload: { candidate, to: chatUser.id, from: currentUser.id } })
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
    segActiveRef.current = false
    maskRef.current = null
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
    const t = localStreamRef.current?.getAudioTracks()[0]
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled) }
  }

  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0]
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled) }
  }

  const handleBgSelect = (b) => {
    setActiveBg(b)
    setShowPanel(null)
    if (b.type !== 'none' && segStatus === 'idle' && localStreamRef.current) {
      loadSegmentation()
    }
  }

  const segLabel = () => {
    if (segStatus === 'loading') return '⏳ Loading AI…'
    if (segStatus === 'error')   return '⚠️ BG unavailable'
    if (segStatus === 'ready')   return `${activeBg.emoji} ${activeBg.label}`
    return `${activeBg.emoji} ${activeBg.label}`
  }

  return (
    <div className="vc-overlay" onClick={() => setShowPanel(null)}>
      <div className="vc-container" onClick={e => e.stopPropagation()}>

        {/* Remote video */}
        <video ref={remoteVideoRef} className="vc-remote" autoPlay playsInline />

        {/* Hidden raw camera — never shown, canvas reads from it */}
        <video ref={localVideoRef} className="vc-hidden-raw" autoPlay playsInline muted />

        {/* Connecting / ended overlay */}
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

        {/* Active labels */}
        {callStatus === 'active' && (activeFilter.id !== 'none' || activeBg.id !== 'none') && (
          <div className="vc-active-labels">
            {activeFilter.id !== 'none' && <span className="vc-label">{activeFilter.emoji} {activeFilter.label}</span>}
            {activeBg.id    !== 'none' && <span className="vc-label">{segLabel()}</span>}
          </div>
        )}

        {/* Filter panel */}
        {showPanel === 'filters' && (
          <div className="vc-panel" onClick={e => e.stopPropagation()}>
            <p className="vc-panel-title">🎭 Filters</p>
            <div className="vc-panel-grid">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  className={`vc-panel-item ${activeFilter.id === f.id ? 'active' : ''}`}
                  onClick={() => { setActiveFilter(f); setShowPanel(null) }}
                >
                  <span className="vc-panel-emoji">{f.emoji}</span>
                  <span className="vc-panel-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Background panel */}
        {showPanel === 'backgrounds' && (
          <div className="vc-panel" onClick={e => e.stopPropagation()}>
            <p className="vc-panel-title">🖼️ Backgrounds</p>
            <div className="vc-panel-grid">
              {BACKGROUNDS.map(b => (
                <button
                  key={b.id}
                  className={`vc-panel-item ${activeBg.id === b.id ? 'active' : ''}`}
                  onClick={() => handleBgSelect(b)}
                  style={
                    b.type === 'gradient'
                      ? { backgroundImage: `linear-gradient(135deg, ${b.colors.join(',')})` }
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
            {segStatus === 'loading' && (
              <p className="vc-panel-note">⏳ Loading AI model… camera stays live</p>
            )}
            {segStatus === 'error' && (
              <p className="vc-panel-note" style={{ color: '#ff7043' }}>
                ⚠️ AI model failed to load. Background shown as overlay.
              </p>
            )}
          </div>
        )}

        {/* Local PiP — canvas output */}
        <div className="vc-local-wrapper">
          {camOn
            ? <canvas ref={mainCanvasRef} className="vc-local-canvas" />
            : <div className="vc-cam-off-pip">📷 Off</div>
          }
        </div>

        {/* Controls */}
        <div className="vc-controls">
          <button className={`vc-btn ${micOn ? '' : 'vc-btn-off'}`} onClick={toggleMic} title="Mic">
            {micOn ? '🎙️' : '🔇'}<span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>

          <button
            className={`vc-btn ${showPanel === 'filters' ? 'vc-btn-active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowPanel(p => p === 'filters' ? null : 'filters') }}
          >
            🎭<span>Filters</span>
          </button>

          <button className="vc-btn vc-btn-end" onClick={endCall}>
            📵<span>End</span>
          </button>

          <button
            className={`vc-btn ${showPanel === 'backgrounds' ? 'vc-btn-active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowPanel(p => p === 'backgrounds' ? null : 'backgrounds') }}
          >
            🖼️<span>BG</span>
          </button>

          <button className={`vc-btn ${camOn ? '' : 'vc-btn-off'}`} onClick={toggleCam} title="Camera">
            {camOn ? '📹' : '🚫'}<span>{camOn ? 'Camera' : 'Off'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}

export default VideoCall