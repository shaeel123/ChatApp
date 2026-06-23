import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login/Login'
import Chat from './pages/Chat/Chat'
import ProfileUpdate from './pages/ProfileUpdate/ProfileUpdate'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import WelcomePopup from './components/WelcomePopup/WelcomePopup'

const App = () => {
  return (
    <>
      <ToastContainer />
      {/* Shows once per session on first visit */}
      <WelcomePopup />
      <Routes>
        <Route path='/'               element={<Login />} />
        <Route path='/chat'           element={<Chat />} />
        <Route path='/Profile'        element={<ProfileUpdate />} />
        <Route path='/reset-password' element={<ResetPassword />} />
      </Routes>
    </>
  )
}

export default App