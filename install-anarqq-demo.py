#!/usr/bin/env python3

"""
AnarQ&Q Ecosystem Demo Installer
Graphical installer for the AnarQ&Q ecosystem demo
Version: 1.0.0
Author: AnarQorp Team
"""

import os
import sys
import subprocess
import shutil
import json
import urllib.request
import zipfile
import tempfile
from pathlib import Path
from typing import Optional, Tuple

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog, scrolledtext
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False
    print("GUI not available, running in console mode")

# Configuration
CONFIG = {
    'demo_repo': 'https://github.com/AnarQorp/anarqq-ecosystem-demo.git',
    'core_repo': 'https://github.com/AnarQorp/anarqq-ecosystem-core.git',
    'demo_zip': 'https://github.com/AnarQorp/anarqq-ecosystem-demo/archive/refs/heads/main.zip',
    'core_zip': 'https://github.com/AnarQorp/anarqq-ecosystem-core/archive/refs/heads/main.zip',
    'min_node_version': '18.0.0',
    'min_python_version': '3.8.0',
    'required_disk_gb': 5,
    'required_memory_gb': 2
}

class AnarQQInstaller:
    def __init__(self):
        self.install_dir = Path.home() / 'anarqq-ecosystem'
        self.demo_dir = self.install_dir / 'demo'
        self.core_dir = self.install_dir / 'core'
        self.log_file = self.install_dir / 'install.log'
        self.progress_callback = None
        self.log_callback = None
        
    def log(self, message: str, level: str = 'INFO'):
        """Log a message"""
        log_entry = f"[{level}] {message}"
        print(log_entry)
        
        # Write to log file
        if self.log_file.parent.exists():
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(f"{log_entry}\n")
        
        # Call GUI callback if available
        if self.log_callback:
            self.log_callback(log_entry)
    
    def update_progress(self, value: int, message: str = ""):
        """Update progress"""
        if self.progress_callback:
            self.progress_callback(value, message)
    
    def check_command(self, command: str) -> Tuple[bool, str]:
        """Check if a command is available"""
        try:
            result = subprocess.run([command, '--version'], 
                                  capture_output=True, text=True, timeout=10)
            return result.returncode == 0, result.stdout.strip()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False, ""
    
    def check_system_requirements(self) -> bool:
        """Check system requirements"""
        self.log("Checking system requirements...")
        errors = 0
        
        # Check Python version
        python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        self.log(f"Python version: {python_version}")
        
        # Check Node.js
        node_available, node_version = self.check_command('node')
        if node_available:
            self.log(f"✅ Node.js found: {node_version}")
        else:
            self.log("❌ Node.js not found", 'ERROR')
            errors += 1
        
        # Check npm
        npm_available, npm_version = self.check_command('npm')
        if npm_available:
            self.log(f"✅ npm found: {npm_version}")
        else:
            self.log("❌ npm not found", 'ERROR')
            errors += 1
        
        # Check Git
        git_available, git_version = self.check_command('git')
        if git_available:
            self.log(f"✅ Git found: {git_version}")
        else:
            self.log("⚠️ Git not found (will use ZIP download)", 'WARNING')
        
        # Check Docker (optional)
        docker_available, docker_version = self.check_command('docker')
        if docker_available:
            self.log(f"✅ Docker found: {docker_version}")
        else:
            self.log("ℹ️ Docker not found (optional)", 'INFO')
        
        # Check disk space
        try:
            disk_usage = shutil.disk_usage(Path.home())
            available_gb = disk_usage.free / (1024**3)
            if available_gb >= CONFIG['required_disk_gb']:
                self.log(f"✅ Disk space: {available_gb:.1f}GB available")
            else:
                self.log(f"❌ Insufficient disk space: {available_gb:.1f}GB (required: {CONFIG['required_disk_gb']}GB)", 'ERROR')
                errors += 1
        except Exception as e:
            self.log(f"⚠️ Could not check disk space: {e}", 'WARNING')
        
        return errors == 0
    
    def setup_directories(self):
        """Setup installation directories"""
        self.log("Setting up directories...")
        
        self.install_dir.mkdir(exist_ok=True)
        self.demo_dir.mkdir(exist_ok=True)
        self.core_dir.mkdir(exist_ok=True)
        
        # Create log file
        self.log_file.touch()
        
        self.log(f"✅ Directories created at: {self.install_dir}")
    
    def download_file(self, url: str, destination: Path, description: str = ""):
        """Download a file with progress"""
        self.log(f"Downloading {description or url}...")
        
        def progress_hook(block_num, block_size, total_size):
            if total_size > 0:
                percent = min(100, (block_num * block_size * 100) // total_size)
                self.update_progress(percent, f"Downloading {description}... {percent}%")
        
        urllib.request.urlretrieve(url, destination, progress_hook)
        self.log(f"✅ Downloaded: {destination}")
    
    def extract_zip(self, zip_path: Path, extract_to: Path, description: str = ""):
        """Extract a ZIP file"""
        self.log(f"Extracting {description or zip_path.name}...")
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        
        self.log(f"✅ Extracted to: {extract_to}")
    
    def clone_or_download_repo(self, repo_url: str, zip_url: str, destination: Path, name: str):
        """Clone repository or download ZIP as fallback"""
        git_available, _ = self.check_command('git')
        
        if git_available:
            try:
                self.log(f"Cloning {name} repository...")
                if destination.exists() and (destination / '.git').exists():
                    # Update existing repository
                    subprocess.run(['git', 'pull', 'origin', 'main'], 
                                 cwd=destination, check=True, capture_output=True)
                    self.log(f"✅ Updated {name} repository")
                else:
                    # Clone new repository
                    subprocess.run(['git', 'clone', repo_url, str(destination)], 
                                 check=True, capture_output=True)
                    self.log(f"✅ Cloned {name} repository")
                return
            except subprocess.CalledProcessError as e:
                self.log(f"⚠️ Git clone failed: {e}", 'WARNING')
        
        # Fallback to ZIP download
        self.log(f"Downloading {name} as ZIP...")
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / f"{name}.zip"
            self.download_file(zip_url, zip_path, f"{name} repository")
            
            # Extract ZIP
            extract_path = Path(temp_dir) / 'extracted'
            self.extract_zip(zip_path, extract_path, f"{name} repository")
            
            # Move contents to destination
            extracted_dirs = list(extract_path.iterdir())
            if extracted_dirs:
                source_dir = extracted_dirs[0]  # Usually the first directory
                if destination.exists():
                    shutil.rmtree(destination)
                shutil.move(str(source_dir), str(destination))
                self.log(f"✅ Downloaded and extracted {name}")
    
    def install_dependencies(self, directory: Path, name: str):
        """Install npm dependencies"""
        self.log(f"Installing {name} dependencies...")
        
        try:
            # Install dependencies
            subprocess.run(['npm', 'install'], cwd=directory, check=True, 
                         capture_output=True, text=True)
            self.log(f"✅ {name} dependencies installed")
            
            # Try to build
            try:
                subprocess.run(['npm', 'run', 'build'], cwd=directory, check=True, 
                             capture_output=True, text=True)
                self.log(f"✅ {name} built successfully")
            except subprocess.CalledProcessError:
                self.log(f"⚠️ {name} build failed (not critical)", 'WARNING')
                
        except subprocess.CalledProcessError as e:
            self.log(f"❌ Failed to install {name} dependencies: {e}", 'ERROR')
            raise
    
    def setup_environment(self):
        """Setup environment files"""
        self.log("Setting up environment...")
        
        # Copy .env.example to .env in demo directory
        env_example = self.demo_dir / '.env.example'
        env_file = self.demo_dir / '.env'
        
        if env_example.exists() and not env_file.exists():
            shutil.copy2(env_example, env_file)
            self.log("✅ Environment file created")
    
    def create_launchers(self):
        """Create launcher scripts"""
        self.log("Creating launcher scripts...")
        
        # Cross-platform launcher scripts
        if os.name == 'nt':  # Windows
            # Start demo script
            start_script = self.install_dir / 'start-demo.bat'
            with open(start_script, 'w') as f:
                f.write('@echo off\n')
                f.write('echo 🚀 Starting AnarQ&Q Demo...\n')
                f.write(f'cd /d "{self.demo_dir}"\n')
                f.write('npm run dev\n')
                f.write('pause\n')
            
            # Stop script
            stop_script = self.install_dir / 'stop-services.bat'
            with open(stop_script, 'w') as f:
                f.write('@echo off\n')
                f.write('echo 🛑 Stopping AnarQ&Q services...\n')
                f.write(f'cd /d "{self.demo_dir}"\n')
                f.write('if exist "docker-compose.yml" docker-compose down\n')
                f.write('echo Services stopped\n')
                f.write('pause\n')
        else:  # Unix-like
            # Start demo script
            start_script = self.install_dir / 'start-demo.sh'
            with open(start_script, 'w') as f:
                f.write('#!/bin/bash\n')
                f.write('echo "🚀 Starting AnarQ&Q Demo..."\n')
                f.write(f'cd "{self.demo_dir}"\n')
                f.write('npm run dev\n')
            start_script.chmod(0o755)
            
            # Stop script
            stop_script = self.install_dir / 'stop-services.sh'
            with open(stop_script, 'w') as f:
                f.write('#!/bin/bash\n')
                f.write('echo "🛑 Stopping AnarQ&Q services..."\n')
                f.write(f'cd "{self.demo_dir}"\n')
                f.write('if [ -f "docker-compose.yml" ]; then\n')
                f.write('    docker-compose down\n')
                f.write('fi\n')
                f.write('echo "Services stopped"\n')
            stop_script.chmod(0o755)
        
        self.log("✅ Launcher scripts created")
    
    def install(self, install_core: bool = False) -> bool:
        """Main installation process"""
        try:
            self.update_progress(0, "Starting installation...")
            
            # Check requirements
            if not self.check_system_requirements():
                self.log("❌ System requirements not met", 'ERROR')
                return False
            self.update_progress(10, "System requirements checked")
            
            # Setup directories
            self.setup_directories()
            self.update_progress(20, "Directories created")
            
            # Download demo repository
            self.clone_or_download_repo(
                CONFIG['demo_repo'], 
                CONFIG['demo_zip'], 
                self.demo_dir, 
                'Demo'
            )
            self.update_progress(40, "Demo repository downloaded")
            
            # Download core repository if requested
            if install_core:
                self.clone_or_download_repo(
                    CONFIG['core_repo'], 
                    CONFIG['core_zip'], 
                    self.core_dir, 
                    'Core'
                )
                self.update_progress(60, "Core repository downloaded")
            else:
                self.update_progress(60, "Skipping core repository")
            
            # Install demo dependencies
            self.install_dependencies(self.demo_dir, 'Demo')
            self.update_progress(80, "Dependencies installed")
            
            # Setup environment
            self.setup_environment()
            self.update_progress(90, "Environment configured")
            
            # Create launchers
            self.create_launchers()
            self.update_progress(100, "Installation completed")
            
            self.log("🎉 Installation completed successfully!")
            return True
            
        except Exception as e:
            self.log(f"❌ Installation failed: {e}", 'ERROR')
            return False

class InstallerGUI:
    def __init__(self):
        self.installer = AnarQQInstaller()
        self.installer.progress_callback = self.update_progress
        self.installer.log_callback = self.add_log
        
        self.root = tk.Tk()
        self.root.title("AnarQ&Q Ecosystem Demo Installer")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        self.setup_ui()
    
    def setup_ui(self):
        """Setup the user interface"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(4, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="🚀 AnarQ&Q Ecosystem Demo Installer", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Installation directory
        ttk.Label(main_frame, text="Installation Directory:").grid(row=1, column=0, sticky=tk.W)
        self.install_dir_var = tk.StringVar(value=str(self.installer.install_dir))
        dir_entry = ttk.Entry(main_frame, textvariable=self.install_dir_var, width=50)
        dir_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=(5, 5))
        
        browse_btn = ttk.Button(main_frame, text="Browse", command=self.browse_directory)
        browse_btn.grid(row=1, column=2, padx=(5, 0))
        
        # Options
        options_frame = ttk.LabelFrame(main_frame, text="Installation Options", padding="10")
        options_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(10, 0))
        
        self.install_core_var = tk.BooleanVar()
        core_check = ttk.Checkbutton(options_frame, text="Install complete ecosystem (core repository)", 
                                    variable=self.install_core_var)
        core_check.grid(row=0, column=0, sticky=tk.W)
        
        # Progress
        progress_frame = ttk.LabelFrame(main_frame, text="Progress", padding="10")
        progress_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(10, 0))
        progress_frame.columnconfigure(0, weight=1)
        
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        self.progress_label = ttk.Label(progress_frame, text="Ready to install")
        self.progress_label.grid(row=1, column=0, sticky=tk.W)
        
        # Log
        log_frame = ttk.LabelFrame(main_frame, text="Installation Log", padding="10")
        log_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=80)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=5, column=0, columnspan=3, pady=(10, 0))
        
        self.install_btn = ttk.Button(button_frame, text="Install", command=self.start_installation)
        self.install_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.close_btn = ttk.Button(button_frame, text="Close", command=self.root.quit)
        self.close_btn.pack(side=tk.LEFT)
    
    def browse_directory(self):
        """Browse for installation directory"""
        directory = filedialog.askdirectory(initialdir=self.install_dir_var.get())
        if directory:
            self.install_dir_var.set(directory)
            self.installer.install_dir = Path(directory)
            self.installer.demo_dir = self.installer.install_dir / 'demo'
            self.installer.core_dir = self.installer.install_dir / 'core'
            self.installer.log_file = self.installer.install_dir / 'install.log'
    
    def update_progress(self, value: int, message: str = ""):
        """Update progress bar and label"""
        self.progress_var.set(value)
        if message:
            self.progress_label.config(text=message)
        self.root.update_idletasks()
    
    def add_log(self, message: str):
        """Add message to log"""
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()
    
    def start_installation(self):
        """Start the installation process"""
        self.install_btn.config(state='disabled')
        
        try:
            # Update installer paths
            self.installer.install_dir = Path(self.install_dir_var.get())
            self.installer.demo_dir = self.installer.install_dir / 'demo'
            self.installer.core_dir = self.installer.install_dir / 'core'
            self.installer.log_file = self.installer.install_dir / 'install.log'
            
            # Start installation
            success = self.installer.install(self.install_core_var.get())
            
            if success:
                messagebox.showinfo("Success", 
                    f"Installation completed successfully!\n\n"
                    f"Installation directory: {self.installer.install_dir}\n\n"
                    f"Use the launcher scripts to start the demo.")
            else:
                messagebox.showerror("Error", "Installation failed. Check the log for details.")
                
        except Exception as e:
            messagebox.showerror("Error", f"Installation failed: {e}")
        
        finally:
            self.install_btn.config(state='normal')
    
    def run(self):
        """Run the GUI"""
        self.root.mainloop()

def console_install():
    """Console-based installation"""
    print("🚀 AnarQ&Q Ecosystem Demo Installer (Console Mode)")
    print("=" * 50)
    
    installer = AnarQQInstaller()
    
    # Get installation directory
    default_dir = installer.install_dir
    install_dir = input(f"Installation directory [{default_dir}]: ").strip()
    if install_dir:
        installer.install_dir = Path(install_dir)
        installer.demo_dir = installer.install_dir / 'demo'
        installer.core_dir = installer.install_dir / 'core'
        installer.log_file = installer.install_dir / 'install.log'
    
    # Ask for core installation
    install_core = input("Install complete ecosystem (core repository)? (y/N): ").strip().lower() == 'y'
    
    print("\nStarting installation...")
    success = installer.install(install_core)
    
    if success:
        print("\n🎉 Installation completed successfully!")
        print(f"📍 Installation directory: {installer.install_dir}")
        print(f"📋 Log file: {installer.log_file}")
        print("\n🚀 To start the demo:")
        if os.name == 'nt':
            print(f"   {installer.install_dir}\\start-demo.bat")
        else:
            print(f"   {installer.install_dir}/start-demo.sh")
    else:
        print("\n❌ Installation failed. Check the log for details.")
        return False
    
    return True

def main():
    """Main entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == '--console':
        # Force console mode
        return console_install()
    
    if GUI_AVAILABLE:
        try:
            app = InstallerGUI()
            app.run()
            return True
        except Exception as e:
            print(f"GUI failed: {e}")
            print("Falling back to console mode...")
            return console_install()
    else:
        return console_install()

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nInstallation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)