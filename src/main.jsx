import React from 'react'
import ReactDOM from 'react-dom/client'
import DinoGame from './DinoGame' // App yerine DinoGame'i çağırıyoruz
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DinoGame />
  </React.StrictMode>,
)
