# 🛡️ ShadowGuard Shield v3.0
### AI-Powered Cyberbullying Detection System

A production-ready, full-stack web application featuring a futuristic cybersecurity UI, hybrid AI detection engine, and complete user management.

---

## 📁 Project Structure

```
shadowguard-shield/
├── frontend/           # React.js + Tailwind CSS + Framer Motion
│   ├── src/
│   │   ├── pages/      # AuthPage, Dashboard, AnalyzePage, HistoryPage, WordManagerPage
│   │   ├── components/ # Layout (sidebar)
│   │   └── context/    # AuthContext (JWT management)
│   └── package.json
├── backend/            # Python Flask REST API
│   ├── app.py          # Main Flask app
│   └── requirements.txt
├── ai-service/         # FastAPI AI Detection Engine
│   ├── app.py          # TF-IDF + Logistic Regression + Custom word engine
│   ├── abusive_words.json
│   └── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- pip

---

### 1️⃣ Start the AI Service

```bash
cd ai-service

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate      # macOS/Linux
# venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

AI service will be available at: **http://localhost:8000**

---

### 2️⃣ Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # macOS/Linux
# venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env if needed

# Start Flask server
python app.py
```

Backend will be available at: **http://localhost:5000**

> The SQLite database (`shadowguard.db`) is created automatically on first run.

---

### 3️⃣ Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Start React development server
npm start
```

Frontend will open at: **http://localhost:3000**

---

## 🔐 First Time Setup

1. Open http://localhost:3000
2. Click **Register** and create an account
3. You'll be redirected to the Dashboard
4. Start analyzing text from the **Analyze Text** page

---

## 🧠 AI Detection Engine

### How it works

The hybrid detection system combines two approaches:

| Method | Description | Weight |
|--------|-------------|--------|
| **ML Model** | TF-IDF + Logistic Regression trained on labeled cyberbullying examples | 60% |
| **Custom Words** | Pattern matching against user-managed word list | 80% |
| **Hybrid** | Combined scoring, high-severity words override to HIGH | Default |

### Detection Modes

- **Hybrid** — Best accuracy, uses both ML + custom words (recommended)
- **AI Only** — Uses only the ML model, ignores word list
- **Custom Only** — Uses only the custom word filter

### Output Format

```json
{
  "risk_score": 0.85,
  "risk_percentage": 85,
  "category": "HIGH",
  "is_cyberbullying": true,
  "model_score": 0.72,
  "custom_abuse_score": 0.65,
  "detected_words": ["loser", "ugly"],
  "source": "both",
  "confidence": "HIGH",
  "explanation": "AI reasoning for the detection...",
  "suggestion": "Rewrite suggestion for safe communication"
}
```

### Risk Categories

| Score | Category | Color |
|-------|----------|-------|
| 0–19% | SAFE | 🟢 Green |
| 20–44% | LOW | 🔵 Cyan |
| 45–74% | MEDIUM | 🟡 Yellow |
| 75–100% | HIGH | 🔴 Red |

### Language Support

- ✅ English
- ✅ Hindi (Devanagari romanized)
- ✅ Hinglish (mixed Hindi-English)
- ✅ Leet speak normalization (`@` → `a`, `3` → `e`, etc.)
- ✅ Common abbreviations (`kys`, `stfu`, `wtf`)

---

## 🌐 API Endpoints

### Backend (Flask — Port 5000)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Get profile |
| POST | `/api/analyze` | ✅ | Analyze text |
| GET | `/api/analyses` | ✅ | Get history |
| DELETE | `/api/analyses/:id` | ✅ | Delete analysis |
| GET | `/api/dashboard/stats` | ✅ | Dashboard data |
| GET | `/api/words` | ✅ | Get custom words |
| POST | `/api/words` | ✅ | Add custom word |
| DELETE | `/api/words/:id` | ✅ | Remove custom word |

### AI Service (FastAPI — Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Run AI detection |
| POST | `/add-word` | Add abusive word |
| DELETE | `/remove-word/:word` | Remove word |
| GET | `/words` | List words |
| GET | `/health` | Health check |

---

## 🎨 UI Features

- **Dark Cybersecurity Theme** — Deep navy/black with purple/blue neon accents
- **Glassmorphism Cards** — Frosted glass panels with gradient borders
- **Framer Motion Animations** — Smooth page transitions, staggered lists, animated bars
- **Animated Risk Gauge** — Live progress bar with glow effects
- **Real-time Charts** — Area chart (7-day trend) + Pie chart (risk distribution)
- **PDF/CSV Export** — Export history and individual reports
- **Toast Notifications** — Non-intrusive success/error feedback
- **Responsive** — Works on desktop and tablet

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
JWT_SECRET=your_strong_random_secret_here
AI_SERVICE_URL=http://localhost:8000
FLASK_DEBUG=false
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 🚀 Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
# Serve the build/ folder with nginx or any static host
```

### Run Backend with Gunicorn

```bash
cd backend
pip install gunicorn
gunicorn app:app --workers 4 --bind 0.0.0.0:5000
```

### Run AI Service with Uvicorn

```bash
cd ai-service
uvicorn app:app --workers 2 --host 0.0.0.0 --port 8000
```

---

## 🔒 Security Notes

- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt (12 salt rounds)
- Rate limiting applied to all `/api/` routes
- CORS configured for frontend origin
- In production: change `JWT_SECRET` to a strong random value

---

## 📦 Dependencies

### Frontend
- React 18, React Router v6
- Framer Motion (animations)
- Recharts (charts)
- Axios (HTTP client)
- React Hot Toast (notifications)
- jsPDF + jspdf-autotable (PDF export)
- Tailwind CSS

### Backend
- Flask + Flask-CORS + Flask-JWT-Extended
- bcrypt, SQLite3

### AI Service
- FastAPI + Uvicorn
- scikit-learn (TF-IDF + LogisticRegression)
- NumPy

---

## 🧑‍💻 Built With

ShadowGuard Shield v3.0 — upgraded with modern full-stack architecture, improved AI detection, and production-grade UI/UX.
