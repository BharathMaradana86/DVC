import { useState } from 'react'
import './App.css';
import './index.css';
import Login from './pages/Login/Login';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Projects } from './pages/Projects/Projects';
import { UploadDataSet } from './pages/UploadDataSet/UploadDataSet';
import { Models } from './pages/Models/Models';
import { Training } from './pages/Training/Training';
import { UploadStages } from './pages/UploadStages/UploadStages';
import { DatasetView } from './pages/DatasetView/DatasetView';
import { ProjectDetails } from './pages/ProjectDetails/ProjectDetails';
function App() {

  return (
    <Router>
      <Routes>
         <Route path="/" element={<Layout/>}>
             {/* <Route path="/overview" element={<Dashboard/>}/> */}
             <Route path='/projects' element={<Projects/>}/>
             <Route path='/projects/:projectName' element={<ProjectDetails/>}/>
             <Route path='/upload-dataset' element={<UploadDataSet/>}/>
             <Route path='/datasets/:datasetName/project/:projectName' element={<DatasetView/>}/>
             <Route path='/models' element={<Models/>}/>
             <Route path='/training' element={<Training/>}/>
             <Route path='/upload-dataset-stages' element={<UploadStages/>}/>
        </Route>
         <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  )
}

export default App
