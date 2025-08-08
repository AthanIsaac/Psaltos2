# Contact Form Setup Instructions

## Overview
The contact page has been successfully created and integrated into the Psaltos application. It includes:
- A feedback form with name, email, subject, and message fields
- File upload functionality (supports up to 10MB files)
- Automatic email sending to psaltoshymns@gmail.com
- Responsive design matching the app's theme

## Setup Instructions

### 1. Backend Server
The backend server is running on port 5002 and includes the contact form endpoint at `/api/contact`.

### 2. Email Configuration
To enable email functionality, you need to set up Gmail App Password:

1. **Create a `.env` file in the `backend/` directory** (copy from `.env.example`):
   ```
   EMAIL_USER=psaltoshymns@gmail.com
   EMAIL_PASS=your-gmail-app-password-here
   PORT=5002
   ```

2. **Set up Gmail App Password**:
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification
   - Scroll down to "App passwords"
   - Generate a new app password for "Mail"
   - Copy the 16-character password and paste it in the `.env` file

### 3. Running the Application

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend** (in a separate terminal):
   ```bash
   npm start
   ```

3. **Access the contact page**:
   - Navigate to `http://localhost:3003/contact`
   - Or click the "Contact" link in the navigation bar

### 4. Features

- **Form Validation**: All required fields are validated
- **File Upload**: Supports various file types (PDF, DOC, images, audio, video)
- **File Size Limit**: Maximum 10MB per file
- **Email Notifications**: Automatic email sending to psaltoshymns@gmail.com
- **Success/Error Messages**: User feedback for form submission status
- **Responsive Design**: Works on all device sizes

### 5. Supported File Types
- Documents: PDF, DOC, DOCX, TXT
- Images: JPG, JPEG, PNG, GIF
- Audio: MP3, WAV
- Video: MP4

### 6. Security Notes
- Never commit the `.env` file to version control
- Use strong app passwords
- The backend validates email format and file sizes
- CORS is configured for localhost development

## Testing
Once the email configuration is complete, you can test the contact form by:
1. Filling out all required fields
2. Optionally attaching a file
3. Submitting the form
4. Checking the psaltoshymns@gmail.com inbox for the email

The form will show success/error messages based on the submission status.