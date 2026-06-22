import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminApp } from './AdminApp'
import './admin.css'
import './admin-grants.css'
import '../src/components/VariantThumbnailGallery.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
