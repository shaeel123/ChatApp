import { useEffect, useState } from 'react'

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false)
  const [backOnline, setBackOnline] = useState(false)

  useEffect(() => {
    let backOnlineTimer = null

    const goOffline = () => {
      setIsOffline(true)
      setBackOnline(false)
    }

    const goOnline = () => {
      setIsOffline(false)
      setBackOnline(true)
      clearTimeout(backOnlineTimer)
      backOnlineTimer = setTimeout(() => setBackOnline(false), 2500)
    }

    // ✅ Primary: browser events
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    // ✅ Secondary: poll every 3s by pinging a tiny URL
    const interval = setInterval(async () => {
      try {
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        })
        // If fetch succeeds and we were offline, go online
        if (isOffline) goOnline()
      } catch {
        goOffline()
      }
    }, 3000)

    // Check immediately on mount
    if (!navigator.onLine) goOffline()

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      clearInterval(interval)
      clearTimeout(backOnlineTimer)
    }
  }, [isOffline])

  if (!isOffline && !backOnline) return null

  return (
    <>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          30% { transform: translateY(-18px) rotate(-5deg); }
          60% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(255, 107, 107, 0); }
        }
        @keyframes dot-blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideDownFade {
          from { opacity: 1; transform: translate(-50%, 0); }
          to { opacity: 0; transform: translate(-50%, 20px); }
        }
        .ob-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 8, 20, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeInScale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .ob-card {
          background: linear-gradient(160deg, #1c1c2e 0%, #12122a 100%);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 32px;
          padding: 52px 44px 44px;
          text-align: center;
          max-width: 380px;
          width: 90%;
          box-shadow:
            0 50px 100px rgba(0,0,0,0.7),
            0 0 0 1px rgba(255,255,255,0.04),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .ob-animal {
          font-size: 88px;
          display: block;
          margin-bottom: 24px;
          animation: bounce 2.2s ease-in-out infinite;
          filter: drop-shadow(0 12px 24px rgba(0,0,0,0.5));
          line-height: 1;
        }
        .ob-icon-ring {
          width: 110px;
          height: 110px;
          margin: 0 auto 24px;
          border-radius: 50%;
          background: rgba(255, 107, 107, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse-glow 2.5s ease-in-out infinite;
        }
        .ob-title {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 10px;
          letter-spacing: -0.5px;
        }
        .ob-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
          margin: 0 0 32px;
          line-height: 1.6;
        }
        .ob-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 28px;
        }
        .ob-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          animation: dot-blink 1.5s ease-in-out infinite;
        }
        .ob-dot:nth-child(1) { background: #ff6b6b; animation-delay: 0s; }
        .ob-dot:nth-child(2) { background: #ffa94d; animation-delay: 0.25s; }
        .ob-dot:nth-child(3) { background: #74c0fc; animation-delay: 0.5s; }
        .ob-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 100px;
          padding: 6px 16px;
          font-family: system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #ff8787;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .ob-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff6b6b;
          animation: dot-blink 1s ease-in-out infinite;
        }
        .ob-toast {
          position: fixed;
          bottom: 36px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(90deg, #00b894, #00cec9);
          color: white;
          padding: 14px 28px;
          border-radius: 100px;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 12px 40px rgba(0, 184, 148, 0.45);
          z-index: 999999;
          animation: slideUpFade 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          white-space: nowrap;
          letter-spacing: -0.2px;
        }
      `}</style>

      {isOffline ? (
        <div className="ob-overlay">
          <div className="ob-card">
            <div className="ob-icon-ring">
              <span className="ob-animal">🦖</span>
            </div>
            <p className="ob-title">No Internet Connection</p>
            <p className="ob-subtitle">
              Your network went for a stroll.<br />
              Hang tight while we wait for it to return.
            </p>
            <div className="ob-dots">
              <div className="ob-dot"></div>
              <div className="ob-dot"></div>
              <div className="ob-dot"></div>
            </div>
            <div className="ob-status">
              <div className="ob-status-dot"></div>
              Reconnecting
            </div>
          </div>
        </div>
      ) : backOnline ? (
        <div className="ob-toast">
          🎉 You're back online!
        </div>
      ) : null}
    </>
  )
}

export default OfflineBanner