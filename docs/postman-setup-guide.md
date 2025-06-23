# Postman Collection Setup Guide

## How to Import the Postman Collection

### Method 1: Import JSON File

1. **Open Postman**
2. **Click "Import"** (top left corner)
3. **Choose "Upload Files"**
4. **Select** the `postman-collection-updated.json` file
5. **Click "Import"**

### Method 2: Import from Raw JSON

1. **Open Postman**
2. **Click "Import"**
3. **Choose "Raw text"**
4. **Copy and paste** the entire JSON content from `postman-collection-updated.json`
5. **Click "Continue"** then **"Import"**

### Method 3: Import via Link (if hosted)

1. **Open Postman**
2. **Click "Import"**
3. **Choose "Link"**
4. **Enter URL**: `https://next-mercor-time-tracker.vercel.app/docs/postman-collection.json`
5. **Click "Import"**

## Setting Up Environment Variables

### Option 1: Collection Variables (Recommended)
The collection comes with pre-configured variables:

- `base_url`: Your API base URL (default: `http://localhost:3000`)
- `jwt_token`: Will be auto-set after login
- `organization_id`: Will be auto-set after login
- `employee_id`: Will be auto-set after login

### Option 2: Create Environment
1. **Click the gear icon** (top right)
2. **Select "Manage Environments"**
3. **Click "Add"**
4. **Name**: "Time Tracker - Local"
5. **Add variables**:
   \`\`\`
   base_url: http://localhost:3000
   jwt_token: (leave empty)
   organization_id: (leave empty)
   employee_id: (leave empty)
   \`\`\`

## How to Use the Collection

### Step 1: Set Base URL
1. **Click on the collection name**
2. **Go to "Variables" tab**
3. **Update `base_url`**:
   - Local: `http://localhost:3000`
   - Production: `https://next-mercor-time-tracker.vercel.app/`

### Step 2: Login to Get Token
1. **Open "🔐 Authentication" folder**
2. **Click "Login - Get JWT Token"**
3. **Update the request body** with your credentials:
   \`\`\`json
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   \`\`\`
4. **Click "Send"**
5. **Token will be automatically saved** to collection variables

### Step 3: Test Other Endpoints
Now you can use any other endpoint - the JWT token will be automatically included in the Authorization header.

## Collection Features

### 🔄 Auto Token Management
- Login request automatically saves JWT token
- All other requests use the saved token
- No manual token copying needed

### 📁 Organized Structure
- **🔐 Authentication**: Login and token refresh
- **👥 Employee Management**: CRUD operations for employees
- **📁 Project Management**: Project operations
- **✅ Task Management**: Task operations
- **⏱️ Time Tracking**: Time tracking functionality
- **📸 Screenshots**: Screenshot management

### 🧪 Pre-request Scripts
Some requests include scripts that:
- Validate required variables
- Set dynamic values
- Handle authentication

### ✅ Test Scripts
Login request includes test script that:
- Automatically saves JWT token
- Sets user-related variables
- Logs success messages

## Testing Workflow

### For Organization Users:
1. **Login** with organization credentials
2. **Get Employees** for your organization
3. **Create Projects** and assign tasks
4. **View Time Tracking Summary**

### For Employee Users:
1. **Login** with employee credentials
2. **Get Your Tasks**
3. **Start Time Tracking** on a task
4. **Pause/Resume** as needed
5. **Complete** the task

## Troubleshooting

### Common Issues:

1. **401 Unauthorized**
   - Check if JWT token is set
   - Try logging in again
   - Verify token hasn't expired

2. **404 Not Found**
   - Verify base_url is correct
   - Check if Next.js server is running

3. **400 Bad Request**
   - Check request body format
   - Verify required fields are included

4. **CORS Errors**
   - Ensure Next.js app allows requests from Postman
   - Check CORS configuration

### Debug Tips:

1. **Check Console Tab** in Postman for script logs
2. **View Collection Variables** to verify token is saved
3. **Use Postman Console** (View → Show Postman Console) for detailed logs
4. **Test with simple GET request** first (like getting employees)

## Environment-Specific Collections

You can duplicate the collection for different environments:

1. **Right-click collection**
2. **Select "Duplicate"**
3. **Rename** (e.g., "Time Tracker - Production")
4. **Update base_url** in variables

This allows you to test against both local and production APIs easily!
