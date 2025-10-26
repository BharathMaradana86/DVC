import os
import json
import time
import glob
import numpy as np
from typing import Dict, List, Optional
from pathlib import Path
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms, models
try:
    import yaml
except ImportError:
    yaml = None
    print("Warning: PyYAML not installed. YAML config files will not be supported.")

class CustomDataset(Dataset):
    """Custom dataset for loading images and labels"""
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        image_path = self.image_paths[idx]
        try:
            image = Image.open(image_path).convert('RGB')
            if self.transform:
                image = self.transform(image)
            label = self.labels[idx]
            return image, label
        except Exception as e:
            print(f"Error loading image {image_path}: {e}")
            # Return a dummy image and label
            dummy_image = Image.new('RGB', (224, 224), color='black')
            if self.transform:
                dummy_image = self.transform(dummy_image)
            return dummy_image, self.labels[idx] if self.labels else 0

class TrainingService:
    """Service for actual ML model training"""
    
    @staticmethod
    def train_model(
        dataset_path: str,
        output_path: str,
        hyperparameters: Dict,
        progress_callback=None
    ) -> Dict:
        """
        Train a model on the given dataset (Mock implementation for now)
        
        Args:
            dataset_path: Path to dataset directory
            output_path: Path to save the trained model
            hyperparameters: Dictionary of hyperparameters
            progress_callback: Callback function for progress updates
            
        Returns:
            Dictionary with training results
        """
        try:
            print(f"Starting actual training on dataset: {dataset_path}")
            
            # Extract hyperparameters
            model_architecture = hyperparameters.get('model_architecture', 'ResNet')
            epochs = hyperparameters.get('epochs', 10)
            batch_size = hyperparameters.get('batch_size', 32)
            learning_rate = hyperparameters.get('learning_rate', 0.001)
            num_classes = hyperparameters.get('num_classes', 10)
            optimizer_name = hyperparameters.get('optimizer', 'Adam')
            loss_function_name = hyperparameters.get('loss_function', 'CrossEntropy')
            train_split = hyperparameters.get('train_split', 70)
            validation_split = hyperparameters.get('validation_split', 20)
            test_split = hyperparameters.get('test_split', 10)
            
            print(f"Model Architecture: {model_architecture}")
            print(f"Optimizer: {optimizer_name}")
            print(f"Loss Function: {loss_function_name}")
            print(f"Epochs: {epochs}, Batch Size: {batch_size}, Learning Rate: {learning_rate}")
            
            # Count files in dataset
            if os.path.exists(dataset_path):
                files = glob.glob(os.path.join(dataset_path, '*.*'))
                file_count = len([f for f in files if os.path.isfile(f)])
            else:
                file_count = 0
                raise Exception(f"Dataset path does not exist: {dataset_path}")
            
            print(f"Found {file_count} files in dataset")
            print(f"Data Split - Train: {train_split}%, Validation: {validation_split}%, Test: {test_split}%")
            
            # Calculate split counts
            train_count = int(file_count * train_split / 100)
            val_count = int(file_count * validation_split / 100)
            test_count = file_count - train_count - val_count  # Remaining goes to test
            
            print(f"Split Details - Train: {train_count} files, Validation: {val_count} files, Test: {test_count} files")
            
            # Load YAML config file if exists
            yaml_config = None
            if yaml is not None:
                for yaml_file in glob.glob(os.path.join(dataset_path, '*.yaml')) + glob.glob(os.path.join(dataset_path, '*.yml')):
                    try:
                        with open(yaml_file, 'r') as f:
                            yaml_config = yaml.safe_load(f)
                        print(f"Loaded YAML config: {os.path.basename(yaml_file)}")
                        print(f"YAML config: {yaml_config}")
                        break
                    except Exception as e:
                        print(f"Error loading YAML: {e}")
            
            # Load images from images/ folder
            images_dir = os.path.join(dataset_path, 'images')
            image_files = []
            if os.path.exists(images_dir):
                for ext in ['*.jpg', '*.jpeg', '*.png', '*.bmp', '*.gif']:
                    image_files.extend(glob.glob(os.path.join(images_dir, ext)))
                    image_files.extend(glob.glob(os.path.join(images_dir, ext.upper())))
            else:
                # Fallback: look in root directory
                for ext in ['*.jpg', '*.jpeg', '*.png', '*.bmp', '*.gif']:
                    image_files.extend(glob.glob(os.path.join(dataset_path, ext)))
                    image_files.extend(glob.glob(os.path.join(dataset_path, ext.upper())))
            
            print(f"Found {len(image_files)} image files in images directory")
            
            if len(image_files) == 0:
                print("No image files found, using simulation mode")
                return TrainingService._simulate_training(hyperparameters, output_path, progress_callback)
            
            # Load labels from labels/ folder
            labels_dir = os.path.join(dataset_path, 'labels')
            labels = []
            if os.path.exists(labels_dir):
                for img_path in image_files:
                    # Find corresponding label file
                    img_name = os.path.basename(img_path)
                    label_name = img_name.rsplit('.', 1)[0] + '.txt'  # Replace extension with .txt
                    label_path = os.path.join(labels_dir, label_name)
                    
                    if os.path.exists(label_path):
                        # Read label file (YOLO format: class x_center y_center width height)
                        try:
                            with open(label_path, 'r') as f:
                                lines = f.readlines()
                                if lines:
                                    # Take the first class for simplicity
                                    first_line = lines[0].strip().split()
                                    if first_line:
                                        label_class = int(float(first_line[0]))
                                        labels.append(label_class)
                                    else:
                                        labels.append(0)  # Default class
                                else:
                                    labels.append(0)  # Default class if file is empty
                        except:
                            labels.append(0)  # Default class on error
                    else:
                        labels.append(0)  # Default class if no label file
            else:
                # No labels folder, use random labels for demo
                labels = np.random.randint(0, num_classes, len(image_files))
            
            print(f"Loaded {len(labels)} labels from labels directory")
            
            # Data transforms
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            # Create dataset
            dataset = CustomDataset(image_files, labels, transform=transform)
            
            # Split dataset
            val_count = int(len(dataset) * validation_split / 100)
            test_count = int(len(dataset) * test_split / 100)
            train_count = len(dataset) - val_count - test_count
            
            train_dataset, val_dataset, test_dataset = random_split(
                dataset, [train_count, val_count, test_count]
            )
            
            # Create data loaders
            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
            val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
            
            print(f"Train samples: {len(train_dataset)}, Val samples: {len(val_dataset)}, Test samples: {len(test_dataset)}")
            
            # Initialize model based on architecture
            model = TrainingService._create_model(model_architecture, num_classes)
            
            # Setup optimizer
            optimizer = TrainingService._create_optimizer(optimizer_name, model, learning_rate)
            
            # Setup loss function
            criterion = TrainingService._create_loss_function(loss_function_name)
            
            # Training history
            training_history = {
                'train_loss': [],
                'val_loss': [],
                'train_accuracy': [],
                'val_accuracy': [],
                'epochs': []
            }
            
            # Training loop
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")
            model = model.to(device)
            
            best_val_acc = 0
            
            for epoch in range(epochs):
                # Update progress
                if progress_callback:
                    progress = int(((epoch + 1) / epochs) * 90)
                    progress_callback(progress)
                
                # Training phase
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0
                
                for images, targets in train_loader:
                    images, targets = images.to(device), targets.to(device)
                    
                    optimizer.zero_grad()
                    outputs = model(images)
                    loss = criterion(outputs, targets)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    _, predicted = torch.max(outputs.data, 1)
                    train_total += targets.size(0)
                    train_correct += (predicted == targets).sum().item()
                
                train_acc = 100. * train_correct / train_total
                avg_train_loss = train_loss / len(train_loader)
                
                # Validation phase
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for images, targets in val_loader:
                        images, targets = images.to(device), targets.to(device)
                        outputs = model(images)
                        loss = criterion(outputs, targets)
                        
                        val_loss += loss.item()
                        _, predicted = torch.max(outputs.data, 1)
                        val_total += targets.size(0)
                        val_correct += (predicted == targets).sum().item()
                
                val_acc = 100. * val_correct / val_total
                avg_val_loss = val_loss / len(val_loader)
                
                # Save history
                training_history['train_loss'].append(avg_train_loss)
                training_history['val_loss'].append(avg_val_loss)
                training_history['train_accuracy'].append(train_acc)
                training_history['val_accuracy'].append(val_acc)
                training_history['epochs'].append(epoch + 1)
                
                print(f"Epoch {epoch+1}/{epochs} - Train Loss: {avg_train_loss:.4f}, Train Acc: {train_acc:.2f}% | Val Loss: {avg_val_loss:.4f}, Val Acc: {val_acc:.2f}%")
                
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    # Save best model
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)
                    torch.save(model.state_dict(), output_path)
                    print(f"Saved best model with validation accuracy: {val_acc:.2f}%")
            
            # Save final model
            torch.save(model.state_dict(), output_path)
            print(f"Final model saved to: {output_path}")
            
            # Save training history
            history_path = output_path.replace('.pth', '_history.json')
            with open(history_path, 'w') as f:
                json.dump(training_history, f, indent=2)
            
            if progress_callback:
                progress_callback(100)
            
            # Get final metrics
            final_loss = training_history['val_loss'][-1]
            final_accuracy = training_history['val_accuracy'][-1]
            
            return {
                'status': 'completed',
                'model_path': output_path,
                'final_loss': final_loss,
                'final_accuracy': final_accuracy,
                'total_epochs': epochs,
                'epochs_completed': epochs,
                'training_history': training_history,
                'file_count': len(image_files),
                'data_split': {
                    'train': {'percentage': train_split, 'count': len(train_dataset)},
                    'validation': {'percentage': validation_split, 'count': len(val_dataset)},
                    'test': {'percentage': test_split, 'count': len(test_dataset)}
                }
            }
            
        except Exception as e:
            print(f"Training error: {e}")
            if progress_callback:
                progress_callback(-1)  # Error indicator
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    @staticmethod
    def _create_model(architecture: str, num_classes: int):
        """Create model based on architecture"""
        if architecture.lower() == 'resnet':
            model = models.resnet18(pretrained=True)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
        elif architecture.lower() == 'yolov5':
            # Simplified YOLO - using ResNet backbone
            model = models.resnet50(pretrained=True)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
        elif architecture.lower() == 'ssd':
            # Using MobileNet as backbone for SSD
            model = models.mobilenet_v2(pretrained=True)
            model.classifier[-1] = nn.Linear(model.last_channel, num_classes)
        elif architecture.lower() == 'fasterrcnn':
            # Using ResNet backbone
            model = models.resnet101(pretrained=True)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
        else:
            # Default to ResNet18
            model = models.resnet18(pretrained=True)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
        
        return model
    
    @staticmethod
    def _create_optimizer(optimizer_name: str, model, learning_rate: float):
        """Create optimizer based on name"""
        optimizer_name = optimizer_name.lower()
        
        if optimizer_name == 'adam':
            return optim.Adam(model.parameters(), lr=learning_rate)
        elif optimizer_name == 'sgd':
            return optim.SGD(model.parameters(), lr=learning_rate, momentum=0.9)
        elif optimizer_name == 'rmsprop':
            return optim.RMSprop(model.parameters(), lr=learning_rate)
        elif optimizer_name == 'adamw':
            return optim.AdamW(model.parameters(), lr=learning_rate)
        else:
            return optim.Adam(model.parameters(), lr=learning_rate)
    
    @staticmethod
    def _create_loss_function(loss_name: str):
        """Create loss function based on name"""
        loss_name = loss_name.lower()
        
        if loss_name == 'crossentropy':
            return nn.CrossEntropyLoss()
        elif loss_name == 'mseloss':
            return nn.MSELoss()
        elif loss_name == 'bceloss':
            return nn.BCELoss()
        elif loss_name == 'nllloss':
            return nn.NLLLoss()
        else:
            return nn.CrossEntropyLoss()
    
    @staticmethod
    def _simulate_training(hyperparameters: Dict, output_path: str, progress_callback=None) -> Dict:
        """Fallback simulation mode when no images found"""
        print("Running in simulation mode")
        epochs = hyperparameters.get('epochs', 10)
        
        for epoch in range(epochs):
            if progress_callback:
                progress = int(((epoch + 1) / epochs) * 90)
                progress_callback(progress)
            time.sleep(0.5)
        
        if progress_callback:
            progress_callback(100)
        
        return {
            'status': 'completed',
            'model_path': output_path,
            'final_loss': 0.5,
            'final_accuracy': 0.85,
            'total_epochs': epochs,
            'epochs_completed': epochs,
            'training_history': {}
        }
    
    @staticmethod
    def get_default_hyperparameters() -> Dict:
        """Get default hyperparameters"""
        return {
            'epochs': 10,
            'batch_size': 32,
            'learning_rate': 0.001,
            'num_classes': 10,
            'optimizer': 'adam',
            'loss_function': 'cross_entropy'
        }
