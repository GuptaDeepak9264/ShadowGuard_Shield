"""
ShadowGuard Shield - AI Detection Service (v3.0)
FastAPI + TF-IDF + Logistic Regression + Hinglish support
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json, os, re, logging
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import numpy as np

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="ShadowGuard AI Service", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

WORDS_FILE = os.path.join(os.path.dirname(__file__), "abusive_words.json")

# ── Models ────────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    text: str
    user_id: Optional[str] = None
    mode: Optional[str] = "hybrid"  # "hybrid", "ai_only", "custom_only"

class AddWordRequest(BaseModel):
    word: str
    severity: Optional[str] = "normal"

# ── Preprocessing ─────────────────────────────────────────────────────────────
LEET_MAP = {"@": "a", "3": "e", "1": "i", "0": "o", "5": "s", "$": "s", "!": "i", "4": "a"}
HINGLISH_MAP = {
    "tu": "you", "tum": "you", "mai": "i", "mujhe": "me", "mera": "my",
    "tera": "your", "yaar": "friend", "bhai": "brother", "pagal": "crazy",
    "bekaar": "useless", "ganda": "dirty", "kamine": "scoundrel",
    "nautanki": "drama queen", "chup": "shut up", "nikal": "get out",
    "maar": "hit", "dhamki": "threat", "tadpao": "torture",
}

def preprocess(text: str) -> str:
    """Normalize, de-leet, and map Hinglish terms."""
    text = text.lower().strip()
    # De-leet speak
    for leet, normal in LEET_MAP.items():
        text = text.replace(leet, normal)
    # Expand common abbreviations
    text = re.sub(r'\bkys\b', 'kill yourself', text)
    text = re.sub(r'\bstfu\b', 'shut the fuck up', text)
    text = re.sub(r'\bwtf\b', 'what the fuck', text)
    text = re.sub(r'\bfoff\b', 'fuck off', text)
    # Map Hinglish
    tokens = text.split()
    tokens = [HINGLISH_MAP.get(t, t) for t in tokens]
    text = " ".join(tokens)
    # Remove excess punctuation but keep spaces
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ── Abusive Word Engine ───────────────────────────────────────────────────────
def load_words() -> dict:
    if not os.path.exists(WORDS_FILE):
        default = {"words": [], "high_severity": [], "last_updated": datetime.now().isoformat()}
        save_words(default)
        return default
    with open(WORDS_FILE, encoding="utf-8") as f:
        return json.load(f)

def save_words(data: dict):
    data["last_updated"] = datetime.now().isoformat()
    with open(WORDS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def detect_custom(text: str, words_data: dict) -> dict:
    text_lower = text.lower()
    detected, high_sev = [], False
    hs_lower = [w.lower() for w in words_data.get("high_severity", [])]

    for word in words_data.get("words", []):
        pattern = re.compile(re.escape(word.lower()), re.IGNORECASE)
        if pattern.search(text_lower):
            detected.append(word)
            if word.lower() in hs_lower:
                high_sev = True

    if not detected:
        score = 0.0
    elif high_sev:
        score = min(0.65 + (len(detected) - 1) * 0.05, 0.95)
    else:
        score = min(0.35 + (len(detected) - 1) * 0.05, 0.65)

    return {"detected_words": detected, "score": round(score, 3), "high_severity": high_sev}

# ── ML Model ──────────────────────────────────────────────────────────────────
TRAIN_DATA = [
    # Cyberbullying (1) — English
    ("you are so ugly and worthless", 1),
    ("nobody likes you go away", 1),
    ("i hate you so much you loser", 1),
    ("kill yourself nobody cares about you", 1),
    ("you are a complete idiot stop existing", 1),
    ("everyone hates you fat ugly freak", 1),
    ("you should just disappear forever", 1),
    ("you are stupid and will never amount to anything", 1),
    ("go die in a ditch loser", 1),
    ("i will make your life hell every single day", 1),
    ("you deserve all the bad things happening to you", 1),
    ("stop breathing you waste of space", 1),
    ("you are so dumb nobody wants you here", 1),
    ("i will hurt you badly if you come near me", 1),
    ("you are pathetic and weak everyone laughs at you", 1),
    ("everyone is laughing at you behind your back", 1),
    ("you are a disgusting piece of trash", 1),
    ("nobody will ever love someone like you", 1),
    ("you ruin everything you touch loser", 1),
    ("get lost you are not welcome anywhere", 1),
    # Cyberbullying — Hinglish/Hindi
    ("tujhe koi pasand nahi karta chal nikal", 1),
    ("tu bilkul bekaar hai aur kuch nahi banega", 1),
    ("tu ek number ka pagal hai sabka mazak hai tujhpe", 1),
    ("nikal yahan se koi nahi chahta tujhe", 1),
    ("teri maa ka naam mat le tu ganda hai", 1),
    ("tu kamina hai sabka bura chahta hai tu", 1),
    # Safe (0)
    ("have a great day today my friend", 0),
    ("i love spending time with my family and friends", 0),
    ("the weather is really nice outside today", 0),
    ("let us study together for the exam tomorrow", 0),
    ("happy birthday to you hope you have a wonderful day", 0),
    ("this movie is really good you should watch it", 0),
    ("i am going to the market to buy groceries", 0),
    ("how are you doing today feeling better", 0),
    ("great job on the project you did amazing", 0),
    ("thank you so much for your kind help", 0),
    ("let us meet for lunch tomorrow at noon", 0),
    ("congratulations on your achievement well deserved", 0),
    ("aaj bahut accha din hai bahar jaate hain", 0),
    ("kal test hai padhai karte hain saath mein", 0),
    ("yaar movie dekhne chalte hain tonight", 0),
    ("kya tum mere saath aa sakte ho please", 0),
    ("mujhe aaj bahut khushi hui tumse milke", 0),
    ("bhai kal cricket khelne chalte hain", 0),
    ("please be careful on your way home tonight", 0),
    ("i disagree with your opinion but respect your view", 0),
    ("the assignment was challenging but i learned a lot", 0),
    ("can we reschedule our meeting to next week", 0),
]

def build_model() -> Pipeline:
    texts = [preprocess(t) for t, _ in TRAIN_DATA]
    labels = [l for _, l in TRAIN_DATA]
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 3), max_features=8000, sublinear_tf=True,
                                  strip_accents="unicode", analyzer="word", min_df=1)),
        ("clf", LogisticRegression(max_iter=2000, C=1.5, random_state=42, class_weight="balanced"))
    ])
    pipeline.fit(texts, labels)
    logger.info("✅ ML model trained successfully.")
    return pipeline

# ── Explanation Engine ────────────────────────────────────────────────────────
def generate_explanation(category: str, detected_words: list, model_score: float, text: str) -> str:
    word_count = len(detected_words)
    if category == "HIGH":
        if word_count > 0:
            return (f"This message contains {word_count} highly offensive term(s) including "
                    f"'{detected_words[0]}'. The language used is threatening, derogatory, "
                    f"or severely abusive and qualifies as cyberbullying.")
        return ("The AI model detected strong indicators of cyberbullying — including threatening "
                "tone, derogatory language, and intent to harm or demean the recipient.")
    elif category == "MEDIUM":
        if word_count > 0:
            return (f"This message contains moderately offensive language (e.g., '{detected_words[0]}'). "
                    "While not extreme, it may be hurtful or disrespectful to the recipient.")
        return ("The model detected patterns consistent with mildly abusive or disrespectful communication. "
                "Review the message for potential harassment.")
    elif category == "LOW":
        return ("Minimal risk detected. The message contains subtle negativity but may not "
                "constitute direct cyberbullying. Exercise caution.")
    else:
        return ("No significant cyberbullying indicators detected. The message appears safe "
                "and respectful in tone.")

def generate_suggestion(category: str, text: str) -> str:
    if category in ("HIGH", "MEDIUM"):
        return ("💡 Consider rewriting this message with respectful language. "
                "Express your concerns calmly without targeting the person's identity, "
                "appearance, or worth. Example: 'I feel frustrated when...' instead of using accusatory language.")
    return "✅ Your message looks respectful. Keep up the positive communication!"

# ── Global State ──────────────────────────────────────────────────────────────
ml_model: Pipeline = None
words_data: dict = {}

@app.on_event("startup")
async def startup():
    global ml_model, words_data
    words_data = load_words()
    ml_model = build_model()
    logger.info(f"✅ ShadowGuard AI ready. Loaded {len(words_data.get('words', []))} custom words.")

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"service": "ShadowGuard Shield AI", "version": "3.0.0", "status": "running"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": ml_model is not None,
        "custom_words": len(words_data.get("words", [])),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    global ml_model, words_data

    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    original_text = req.text.strip()
    processed = preprocess(original_text)
    mode = req.mode or "hybrid"

    # ── ML Score ──
    model_score = 0.0
    if mode != "custom_only":
        try:
            prob = ml_model.predict_proba([processed])[0]
            model_score = float(prob[1])
        except Exception as e:
            logger.error(f"Model error: {e}")

    # ── Custom Word Score ──
    custom_result = {"detected_words": [], "score": 0.0, "high_severity": False}
    if mode != "ai_only":
        custom_result = detect_custom(original_text, words_data)

    custom_score = custom_result["score"]
    detected_words = custom_result["detected_words"]
    high_sev = custom_result["high_severity"]

    # ── Combine ──
    if mode == "ai_only":
        final_score = model_score
    elif mode == "custom_only":
        final_score = custom_score
    else:
        # Weighted hybrid: give more weight to custom words
        final_score = min(model_score * 0.6 + custom_score * 0.8, 1.0)
        if high_sev:
            final_score = max(final_score, 0.8)

    final_score = round(final_score, 3)
    risk_pct = int(final_score * 100)

    # ── Category ──
    if high_sev or final_score >= 0.75:
        category = "HIGH"
    elif final_score >= 0.45:
        category = "MEDIUM"
    elif final_score >= 0.20:
        category = "LOW"
    else:
        category = "SAFE"

    is_bullying = category in ("MEDIUM", "HIGH")

    if final_score >= 0.80 or final_score <= 0.10:
        confidence = "HIGH"
    elif final_score >= 0.55 or final_score <= 0.25:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    if model_score >= 0.4 and custom_score > 0:
        source = "both"
    elif custom_score > 0:
        source = "custom"
    elif model_score >= 0.4:
        source = "model"
    else:
        source = "none"

    explanation = generate_explanation(category, detected_words, model_score, original_text)
    suggestion = generate_suggestion(category, original_text)

    return {
        "text": original_text,
        "risk_score": final_score,
        "risk_percentage": risk_pct,
        "category": category,
        "is_cyberbullying": is_bullying,
        "model_score": round(model_score, 3),
        "custom_abuse_score": round(custom_score, 3),
        "detected_words": detected_words,
        "source": source,
        "confidence": confidence,
        "explanation": explanation,
        "suggestion": suggestion,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/add-word")
def add_word(req: AddWordRequest):
    global words_data
    word = req.word.strip().lower()
    if not word:
        raise HTTPException(400, "Word cannot be empty.")

    existing = [w.lower() for w in words_data.get("words", [])]
    if word not in existing:
        words_data.setdefault("words", []).append(word)

    if req.severity == "high":
        hs = [w.lower() for w in words_data.get("high_severity", [])]
        if word not in hs:
            words_data.setdefault("high_severity", []).append(word)
    else:
        # If re-added as normal, remove from high_severity
        words_data["high_severity"] = [
            w for w in words_data.get("high_severity", []) if w.lower() != word
        ]

    save_words(words_data)
    logger.info(f"Word added: '{word}' | severity={req.severity} | high_sev_list={words_data.get('high_severity')}")
    return {"success": True, "message": f"'{word}' added.", "severity": req.severity, "total": len(words_data["words"])}


@app.get("/reload-words")
def reload_words():
    """Force reload words from JSON file into memory."""
    global words_data
    words_data = load_words()
    logger.info(f"Words reloaded: {len(words_data.get('words', []))} words, {len(words_data.get('high_severity', []))} high severity")
    return {
        "success": True,
        "total": len(words_data.get("words", [])),
        "high_severity_count": len(words_data.get("high_severity", [])),
        "high_severity": words_data.get("high_severity", [])
    }

@app.delete("/remove-word/{word}")
def remove_word(word: str):
    global words_data
    word = word.strip().lower()
    words_data["words"] = [w for w in words_data.get("words", []) if w.lower() != word]
    words_data["high_severity"] = [w for w in words_data.get("high_severity", []) if w.lower() != word]
    save_words(words_data)
    return {"success": True}

@app.get("/words")
def get_words():
    global words_data
    return {"total": len(words_data.get("words", [])), "words": words_data.get("words", []),
            "high_severity": words_data.get("high_severity", [])}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
