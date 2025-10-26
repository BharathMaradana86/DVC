from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from dbConnection import get_connection
from contextlib import contextmanager
import os
import json
import hashlib
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
# DVC removed - using custom versioning and hashing
from training_service import TrainingService
import threading

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Use absolute path for projects directory
project_relative_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'projects'))
@contextmanager
def get_db():
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()

@app.get("/")
def root():
    return {"message": "ML Training API", "status": "running"}

@app.get("/api/projects")
def debug_projects():
    """Debug endpoint to check projects table"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM projects")
                projects = cursor.fetchall()
                return {"projects": projects, "count": len(projects)}
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

@app.get("/api/datasets")
def debug_datasets():
    """Debug endpoint to check datasets table"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM datasets")
                datasets = cursor.fetchall()
                print(f"Debug datasets query result: {datasets}")
                return {"datasets": datasets, "count": len(datasets)}
    except Exception as e:
        print(f"Debug datasets error: {e}")
        return {"error": str(e), "type": type(e).__name__}

@app.post("/api/projects")
def create_project(project: dict):
    """Create a new project"""
    try:
        # Validate required fields
        required_fields = ['name', 'description', 'path', 'created_by']
        for field in required_fields:
            if field not in project:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        with get_db() as connection:
            with connection.cursor() as cursor:
                # Check if project name already exists
                cursor.execute("SELECT id FROM projects WHERE name = %s", (project['name'],))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Project with this name already exists")

                # create a project directory with the proper structure
                project_dir = os.path.join(project_relative_path, project['name'])
                os.makedirs(project_dir, exist_ok=True)
                data_dir = os.path.join(project_dir, 'data')
                os.makedirs(data_dir, exist_ok=True)
                models_dir = os.path.join(project_dir, 'models')
                os.makedirs(models_dir, exist_ok=True)
                # Custom versioning system - no DVC/git needed               
                # Insert new project
                cursor.execute(
                    "INSERT INTO projects (name, description, path, created_by) VALUES (%s, %s, %s, %s)", 
                    (project['name'], project['description'], project_dir, project['created_by'])
                )
                connection.commit()
                # Get the created project
                project_id = cursor.lastrowid
                cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
                created_project = cursor.fetchone()
                
                # Versioning handled by custom system (no DVC needed)
                print(f"Project directory created: {project_dir}")
                
        return {"message": "Project created successfully", "project": created_project, "status": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")

@app.get("/api/projects")
def get_projects():
    """Get all projects"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM projects ORDER BY created_at DESC")
                projects = cursor.fetchall()
        
        return {"projects": projects}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")

@app.get("/api/projects/{project_id}")
def get_project(project_id: int):
    """Get a specific project by ID"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
                project = cursor.fetchone()
                
                if not project:
                    raise HTTPException(status_code=404, detail="Project not found")
        
        return {"project": project}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project: {str(e)}")

@app.put("/api/projects/{project_id}")
def update_project(project_id: int, project: dict):
    """Update a project"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                # Check if project exists
                cursor.execute("SELECT id FROM projects WHERE id = %s", (project_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Project not found")
                
                # Build update query dynamically
                update_fields = []
                values = []
                
                for field in ['name', 'description', 'path', 'status']:
                    if field in project:
                        update_fields.append(f"{field} = %s")
                        values.append(project[field])
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No fields to update")
                
                values.append(project_id)
                query = f"UPDATE projects SET {', '.join(update_fields)} WHERE id = %s"
                
                cursor.execute(query, values)
                connection.commit()
                
                # Get updated project
                cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
                updated_project = cursor.fetchone()
        
        return {"message": "Project updated successfully", "project": updated_project}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating project: {str(e)}")

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int):
    """Delete a project"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                # Check if project exists
                cursor.execute("SELECT id FROM projects WHERE id = %s", (project_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Project not found")
                
                cursor.execute("DELETE FROM projects WHERE id = %s", (project_id,))
                connection.commit()
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting project: {str(e)}")

@app.get("/api/datasets")
def get_datasets():
    """Get all datasets for frontend selection"""
    try:
        print("Fetching datasets from database...")
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT d.id, d.name, d.version, d.file_count, d.created_at, p.name as project_name
                    FROM datasets d 
                    JOIN projects p ON d.project_id = p.id 
                    ORDER BY d.created_at DESC
                """)
                datasets = cursor.fetchall()
                print(f"Raw datasets from DB: {datasets}")
                
                # Convert to list of dictionaries with proper structure
                dataset_list = []
                for dataset in datasets:
                    print(f"Dataset: {dataset}")
                    dataset_obj = {
                        "id": f"dataset_{dataset['id']}",
                        "name": dataset['name'] or f"Dataset {dataset['id']}",
                        "version": dataset['version'] or "v1.0",
                        "fileCount": dataset['file_count'] or 0,
                        "lastUpdated": dataset['created_at'].strftime("%Y-%m-%d") if dataset['created_at'] else "Unknown",
                        "description": f"Dataset with {dataset['file_count'] or 0} files from {dataset['project_name']} project"
                    }
                    dataset_list.append(dataset_obj)
        return {"datasets": dataset_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching datasets: {str(e)}")

@app.get("/api/datasets/project/{project_name}")
def get_datasets_by_project(project_name: str):
    """Get all datasets for a specific project by project name"""
    try:
        print(f"Fetching datasets for project: {project_name}")
        with get_db() as connection:
            with connection.cursor() as cursor:
                # First get the project ID
                cursor.execute("SELECT id FROM projects WHERE name = %s", (project_name,))
                project_result = cursor.fetchone()
                if not project_result:
                    print(f"Project {project_name} not found")
                    return {"datasets": []}
                
                project_id = project_result[0] if isinstance(project_result, tuple) else project_result["id"]
                print(f"Found project ID: {project_id}")
                
                # Get datasets for this project
                cursor.execute("""
                    SELECT d.id, d.name, d.version, d.file_count, d.created_at, p.name as project_name
                    FROM datasets d 
                    JOIN projects p ON d.project_id = p.id 
                    WHERE d.project_id = %s
                    ORDER BY d.created_at DESC
                """, (project_id,))
                datasets = cursor.fetchall()
                print(f"Found {len(datasets)} datasets for project {project_name}")
                
                # Convert to list of dictionaries
                dataset_list = []
                for dataset in datasets:
                    dataset_obj = {
                        "id": f"dataset_{dataset["id"]}",
                        "name": dataset["name"] or f"Dataset {dataset["id"]}",
                        "version": dataset["version"] or "v1.0",
                        "fileCount": dataset["file_count"] or 0,
                        "lastUpdated": dataset["created_at"].strftime("%Y-%m-%d") if dataset["created_at"] else "Unknown",
                        "description": f"Dataset with {dataset["file_count"] or 0} files from {dataset["project_name"]} project",
                        "project_name": dataset["project_name"]
                    }
                    dataset_list.append(dataset_obj)
        
        return {"datasets": dataset_list}
    except Exception as e:
        print(f"Error fetching datasets by project: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching datasets: {str(e)}")

@app.get("/api/datasets/{dataset_name}/details")
def get_dataset_details(dataset_name: str, project: str):
    """Get detailed information about a dataset including all files"""
    try:
        print(f"Fetching details for dataset: {dataset_name} in project: {project}")
        
        with get_db() as connection:
            with connection.cursor() as cursor:
                # Get the dataset information
                cursor.execute("""
                    SELECT d.id, d.name, d.version, d.file_count, d.created_at, d.base_path, p.name as project_name
                    FROM datasets d 
                    JOIN projects p ON d.project_id = p.id 
                    WHERE d.name = %s AND p.name = %s
                    ORDER BY d.created_at DESC
                    LIMIT 1
                """, (dataset_name, project))
                dataset = cursor.fetchone()
                
                if not dataset:
                    raise HTTPException(status_code=404, detail="Dataset not found")
                
                dataset_id = dataset[0] if isinstance(dataset, tuple) else dataset['id']
                dataset_path = dataset[5] if isinstance(dataset, tuple) else dataset['base_path']
                
                print(f"Found dataset at path: {dataset_path}")
                
                # Get all files in the dataset directory (including subdirectories)
                file_list = []
                if dataset_path and os.path.exists(dataset_path):
                    def list_files_recursive(directory):
                        """Recursively list all files in a directory"""
                        files = []
                        try:
                            for item in os.listdir(directory):
                                item_path = os.path.join(directory, item)
                                if os.path.isfile(item_path):
                                    files.append(item_path)
                                elif os.path.isdir(item_path):
                                    # Recursively get files from subdirectories
                                    files.extend(list_files_recursive(item_path))
                        except Exception as e:
                            print(f"Error reading directory {directory}: {e}")
                        return files
                    
                    all_files = list_files_recursive(dataset_path)
                    print(f"Found {len(all_files)} files in dataset")
                    
                    for file_path in all_files:
                        file_name = os.path.basename(file_path)
                        file_size = os.path.getsize(file_path)
                        file_rel_path = os.path.relpath(file_path, dataset_path)
                        
                        file_info = {
                            "name": file_name,
                            "path": file_path,
                            "relative_path": file_rel_path,
                            "type": file_name.split('.')[-1] if '.' in file_name else 'unknown',
                            "size": f"{(file_size / 1024):.2f} KB" if file_size < 1024 * 1024 else f"{(file_size / (1024 * 1024)):.2f} MB",
                            "size_bytes": file_size
                        }
                        file_list.append(file_info)
                    
                    file_list.sort(key=lambda x: x['name'])
                
                return {
                    "dataset": {
                        "id": dataset_id,
                        "name": dataset[1] if isinstance(dataset, tuple) else dataset['name'],
                        "version": dataset[2] if isinstance(dataset, tuple) else dataset['version'],
                        "file_count": dataset[3] if isinstance(dataset, tuple) else dataset['file_count'],
                        "created_at": dataset[4] if isinstance(dataset, tuple) else dataset['created_at'],
                        "base_path": dataset_path
                    },
                    "files": file_list
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching dataset details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching dataset details: {str(e)}")

@app.post("/api/datasets/{dataset_hash_id}/versions")
def get_dataset_versions(dataset_hash_id: str):
    """Get all versions for a dataset"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM dataset_versions WHERE dataset_hash_id = %s", (dataset_hash_id,))
                versions = cursor.fetchall()
                if not versions:
                    return {"versions": [{"version_id": "v1"}]}
        return {"versions": [{"version_id": f"v{len(versions)+1}"}]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dataset versions: {str(e)}")

def generate_dvc_hash(file_paths: List[str]) -> str:
    """Generate a DVC-style hash for the uploaded files"""
    hash_content = ""
    for file_path in sorted(file_paths):
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                hash_content += f.read().hex()
    return hashlib.md5(hash_content.encode()).hexdigest()

@app.post("/api/upload/dataset")
async def upload_dataset_stages(
    projectId: str = Form(...),
    datasetType: str = Form(...),
    dataTypes: str = Form(...),
    selectedDatasetId: Optional[str] = Form(None),
    datasetName: Optional[str] = Form(None),  # User-entered dataset name for new datasets
    updateDescription: str = Form(""),  # Description for updating existing dataset
    images: List[UploadFile] = File(default=[]),
    labels: List[UploadFile] = File(default=[]),
    yaml_file: Optional[UploadFile] = File(None)  # YAML config file
):
    """Integrated upload endpoint for upload stages"""
    try:
        print(f"Received upload request:")
        print(f"  projectId: {projectId}")
        print(f"  datasetType: {datasetType}")
        print(f"  dataTypes: {dataTypes}")
        print(f"  selectedDatasetId: {selectedDatasetId}")
        print(f"  updateDescription: {updateDescription}")
        print(f"  images: {len(images)} files")
        print(f"  labels: {len(labels)} files")
        print(f"  yaml_file: {yaml_file.filename if yaml_file else 'None'}")
        
        # Parse data types
        data_types = json.loads(dataTypes)
        print(f"Parsed data types: {data_types}")
        
        # Get project information
        print("Fetching project information...")
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM projects WHERE name = %s", (projectId,))
                project = cursor.fetchone()
                print(f"Project query result: {project}")
                
                if not project:
                    raise HTTPException(status_code=404, detail="Project not found")
                
                project_id = project["id"]
                project_path = project["path"]
                print(f"Project ID: {project_id}, Path: {project_path}")
        
        # Determine version and dataset name
        if datasetType == "new":
            version = "v1.0"
            # Use user-provided dataset name if available, otherwise generate one
            if datasetName:
                dataset_name = datasetName
            else:
                dataset_name = f"{projectId}_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            print(f"New dataset name: {dataset_name}")
        else:
            # Get next version for existing dataset
            if not selectedDatasetId:
                raise HTTPException(status_code=400, detail="Dataset ID required for existing dataset")
            
            with get_db() as connection:
                with connection.cursor() as cursor:
                    print(f"Selected dataset ID: {selectedDatasetId}")
                    # Get the original dataset name and current version
                    cursor.execute("SELECT name, version FROM datasets WHERE id = %s", (selectedDatasetId.replace("dataset_", ""),))
                    existing_dataset = cursor.fetchone()
                    print(f"Existing dataset: {existing_dataset}")
                    
                    if existing_dataset:
                        # Use the original dataset name
                        dataset_name = existing_dataset["name"]
                        
                        # Get the highest version for this dataset name in this project
                        cursor.execute("""
                            SELECT version FROM datasets 
                            WHERE name = %s AND project_id = %s 
                            ORDER BY version DESC 
                            LIMIT 1
                        """, (dataset_name, project_id))
                        latest_version = cursor.fetchone()
                        
                        if latest_version:
                            # Extract and increment version
                            version_str = latest_version["version"]
                            print(f"Latest version: {version_str}")
                            # Parse version like "v1.0"
                            version_parts = version_str.split('.')
                            major = int(version_parts[0][1:])  # Remove 'v' and convert to int
                            minor = int(version_parts[1]) + 1  # Increment minor version
                            version = f"v{major}.{minor}"
                        else:
                            version = "v1.0"
                    else:
                        # Fallback if dataset not found
                        dataset_name = f"{projectId}_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                        version = "v1.0"
            
            print(f"Dataset name: {dataset_name}")
            print(f"Version: {version}")
        
        # Create data directory - include dataset name to prevent conflicts
        data_dir = os.path.join(project_path, 'data', dataset_name, version)
        print(f"Project path: {project_path}")
        print(f"Creating data directory: {data_dir}")
        print(f"Absolute data directory: {os.path.abspath(data_dir)}")
        os.makedirs(data_dir, exist_ok=True)
        print(f"Data directory created successfully")
        
        # If updating existing dataset, copy files from previous version
        if datasetType == "existing" and latest_version:
            previous_version_dir = os.path.join(project_path, 'data', dataset_name, latest_version["version"])
            print(f"Previous version directory: {previous_version_dir}")
            
            if os.path.exists(previous_version_dir):
                print(f"Copying files from previous version {latest_version['version']} to {version}...")
                
                def copy_directory(src, dst):
                    """Copy directory recursively"""
                    if os.path.isdir(src):
                        shutil.copytree(src, dst, dirs_exist_ok=True)
                        print(f"Copied directory {src} to {dst}")
                
                # Copy images directory if it exists
                if os.path.exists(os.path.join(previous_version_dir, 'images')):
                    copy_directory(os.path.join(previous_version_dir, 'images'), os.path.join(data_dir, 'images'))
                
                # Copy labels directory if it exists
                if os.path.exists(os.path.join(previous_version_dir, 'labels')):
                    copy_directory(os.path.join(previous_version_dir, 'labels'), os.path.join(data_dir, 'labels'))
                
                # Copy YAML files from root
                for file in os.listdir(previous_version_dir):
                    file_path = os.path.join(previous_version_dir, file)
                    if os.path.isfile(file_path) and file.endswith(('.yaml', '.yml')):
                        shutil.copy2(file_path, data_dir)
                        print(f"Copied YAML file {file} to {data_dir}")
                
                print(f"Successfully copied files from previous version")
            else:
                print(f"Previous version directory not found: {previous_version_dir}")
        
        # Upload files by type with proper organization
        uploaded_files = []
        file_paths = []
        
        print("Starting file upload process...")
        
        # Create subdirectories for organized structure
        images_dir = os.path.join(data_dir, 'images')
        labels_dir = os.path.join(data_dir, 'labels')
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(labels_dir, exist_ok=True)
        
        # Upload images to images/ folder
        print(f"Uploading {len(images)} image files to images/ folder...")
        for image_file in images:
            if image_file.filename:
                file_path = os.path.join(images_dir, image_file.filename)
                print(f"Saving image to: {file_path}")
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(image_file.file, buffer)
                print(f"Image saved successfully")
                uploaded_files.append(f"/data/{version}/images/{image_file.filename}")
                file_paths.append(file_path)
        
        # Upload label files to labels/ folder
        print(f"Uploading {len(labels)} label files to labels/ folder...")
        for label_file in labels:
            if label_file.filename:
                file_path = os.path.join(labels_dir, label_file.filename)
                print(f"Saving label file: {file_path}")
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(label_file.file, buffer)
                print(f"Label file saved successfully: {file_path}")
                uploaded_files.append(f"/data/{version}/labels/{label_file.filename}")
                file_paths.append(file_path)
        
        # Upload YAML config file if provided
        if yaml_file and yaml_file.filename:
            file_path = os.path.join(data_dir, yaml_file.filename)
            print(f"Saving YAML file: {file_path}")
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(yaml_file.file, buffer)
            print(f"YAML file saved successfully: {file_path}")
            uploaded_files.append(f"/data/{version}/{yaml_file.filename}")
            file_paths.append(file_path)
        
        # Generate hash for uploaded files using custom system
        print("Generating hash for uploaded files...")
        custom_hash = generate_dvc_hash(file_paths)
        
        # Calculate statistics
        total_files = len(images) + len(labels) + (1 if yaml_file and yaml_file.filename else 0)
        total_size = sum(os.path.getsize(path) for path in file_paths)
        
        # Save to database
        with get_db() as connection:
            with connection.cursor() as cursor:
                # Use updateDescription for description field if it's an existing dataset update
                description = updateDescription if datasetType == "existing" and updateDescription else f"Dataset {version} for {dataset_name}"
                cursor.execute("""
                    INSERT INTO datasets (project_id, name, version, file_count, commit_hash, base_path, created_by, description, created_at) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (project_id, dataset_name, version, total_files, custom_hash, data_dir, "User", description))
                connection.commit()
                dataset_id = cursor.lastrowid
        
        # Return comprehensive response
        return {
            "message": "Dataset uploaded successfully",
            "status": True,
            "fileCount": total_files,
            "totalSize": total_size,
            "filePaths": uploaded_files,
            "commitHash": custom_hash,
            "commitMessage": f"Added {total_files} files to dataset {dataset_name}",
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "images": len(images),
                "labels": len(labels),
                "yaml": 1 if yaml_file and yaml_file.filename else 0
            },
            "datasetInfo": {
                "id": dataset_id,
                "name": dataset_name,
                "version": version,
                "projectId": project_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error uploading dataset: {str(e)}")

@app.post("/api/datasets/uploadDataset")
def upload_dataset_legacy(dataset: dict):
    """Legacy upload dataset endpoint (kept for backward compatibility)"""
    try:
        # Validate required fields
        required_fields = ['project_id', 'version_id', 'images', 'text_files', 'json_file', 'label_file', 'project_path']
        for field in required_fields:
            if field not in dataset:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        project_path = dataset['project_path']
        dataset_images = dataset['images']  # List of image file paths
        data_dir = os.path.join(project_path, 'data', dataset['version_id'])
        os.makedirs(data_dir, exist_ok=True)
        
        for image_path in dataset_images:
            image_name = os.path.basename(image_path)
            dest_path = os.path.join(data_dir, image_name)
            with open(image_path, 'rb') as src_file:
                with open(dest_path, 'wb') as dest_file:
                    dest_file.write(src_file.read())
        
        dataset_text = dataset['text_files']  # List of text file paths
        for text_path in dataset_text:
            text_name = os.path.basename(text_path)
            dest_path = os.path.join(data_dir, text_name)
            with open(text_path, 'rb') as src_file:
                with open(dest_path, 'wb') as dest_file:
                    dest_file.write(src_file.read())
        
        json_file_path = dataset['json_file']  # Single json file path
        json_name = os.path.basename(json_file_path)
        dest_path = os.path.join(data_dir, json_name)
        with open(json_file_path, 'rb') as src_file:
            with open(dest_path, 'wb') as dest_file:
                dest_file.write(src_file.read())
        
        label_file_path = dataset['label_file']  # Single label file path
        label_name = os.path.basename(label_file_path)
        dest_path = os.path.join(data_dir, label_name)
        with open(label_file_path, 'rb') as src_file:
            with open(dest_path, 'wb') as dest_file:
                dest_file.write(src_file.read())
        
        # Save to database
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO datasets (project_id, version_id, commit_hash, base_path, created_at) VALUES (%s, %s, %s, %s, NOW())",
                    (dataset['project_id'], dataset['version_id'], dataset['commit_hash'], project_path)
                )
                connection.commit()
                
        return {"message": "Dataset uploaded successfully", "status": True}
        
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error uploading dataset: {str(e)}")

@app.get("/api/files/view")
def view_file(path: str):
    """Serve image files for viewing"""
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error viewing file: {str(e)}")

@app.post("/api/files/download")
async def download_file(request: dict):
    """Download a file"""
    try:
        file_path = request.get("path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(file_path, media_type='application/octet-stream')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

# Training endpoints
training_jobs = {}  # In-memory storage for training jobs

@app.post("/api/training/start")
async def start_training(request: dict):
    """Start a training job"""
    try:
        project_id = request.get("project_id")
        dataset_id = request.get("dataset_id")
        hyperparameters = request.get("hyperparameters", {})
        model_name = request.get("model_name", f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        print(f"Starting training job - Project: {project_id}, Dataset: {dataset_id}")
        print(f"Request data: {request}")
        
        # Validate required fields
        if not project_id or not dataset_id:
            raise HTTPException(status_code=400, detail="project_id and dataset_id are required")
        
        # Get project and dataset info from database
        with get_db() as connection:
            with connection.cursor() as cursor:
                # Get project
                cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
                project = cursor.fetchone()
                if not project:
                    raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
                
                # Get dataset
                dataset_id = dataset_id.replace("dataset_", "")
                cursor.execute("SELECT * FROM datasets WHERE id = %s", (dataset_id,))
                dataset = cursor.fetchone()
                if not dataset:
                    raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")
                
                # Extract paths - handle both tuple and dict
                if isinstance(dataset, tuple):
                    # Dataset columns: id, name, version, file_count, commit_hash, base_path, created_by, created_at
                    dataset_path = dataset["base_path"] if len(dataset) > 6 else None  # base_path at index 6
                    dataset_version = dataset["version"] if len(dataset) > 2 else "v1.0"  # version at index 2
                    dataset_name_from_db = dataset["name"] if len(dataset) > 1 else ""  # name at index 1
                    actual_dataset_id = dataset["id"] if len(dataset) > 0 else dataset_id  # id at index 0
                else:
                    dataset_path = dataset.get("base_path")
                    dataset_version = dataset.get("version", "v1.0")
                    dataset_name_from_db = dataset.get("name", "")
                    actual_dataset_id = dataset.get("id", dataset_id)
                
                if isinstance(project, tuple):
                    # Project columns: id, name, description, path, created_by, status, created_at
                    project_path = project["path"] if len(project) > 3 else None  # path at index 3
                    actual_project_id = project["id"] if len(project) > 0 else project_id  # id at index 0
                else:
                    project_path = project.get("path")
                    actual_project_id = project.get("id", project_id)
                
                print(f"Dataset path: {dataset_path}")
                print(f"Project path: {project_path}")
                
        # Validate paths exist
        if not os.path.exists(dataset_path):
            raise HTTPException(status_code=404, detail=f"Dataset path does not exist: {dataset_path}")
        
        if not os.path.exists(project_path):
            raise HTTPException(status_code=404, detail=f"Project path does not exist: {project_path}")
                
        # Prepare output path
        models_dir = os.path.join(project_path, 'models')
        os.makedirs(models_dir, exist_ok=True)
        model_output_path = os.path.join(models_dir, f"{model_name}.pth")
        
        # Start training in background thread
        training_id = f"train_{datetime.now().timestamp()}"
        
        def train_in_background():
            try:
                # Update status to running
                training_jobs[training_id] = {
                    'status': 'running',
                    'progress': 0,
                    'model_id': None,
                    'message': 'Training started...'
                }
                
                print(f"Training with dataset version: {dataset_version}")
                print(f"Using project_id: {actual_project_id}, dataset_id: {actual_dataset_id}")
                
                # Train model
                result = TrainingService.train_model(
                    dataset_path=dataset_path,
                    output_path=model_output_path,
                    hyperparameters=hyperparameters,
                    progress_callback=lambda p: training_jobs[training_id].update({'progress': p, 'message': f'Training progress: {p}%'})
                )
                
                # Save model to database
                if result['status'] == 'completed':
                    with get_db() as connection:
                        with connection.cursor() as cursor:
                            # Check if models already exist for this dataset
                            cursor.execute("""
                                SELECT version FROM models 
                                WHERE dataset_id = %s 
                                ORDER BY created_at DESC
                                LIMIT 1
                            """, (str(actual_dataset_id),))
                            
                            existing_model = cursor.fetchone()
                            
                            if existing_model:
                                # Extract version number and increment
                                existing_version = existing_model[0] if isinstance(existing_model, tuple) else existing_model['version']
                                print(f"Found existing model version: {existing_version}")
                                
                                # Extract version number (e.g., "v1.0_model" -> "v1.1_model")
                                if "_model" in existing_version:
                                    version_base = existing_version.replace("_model", "")
                                    version_parts = version_base.replace("v", "").split(".")
                                    major = int(version_parts[0]) if len(version_parts) > 0 else 1
                                    minor = int(version_parts[1]) if len(version_parts) > 1 else 0
                                    new_minor = minor + 1
                                    model_version = f"v{major}.{new_minor}_model"
                                else:
                                    # If format is different, just append version number
                                    model_version = f"{existing_version}_v{int(existing_version.split('.')[-1]) + 1 if '.' in existing_version else '1'}"
                            else:
                                # First model for this dataset - use dataset version as base
                                model_version = f"{dataset_version}_model"
                            
                            print(f"Generated model version: {model_version}")
                            print(f"Parameters: project_id={actual_project_id}, dataset_id={actual_dataset_id}")
                            
                            # Insert into models table with new schema
                            metrics = json.dumps({
                                'accuracy': result.get('final_accuracy', 0),
                                'loss': result.get('final_loss', 0),
                                'epochs_completed': result['epochs_completed'],
                                'final_epochs': hyperparameters.get('epochs', 10)
                            })
                            
                            cursor.execute("""
                                INSERT INTO models (project_id, dataset_id, name, version, description, model_path, 
                                framework, parameters, metrics, commit_hash, created_by)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                actual_project_id, str(actual_dataset_id), model_name, model_version, 
                                f"Model trained on {dataset_name_from_db} dataset version {dataset_version}",
                                model_output_path, 'pytorch', json.dumps(hyperparameters), 
                                metrics, result.get('commit_hash', ''), 'User'
                            ))
                            connection.commit()
                            model_id = cursor.lastrowid
                            
                            print(f"Model saved to database with ID: {model_id}")
                            
                            # Insert into training_runs table
                            input_datasets_json = json.dumps([{
                                'dataset_id': str(actual_dataset_id),
                                'dataset_name': dataset_name_from_db,
                                'dataset_version': dataset_version,
                                'dataset_path': dataset_path
                            }])
                            
                            training_reason = f"Training on {dataset_name_from_db} version {dataset_version}"
                            
                            cursor.execute("""
                                INSERT INTO training_runs (job_id, project_id, model_id, input_datasets, 
                                training_reason, parameters, status, created_by, started_at, completed_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """, (
                                training_id, actual_project_id, model_id, input_datasets_json,
                                training_reason, json.dumps(hyperparameters), 'completed', 'User'
                            ))
                            connection.commit()
                            
                            print(f"Training run saved to database")
                            
                            # Update training job with model_id
                            training_jobs[training_id]['model_id'] = model_id
                            training_jobs[training_id]['status'] = 'completed'
                            training_jobs[training_id]['message'] = 'Training completed successfully!'
                            training_jobs[training_id]['model_version'] = model_version
                            training_jobs[training_id]['dataset_version'] = dataset_version
                else:
                    training_jobs[training_id]['status'] = 'failed'
                    training_jobs[training_id]['error'] = result.get('error', 'Unknown error')
                    training_jobs[training_id]['message'] = f"Training failed: {result.get('error', 'Unknown error')}"
                    
            except Exception as e:
                print(f"Error in training background thread: {e}")
                import traceback
                traceback.print_exc()
                training_jobs[training_id]['status'] = 'failed'
                training_jobs[training_id]['error'] = str(e)
                training_jobs[training_id]['message'] = f"Error: {str(e)}"
        
        # Start background thread
        thread = threading.Thread(target=train_in_background)
        thread.daemon = True
        thread.start()
        
        return {
            "training_id": training_id,
            "status": "started",
            "message": "Training job started successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting training: {str(e)}")

@app.get("/api/training/{training_id}/status")
def get_training_status(training_id: str):
    """Get training job status"""
    if training_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    return training_jobs[training_id]

@app.get("/api/training/runs")
def get_all_training_runs():
    """Get all training runs from database"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT tr.*, 
                           p.name as project_name,
                           d.name as dataset_name,
                           d.version as dataset_version,
                           m.name as model_name,
                           m.version as model_version
                    FROM training_runs tr
                    LEFT JOIN projects p ON tr.project_id = p.id
                    LEFT JOIN datasets d ON JSON_EXTRACT(tr.input_datasets, '$[0].dataset_id') = d.id
                    LEFT JOIN models m ON tr.model_id = m.id
                    ORDER BY tr.started_at DESC
                """)
                runs = cursor.fetchall()
                
                formatted_runs = []
                for run in runs:
                    if isinstance(run, tuple):
                        # Parse input_datasets if it's JSON string
                        input_datasets = run[3]
                        if isinstance(input_datasets, str):
                            try:
                                input_datasets = json.loads(input_datasets)
                            except:
                                input_datasets = {}
                        
                        formatted_runs.append({
                            'id': run[0],
                            'job_id': run[1],
                            'project_id': run[2],
                            'model_id': run[5],
                            'input_datasets': input_datasets,
                            'training_reason': run[6],
                            'parameters': run[7],
                            'metrics': run[8],
                            'status': run[9],
                            'created_by': run[10],
                            'started_at': run[11].isoformat() if run[11] else None,
                            'completed_at': run[12].isoformat() if run[12] else None,
                            'dataset_id': input_datasets[0].get('dataset_id') if isinstance(input_datasets, list) and len(input_datasets) > 0 else None,
                            'project_name': run[13],
                            'dataset_name': run[14],
                            'dataset_version': run[15],
                            'model_name': run[16],
                            'model_version': run[17]
                        })
                    else:
                        formatted_runs.append(run)
        
        return {"training_runs": formatted_runs}
    except Exception as e:
        print(f"Error fetching training runs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching training runs: {str(e)}")

@app.get("/api/models")
def get_models(project_id: Optional[int] = None):
    """Get all models, optionally filtered by project"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                if project_id:
                    cursor.execute("""
                        SELECT m.*, p.name as project_name
                        FROM models m
                        LEFT JOIN projects p ON m.project_id = p.id
                        WHERE m.project_id = %s
                        ORDER BY m.created_at DESC
                    """, (project_id,))
                else:
                    cursor.execute("""
                        SELECT m.*, p.name as project_name
                        FROM models m
                        LEFT JOIN projects p ON m.project_id = p.id
                        ORDER BY m.created_at DESC
                    """)
                models = cursor.fetchall()
                
                # Format models for frontend
                formatted_models = []
                for model in models:
                    if isinstance(model, tuple):
                        formatted_models.append({
                            'id': model[0],
                            'project_id': model[1],
                            'name': model[2],
                            'version': model[3],
                            'description': model[4],
                            'model_path': model[5],
                            'framework': model[6],
                            'parameters': json.loads(model[7]) if model[7] else {},
                            'metrics': json.loads(model[8]) if model[8] else {},
                            'commit_hash': model[9],
                            'tags': json.loads(model[10]) if model[10] else [],
                            'created_by': model[11],
                            'created_at': model[12].isoformat() if model[12] else None,
                            'dataset_id': model[13],
                            'project_name': model[14]
                        })
                    else:
                        formatted_models.append(model)
                
        return {"models": formatted_models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")

@app.get("/api/models/{model_id}")
def get_model_details(model_id: int):
    """Get model details"""
    try:
        with get_db() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT m.*, d.name as dataset_name, p.name as project_name
                    FROM models m
                    JOIN datasets d ON m.dataset_id = d.id
                    JOIN projects p ON m.project_id = p.id
                    WHERE m.id = %s
                """, (model_id,))
                model = cursor.fetchone()
                
                if not model:
                    raise HTTPException(status_code=404, detail="Model not found")
                
        return {"model": model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching model: {str(e)}")
