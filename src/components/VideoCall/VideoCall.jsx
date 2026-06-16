import React, { useEffect, useRef, useState, useCallback } from 'react'
import './VideoCall.css'
import { supabase } from '../../config/supabase'
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision'

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
  { id: 'dreamy',    label: 'Dreamy',  emoji: '💭', css: 'blur(2px) brightness(1.15)' },
  { id: 'invert',    label: 'Invert',  emoji: '🔄', css: 'invert(0.85)' },
  { id: 'comic',     label: 'Comic',   emoji: '💥', css: 'contrast(2) saturate(2.5)' },
  { id: 'pink',      label: 'Pink',    emoji: '🌸', css: 'sepia(0.4) saturate(2.5) hue-rotate(300deg)' },
  { id: 'horror',    label: 'Horror',  emoji: '👹', css: 'grayscale(0.6) contrast(2) brightness(0.7)' },
  { id: 'dark',      label: 'Dark',    emoji: '🌑', css: 'brightness(0.45) contrast(1.6)' },
]

const BACKGROUNDS = [
  { id: 'none',      label: 'None',      emoji: '🚫', type: 'none' },
  { id: 'blur',      label: 'Blur',      emoji: '🌫️', type: 'blur' },
  { id: 'beach',     label: 'Beach',     emoji: '🏖️', type: 'image', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80' },
  { id: 'mountains', label: 'Mountains', emoji: '🏔️', type: 'image', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=80' },
  { id: 'city',      label: 'City Night',emoji: '🌆', type: 'image', value: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1280&q=80' },
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
  const localVideoRef       = useRef(null)   // raw camera (hidden)
  const remoteVideoRef      = useRef(null)
  const outputCanvasRef     = useRef(null)   // final output shown + streamed
  const bgCanvasRef         = useRef(null)   // offscreen: background frames
  const personCanvasRef     = useRef(null)   // offscreen: person with filter
  const segmenterRef        = useRef(null)
  const bgImageRef          = useRef(null)
  const rafRef              = useRef(null)
  const lastMaskRef         = useRef(null)   // Float32Array from MediaPipe
  const pcRef               = useRef(null)
  const localStreamRef      = useRef(null)
  const processedStreamRef  = useRef(null)
  const channelRef          = useRef(null)
  const makingOfferRef      = useRef(false)
  const ignoreOfferRef      = useRef(false)
  const politeRef           = useRef(false)
  const timerRef            = useRef(null)
  const activeFilterRef     = useRef(FILTERS[0])
  const activeBgRef         = useRef(BACKGROUNDS[0])
  const segRunningRef       = useRef(false)

  const [callStatus, setCallStatus]     = useState('connecting')
  const [micOn, setMicOn]               = useState(true)
  const [camOn, setCamOn]               = useState(true)
  const [duration, setDuration]         = useState(0)
  const [showPanel, setShowPanel]       = useState(null)
  const [activeFilter, setActiveFilter] = useState(FILTERS[0])
  const [activeBg, setActiveBg]         = useState(BACKGROUNDS[0])
  const [segStatus, setSegStatus]       = useState('idle') // idle|loading|ready|error

  const roomId = [currentUser.id, chatUser.id].sort().join('_')

  useEffect(() => { activeFilterRef.current = activeFilter }, [activeFilter])
  useEffect(() => { activeBgRef.current = activeBg }, [activeBg])

  // ── Preload bg image ──────────────────────────────────────────────────────
  useEffect(() => {
    bgImageRef.current = null
    if (activeBg.type === 'image') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = activeBg.value
      img.onload = () => { bgImageRef.current = img }
    }
  }, [activeBg])

  // ── Init MediaPipe ImageSegmenter (selfie model) ──────────────────────────
  const initSegmenter = useCallback(async () => {
    if (segmenterRef.current || segStatus === 'loading') return
    setSegStatus('loading')
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      const segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
          delegate: 'GPU',
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: 'VIDEO',
      })
      segmenterRef.current = segmenter
      setSegStatus('ready')
      startSegLoop()
    } catch (err) {
      console.error('Segmenter init error:', err)
      // Try CPU fallback
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        const segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'CPU',
          },
          outputCategoryMask: false,
          outputConfidenceMasks: true,
          runningMode: 'VIDEO',
        })
        segmenterRef.current = segmenter
        setSegStatus('ready')
        startSegLoop()
      } catch (err2) {
        console.error('Segmenter CPU fallback error:', err2)
        setSegStatus('error')
      }
    }
  }, [segStatus])

  // ── Segmentation loop — independent from draw loop ───────────────────────
  const startSegLoop = useCallback(() => {
    if (segRunningRef.current) return
    segRunningRef.current = true

    const loop = () => {
      const video = localVideoRef.current
      const seg   = segmenterRef.current
      if (!segRunningRef.current) return

      if (video && video.readyState >= 2 && seg) {
        try {
          const result = seg.segmentForVideo(video, performance.now())
          if (result?.confidenceMasks?.[0]) {
            lastMaskRef.current = result.confidenceMasks[0].getAsFloat32Array()
            result.confidenceMasks[0].close()
          }
        } catch (_) {}
      }
      setTimeout(loop, 33) // ~30fps segmentation
    }
    loop()
  }, [])

  // ── Main draw loop — always runs, never blocked ───────────────────────────
  const startDrawLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    // Create offscreen canvases once
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas')
      bgCanvasRef.current.width = W
      bgCanvasRef.current.height = H
    }
    if (!personCanvasRef.current) {
      personCanvasRef.current = document.createElement('canvas')
      personCanvasRef.current.width = W
      personCanvasRef.current.height = H
    }

    const draw = () => {
      const video    = localVideoRef.current
      const canvas   = outputCanvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }

      const ctx = canvas.getContext('2d')
      const bg  = activeBgRef.current
      const filter = activeFilterRef.current
      const mask = lastMaskRef.current

      ctx.save()
      ctx.scale(-1, 1)
      ctx.translate(-W, 0)

      if (!video || video.readyState < 2) {
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      if (bg.type === 'none' || !mask) {
        // No bg or mask not ready — raw video + filter
        ctx.filter = filter.css
        ctx.drawImage(video, 0, 0, W, H)
        ctx.restore()
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      // ── Real background replacement ──────────────────────────────────────

      // 1. Draw background onto output
      ctx.filter = 'none'
      if (bg.type === 'blur') {
        ctx.filter = 'blur(18px) brightness(0.75)'
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

      // 2. Draw person with filter onto person canvas
      const pCtx = personCanvasRef.current.getContext('2d')
      pCtx.clearRect(0, 0, W, H)
      pCtx.filter = filter.css
      pCtx.drawImage(video, 0, 0, W, H)

      // 3. Apply mask: for each pixel, set alpha = confidence * 255
      const pImgData = pCtx.getImageData(0, 0, W, H)
      const pixels   = pImgData.data
      const mW = Math.round(Math.sqrt(mask.length * (W / H)))
      const mH = Math.round(mask.length / mW)

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          // Mirror x because we already flipped the ctx
          const mx = Math.floor(((W - 1 - x) / W) * mW)
          const my = Math.floor((y / H) * mH)
          const mi = my * mW + mx
          const confidence = mask[mi] ?? 0
          // Soft edge: smooth the alpha
          pixels[(y * W + x) * 4 + 3] = Math.min(255, confidence * 280)
        }
      }
      pCtx.putImageData(pImgData, 0, 0)

      // 4. Composite person over background (no need to flip — bg already drawn flipped)
      ctx.filter = 'none'
      // Draw person canvas WITHOUT the flip (it's in normal orientation)
      ctx.restore()
      ctx.save()
      ctx.drawImage(personCanvasRef.current, 0, 0, W, H)
      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  // ── Trigger segmenter init when a background is chosen ───────────────────
  const handleBgSelect = (b) => {
    setActiveBg(b)
    setShowPanel(null)
    if (b.type !== 'none' && !segmenterRef.current && segStatus !== 'loading') {
      initSegmenter()
    }
  }

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

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H, facingMode: 'user' },
        audio: true,
      })
      localStreamRef.current = stream

      const vid = localVideoRef.current
      vid.srcObject = stream
      vid.onloadedmetadata = () => vid.play().catch(() => {})

      const canvas = outputCanvasRef.current
      canvas.width = W
      canvas.height = H

      // Start draw loop immediately — camera works from frame 1
      startDrawLoop()

      const canvasStream = canvas.captureStream(25)
      stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
      processedStreamRef.current = canvasStream

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
        if (['disconnected', 'failed'].includes(pc.iceConnectionState))
          setCallStatus('ended')
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
          catch (e) { if (!ignoreOfferRef.current) console.error(e) }
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
        try { makingOfferRef.current = true; await sendOffer(pc, channelRef.current) }
        catch (e) { console.error(e) }
        finally { makingOfferRef.current = false }
      }

    } catch (err) {
      console.error('startCall:', err)
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
    segRunningRef.current = false
    segmenterRef.current?.close()
    segmenterRef.current = null
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

  return (
    <div className="vc-overlay" onClick={() => setShowPanel(null)}>
      <div className="vc-container" onClick={e => e.stopPropagation()}>

        <video ref={remoteVideoRef} className="vc-remote" autoPlay playsInline />
        <video ref={localVideoRef}  className="vc-hidden-raw" autoPlay playsInline muted />

        {callStatus !== 'active' && (
          <div className="vc-status-overlay">
            <div className="vc-avatar">
              {chatUser?.avatar_url
                ? <img src={chatUser.avatar_url} alt="" />
                : <span>{(chatUser?.name || '?')[0].toUpperCase()}</span>
              }
            </div>
            <p className="vc-name">{chatUser?.name || chatUser?.email || 'User'}</p>
            <p className="vc-status-text">{callStatus === 'connecting' ? 'Calling…' : 'Call ended'}</p>
          </div>
        )}

        {callStatus === 'active' && <div className="vc-duration">{fmt(duration)}</div>}

        {callStatus === 'active' && (activeFilter.id !== 'none' || activeBg.id !== 'none') && (
          <div className="vc-active-labels">
            {activeFilter.id !== 'none' && <span className="vc-label">{activeFilter.emoji} {activeFilter.label}</span>}
            {activeBg.id !== 'none' && (
              <span className="vc-label">
                {segStatus === 'loading' ? '⏳ Loading AI…' : segStatus === 'error' ? '⚠️ BG failed' : `${activeBg.emoji} ${activeBg.label}`}
              </span>
            )}
          </div>
        )}

        {/* Filter panel */}
        {showPanel === 'filters' && (
          <div className="vc-panel" onClick={e => e.stopPropagation()}>
            <p className="vc-panel-title">🎭 Filters</p>
            <div className="vc-panel-grid">
              {FILTERS.map(f => (
                <button key={f.id}
                  className={`vc-panel-item ${activeFilter.id === f.id ? 'active' : ''}`}
                  onClick={() => { setActiveFilter(f); setShowPanel(null) }}>
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
                <button key={b.id}
                  className={`vc-panel-item ${activeBg.id === b.id ? 'active' : ''}`}
                  onClick={() => handleBgSelect(b)}
                  style={
                    b.type === 'gradient'
                      ? { backgroundImage: `linear-gradient(135deg, ${b.colors.join(',')})` }
                      : b.type === 'image'
                      ? { backgroundImage: `url(${b.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : {}
                  }>
                  <span className="vc-panel-emoji">{b.emoji}</span>
                  <span className="vc-panel-label"
                    style={b.type !== 'none' ? { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } : {}}>
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
            {segStatus === 'loading' && <p className="vc-panel-note">⏳ Loading AI model… camera stays live</p>}
            {segStatus === 'error'   && <p className="vc-panel-note" style={{ color: '#ff7043' }}>⚠️ Could not load AI model</p>}
          </div>
        )}

        {/* Local PiP */}
        <div className="vc-local-wrapper">
          {camOn
            ? <canvas ref={outputCanvasRef} className="vc-local-canvas" />
            : <div className="vc-cam-off-pip">📷 Off</div>
          }
        </div>

        {/* Controls */}
        <div className="vc-controls">
          <button className={`vc-btn ${micOn ? '' : 'vc-btn-off'}`} onClick={toggleMic}>
            {micOn ? '🎙️' : '🔇'}<span>{micOn ? 'Mute' : 'Unmute'}</span>
          </button>
          <button
            className={`vc-btn ${showPanel === 'filters' ? 'vc-btn-active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowPanel(p => p === 'filters' ? null : 'filters') }}>
            🎭<span>Filters</span>
          </button>
          <button className="vc-btn vc-btn-end" onClick={endCall}>
            📵<span>End</span>
          </button>
          <button
            className={`vc-btn ${showPanel === 'backgrounds' ? 'vc-btn-active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowPanel(p => p === 'backgrounds' ? null : 'backgrounds') }}>
            🖼️<span>BG</span>
          </button>
          <button className={`vc-btn ${camOn ? '' : 'vc-btn-off'}`} onClick={toggleCam}>
            {camOn ? '📹' : '🚫'}<span>{camOn ? 'Camera' : 'Off'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}

export default VideoCall