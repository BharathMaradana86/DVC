# Models table schema
"""
CREATE TABLE models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    dataset_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT 'v1.0',
    model_type VARCHAR(100) NOT NULL,
    model_path VARCHAR(500) NOT NULL,
    hyperparameters JSON,
    accuracy FLOAT,
    loss FLOAT,
    precision FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    training_status VARCHAR(50) DEFAULT 'pending',
    training_progress INT DEFAULT 0,
    epochs_completed INT DEFAULT 0,
    total_epochs INT DEFAULT 10,
    training_time_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);

CREATE TABLE training_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    epoch INT NOT NULL,
    train_loss FLOAT,
    train_accuracy FLOAT,
    val_loss FLOAT,
    val_accuracy FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id)
);

CREATE TABLE predictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    input_data JSON NOT NULL,
    prediction JSON NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id)
);
"""

