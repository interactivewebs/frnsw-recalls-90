# GitHub Repository Setup for FRNSW Recalls 90

## 🚀 Quick Setup Instructions

### Step 1: Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "New repository" (green button)
3. Repository name: `frnsw-recalls-90`
4. Make it **Public** (so curl can access it)
5. Check "Add a README file"
6. Click "Create repository"

### Step 2: Upload Deployment Script
1. In your new repository, click "Add file" → "Upload files"
2. Drag and drop the `deploy-frnswrecall90.sh` file
3. Commit message: "Add AlmaLinux deployment script"
4. Click "Commit changes"

### Step 3: Test the URL
The script will be available at:
```
https://raw.githubusercontent.com/davidfinley/frnsw-recalls-90/main/deploy-frnswrecall90.sh
```

### Step 4: Deploy to Server
```bash
# SSH to your AlmaLinux server
ssh root@199.91.68.150

# Run the deployment script
curl -sSL https://raw.githubusercontent.com/davidfinley/frnsw-recalls-90/main/deploy-frnswrecall90.sh | bash
```

## 📋 Alternative: Upload All Files

You can also upload your entire project to make future updates easier:

### Repository Structure:
```
frnsw-recalls-90/
├── deploy-frnswrecall90.sh     # Main deployment script
├── backend/                    # Backend application files
├── frontend/                   # Frontend application files
├── database/                   # Database schema files
├── README.md                   # Project documentation
└── DEPLOYMENT.md              # Deployment guide
```

### Upload Process:
1. **Option A: Web Interface**
   - Use GitHub's web interface to upload files/folders
   - Drag and drop entire directories

2. **Option B: Git Command Line**
   ```bash
   # In your project directory
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/davidfinley/frnsw-recalls-90.git
   git push -u origin main
   ```

## 🔧 Update Script for Latest Code

If you want the deployment script to automatically pull the latest code from GitHub, I can modify it to clone your repository instead of creating basic files.

Would you like me to:
1. Create a version that clones from GitHub?
2. Help you set up the repository?
3. Modify the script for automatic updates?
