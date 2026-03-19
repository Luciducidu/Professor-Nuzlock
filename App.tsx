import { Navigate, Route, Routes } from 'react-router-dom'
import { ProjectBackupPage } from './pages/ProjectBackupPage'
import { LocationDetailPage } from './pages/LocationDetailPage'
import { LocationsPage } from './pages/LocationsPage'
import { NewLocationPage } from './pages/NewLocationPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { ProjectDashboardPage } from './pages/ProjectDashboardPage'
import { ProjectListPage } from './pages/ProjectListPage'
import { ProjectPokemonPage } from './pages/ProjectPokemonPage'
import { ProjectSettingsPage } from './pages/ProjectSettingsPage'
import { ProjectTeamPage } from './pages/ProjectTeamPage'
import { ProjectLevelCapsPage } from './pages/ProjectLevelCapsPage'
import { ProjectTypesPage } from './pages/ProjectTypesPage'
import { ProjectNaturesPage } from './pages/ProjectNaturesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/new" element={<NewProjectPage />} />
      <Route path="/project/:id" element={<ProjectDashboardPage />} />
      <Route path="/project/:id/settings" element={<ProjectSettingsPage />} />
      <Route path="/project/:id/orte" element={<LocationsPage />} />
      <Route path="/project/:id/orte/neu" element={<NewLocationPage />} />
      <Route path="/project/:id/orte/:locationId" element={<LocationDetailPage />} />
      <Route path="/project/:id/pokemon" element={<ProjectPokemonPage />} />
      <Route path="/project/:id/team" element={<ProjectTeamPage />} />
      <Route path="/project/:id/levelcaps" element={<ProjectLevelCapsPage />} />
      <Route path="/project/:id/typen" element={<ProjectTypesPage />} />
      <Route path="/project/:id/wesen" element={<ProjectNaturesPage />} />
      <Route path="/project/:id/backup" element={<ProjectBackupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App




