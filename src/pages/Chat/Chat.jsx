import React from 'react'
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar'
import RightSidebar from '../../components/RightSidebar/RightSidebar'
import MiddleBox from '../../components/MiddleBox/MiddleBox'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'

const Chat = () => {
  const { chatUser } = useAppContext()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'hsl(201,100%,13%)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(7,126,255,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeRise { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Home button */}
      <span onClick={() => navigate('/')} title="Back to Login" style={{
        position: 'fixed', top: 16, left: 16, zIndex: 999,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'white', width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', backdropFilter: 'blur(8px)',
        transition: 'background 0.2s, transform 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'scale(1)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
      </span>

      {/* Chat container */}
      <div style={{
        display: 'flex',
        width: 'min(1100px, 98vw)',
        height: 'min(575px, 96vh)',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'fadeRise 0.5s ease-out both',
      }}>
        <LeftSidebar />
        <MiddleBox />
        {chatUser && <RightSidebar />}
      </div>
    </div>
  )
}

export default Chat