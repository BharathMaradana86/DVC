import pymysql
from dbConnection import get_connection

def create_tables():
    """Create the projects table if it doesn't exist"""
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                # Create projects table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) UNIQUE NOT NULL,
                        description TEXT,
                        path VARCHAR(500) NOT NULL,
                        created_by VARCHAR(100) NOT NULL,
                        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                """)
                connection.commit()
                print("Projects table created successfully")
                
                # Create datasets table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS datasets (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        project_id INT NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        version VARCHAR(50) NOT NULL,
                        file_count INT DEFAULT 0,
                        commit_hash VARCHAR(100),
                        base_path VARCHAR(500),
                        created_by VARCHAR(100) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects(id)
                    )
                """)
                connection.commit()
                print("Datasets table created successfully")
                
                # Create models table with new schema
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS models (
                        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        project_id INT,
                        name VARCHAR(100) NOT NULL,
                        version VARCHAR(50) NOT NULL,
                        description TEXT,
                        model_path VARCHAR(500) NOT NULL,
                        framework VARCHAR(50) DEFAULT 'pytorch',
                        parameters JSON,
                        metrics JSON,
                        commit_hash VARCHAR(100),
                        tags JSON,
                        created_by VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        dataset_id VARCHAR(50),
                        FOREIGN KEY (project_id) REFERENCES projects(id)
                    )
                """)
                connection.commit()
                print("Models table created successfully")
                
                # Create training_runs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS training_runs (
                        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        job_id VARCHAR(100) UNIQUE NOT NULL,
                        project_id INT,
                        model_id INT,
                        input_datasets JSON NOT NULL,
                        training_reason TEXT NOT NULL,
                        parameters JSON NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        commit_hash_before VARCHAR(100),
                        commit_hash_after VARCHAR(100),
                        created_by VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        started_at TIMESTAMP,
                        completed_at TIMESTAMP,
                        error_message TEXT,
                        FOREIGN KEY (project_id) REFERENCES projects(id),
                        FOREIGN KEY (model_id) REFERENCES models(id)
                    )
                """)
                connection.commit()
                print("Training_runs table created successfully")
                
    except Exception as e:
        print(f"Error creating tables: {e}")
        raise e

if __name__ == "__main__":
    create_tables()

