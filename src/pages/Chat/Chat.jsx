import React from 'react'
import './Chat.css'
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar'
import RightSidebar from '../../components/RightSidebar/RightSidebar'
import MiddleBox from '../../components/MiddleBox/MiddleBox'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'

const Chat = () => {
  const { chatUser } = useAppContext()
  const navigate = useNavigate()

  return (
    <div className='chat'>
      <span className="home-btn" onClick={() => navigate('/')} title="Back to Login">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
      </span>

      <div className="chat-container">
        <LeftSidebar />
        <MiddleBox />
        {chatUser && <RightSidebar />}
      </div>
    </div>
  )
}

export default Chat