"""
ShadowGuard Shield - Flask Backend
Handles: Auth, Analysis, History, Word Management
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import sqlite3
import bcrypt
import uuid
import json
import os
import logging
import requests
from datetime import datetime, timedelta
from functools import wraps

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# ── Config ──────────────────────────────────────────────────────────────────
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", "shadowguard_super_secret_key_2024")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "https://shadowguard-ai-vdx6.onrender.com")
DB_PATH = os.path.join(os.path.dirname(__file__), "shadowguard.db")

jwt = JWTManager(app)

# ── Database Setup ───────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TEXT NOT NULL,
            last_login TEXT
        );

        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            text TEXT NOT NULL,
            platform TEXT DEFAULT 'unknown',
            reported_user TEXT,
            risk_score REAL,
            category TEXT,
            is_cyberbullying INTEGER,
            model_score REAL,
            custom_abuse_score REAL,
            detected_words TEXT,
            source TEXT,
            confidence TEXT,
            explanation TEXT,
            suggestion TEXT,
            analyzed_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS custom_words (
            id TEXT PRIMARY KEY,
            word TEXT UNIQUE NOT NULL,
            severity TEXT DEFAULT 'normal',
            added_by TEXT,
            added_at TEXT NOT NULL
        );
    """)

    conn.commit()
    conn.close()

# ── Helpers ──────────────────────────────────────────────────────────────────

def row_to_dict(row):
    return dict(row) if row else None

# ── Auth Routes ──────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "user")

    if not name or not email or not password:
        return jsonify(success=False, message="Name, email, and password are required."), 400

    if len(password) < 6:
        return jsonify(success=False, message="Password must be at least 6 characters."), 400

    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify(success=False, message="Email already registered."), 409

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        conn.execute(
            "INSERT INTO users (id, name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, name, email, hashed, role, now)
        )
        conn.commit()

        token = create_access_token(identity=json.dumps({"id": user_id, "email": email, "role": role}))
        return jsonify(
            success=True,
            message="Account created successfully!",
            token=token,
            user={"id": user_id, "name": name, "email": email, "role": role, "createdAt": now}
        ), 201

    finally:
        conn.close()


@app.post("/api/auth/login")
def login():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify(success=False, message="Email and password are required."), 400

    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user["password"].encode()):
            return jsonify(success=False, message="Invalid email or password."), 401

        now = datetime.utcnow().isoformat()
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user["id"]))
        conn.commit()

        token = create_access_token(identity=json.dumps({"id": user["id"], "email": user["email"], "role": user["role"]}))
        return jsonify(
            success=True,
            message="Login successful!",
            token=token,
            user={"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"], "lastLogin": now}
        )

    finally:
        conn.close()


@app.get("/api/auth/me")
@jwt_required()
def get_me():
    identity = json.loads(get_jwt_identity())
    conn = get_db()
    try:
        user = conn.execute("SELECT id, name, email, role, created_at, last_login FROM users WHERE id = ?",
                            (identity["id"],)).fetchone()
        if not user:
            return jsonify(success=False, message="User not found."), 404
        return jsonify(success=True, user=row_to_dict(user))
    finally:
        conn.close()

# ── Analysis Routes ──────────────────────────────────────────────────────────

@app.post("/api/analyze")
@jwt_required()
def analyze():
    identity = json.loads(get_jwt_identity())
    data = request.get_json()

    text = (data.get("text") or "").strip()
    platform = data.get("platform", "unknown")
    reported_user = data.get("reportedUser")
    mode = data.get("mode", "hybrid")

    if not text:
        return jsonify(success=False, message="Text is required."), 400

    try:
        ai_resp = requests.post(
            f"{AI_SERVICE_URL}/analyze",
            json={
                "text": text,
                "user_id": identity["id"],
                "mode": mode
            },
            timeout=15
        )

        print("AI URL:", f"{AI_SERVICE_URL}/analyze")
        print("STATUS:", ai_resp.status_code)
        print("RESPONSE:", ai_resp.text[:500])

        ai_resp.raise_for_status()
        ai_result = ai_resp.json()

    except Exception as e:
        logger.exception("Analyze Error")
        return jsonify(
            success=False,
            message=f"AI service unavailable: {str(e)}"
        ), 503

    analysis_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO analyses
            (id, user_id, text, platform, reported_user, risk_score, category,
             is_cyberbullying, model_score, custom_abuse_score,
             detected_words, source, confidence, explanation,
             suggestion, analyzed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis_id,
            identity["id"],
            text,
            platform,
            reported_user,
            ai_result.get("risk_score"),
            ai_result.get("category"),
            1 if ai_result.get("is_cyberbullying") else 0,
            ai_result.get("model_score"),
            ai_result.get("custom_abuse_score"),
            json.dumps(ai_result.get("detected_words", [])),
            ai_result.get("source"),
            ai_result.get("confidence"),
            ai_result.get("explanation"),
            ai_result.get("suggestion"),
            now
        ))
        conn.commit()

    finally:
        conn.close()

    return jsonify(
        success=True,
        analysis={
            **ai_result,
            "id": analysis_id,
            "analyzedAt": now
        }
    )


@app.get("/api/analyses")
@jwt_required()
def get_analyses():
    identity = json.loads(get_jwt_identity())
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT * FROM analyses WHERE user_id = ?
            ORDER BY analyzed_at DESC LIMIT ? OFFSET ?
        """, (identity["id"], limit, offset)).fetchall()

        total = conn.execute("SELECT COUNT(*) FROM analyses WHERE user_id = ?", (identity["id"],)).fetchone()[0]

        analyses = []
        for r in rows:
            d = row_to_dict(r)
            d["detected_words"] = json.loads(d.get("detected_words") or "[]")
            analyses.append(d)

        return jsonify(success=True, analyses=analyses, total=total, page=page)
    finally:
        conn.close()


@app.delete("/api/analyses/<analysis_id>")
@jwt_required()
def delete_analysis(analysis_id):
    identity = json.loads(get_jwt_identity())
    conn = get_db()
    try:
        conn.execute("DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, identity["id"]))
        conn.commit()
        return jsonify(success=True, message="Analysis deleted.")
    finally:
        conn.close()

# ── Dashboard Routes ─────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats")
@jwt_required()
def dashboard_stats():
    identity = json.loads(get_jwt_identity())
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM analyses WHERE user_id = ? ORDER BY analyzed_at DESC",
                            (identity["id"],)).fetchall()
        analyses = []
        for r in rows:
            d = row_to_dict(r)
            d["detected_words"] = json.loads(d.get("detected_words") or "[]")
            analyses.append(d)

        total = len(analyses)
        flagged = sum(1 for a in analyses if a["is_cyberbullying"])
        safe = total - flagged
        high = sum(1 for a in analyses if a["category"] == "HIGH")
        medium = sum(1 for a in analyses if a["category"] == "MEDIUM")
        low = sum(1 for a in analyses if a["category"] == "LOW")

        # Weekly trend (last 7 days)
        from collections import defaultdict
        trend = defaultdict(lambda: {"safe": 0, "flagged": 0})
        for a in analyses:
            try:
                day = a["analyzed_at"][:10]
                if a["is_cyberbullying"]:
                    trend[day]["flagged"] += 1
                else:
                    trend[day]["safe"] += 1
            except:
                pass

        return jsonify(success=True, stats={
            "totalAnalyzed": total, "totalFlagged": flagged, "totalSafe": safe,
            "highRisk": high, "mediumRisk": medium, "lowRisk": low,
            "safeCount": safe, "recentAnalyses": analyses[:5],
            "weeklyTrend": dict(trend)
        })
    finally:
        conn.close()

# ── Word Manager Routes ──────────────────────────────────────────────────────

@app.get("/api/words")
@jwt_required()
def get_words():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM custom_words ORDER BY added_at DESC").fetchall()
        return jsonify(success=True, words=[row_to_dict(r) for r in rows])
    finally:
        conn.close()


@app.post("/api/words")
@jwt_required()
def add_word():
    identity = json.loads(get_jwt_identity())
    data = request.get_json()
    word = (data.get("word") or "").strip().lower()
    severity = data.get("severity", "normal")

    if not word:
        return jsonify(success=False, message="Word cannot be empty."), 400

    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM custom_words WHERE word = ?", (word,)).fetchone()
        if existing:
            return jsonify(success=False, message=f"Word '{word}' already exists."), 409

        word_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        conn.execute("INSERT INTO custom_words (id, word, severity, added_by, added_at) VALUES (?, ?, ?, ?, ?)",
                     (word_id, word, severity, identity["id"], now))
        conn.commit()

        # Notify AI service — add word with correct severity
        try:
            requests.post(f"{AI_SERVICE_URL}/add-word", json={"word": word, "severity": severity}, timeout=5)
            # Force AI service to reload from file to ensure in-memory state is fresh
            requests.get(f"{AI_SERVICE_URL}/reload-words", timeout=5)
        except Exception as e:
            logger.warning(f"AI service sync warning (non-critical): {e}")

        return jsonify(success=True, message=f"Word '{word}' added successfully.", word={"id": word_id, "word": word, "severity": severity}), 201
    finally:
        conn.close()


@app.delete("/api/words/<word_id>")
@jwt_required()
def delete_word(word_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT word FROM custom_words WHERE id = ?", (word_id,)).fetchone()
        if not row:
            return jsonify(success=False, message="Word not found."), 404

        conn.execute("DELETE FROM custom_words WHERE id = ?", (word_id,))
        conn.commit()

        # Notify AI service
        try:
            requests.delete(f"{AI_SERVICE_URL}/remove-word/{row['word']}", timeout=5)
            requests.get(f"{AI_SERVICE_URL}/reload-words", timeout=5)
        except Exception as e:
            logger.warning(f"AI service sync warning: {e}")

        return jsonify(success=True, message="Word removed successfully.")
    finally:
        conn.close()

# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return jsonify(status="healthy", service="ShadowGuard Shield Backend", timestamp=datetime.utcnow().isoformat())

# ── Startup ──────────────────────────────────────────────────────────────────
init_db()
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🛡️  ShadowGuard Shield Backend running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
