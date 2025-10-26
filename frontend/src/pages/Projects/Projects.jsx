import React from "react";
import { useNavigate } from "react-router-dom";
import { SideHeading } from "../../components/SideHeading/SideHeading";
import { Popup } from "../../components/Popup/Popup";
import { listProjects, createProject } from "../../services/projectsService";


const ProjectCreationLoader = ({ isLoading, metadata, title }) => {
    if (!isLoading) {
        return null;
    }
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black opacity-50" />
            <div className="bg-white rounded-lg p-4 z-10">
                <h2 className="font-bold text-lg mb-2">{title}</h2>
                <div>{metadata}</div>
            </div>
        </div>
    );
};
const CreateProjectForm = ({ setIsPopupOpen, setIsLoading, setMetadata, onCreated }) => {
    const [projectData, setProjectData] = React.useState({
        projectName: "",
        description: ""
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projectData.projectName.trim()) {
            alert("Project name is required");
            return;
        }
        setIsLoading(true);
        setMetadata("Creating project...");
        try {
            console.log(projectData);
            const response = await createProject({ name: projectData.projectName, description: projectData.description, path: 'home/projects/dvc', created_by: "User" });
            console.log(response);
            if (response.status) {
                alert("Project created successfully");
            } else {
                alert(response.message);
            }
            setIsPopupOpen(false);
            setProjectData({ projectName: "", description: "" });
            if (typeof onCreated === 'function') {
                await onCreated();
            }
        } catch (err) {
            alert(err.message || 'Failed to create project');
        } finally {
            setIsLoading(false);
            setMetadata("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-[600px] h-[400px]">
            <label className="flex flex-col">
                <span className="font-bold mb-1">Project Name:</span>
                <input 
                    type="text" 
                    className="border border-gray-300 rounded px-2 py-1" 
                    value={projectData.projectName} 
                    onChange={(e) => setProjectData({ ...projectData, projectName: e.target.value })}
                    required
                />
            </label>
            <label className="flex flex-col">
                <span className="font-bold mb-1">Description:</span>
                <textarea 
                    className="border border-gray-300 rounded px-2 py-1" 
                    rows="4" 
                    value={projectData.description} 
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                />
            </label>
            <label className="flex flex-col">
                <span className="font-bold mb-1">Project Auth (Auto Created)</span>
                <p className="text-gray-600">"home/projects/dvc/{projectData.projectName || 'projectName'}/auth"</p>
            </label>
            <div className="flex gap-4">
                <button type="submit" className="bg-blue-500 text-white rounded px-4 py-2 mt-2 hover:bg-blue-600">
                    Create Project
                </button>
                <button 
                    type="button" 
                    className="bg-gray-500 text-white rounded px-4 py-2 mt-2 hover:bg-gray-600" 
                    onClick={() => setIsPopupOpen(false)}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};
export const Projects = () => {
    const navigate = useNavigate();
    const [recentProjects, setRecentProjects] = React.useState([]);
    const [isPopupOpen, setIsPopupOpen] = React.useState(false);

    const openPopup = () => {
        setIsPopupOpen(true);
    };

    const [isLoading, setIsLoading] = React.useState(false);
    const [metadata, setMetadata] = React.useState("");
    const title = "Creating Project...";

    const loadProjects = React.useCallback(async () => {
        try {
            const data = await listProjects();
            console.log(data);
            // Expect array of { projectName, description, createdAt, lastEdited }
           setRecentProjects(data?.projects);
        } catch (err) {
            console.error(err);
            // alert(err.message || 'Failed to load projects');
        }
    }, []);

    React.useEffect(() => {
        loadProjects();
    }, []);
    return (
         <div className="flex flex-1 h-full flex-col">   
                <SideHeading title={"Projects"}/>
                <div className="h-[80px] w-[220px] mt-[32px] ml-[32px] gap-4 border-2 border-dashed border-gray-300 rounded-lg hover:cursor-pointer flex align-center justify-center items-center" 
                onClick={openPopup}>      
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <p className="font-bold text-2xl">Create Project</p>
                            {/* <input type="file" className="absolute w-full h-full opacity-0 hover:cursor-pointer"/> */}
                </div>
                <div>
                    <SideHeading title={"Recent Projects"}/>
                    <div className="flex flex-row flex-wrap mt-[16px] ml-[18px]">
                        {/* Recent projects will go here */}
                        {recentProjects.map((project, index) => (
                            <div 
                            key={index} 
                            className="border border-gray-300 gap-1 rounded-lg p-4 m-4 w-[280px] hover:shadow-lg hover:cursor-pointer"
                            onClick={() => navigate(`/projects/${project.name}`)}
                        >
                                <h4 className="font-bold text-xl mb-2">{project.name}</h4>
                                <p className="text-gray-600"><span className="font-bold">Desc:</span> {project.description}</p>
                                <p className="text-gray-400 text-sm">Last Edited: {project.updated_at}</p>
                                <p className="text-gray-400 text-sm">Created At: {project.created_at}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <Popup
                    isOpen={isPopupOpen}
                    children={<CreateProjectForm setIsPopupOpen={setIsPopupOpen} setIsLoading={setIsLoading} setMetadata={setMetadata} onCreated={loadProjects}/>}
                    title="Create New Project"
                />
                <ProjectCreationLoader isLoading={isLoading} metadata={metadata} title={title} />
                
         </div>
    )
}