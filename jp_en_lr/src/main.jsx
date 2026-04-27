import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// 如果你有獨立的 CSS 檔案 (例如 Tailwind 設定)，記得在這裡引入，例如: import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)