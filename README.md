# Picture Frame 🖼️

A modern, web-based digital picture frame application with slideshow controls, image management, and real-time synchronization. Perfect for running on a Raspberry Pi connected to a display, or any device with a web browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19.1-61dafb)
![Node](https://img.shields.io/badge/Node-20+-green)

## ✨ Features

- **🎞️ Slideshow Mode**: Automatically cycle through your photos with adjustable speed
- **🔀 Shuffle Mode**: Randomize the order of your images
- **🖱️ Drag & Drop**: Reorder images with intuitive drag-and-drop interface
- **📱 Progressive Web App**: Install on any device, works offline, supports Web Share Target API
- **🔄 Real-time Sync**: WebSocket-based synchronization across all connected devices
- **👥 Multi-user**: Secure JWT-based authentication with user management
- **🖼️ Smart Image Processing**: Automatic thumbnail generation and EXIF metadata stripping
- **🐳 Docker Ready**: Easy deployment with Docker and Docker Compose
- **🍓 Raspberry Pi Optimized**: Includes setup guide for Raspbian with automatic display scheduling

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- SQLite3 (bundled with Node.js)

### Local Development

1. **Clone the repository**:

```bash
git clone <your-repo-url>
cd picture-frame
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up environment variables**:

Create a `.env` file in the project root:

```env
JWT_SECRET=your-strong-random-secret-key-here
DB_FILE_NAME=local.sqlite
PORT=3000
NODE_ENV=development
```

**Important**: Generate a strong random string for `JWT_SECRET`:

```bash
openssl rand -base64 32
```

4. **Initialize the database**:

```bash
npm run db:push
```

5. **Create your first user**:

```bash
npm run create-user
```

Follow the prompts to create an admin user.

6. **Start the development server**:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

7. **Build the frontend** (in a separate terminal):

```bash
npm run build
```

This builds the optimized production assets including the PWA service worker.

## 🐳 Docker Deployment

For production deployment, Docker is the recommended approach. See [DOCKER.md](DOCKER.md) for detailed instructions.

**Quick Docker Start**:

1. Create a `.env.production` file with your environment variables
2. Run:

```bash
docker-compose up -d
```

3. Create your first user:

```bash
docker-compose exec picture-frame npm run create-user
```

## 📖 Usage

### Managing Images

1. **Upload Images**:
   - Click the upload button or use the Web Share Target API to share images directly to the app
   - Supported formats: JPEG, PNG, WebP, GIF
   - EXIF metadata is automatically stripped for privacy

2. **Reorder Images**:
   - Drag and drop images in the grid to change the slideshow order
   - Changes sync in real-time to all connected devices

3. **Delete Images**:
   - Click the delete icon on any image thumbnail
   - Requires authentication

### Slideshow Controls

- **Play/Pause**: Start or stop the automatic slideshow
- **Previous/Next**: Manually navigate between images
- **Speed Control**: Adjust how long each image is displayed (3-60 seconds)
- **Shuffle Mode**: Toggle random order for the slideshow

### Multi-Device Sync

- Open the app on multiple devices (phones, tablets, computers)
- Control the slideshow from any device
- All devices stay synchronized via WebSocket connection
- Connection status indicator shows when devices are connected

## 🍓 Raspberry Pi Setup

For running the picture frame on a Raspberry Pi with automatic display scheduling, see [raspbian setup.md](raspbian%20setup.md).

The setup includes:

- Auto-start Chromium in kiosk mode on boot
- Scheduled display on/off times (8 AM - 10 PM by default)
- Optimized performance for low-power devices

## 🏗️ Project Structure

```
picture-frame/
├── src/
│   ├── client/              # React frontend
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── Home.tsx         # Image management page
│   │   ├── Slideshow.tsx    # Slideshow display page
│   │   └── Login.tsx        # Authentication page
│   ├── server/              # Express backend
│   │   ├── db/              # Database schema and client
│   │   ├── auth.ts          # JWT authentication
│   │   ├── images.ts        # Image upload and processing
│   │   ├── users.ts         # User management
│   │   ├── settings.ts      # App settings
│   │   └── websocket.ts     # WebSocket server
│   ├── scripts/             # Utility scripts
│   └── sw.ts                # Service worker for PWA
├── public/                  # Static assets
│   └── uploads/             # Uploaded images and thumbnails
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker image definition
└── vite.config.ts           # Vite configuration
```

## 🛠️ Available Scripts

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Start development server with hot reload |
| `npm run build`       | Build optimized production bundle        |
| `npm start`           | Start production server                  |
| `npm run db:push`     | Push database schema changes             |
| `npm run create-user` | Interactive user creation script         |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt-based password encryption
- **EXIF Stripping**: Automatic removal of metadata from uploaded images
- **Environment Variables**: Sensitive configuration via environment variables
- **Docker Secrets**: Support for Docker secrets in production

## 🌐 API Endpoints

### Public Endpoints

- `POST /login` - User authentication

### Protected Endpoints (Requires JWT)

- `POST /api/users/create` - Create new user
- `POST /api/images/upload` - Upload image
- `DELETE /api/images/:id` - Delete image
- `POST /api/images/reorder` - Update image order
- `GET /api/settings/random-order` - Get shuffle setting
- `POST /api/settings/random-order` - Update shuffle setting

### WebSocket

- `ws://localhost:3000/ws` - Real-time image updates and slideshow control

## 🧪 Technology Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **@dnd-kit** - Drag and drop functionality
- **react-spring** - Smooth animations
- **Workbox** - PWA service worker

### Backend

- **Express 5** - Web server framework
- **SQLite** - Lightweight database
- **Drizzle ORM** - Type-safe database queries
- **WebSocket (ws)** - Real-time communication
- **Sharp** - Image processing and thumbnail generation
- **Multer** - File upload handling
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing

### DevOps

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Alpine Linux** - Lightweight container base

## 📝 Configuration

### Environment Variables

| Variable       | Description                | Default        | Required |
| -------------- | -------------------------- | -------------- | -------- |
| `JWT_SECRET`   | Secret key for JWT signing | -              | Yes      |
| `DB_FILE_NAME` | SQLite database file path  | `local.sqlite` | No       |
| `PORT`         | Server port                | `3000`         | No       |
| `NODE_ENV`     | Environment mode           | `development`  | No       |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Optimized for low-power devices like Raspberry Pi
- Designed for ease of use and beautiful UI/UX

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Enjoy your digital picture frame! 📸**
