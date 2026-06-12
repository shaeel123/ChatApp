import React, { useEffect, useRef, useState, useCallback } from 'react'
import './VideoCall.css'
import { supabase } from '../../config/supabase'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

/* ── Filter definitions ───────────────────────────── */
const FILTERS = [
  { id: 'none',      label: 'Normal',    emoji: '✨', css: 'none' },
  { id: 'grayscale', label: 'B&W',       emoji: '⬛', css: 'grayscale(100%)' },
  { id: 'sepia',     label: 'Vintage',   emoji: '🟤', css: 'sepia(90%) contrast(1.1) brightness(1.05)' },
  { id: 'warm',      label: 'Warm',      emoji: '🔆', css: 'saturate(1.4) hue-rotate(-15deg) brightness(1.08)' },
  { id: 'cold',      label: 'Icy',       emoji: '🧊', css: 'saturate(0.8) hue-rotate(160deg) brightness(1.05)' },
  { id: 'neon',      label: 'Neon',      emoji: '💜', css: 'saturate(3) hue-rotate(270deg) contrast(1.3) brightness(0.9)' },
  { id: 'comic',     label: 'Comic',     emoji: '💥', css: 'saturate(2.5) contrast(2) brightness(1.1)' },
  { id: 'blur',      label: 'Dreamy',    emoji: '🌫️', css: 'blur(3px) brightness(1.1) saturate(1.3)' },
  { id: 'invert',    label: 'Invert',    emoji: '🔄', css: 'invert(100%)' },
  { id: 'pinky',     label: 'Pinky',     emoji: '🌸', css: 'saturate(1.8) hue-rotate(300deg) brightness(1.1)' },
  { id: 'matrix',    label: 'Matrix',    emoji: '🟢', css: 'grayscale(100%) sepia(100%) saturate(500%) hue-rotate(80deg) brightness(0.85)' },
  { id: 'horror',    label: 'Horror',    emoji: '🩸', css: 'grayscale(40%) sepia(60%) saturate(400%) hue-rotate(320deg) contrast(1.5) brightness(0.8)' },
]

/* ── Background definitions ───────────────────────── */
const BACKGROUNDS = [
  { id: 'none',     label: 'None',        emoji: '🚫', type: 'none' },
  { id: 'blur',     label: 'Blur',        emoji: '🌫️', type: 'blur' },
  { id: 'space',    label: 'Space',       emoji: '🚀', type: 'color', value: 'radial-gradient(ellipse at 20% 40%, #0d0221 0%, #1a0533 30%, #000000 70%)' },
  { id: 'beach',    label: 'Beach',       emoji: '🏖️', type: 'gradient', value: 'linear-gradient(180deg, #87CEEB 0%, #87CEEB 55%, #f4d03f 55%, #f4d03f 65%, #c2956c 65%, #c2956c 100%)' },
  { id: 'office',   label: 'Office',      emoji: '🏢', type: 'gradient', value: 'linear-gradient(180deg, #b0c4de 0%, #b0c4de 40%, #8b7355 40%, #8b7355 100%)' },
  { id: 'forest',   label: 'Forest',      emoji: '🌲', type: 'gradient', value: 'linear-gradient(180deg, #2d5a27 0%, #4a7c59 40%, #3d2b1f 60%, #3d2b1f 100%)' },
  { id: 'galaxy',   label: 'Galaxy',      emoji: '🌌', type: 'color',    value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { id: 'sunset',   label: 'Sunset',      emoji: '🌅', type: 'gradient', value: 'linear-gradient(180deg, #ff6b35 0%, #f7931e 30%, #ffcd3c 60%, #c0392b 100%)' },
  { id: 'underwater',label:'Ocean',       emoji: '🐠', type: 'gradient', value: 'linear-gradient(180deg, #006994 0%, #0099cc 50%, #00bcd4 100%)' },
  { id: 'fire',     label: 'Fire',        emoji: '🔥', type: 'gradient', value: 'linear-gradient(180deg, #000000 0%, #1a0000 30%, #8b0000 60%, #ff4500 80%, #ff8c00 100%)' },
  { id: 'snow',     label: 'Arctic',      emoji: '❄️', type: 'gradient', value: 'linear-gradient(180deg, #87ceeb 0%, #b0e0e6 40%, #f0f8ff 70%, #ffffff 100%)' },
  { id: 'confetti', label: 'Party',       emoji: '🎉', type: 'animated' },
]

const VideoCall = ({ currentUser, chatUser, onClose }) => {
  const localVideoRef   = useRef(null)
  const remoteVideoRef  = useRef(null)
  const canvasRef       = useRef(null)
  const pcRef           = useRef(null)
  const localStreamRef  = useRef(null)
  const processedStreamRef = useRef(null)
  const channelRef      = useRef(null)
  const makingOfferRef  = useRef(false)
  const ignoreOfferRef  = useRef(false)
  const politeRef       = useRef(false)
  const animFrameRef    = useRef(null)
  const confettiRef     = useRef([])

  const [callStatus, setCallStatus]   = useState('connecting')
  const [micOn, setMicOn]             = useState(true)
  const [camOn, setCamOn]             = useState(true)
  const [duration, setDuration]       = useState(0)
  const [activeFilter, setActiveFilter]   = useState('none')
  const [activeBg, setActiveBg]           = useState('none')
  const [showPanel, setShowPanel]         = useState(null) // 'filters' | 'backgrounds' | null
  const timerRef = useRef(null)

  const roomId = [currentUser.id, chatUser.id].sort().join('_')

  /* ── Confetti particles ───────────────────────────── */
  const initConfetti = () => {
    confettiRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 640,
      y: Math.random() * -200,
      size: 6 + Math.random() * 10,
      speed: 1.5 + Math.random() * 2.5,
      color: `hsl(${Math.random() * 360},90%,60%)`,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6,
      swing: (Math.random() - 0.5) * 1.5,
    }))
  }

  /* ── Canvas rendering loop ───────────────────────── */
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const video  = localVideoRef.current
    if (!canvas || !video || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    ctx.save()
    // Mirror selfie
    ctx.translate(W, 0)
    ctx.scale(-1, 1)

    const bg = BACKGROUNDS.find(b => b.id === activeBg)

    if (bg && bg.type !== 'none') {
      // Draw background first
      if (bg.type === 'blur') {
        // Draw video, then overlay with blurred copy
        ctx.drawImage(video, 0, 0, W, H)
        ctx.restore()
        // Apply blur via canvas filter (not sent over WebRTC — just visual)
        // For the blurred bg we use a workaround: draw small, scale up
        const offscreen = document.createElement('canvas')
        offscreen.width = W / 8; offscreen.height = H / 8
        const octx = offscreen.getContext('2d')
        octx.drawImage(video, 0, 0, W / 8, H / 8)
        ctx.save()
        ctx.translate(W, 0); ctx.scale(-1, 1)
        ctx.filter = 'blur(16px)'
        ctx.drawImage(offscreen, 0, 0, W, H)
        ctx.filter = 'none'
        // Draw person on top (simple center oval crop)
        ctx.drawImage(video, W * 0.1, H * 0.05, W * 0.8, H * 0.9)
        ctx.restore()
      } else if (bg.type === 'animated' && bg.id === 'confetti') {
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
        // Draw confetti
        confettiRef.current.forEach(p => {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rot * Math.PI) / 180)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
          p.y += p.speed
          p.x += p.swing
          p.rot += p.rotSpeed
          if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W }
        })
        ctx.save()
        ctx.translate(W, 0); ctx.scale(-1, 1)
        ctx.drawImage(video, W * 0.08, H * 0.05, W * 0.84, H * 0.9)
        ctx.restore()
      } else {
        // Gradient / solid background
        ctx.restore()
        // Parse gradient string → use a temp div approach
        const grad = parseCssGradient(ctx, bg.value, W, H)
        if (grad) {
          ctx.fillStyle = grad
        } else {
          ctx.fillStyle = bg.value
        }
        ctx.fillRect(0, 0, W, H)
        ctx.save()
        ctx.translate(W, 0); ctx.scale(-1, 1)
        // Draw person (center-crop)
        ctx.drawImage(video, W * 0.08, H * 0.05, W * 0.84, H * 0.9)
        ctx.restore()
      }
    } else {
      ctx.drawImage(video, 0, 0, W, H)
      ctx.restore()
    }

    // Apply CSS filter on the canvas element for visual feedback
    const filterDef = FILTERS.find(f => f.id === activeFilter)
    canvas.style.filter = filterDef ? filterDef.css : 'none'

    animFrameRef.current = requestAnimationFrame(renderFrame)
  }, [activeFilter, activeBg])

  // simple linear-gradient parser → CanvasGradient
  const parseCssGradient = (ctx, cssStr, W, H) => {
    try {
      if (!cssStr.startsWith('linear-gradient')) return null
      const inner = cssStr.slice(cssStr.indexOf('(') + 1, cssStr.lastIndexOf(')'))
      const parts = inner.split(/,(?![^(]*\))/)
      let angle = 180
      let colorStops = []
      parts.forEach((p, i) => {
        p = p.trim()
        if (i === 0 && p.endsWith('deg')) { angle = parseFloat(p); return }
        const m = p.match(/^(#[\da-fA-F]+|\w+)\s*([\d.]+%)?$/)
        if (m) colorStops.push({ color: m[1], stop: m[2] ? parseFloat(m[2]) / 100 : null })
      })
      // Equally distribute missing stops
      colorStops = colorStops.map((s, i) => ({
        ...s,
        stop: s.stop !== null ? s.stop : i / (colorStops.length - 1)
      }))
      const rad = ((angle - 90) * Math.PI) / 180
      const grad = ctx.createLinearGradient(
        W / 2 - Math.cos(rad) * W / 2,
        H / 2 - Math.sin(rad) * H / 2,
        W / 2 + Math.cos(rad) * W / 2,
        H / 2 + Math.sin(rad) * H / 2,
      )
      colorStops.forEach(s => grad.addColorStop(s.stop, s.color))
      return grad
    } catch { return null }
  }

  /* ── Capture processed canvas as stream for WebRTC ── */
  const setupCanvasStream = (rawStream) => {
    const canvas = canvasRef.current
    if (!canvas) return rawStream
    const canvasStream = canvas.captureStream(30)
    const audioTrack = rawStream.getAudioTracks()[0]
    if (audioTrack) canvasStream.addTrack(audioTrack)
    processedStreamRef.current = canvasStream
    return canvasStream
  }

  useEffect(() => {
    initConfetti()
    startCall()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      cleanup()
    }
  }, [])

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(renderFrame)
  }, [renderFrame])

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // Wait for video to be ready before capturing canvas stream
      await new Promise(res => {
        const v = localVideoRef.current
        if (v && v.readyState >= 2) { res(); return }
        v.onloadeddata = res
      })

      const processedStream = setupCanvasStream(stream)

      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc

      processedStream.getTracks().forEach(track => pc.addTrack(track, processedStream))

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
          catch (err) { if (!ignoreOfferRef.current) console.error('ICE error:', err) }
        })
        .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
          if (payload.to !== currentUser.id) return
          setCallStatus('ended')
          setTimeout(() => onClose(), 1500)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const callerChannel = supabase.channel(`incoming-call-${chatUser.id}`)
            await callerChannel.subscribe()
            await callerChannel.send({
              type: 'broadcast', event: 'incoming-call',
              payload: { from: currentUser.id, callerName: currentUser.email, roomId }
            })
            supabase.removeChannel(callerChannel)
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
        } catch (err) { console.error('Negotiation error:', err) }
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
    channel.send({ type: 'broadcast', event: 'offer', payload: { sdp: offer, to: chatUser.id, from: currentUser.id } })
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    processedStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
  }

  const endCall = async () => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast', event: 'call-ended',
        payload: { to: chatUser.id, from: currentUser.id }
      })
    }
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

  const togglePanel = (panel) => setShowPanel(p => p === panel ? null : panel)

  return (
    <div className="vc-overlay" onClick={() => setShowPanel(null)}>
      <div className="vc-container" onClick={e => e.stopPropagation()}>

        {/* Remote video */}
        <video ref={remoteVideoRef} className="vc-remote" autoPlay playsInline />

        {/* Hidden raw local video (source for canvas) */}
        <video ref={localVideoRef} className="vc-local-raw" autoPlay playsInline muted />

        {/* Canvas — processed local video shown in PiP */}
        <canvas ref={canvasRef} width={640} height={480} className="vc-canvas-pip" />

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

        {callStatus === 'active' && (
          <div className="vc-duration">{formatDuration(duration)}</div>
        )}

        {!camOn && (
          <div className="vc-cam-off-pip">📷 Camera off</div>
        )}

        {/* ── Filters panel ─────────────────────────────── */}
        {showPanel === 'filters' && (
          <div className="vc-panel">
            <div className="vc-panel-title">Filters</div>
            <div className="vc-panel-grid">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  className={`vc-panel-item ${activeFilter === f.id ? 'vc-panel-item--active' : ''}`}
                  onClick={() => setActiveFilter(f.id)}
                >
                  <span className="vc-panel-emoji">{f.emoji}</span>
                  <span className="vc-panel-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Backgrounds panel ─────────────────────────── */}
        {showPanel === 'backgrounds' && (
          <div className="vc-panel">
            <div className="vc-panel-title">Backgrounds</div>
            <div className="vc-panel-grid">
              {BACKGROUNDS.map(b => (
                <button
                  key={b.id}
                  className={`vc-panel-item ${activeBg === b.id ? 'vc-panel-item--active' : ''}`}
                  onClick={() => setActiveBg(b.id)}
                >
                  <span className="vc-panel-emoji">{b.emoji}</span>
                  <span className="vc-panel-label">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Controls ──────────────────────────────────── */}
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
            onClick={() => togglePanel('filters')}
            title="Filters"
          >
            🎭
            <span>Filters</span>
          </button>

          <button
            className="vc-btn vc-btn-end"
            onClick={endCall}
            title="End call"
          >
            📵
            <span>End</span>
          </button>

          <button
            className={`vc-btn ${showPanel === 'backgrounds' ? 'vc-btn-active' : ''}`}
            onClick={() => togglePanel('backgrounds')}
            title="Backgrounds"
          >
            🖼️
            <span>Bg</span>
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