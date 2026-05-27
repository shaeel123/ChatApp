import { useEffect, useState } from 'react'

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [show, setShow] = useState(!navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [backOnline, setBackOnline] = useState(false)

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true)
      setShow(true)
      setBackOnline(false)
      setWasOffline(true)
    }

    const handleOnline = () => {
      setIsOffline(false)
      setBackOnline(true)
      // Show "back online" message briefly then hide
      setTimeout(() => {
        setShow(false)
        setBackOnline(false)
      }, 2500)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes dot-blink {
          0%, 80%, 100% { opacity: 0; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-20px); opacity: 0; }
        }
        .offline-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 20, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .offline-card {
          background: linear-gradient(145deg, #1a1a2e, #16213e);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          padding: 48px 40px 40px;
          text-align: center;
          max-width: 360px;
          width: 90%;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
          animation: fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }
        .offline-gif-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 24px;
        }
        .offline-gif-wrapper::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,100,100,0.15), transparent 70%);
          animation: pulse-ring 2s ease-out infinite;
        }
        .offline-emoji {
          font-size: 80px;
          line-height: 120px;
          display: block;
          animation: bounce 2s ease-in-out infinite, wiggle 3s ease-in-out infinite;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
        }
        .offline-title {
          font-family: 'Georgia', serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 8px;
          letter-spacing: -0.3px;
        }
        .offline-subtitle {
          font-family: 'system-ui', sans-serif;
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .offline-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .offline-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff6b6b;
          animation: dot-blink 1.4s ease-in-out infinite;
        }
        .offline-dot:nth-child(2) { animation-delay: 0.2s; background: #ffa94d; }
        .offline-dot:nth-child(3) { animation-delay: 0.4s; background: #74c0fc; }
        .online-toast {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(90deg, #2ecc71, #27ae60);
          color: white;
          padding: 12px 24px;
          border-radius: 100px;
          font-family: 'system-ui', sans-serif;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 32px rgba(46,204,113,0.4);
          z-index: 99999;
          animation: fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          white-space: nowrap;
        }
      `}</style>

      {isOffline ? (
        <div className="offline-overlay">
          <div className="offline-card">
            <div className="offline-gif-wrapper">
              <span className="offline-emoji">🦕</span>
            </div>
            <p className="offline-title">You're offline</p>
            <p className="offline-subtitle">
              Looks like your internet went for a walk.<br />
              Waiting for it to come back...
            </p>
            <div className="offline-dots">
              <div className="offline-dot"></div>
              <div className="offline-dot"></div>
              <div className="offline-dot"></div>
            </div>
          </div>
        </div>
      ) : backOnline ? (
        <div className="online-toast">
          ✅ Back online!
        </div>
      ) : null}
    </>
  )
}

export default OfflineBanner