import subprocess
import os
import hashlib
import json
from typing import List, Tuple, Optional

class DVCManager:
    """Manage DVC operations for datasets and models"""
    
    @staticmethod
    def init_dvc(project_path: str) -> bool:
        """
        Initialize DVC in a project directory
        Returns True if successful, False otherwise
        """
        try:
            # Initialize Git if not already done
            git_dir = os.path.join(project_path, '.git')
            if not os.path.exists(git_dir):
                print(f"Initializing Git in {project_path}")
                result = subprocess.run(
                    ['git', 'init'],
                    cwd=project_path,
                    capture_output=True,
                    text=True
                )
                if result.returncode != 0:
                    print(f"Git init failed: {result.stderr}")
                    return False
            
            # Initialize DVC
            print(f"Initializing DVC in {project_path}")
            result = subprocess.run(
                ['dvc', 'init'],
                cwd=project_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print(f"DVC init failed: {result.stderr}")
                return False
            
            # Initial commit
            print("Making initial DVC commit...")
            subprocess.run(['git', 'add', '.dvc'], cwd=project_path)
            subprocess.run(['git', 'add', '.gitignore'], cwd=project_path)
            subprocess.run(
                ['git', 'commit', '-m', 'Initial DVC setup'],
                cwd=project_path,
                capture_output=True
            )
            
            print(f"DVC initialized successfully in {project_path}")
            return True
            
        except Exception as e:
            print(f"Error initializing DVC: {e}")
            return False
    
    @staticmethod
    def add_files_to_dvc(project_path: str, data_dir: str, files: List[str]) -> Optional[str]:
        """
        Add files to DVC tracking
        Returns DVC hash if successful, None otherwise
        """
        try:
            print(f"Adding {len(files)} files to DVC in {data_dir}")
            
            # Change to data directory
            os.chdir(data_dir)
            
            # Add each file to DVC
            for file_path in files:
                if os.path.exists(file_path):
                    result = subprocess.run(
                        ['dvc', 'add', os.path.basename(file_path)],
                        cwd=data_dir,
                        capture_output=True,
                        text=True,
                        shell=True
                    )
                    
                    if result.returncode != 0:
                        print(f"Failed to add {file_path}: {result.stderr}")
            
            os.chdir(project_path)
            
            # Commit DVC changes
            print("Committing DVC changes to Git...")
            
            # Stage .dvc files
            subprocess.run(['git', 'add', f'{data_dir}/*.dvc'], cwd=project_path, capture_output=True)
            subprocess.run(['git', 'add', '.gitignore'], cwd=project_path, capture_output=True)
            
            # Make commit
            commit_message = f"Add dataset with {len(files)} files"
            result = subprocess.run(
                ['git', 'commit', '-m', commit_message],
                cwd=project_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # Get commit hash
                git_result = subprocess.run(
                    ['git', 'rev-parse', 'HEAD'],
                    cwd=project_path,
                    capture_output=True,
                    text=True
                )
                
                commit_hash = git_result.stdout.strip()
                print(f"DVC commit successful: {commit_hash}")
                return commit_hash
            else:
                print(f"DVC commit failed: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"Error adding files to DVC: {e}")
            return None
    
    @staticmethod
    def get_dvc_hash(file_paths: List[str]) -> str:
        """
        Generate a DVC-style hash for files
        This is a fallback if DVC is not available
        """
        hash_content = ""
        for file_path in sorted(file_paths):
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    hash_content += f.read().hex()
        return hashlib.md5(hash_content.encode()).hexdigest()
    
    @staticmethod
    def list_tracked_files(project_path: str) -> List[str]:
        """
        List all files tracked by DVC
        """
        try:
            result = subprocess.run(
                ['dvc', 'list', project_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return result.stdout.strip().split('\n')
            return []
            
        except Exception as e:
            print(f"Error listing DVC files: {e}")
            return []
    
    @staticmethod
    def get_dvc_state(project_path: str) -> dict:
        """
        Get current DVC state information
        """
        try:
            # Check if DVC is initialized
            dvc_dir = os.path.join(project_path, '.dvc')
            if not os.path.exists(dvc_dir):
                return {"initialized": False}
            
            # Get git log for DVC commits
            result = subprocess.run(
                ['git', 'log', '--oneline', '-10'],
                cwd=project_path,
                capture_output=True,
                text=True
            )
            
            commits = result.stdout.strip().split('\n') if result.returncode == 0 else []
            
            return {
                "initialized": True,
                "recent_commits": commits
            }
            
        except Exception as e:
            print(f"Error getting DVC state: {e}")
            return {"initialized": False, "error": str(e)}
    
    @staticmethod
    def checkout_version(project_path: str, version: str) -> bool:
        """
        Checkout a specific version of the dataset
        """
        try:
            result = subprocess.run(
                ['git', 'checkout', version],
                cwd=project_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # Run dvc checkout to get data
                result = subprocess.run(
                    ['dvc', 'checkout'],
                    cwd=project_path,
                    capture_output=True,
                    text=True
                )
                return result.returncode == 0
            
            return False
            
        except Exception as e:
            print(f"Error checking out version: {e}")
            return False

