import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicSite from './public/PublicSite'

const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="*" element={<PublicSite />} />
    </Routes>
  )
}
