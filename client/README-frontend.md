# FunaGig Frontend Documentation

**Version:** 2.5 | **Last Updated:** 2025-01-27 | **Status:** ✅ Production-Ready

## Overview

The FunaGig frontend is built with vanilla HTML, CSS, and JavaScript, designed for easy deployment. It features a responsive, modern UI with role-based access for students and businesses. All mock data has been replaced with real database queries.

---

## 📁 File Structure

```
funagig2.5/
├── styles.css                 # Global styles (responsive, modern UI)
├── app.js                     # Core utilities (Auth, API, WebSocket, etc.)
├── messaging.js               # Messaging functionality
├── dashboard.js               # Dashboard-specific features
│
├── index.html                 # Landing page with contact form
├── auth.html                  # Login page
├── signup.html                # Signup page (unified with role selector)
├── forgot-password.html       # Password reset request
├── reset-password.html        # Password reset form
│
├── student-dashboard.html     # Student dashboard (real data)
├── student-profile.html       # Student profile management
├── student-gigs.html          # Browse gigs, apply, track applications, interest
├── student-messaging.html     # Student messaging interface
│
├── business-dashboard.html    # Business dashboard (real data)
├── business-profile.html     # Business profile management
├── business-post-gig.html    # Post new gig (with draft support)
├── business-posted-gigs.html # Manage posted gigs (with drafts)
├── business-applicants.html   # Manage applicants
├── business-messaging.html   # Business messaging interface
│
└── home-gigs.html             # Public gig browsing
```

**Note:** All files are in the root directory (flat structure) for easier deployment.

---

## ✨ Key Features

### ✅ Completed Features

#### Responsive Design
- ✅ Mobile-first approach
- ✅ Modern, clean UI design
- ✅ Consistent color scheme and typography
- ✅ Grid-based layouts with CSS Grid and Flexbox
- ✅ Works on all screen sizes

#### Role-Based Access
- ✅ **Students**: Browse gigs, apply, track applications, manage profile, messaging
- ✅ **Businesses**: Post gigs, manage applications, hire students, analytics, messaging
- ✅ **Visitors**: Browse public gigs, learn about platform

#### Real-Time Features
- ✅ **WebSocket Integration** - Real-time messaging with automatic reconnection
- ✅ **Typing Indicators** - Shows when users are typing
- ✅ **Live Notifications** - Real-time notification updates
- ✅ **Online/Offline Status** - User presence tracking

#### Data Management
- ✅ **Real Data** - All mock data replaced with database queries
- ✅ **Pagination** - Efficient data loading for large datasets
- ✅ **Search & Filtering** - Real-time search across gigs, conversations, messages
- ✅ **Sorting** - Sort by date, budget, status, etc.

#### User Experience
- ✅ **Form Validation** - Real-time client-side and server-side validation
- ✅ **Error Handling** - User-friendly error messages with retry options
- ✅ **Loading States** - Visual feedback during operations
- ✅ **Toast Notifications** - Success/error/info notifications
- ✅ **Empty States** - Helpful messages when no data available

---

## 🎨 CSS Architecture

### Global Styles (`styles.css`)

**CSS Custom Properties (Theming):**
```css
:root {
    --primary: #1296EA;
    --success: #28a745;
    --warning: #ffc107;
    --error: #dc3545;
    --text: #333;
    --text-secondary: #666;
    --border: #e0e0e0;
    --bg: #f5f5f5;
    --panel: #ffffff;
}
```

**Key CSS Classes:**
```css
/* Layout */
.container          # Main content wrapper
.app-layout        # Dashboard layout with sidebar
.section           # Content sections
.grid-2, .grid-3, .grid-4  # Grid layouts

/* Components */
.btn               # Primary buttons
.btn.secondary     # Secondary buttons
.btn.ghost         # Ghost buttons
.card              # Content cards
.modal             # Modal dialogs
.pill              # Status badges

/* Utilities */
.mt-20, .mb-10     # Spacing utilities
.flex, .items-center  # Flexbox utilities
.text-right        # Text alignment
.subtle            # Muted text
```

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 💻 JavaScript Architecture

### Core Module (`app.js`)

#### API Integration
- **Auto-Detection** - Automatically detects API path from current location
- **Error Handling** - Retry logic with exponential backoff
- **CSRF Protection** - Automatic token management
- **Rate Limiting** - Client-side rate limit handling
- **Pagination** - Client-side pagination utility

**Example:**
```javascript
// Auto-detects API path
const response = await apiFetch('/gigs', {
    method: 'GET',
    // Optional: silent, retry, skipCSRF
});
```

#### Authentication (`Auth` utility)
- **Session Management** - LocalStorage-based session storage
- **Role-Based Access** - `requireUserType('student' | 'business')`
- **Session Verification** - `verifySession()` checks with backend
- **Auto-Logout** - Automatic logout on session expiration

**Example:**
```javascript
// Check if user is logged in and is a student
if (!Auth.requireUserType('student')) {
    return; // Redirects if not authenticated or wrong role
}

// Get current user
const user = Auth.getUser();

// Verify session is still valid
const validUser = await Auth.verifySession();
```

#### WebSocket Client (`WebSocketClient` utility)
- **Auto-Connection** - Connects on page load
- **Session Authentication** - Validates PHP session with backend
- **Reconnection** - Automatic reconnection on disconnect
- **Event Handling** - Listens for messages, notifications, typing indicators
- **Connection Management** - Tracks connection state

**Example:**
```javascript
// Check if connected
if (WebSocketClient.isConnected()) {
    // Send message via WebSocket
    WebSocketClient.sendMessageEvent(conversationId, messageId, userId, content);
}

// Listen for events
WebSocketClient.on('message_received', (data) => {
    // Handle new message
});
```

#### UI Utilities

**Toast Notifications:**
```javascript
Toast.success('Operation completed!');
Toast.error('Something went wrong');
Toast.info('Information message');
Toast.warning('Warning message');
```

**Loading States:**
```javascript
Loading.show(element, 'Loading...');
Loading.hide(element);
Loading.setButtonLoading(button, true);
```

**Empty States:**
```javascript
EmptyState.show(container, {
    icon: '📭',
    title: 'No messages',
    message: 'Start a conversation to see messages here'
});
```

**Modals:**
```javascript
// Application modal
const data = await ApplicationModal.show(gigTitle, gigId);

// File upload modal
const file = await FileUpload.upload(file, 'profile', {
    onProgress: (loaded, total) => {
        const percent = (loaded / total) * 100;
    }
});
```

#### Form Validation
- **Real-Time Validation** - Validates as user types
- **Email Validation** - Format checking
- **Phone Validation** - Pattern matching
- **URL Validation** - Website URL format
- **Required Fields** - Highlights missing required fields

#### Other Utilities
- **Debouncing** - Search input debouncing
- **URL State Management** - Sync UI state with URL parameters
- **Error Recovery** - User-friendly error handling with retry
- **Keyboard Shortcuts** - Global shortcuts (Ctrl+K for search)
- **Storage** - LocalStorage utilities

---

## 📄 Page-Specific Features

### Landing Page (`index.html`)
- ✅ Hero section with call-to-action
- ✅ Feature highlights
- ✅ About section
- ✅ How it works
- ✅ **Contact form** - Connected to `/contact` API endpoint
- ✅ FAQ section

### Authentication Pages

#### `auth.html` - Login
- ✅ Unified login for students and businesses
- ✅ Form validation
- ✅ Error handling
- ✅ Remember me functionality
- ✅ Password reset link

#### `signup.html` - Registration
- ✅ Role selection (student/business)
- ✅ Dynamic form fields based on role
- ✅ Real-time validation
- ✅ Password strength indicator

#### `forgot-password.html` - Password Reset Request
- ✅ Email input validation
- ✅ Connected to `/auth/forgot-password` API
- ✅ Success/error feedback

#### `reset-password.html` - Password Reset
- ✅ Token validation
- ✅ Password confirmation
- ✅ Connected to `/auth/reset-password` API

---

### Student Pages

#### `student-dashboard.html` - Dashboard
- ✅ **Real Statistics:**
  - Active Tasks (accepted applications)
  - Pending Tasks (pending applications)
  - Completed Tasks (completed applications)
  - Average Rating (from reviews)
  - Total Earned (from completed gigs)
  - Total Tasks (all applications)
  - Days Active (since account creation)
- ✅ **Recent Applications** - Real data from database
- ✅ **Recent Activity** - Real activity tracking
- ✅ **Notifications** - Real-time notifications
- ✅ Quick actions

#### `student-profile.html` - Profile Management
- ✅ **Editable Fields:**
  - Name, Email, Phone
  - University, Major
  - Bio/Description
  - Skills (comma-separated)
  - Location
- ✅ Profile image upload
- ✅ Portfolio management
- ✅ Reviews display
- ✅ Real-time form validation

#### `student-gigs.html` - Gig Browsing
- ✅ **Browse Gigs Tab:**
  - Search and filter gigs
  - Sort by date, budget, etc.
  - Pagination
  - Apply to gigs
  - Express interest
  - Save gigs
- ✅ **My Applications Tab:**
  - Track application status
  - View application details
  - Withdraw applications
- ✅ **Interested Tab:**
  - View interested gigs
  - Remove interest
- ✅ **Saved Tab:**
  - View saved gigs
  - Unsave gigs

#### `student-messaging.html` - Messaging
- ✅ **Conversation List:**
  - Search conversations
  - Unread message indicators
  - Last message preview
- ✅ **Chat Interface:**
  - Real-time messaging
  - Typing indicators
  - Message search within conversation
  - File attachments
  - Message timestamps
- ✅ **Chat Header:**
  - View Gig button (opens gig details modal)
  - Report button (submit report via contact API)
- ✅ **Gig Details Modal:**
  - Displays full gig information
  - No action buttons (read-only)

---

### Business Pages

#### `business-dashboard.html` - Dashboard
- ✅ **Real Statistics:**
  - Active Gigs (active gigs count)
  - Total Applicants (all applications)
  - Hired Students (accepted applications)
  - Average Rating (from reviews)
- ✅ **Recent Activity:**
  - New applications
  - Gig posts
  - Student hires
  - Sorted by date (most recent first)
- ✅ **Recent Applications** - Real data
- ✅ **Top Performing Gigs** - Real data
- ✅ **Notifications** - Real-time notifications

#### `business-profile.html` - Profile Management
- ✅ **Editable Fields:**
  - Company Name
  - Industry
  - Location
  - Website (URL validation)
  - Phone (format validation)
  - Description/Bio
  - Skills (comma-separated)
- ✅ Profile image upload
- ✅ **Real Statistics:**
  - Active Gigs
  - Total Applicants
  - Hired Students
  - Average Rating
- ✅ Reviews display
- ✅ Real-time form validation

#### `business-post-gig.html` - Post New Gig
- ✅ **Full Form:**
  - Title (required, max 255 chars)
  - Description (required)
  - Type (one-time, ongoing, contract)
  - Skills (comma-separated)
  - Budget (required, positive number)
  - Deadline (required, future date)
  - Location
- ✅ **Draft Support:**
  - "Save as Draft" button
  - Saves with `status='draft'`
  - No redirect after saving
- ✅ **Publish:**
  - "Post Gig" button
  - Saves with `status='active'`
  - Redirects to "My Gigs"
- ✅ Real-time form validation

#### `business-posted-gigs.html` - Manage Gigs
- ✅ **Gig List:**
  - All user's gigs (active, paused, completed, cancelled, **drafts**)
  - Search and filter
  - Status filter (includes "Draft")
  - Sort options
- ✅ **Draft Management:**
  - View drafts
  - Edit drafts
  - **Publish drafts** - Validates required fields and deadline
- ✅ **Gig Actions:**
  - Edit gig (supports partial updates)
  - Delete gig
  - View applicants
  - Pause/Resume gig
- ✅ **Pagination** - For large lists

#### `business-applicants.html` - Manage Applicants
- ✅ **Applicant List:**
  - Filter by gig
  - Search applicants
  - Status filter
  - Sort options
- ✅ **Applicant Actions:**
  - Accept applicant
  - Reject applicant
  - View student profile
  - View application details
- ✅ **Student Profile Modal:**
  - Displays student profile
  - Shows skills, education, portfolio
  - Shows ratings and reviews

#### `business-messaging.html` - Messaging
- ✅ **Conversation List:**
  - Search conversations
  - Unread message indicators
  - Last message preview
- ✅ **Chat Interface:**
  - Real-time messaging
  - Typing indicators
  - Message search within conversation
  - File attachments
  - Message timestamps
- ✅ **Chat Header:**
  - **View Profile button** - Opens student profile modal
  - Search messages
- ✅ **Student Profile Modal:**
  - Displays full student profile
  - Shows university, major, skills, bio
  - Shows ratings and completed gigs
  - Shows member since date

---

### Public Pages

#### `home-gigs.html` - Public Gig Browsing
- ✅ Browse active gigs (public access)
- ✅ Search and filter
- ✅ Gig details view
- ✅ Apply to gigs (requires login)

---

## 🔌 API Integration

### Endpoints Used

```javascript
// Authentication
POST /api.php/login
POST /api.php/signup
POST /api.php/logout
POST /api.php/auth/forgot-password
POST /api.php/auth/reset-password
GET /api.php/auth/session-status

// Dashboard
GET /api.php/dashboard  // Returns stats and recent activity

// Gigs
GET /api.php/gigs                    // List active gigs (paginated)
GET /api.php/gigs/{id}               // Get single gig
GET /api.php/gigs/active             // Get user's gigs (supports include_drafts=true)
POST /api.php/gigs                   // Create gig (supports status='draft')
POST /api.php/gigs/update            // Update gig (supports partial updates)
DELETE /api.php/gigs/delete          // Delete gig
POST /api.php/gigs/{id}/interest     // Express interest
DELETE /api.php/gigs/{id}/interest  // Remove interest
GET /api.php/interested-gigs         // Get interested gigs

// Applications
GET /api.php/applications            // Get applications
POST /api.php/applications           // Apply to gig
PUT /api.php/applications            // Update application status
DELETE /api.php/applications         // Withdraw application

// Messaging
GET /api.php/conversations           // Get conversations (paginated)
POST /api.php/conversations          // Start conversation
GET /api.php/messages/{id}           // Get messages
POST /api.php/messages               // Send message
POST /api.php/typing                 // Set typing indicator

// Notifications
GET /api.php/notifications           // Get notifications (paginated)
PUT /api.php/notifications           // Mark as read

// Profile
GET /api.php/profile                 // Get current user profile
POST /api.php/profile                // Update profile
GET /api.php/users/{id}              // Get public user profile

// File Uploads
POST /api.php/upload                 // Upload files

// Reviews
POST /api.php/reviews                // Submit review
GET /api.php/reviews/{user_id}       // Get user reviews

// Contact
POST /api.php/contact                // Submit contact form

// Saved Gigs
GET /api.php/saved-gigs              // Get saved gigs
POST /api.php/saved-gigs             // Save gig
DELETE /api.php/saved-gigs           // Unsave gig
```

### Error Handling

**Global Error Handling:**
- Network errors with retry logic
- User-friendly error messages
- Loading states during operations
- Toast notifications for feedback

**Error Response Format:**
```javascript
{
    "success": false,
    "error": "Error message",
    "error_code": "VALIDATION_ERROR",  // Optional
    "details": {                        // Optional
        "field": "email",
        "reason": "Invalid format"
    }
}
```

---

## 🎯 Recent Updates (v2.5)

### Major Improvements
- ✅ **Replaced All Mock Data** - All dashboards and pages now use real database data
- ✅ **Draft Functionality** - Full draft support for gigs
- ✅ **Interest Tracking** - Students can express interest in gigs
- ✅ **Profile Modals** - Student profile viewing from messaging
- ✅ **Gig Details Modal** - View gig details from messaging
- ✅ **Real-Time Validation** - Client-side form validation
- ✅ **Enhanced Security** - WebSocket security improvements
- ✅ **Error Handling** - Standardized error responses
- ✅ **Pagination** - Efficient data loading
- ✅ **Search Functionality** - Message search within conversations

### Bug Fixes
- ✅ Fixed path issues after file reorganization
- ✅ Fixed script loading order
- ✅ Fixed draft publishing validation
- ✅ Fixed interested gigs display
- ✅ Fixed WebSocket notification spam
- ✅ Fixed profile editing functionality
- ✅ Fixed dashboard statistics display

---

## 🌐 Browser Support

- ✅ **Modern Browsers:**
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest)
  - Edge (latest)
- ✅ **Required Features:**
  - ES6+ JavaScript support
  - CSS Grid and Flexbox
  - LocalStorage API
  - Fetch API
  - WebSocket API

---

## 🚀 Performance Optimizations

- ✅ **Efficient DOM Manipulation** - Minimal re-renders
- ✅ **Debounced Search** - Reduces API calls
- ✅ **Pagination** - Loads data in chunks
- ✅ **Lazy Loading** - Images and content loaded on demand
- ✅ **Cached API Responses** - Session data caching
- ✅ **Optimized Queries** - Efficient database queries

---

## 📱 Responsive Design

### Mobile (< 768px)
- Single column layouts
- Collapsible sidebar
- Touch-friendly buttons
- Optimized forms
- Stacked navigation

### Tablet (768px - 1024px)
- Two-column layouts where appropriate
- Sidebar remains visible
- Optimized grid layouts

### Desktop (> 1024px)
- Full multi-column layouts
- Sidebar always visible
- Maximum content width
- Hover effects

---

## 🛠️ Development Guidelines

### Adding New Pages

1. **Create HTML file** in root directory
2. **Include styles and scripts:**
   ```html
   <link rel="stylesheet" href="styles.css" />
   <script src="app.js"></script>
   ```
3. **Add authentication check:**
   ```javascript
   if (!Auth.requireUserType('student')) {
       return;
   }
   ```
4. **Load data from API:**
   ```javascript
   const response = await apiFetch('/endpoint');
   ```
5. **Update navigation links** if needed
6. **Test responsive design**

### Styling Guidelines

- Use CSS custom properties for colors
- Follow utility-first approach
- Mobile-first responsive design
- Consistent spacing using utility classes
- Use semantic HTML

### JavaScript Guidelines

- Use modern ES6+ features
- Modular approach with separate files
- Error handling for all API calls
- Consistent naming conventions
- Comment complex logic

### API Integration Guidelines

- Always use `apiFetch()` utility
- Handle errors gracefully
- Show loading states
- Provide user feedback
- Use pagination for large datasets

---

## 📚 Additional Resources

- **[README.md](README.md)** - Main project README
- **[README-backend.md](README-backend.md)** - Backend API documentation
- **[CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md)** - Configuration guide

---

**Version:** 2.5  
**Last Updated:** 2025-01-27  
**Status:** ✅ Production-Ready
