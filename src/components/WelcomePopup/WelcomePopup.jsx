import React, { useEffect, useState, useRef } from 'react'

const MESSAGE = "Your privacy is our foundation. At BlueC, every message you send and every image you share is protected end-to-end — we built this platform with one promise: your conversations stay yours, always. Welcome to the most secure chat experience you'll ever have."

const WORDS = MESSAGE.split(' ')

const WelcomePopup = () => {
  const [visible, setVisible]     = useState(false)
  const [animIn, setAnimIn]       = useState(false)
  const [animOut, setAnimOut]     = useState(false)
  const [displayedWords, setDisplayedWords] = useState([])
  const [showBtn, setShowBtn]     = useState(false)
  const wordTimersRef = useRef([])
  const closedRef = useRef(false)

  useEffect(() => {
    // Show only once per browser session
    const seen = sessionStorage.getItem('bluec-welcome-seen')
    if (seen) return

    // Small delay so the app loads first
    const delay = setTimeout(() => {
      setVisible(true)
      setTimeout(() => setAnimIn(true), 50)
      startWordAnimation()
    }, 600)

    return () => clearTimeout(delay)
  }, [])

  const startWordAnimation = () => {
    WORDS.forEach((_, i) => {
      const t = setTimeout(() => {
        setDisplayedWords(prev => [...prev, i])
      }, 120 * i)
      wordTimersRef.current.push(t)
    })
    // Show button after all words appear
    const btnTimer = setTimeout(() => {
      setShowBtn(true)
    }, 120 * WORDS.length + 300)
    wordTimersRef.current.push(btnTimer)
  }

  const handleClose = () => {
    if (closedRef.current) return
    closedRef.current = true
    setAnimOut(true)
    setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('bluec-welcome-seen', '1')
    }, 500)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes wp-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes wp-backdrop-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes wp-card-in {
          from { opacity: 0; transform: translateY(40px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes wp-card-out {
          from { opacity: 1; transform: translateY(0)    scale(1); }
          to   { opacity: 0; transform: translateY(30px) scale(0.95); }
        }
        @keyframes wp-word-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wp-btn-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wp-shield-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes wp-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes wp-ring {
          0%   { transform: scale(0.85); opacity: 0; }
          50%  { opacity: 0.35; }
          100% { transform: scale(1.5);  opacity: 0; }
        }

        .wp-word {
          display: inline;
          opacity: 0;
          animation: wp-word-in 0.35s ease forwards;
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0, 5, 20, 0.78)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: animOut
            ? 'wp-backdrop-out 0.5s ease forwards'
            : animIn ? 'wp-backdrop-in 0.4s ease forwards' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            background: 'linear-gradient(145deg, rgba(10,15,40,0.97) 0%, rgba(5,8,28,0.99) 100%)',
            border: '1px solid rgba(100,160,255,0.2)',
            borderRadius: 28,
            padding: '44px 40px 36px',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(7,126,255,0.08), inset 0 1px 0 rgba(255,255,255,0.07)',
            animation: animOut
              ? 'wp-card-out 0.5s cubic-bezier(0.4,0,0.2,1) forwards'
              : animIn ? 'wp-card-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            textAlign: 'center',
          }}
        >
          {/* Top glow */}
          <div style={{
            position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
            width: 180, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(7,126,255,0.7), transparent)',
            borderRadius: 2,
          }} />

          {/* Shield icon with glow rings */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
            {/* Pulse rings */}
            <div style={{
              position: 'absolute', inset: -12, borderRadius: '50%',
              border: '2px solid rgba(7,126,255,0.4)',
              animation: 'wp-ring 2.2s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: -12, borderRadius: '50%',
              border: '2px solid rgba(7,126,255,0.3)',
              animation: 'wp-ring 2.2s ease-out 0.7s infinite',
            }} />
            {/* Glow bg */}
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(7,126,255,0.25) 0%, transparent 70%)',
              animation: 'wp-glow-pulse 2.5s ease-in-out infinite',
            }} />
            {/* Shield emoji */}
            <div style={{
              fontSize: 52,
              animation: 'wp-shield-float 3s ease-in-out infinite',
              position: 'relative', zIndex: 1,
              filter: 'drop-shadow(0 0 12px rgba(7,126,255,0.6))',
            }}>
              🛡️
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            margin: '0 0 6px',
            fontSize: 22,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.3px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Welcome to BlueC
          </h2>
          <p style={{
            margin: '0 0 22px',
            fontSize: 12,
            color: 'rgba(7,126,255,0.8)',
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
          }}>
            Privacy First · Always
          </p>

          {/* Divider */}
          <div style={{
            width: 40, height: 2, margin: '0 auto 22px',
            background: 'linear-gradient(90deg, transparent, rgba(7,126,255,0.6), transparent)',
            borderRadius: 2,
          }} />

          {/* Animated message text */}
          <p style={{
            fontSize: 15,
            lineHeight: 1.85,
            color: 'rgba(255,255,255,0.78)',
            margin: '0 0 28px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            minHeight: 100,
          }}>
            {WORDS.map((word, i) => (
              displayedWords.includes(i) ? (
                <span
                  key={i}
                  className="wp-word"
                  style={{ animationDelay: '0ms' }}
                >
                  {word}{' '}
                </span>
              ) : null
            ))}
          </p>

          {/* Feature pills */}
          {showBtn && (
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center',
              flexWrap: 'wrap', marginBottom: 28,
              animation: 'wp-btn-in 0.4s ease forwards',
            }}>
              {['🔒 End-to-End Secure', '🚫 No Data Leaks', '🤝 Built on Trust'].map((pill, i) => (
                <span key={i} style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'rgba(7,126,255,0.9)',
                  background: 'rgba(7,126,255,0.1)',
                  border: '1px solid rgba(7,126,255,0.2)',
                  borderRadius: 20, padding: '5px 12px',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.3px',
                }}>
                  {pill}
                </span>
              ))}
            </div>
          )}

          {/* CTA Button */}
          {showBtn && (
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '13px',
                background: 'linear-gradient(135deg, #077eff 0%, #0055cc 100%)',
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.3px',
                boxShadow: '0 4px 20px rgba(7,126,255,0.4)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                animation: 'wp-btn-in 0.4s ease 0.1s both',
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 6px 28px rgba(7,126,255,0.55)'
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 4px 20px rgba(7,126,255,0.4)'
              }}
            >
              Got it, let's chat →
            </button>
          )}

          {/* Skip */}
          <p
            onClick={handleClose}
            style={{
              marginTop: 14, fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.25)'}
          >
            Skip
          </p>

        </div>
      </div>
    </>
  )
}

export default WelcomePopup