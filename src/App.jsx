import { useState } from 'react'
import './App.css'
import Login from './login/Login'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Rota from './Rota/Rota';


function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/rota" element={<Rota />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
