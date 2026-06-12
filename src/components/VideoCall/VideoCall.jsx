import React, { useEffect, useRef, useState } from 'react'
import './VideoCall.css'
import { supabase } from '../../config/supabase'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

const VideoCall = ({ currentUser, chatUser, onClose }) => {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const channelRef = useRef(null)
  const makingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)
  const politeRef = useRef(false)

  const [callStatus, setCallStatus] = useState('connecting') // connecting | active | ended
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [duration, setDuration] = useState(0)
  const timerRef = useRef(null)

  // Stable room ID — same for both sides
  const roomId = [currentUser.id, chatUser.id].sort().join('_')

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
      // Get local camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS)
      pcRef.current = pc

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Receive remote stream
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

      // Supabase signalling channel
      const channel = supabase.channel(`videocall-${roomId}`, {
        config: { broadcast: { self: false } }
      })
      channelRef.current = channel

      // The user with the lexicographically smaller ID is "polite" (waits for offer)
      politeRef.current = currentUser.id > chatUser.id

      // Handle incoming signalling messages
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
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } catch (err) {
            if (!ignoreOfferRef.current) console.error('ICE error:', err)
          }
        })
        .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
          if (payload.to !== currentUser.id) return
          setCallStatus('ended')
          setTimeout(() => onClose(), 1500)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Send incoming-call notification to other user
            const callerChannel = supabase.channel(`incoming-call-${chatUser.id}`)
            await callerChannel.subscribe()
            await callerChannel.send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: {
                from: currentUser.id,
                callerName: currentUser.email,
                roomId,
              }
            })
            supabase.removeChannel(callerChannel)

            // If we are the "impolite" side, we create and send the offer
            if (!politeRef.current) {
              await sendOffer(pc, channel)
            }
          }
        })

      // ICE candidate trickle
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate, to: chatUser.id, from: currentUser.id }
          })
        }
      }

      // Renegotiation (handles reconnects)
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current = true
          await sendOffer(pc, channelRef.current)
        } catch (err) {
          console.error('Negotiation error:', err)
        } finally {
          makingOfferRef.current = false
        }
      }

    } catch (err) {
      console.error('startCall error:', err)
      setCallStatus('ended')
    }
  }

  const sendOffer = async (pc, channel) => {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: { sdp: offer, to: chatUser.id, from: currentUser.id }
    })
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
  }

  const endCall = async () => {
    // Notify other side
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { to: chatUser.id, from: currentUser.id }
      })
    }
    setCallStatus('ended')
    setTimeout(() => {
      cleanup()
      onClose()
    }, 800)
  }

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setMicOn(track.enabled)
    }
  }

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setCamOn(track.enabled)
    }
  }

  return (
    <div className="vc-overlay">
      <div className="vc-container">

        {/* Remote video — full background */}
        <video
          ref={remoteVideoRef}
          className="vc-remote"
          autoPlay
          playsInline
        />

        {/* Status overlay when not yet connected */}
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

        {/* Duration badge */}
        {callStatus === 'active' && (
          <div className="vc-duration">{formatDuration(duration)}</div>
        )}

        {/* Local video PiP */}
        <div className="vc-local-wrapper">
          <video
            ref={localVideoRef}
            className="vc-local"
            autoPlay
            playsInline
            muted
          />
          {!camOn && <div className="vc-cam-off-pip">📷 Off</div>}
        </div>

        {/* Controls */}
        <div className="vc-controls">
          <button
            className={`vc-btn ${micOn ? '' : 'vc-btn-off'}`}
            onClick={toggleMic}
            title={micOn ? 'Mute mic' : 'Unmute mic'}
          >
            {micOn ? '🎙️' : '🔇'}
            <span>{micOn ? 'Mute' : 'Unmute'}</span>
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
            className={`vc-btn ${camOn ? '' : 'vc-btn-off'}`}
            onClick={toggleCam}
            title={camOn ? 'Turn off camera' : 'Turn on camera'}
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