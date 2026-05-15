# Text2Graph - AI-Powered Knowledge Graph Extraction & Visualization

A sophisticated full-stack application that transforms text into interactive knowledge graphs using advanced AI and modern web technologies.

## ✨ Features

### 🧠 **AI-Powered Text Processing**
- **Smart Text Enhancement**: Optional AI-powered text enhancement for better graph extraction
- **Entity Recognition**: Advanced entity extraction using OpenAI GPT models
- **Relationship Mapping**: Intelligent relationship detection and classification
- **Orphaned Entity Detection**: Automatic detection of disconnected entities with suggestions

### 🎨 **Interactive Graph Visualization**
- **D3.js Force-Directed Graphs**: Beautiful, physics-based graph layouts
- **Drag & Drop Nodes**: Interactive node manipulation
- **Pan & Zoom**: Full graph navigation with zoom controls
- **Responsive Design**: Optimized for desktop and mobile devices
- **Node Highlighting**: Click to highlight connected entities and relationships
- **Real-time Updates**: Dynamic graph rendering with smooth animations

### 🗄️ **Graph Management**
- **Persistent Storage**: MongoDB-based graph storage
- **Graph Metadata**: Automatic tagging and versioning
- **Bulk Operations**: View, delete, and manage multiple graphs
- **Search & Filter**: Find graphs by name or tags
- **Graph Statistics**: Node and edge counts with creation timestamps

### 🎯 **User Experience**
- **Glassmorphic UI**: Modern, elegant interface design
- **Progressive Web App**: Mobile-friendly responsive design
- **Real-time Feedback**: Loading states and progress indicators
- **Error Recovery**: Smart error handling with automatic retry mechanisms
- **Keyboard Shortcuts**: Power user features for graph navigation

## 🏗️ Architecture

### **Frontend Stack**
- **React 18** with TypeScript for type safety
- **Vite** for lightning-fast development and building
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for beautiful, accessible components
- **React Query** for efficient data fetching and caching
- **React Router DOM** for client-side routing
- **D3.js v4** for advanced graph visualizations
- **Lucide React** for consistent iconography

### **Backend Stack**
- **FastAPI** for high-performance API development
- **Python 3.8+** with async/await support
- **LangChain** for LLM integration and graph processing
- **OpenAI GPT** models for intelligent text analysis
- **MongoDB** for flexible document storage
- **Pydantic** for data validation and serialization
- **Uvicorn** for ASGI server with optimized timeouts

### **Data Flow**
```
Text Input → AI Enhancement → Entity Extraction → Relationship Mapping → 
Graph Normalization → MongoDB Storage → D3.js Visualization
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm/yarn
- **Python 3.8+** with pip
- **MongoDB** (local installation or cloud service)
- **OpenAI API Key** (for AI processing)

### 1. Clone & Setup

```bash
git clone https://github.com/da-ros/knowledge-graph-studio.git
cd knowledge-graph-studio
```

### 2. Backend Setup

```bash
cd Backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp env.example .env
# Edit .env with your credentials
```

**Backend Environment Variables (.env):**
```env
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your API URL
```

**Frontend Environment Variables (.env):**
```env
VITE_API_URL=http://localhost:8000
```

### 4. Database Setup

Ensure MongoDB is running:
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in backend .env
```

### 5. Launch Application

**Terminal 1 - Backend Server:**
```bash
cd Backend
python start_server.py
```

**Terminal 2 - Frontend Development:**
```bash
cd Frontend
npm run dev
```

**Access Points:**
- 🌐 **Frontend**: http://localhost:8080
- 🔧 **Backend API**: http://localhost:8000
- 📚 **API Documentation**: http://localhost:8000/docs
- ❤️ **Health Check**: http://localhost:8000/api/health

## 📖 Usage Guide

### Creating Knowledge Graphs

1. **Navigate to Home**: Start at the main page
2. **Input Text**: 
   - Type or paste your text (up to 5,000 characters)
   - Use preset examples for quick testing
   - Toggle "Enhance text" for AI-powered text improvement
3. **Extract Graph**: Click "Extract & Save" and wait for processing
4. **View Results**: Automatically redirected to graph visualization

### Managing Graphs

1. **View All Graphs**: Navigate to the Graphs page
2. **Search & Filter**: Use the search bar to find specific graphs
3. **Open Graph**: Click "Open" to view visualization
4. **Delete Graph**: Click "Delete" to remove (with confirmation)
5. **Graph Details**: View node/edge counts and creation dates

## 🔌 API Reference

### Core Endpoints

#### `POST /api/process-text`
Process text and extract knowledge graph.

**Request:**
```json
{
  "text": "Your text content here",
  "enhance": true
}
```

**Response:**
```json
{
  "metadata": {
    "id": "uuid",
    "name": "Graph abc12345",
    "version": "v1.0",
    "tags": ["auto-generated"],
    "nodes": 10,
    "edges": 15,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  },
  "data": {
    "nodes": [...],
    "links": [...]
  }
}
```

#### `GET /api/graphs`
Retrieve all saved graphs.

#### `GET /api/graphs/{id}`
Get specific graph with full visualization data.

#### `DELETE /api/graphs/{id}`
Delete a graph and all associated data.

#### `GET /api/health`
Check API and database connectivity status.

## ⚙️ Configuration

### Backend Configuration

**Server Settings:**
- **Timeout**: 3-minute request timeout for LLM processing
- **Keep-Alive**: 5-minute connection timeout
- **CORS**: Configured for localhost:8080
- **Logging**: Detailed progress logging with emojis

**AI Settings:**
- **Model**: GPT-5-nano (configurable)
- **Temperature**: Optimized for entity extraction
- **Enhancement**: Optional text preprocessing for better results

### Frontend Configuration

**Development:**
- **Hot Reload**: Instant updates during development
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Tailwind**: Utility-first CSS framework

**Production:**
- **Vite Build**: Optimized bundle generation
- **Code Splitting**: Automatic route-based splitting
- **Asset Optimization**: Compressed images and fonts

## 🐛 Troubleshooting

### Common Issues

#### **Network Timeout Errors**
- **Symptom**: "NetworkError when attempting to fetch resource"
- **Cause**: LLM processing takes 30-60+ seconds
- **Solution**: The app now includes automatic recovery - check the Graphs page for newly created graphs

#### **MongoDB Connection Issues**
- **Symptom**: "Database disconnected" in health check
- **Solution**: 
  ```bash
  # Start MongoDB locally
  mongod
  
  # Or update MONGODB_URI for cloud service
  ```

#### **OpenAI API Errors**
- **Symptom**: "API Error: 401" or "quota exceeded"
- **Solution**: 
  - Verify API key in backend `.env`
  - Check OpenAI account billing and quotas
  - Ensure sufficient credits for API usage

#### **Graph Visualization Issues**
- **Symptom**: Blank graph or D3.js errors
- **Solution**:
  - Check browser console for JavaScript errors
  - Ensure D3.js script loads correctly
  - Verify graph data structure in API response

#### **Orphaned Entity Warnings**
- **Symptom**: "⚠️ Orphaned entities found" in logs
- **Explanation**: Entities without relationships (normal for some texts)
- **Action**: Review the debug output to understand entity connections

### Performance Optimization

#### **For Large Texts**
- Break down very long texts into smaller chunks
- Use text enhancement for better entity recognition
- Consider processing time (30-60 seconds for complex texts)

#### **For Mobile Devices**
- The app is optimized for mobile with responsive design
- Touch gestures work for graph navigation
- Smaller node sizes and fonts on mobile screens

## 🔧 Development

### Backend Development

```bash
cd Backend

# Run with hot reload
python start_server.py

# Run tests
python test_api.py

# Check API documentation
open http://localhost:8000/docs
```

**Key Files:**
- `main.py`: FastAPI application and endpoints
- `knowledge_graph_extractor.py`: AI processing logic
- `start_server.py`: Server configuration
- `requirements.txt`: Python dependencies

### Frontend Development

```bash
cd Frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

**Key Files:**
- `src/pages/Ingest.tsx`: Text input and processing
- `src/pages/Graphs.tsx`: Graph management interface
- `src/components/GraphVisualization.tsx`: D3.js graph component
- `src/lib/api.ts`: API client and data types

### Code Structure

```
knowledge-graph-studio/
├── Backend/
│   ├── main.py                 # FastAPI application
│   ├── knowledge_graph_extractor.py  # AI processing
│   ├── start_server.py         # Server startup
│   ├── requirements.txt        # Python dependencies
│   └── env.example            # Environment template
├── Frontend/
│   ├── src/
│   │   ├── pages/             # Main application pages
│   │   ├── components/        # Reusable UI components
│   │   ├── lib/              # Utilities and API client
│   │   └── hooks/            # Custom React hooks
│   ├── package.json          # Node.js dependencies
│   └── env.example           # Environment template
└── README.md                 # This file
```

## 🚀 Deployment

### Production Considerations

#### **Backend Deployment**
- Use production ASGI server (Gunicorn + Uvicorn)
- Set up proper environment variables
- Configure MongoDB connection pooling
- Implement rate limiting for API endpoints
- Set up monitoring and logging

#### **Frontend Deployment**
- Build optimized production bundle
- Configure CDN for static assets
- Set up proper CORS policies
- Implement error tracking (Sentry)
- Configure caching strategies

#### **Database**
- Use MongoDB Atlas for production
- Set up proper indexing for performance
- Configure backup and recovery
- Monitor database performance

## 📄 License

MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Ensure mobile responsiveness
- Test with various text inputs
- Verify graph visualization accuracy
