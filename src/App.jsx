import './styles/style.css'
import ObstacleMappingPage from './pages/steps/ObstacleMappingPage'
import Model3DPage from './pages/steps/Model3DPage'
import DiagramsPage from './pages/steps/DiagramsPage'
import ProductSelectionPage from './pages/steps/ProductSelectionPage'
import SimulationPage from './pages/steps/SimulationPage'
import AnalysisPage from './pages/steps/AnalysisPage'
import ReportGeneratorPage from './pages/steps/ReportGeneratorPage'
import SiteLocationPage from './pages/steps/SiteLocationPage'
// import NavBar from './components/common/NavBar'

function App() {
  return (
    <> 
        {/* <NavBar /> */}
        <SiteLocationPage />
        <ObstacleMappingPage />
        <ProductSelectionPage />
        <Model3DPage />
        <DiagramsPage />
        <SimulationPage />
        <AnalysisPage />
        <ReportGeneratorPage />
    </>
  )
}

export default App
