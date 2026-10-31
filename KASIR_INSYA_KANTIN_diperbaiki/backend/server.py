from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Annotated
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

JKT = ZoneInfo("Asia/Jakarta")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Kantin Insya API")
bearer = HTTPBearer(auto_error=False)


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api = APIRouter(prefix="/api")


# -------- Models --------
Role = Literal["owner", "cashier"]
PaymentMethod = Literal["tunai", "qris", "transfer"]
TxnKind = Literal["sale", "modal_in", "expense"]


class LoginReq(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    role: Role


class TokenOut(BaseModel):
    access_token: str
    user: UserOut


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str


class CategoryIn(BaseModel):
    name: str


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # category name
    price: int
    cost: int = 0
    description: str = ""
    stock: int = 0
    icon: str = "coffee"  # feather icon name
    archived: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductIn(BaseModel):
    name: str
    category: str
    price: int
    cost: int = 0
    description: str = ""
    stock: int = 0
    icon: str = "coffee"


class SaleItem(BaseModel):
    product_id: str
    name: str
    price: int
    cost: int = 0
    qty: int = Field(gt=0, le=1000)


class SaleIn(BaseModel):
    items: List[SaleItem]
    payment_method: PaymentMethod
    paid_amount: int = Field(ge=0)
    note: str = ""


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: TxnKind
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cashier: str
    # for sale
    items: List[SaleItem] = []
    subtotal: int = 0
    payment_method: Optional[PaymentMethod] = None
    paid_amount: int = 0
    change_amount: int = 0
    cost_total: int = 0
    # for modal_in / expense
    amount: int = 0
    note: str = ""
    voided: bool = False
    void_reason: str = ""
    voided_by: str = ""
    voided_at: Optional[datetime] = None


class ModalIn(BaseModel):
    kind: Literal["modal_in", "expense"]
    amount: int = Field(gt=0)
    note: str = ""


# -------- Auth helpers --------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except ValueError:
        return False


def make_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def current_user(creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]) -> dict:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_owner(user: Annotated[dict, Depends(current_user)]) -> dict:
    if user["role"] != "owner":
        raise HTTPException(403, "Owner only")
    return user


# -------- Auth routes --------
@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginReq):
    user = await db.users.find_one({"username": body.username.lower()}, {"_id": 0})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Username atau password salah")
    return TokenOut(
        access_token=make_token(user),
        user=UserOut(id=user["id"], username=user["username"], role=user["role"]),
    )


@api.get("/auth/me", response_model=UserOut)
async def me(user: Annotated[dict, Depends(current_user)]):
    return UserOut(id=user["id"], username=user["username"], role=user["role"])


# -------- Categories --------
@api.get("/categories", response_model=List[Category])
async def list_categories(_: Annotated[dict, Depends(current_user)]):
    docs = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return [Category(**d) for d in docs]


@api.post("/categories", response_model=Category)
async def add_category(body: CategoryIn, _: Annotated[dict, Depends(require_owner)]):
    existing = await db.categories.find_one({"name": body.name}, {"_id": 0})
    if existing:
        return Category(**existing)
    c = Category(name=body.name)
    await db.categories.insert_one(c.model_dump())
    return c


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, _: Annotated[dict, Depends(require_owner)]):
    await db.categories.delete_one({"id": cat_id})
    return {"ok": True}


# -------- Products --------
@api.get("/products", response_model=List[Product])
async def list_products(_: Annotated[dict, Depends(current_user)]):
    docs = await db.products.find({"archived": {"$ne": True}}, {"_id": 0}).to_list(1000)
    return [Product(**d) for d in docs]


@api.post("/products", response_model=Product)
async def create_product(body: ProductIn, _: Annotated[dict, Depends(require_owner)]):
    p = Product(**body.model_dump())
    await db.products.insert_one(p.model_dump())
    # ensure category exists
    if body.category:
        await db.categories.update_one({"name": body.category}, {"$setOnInsert": {"id": str(uuid.uuid4()), "name": body.category}}, upsert=True)
    return p


@api.put("/products/{pid}", response_model=Product)
async def update_product(pid: str, body: ProductIn, _: Annotated[dict, Depends(require_owner)]):
    existing = await db.products.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Product not found")
    update = body.model_dump()
    await db.products.update_one({"id": pid}, {"$set": update})
    merged = {**existing, **update}
    return Product(**merged)


@api.delete("/products/{pid}")
async def delete_product(pid: str, _: Annotated[dict, Depends(require_owner)]):
    await db.products.update_one({"id": pid}, {"$set": {"archived": True}})
    return {"ok": True}


# -------- Sales / Transactions --------
@api.post("/sales", response_model=Transaction)
async def create_sale(body: SaleIn, user: Annotated[dict, Depends(current_user)]):
    if not body.items:
        raise HTTPException(400, "Keranjang kosong")
    # Never trust client prices: load price & cost from DB
    clean_items = []
    for it in body.items:
        p = await db.products.find_one({"id": it.product_id, "archived": {"$ne": True}}, {"_id": 0})
        if not p:
            raise HTTPException(400, f"Produk tidak ditemukan: {it.name}")
        clean_items.append(SaleItem(product_id=p["id"], name=p["name"], price=int(p["price"]), cost=int(p.get("cost", 0)), qty=it.qty))
    body.items = clean_items
    subtotal = sum(it.price * it.qty for it in body.items)
    cost_total = sum(it.cost * it.qty for it in body.items)
    if body.paid_amount < subtotal and body.payment_method == "tunai":
        raise HTTPException(400, "Pembayaran tunai kurang")
    change = max(0, body.paid_amount - subtotal) if body.payment_method == "tunai" else 0
    txn = Transaction(
        kind="sale",
        cashier=user["username"],
        items=body.items,
        subtotal=subtotal,
        payment_method=body.payment_method,
        paid_amount=body.paid_amount if body.payment_method == "tunai" else subtotal,
        change_amount=change,
        cost_total=cost_total,
        note=body.note,
    )
    doc = txn.model_dump()
    doc["created_at"] = txn.created_at.isoformat()
    await db.transactions.insert_one(doc)
    # decrement stock
    for it in body.items:
        await db.products.update_one({"id": it.product_id}, {"$inc": {"stock": -it.qty}})
    return txn


@api.post("/modal", response_model=Transaction)
async def add_modal(body: ModalIn, user: Annotated[dict, Depends(require_owner)]):
    txn = Transaction(
        kind=body.kind,
        cashier=user["username"],
        amount=body.amount,
        note=body.note,
    )
    doc = txn.model_dump()
    doc["created_at"] = txn.created_at.isoformat()
    await db.transactions.insert_one(doc)
    return txn


def _parse_dt(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except Exception:
            return datetime.now(timezone.utc)
    return datetime.now(timezone.utc)


@api.get("/transactions", response_model=List[Transaction])
async def list_transactions(
    _: Annotated[dict, Depends(current_user)],
    limit: int = 200,
    kind: Optional[TxnKind] = None,
):
    q = {}
    if kind:
        q["kind"] = kind
    docs = await db.transactions.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    out = []
    for d in docs:
        d["created_at"] = _parse_dt(d.get("created_at"))
        if d.get("voided_at"):
            d["voided_at"] = _parse_dt(d["voided_at"])
        out.append(Transaction(**d))
    return out


class VoidIn(BaseModel):
    reason: str = Field(min_length=3)


@api.post("/transactions/{tid}/void")
async def void_transaction(tid: str, body: VoidIn, user: Annotated[dict, Depends(require_owner)]):
    t = await db.transactions.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    if t.get("voided"):
        raise HTTPException(400, "Transaksi sudah dibatalkan")
    await db.transactions.update_one({"id": tid}, {"$set": {
        "voided": True, "void_reason": body.reason, "voided_by": user["username"],
        "voided_at": datetime.now(timezone.utc).isoformat(),
    }})
    if t.get("kind") == "sale":
        for it in t.get("items", []):
            await db.products.update_one({"id": it["product_id"]}, {"$inc": {"stock": int(it.get("qty", 0))}})
    return {"ok": True}


class DailyReport(BaseModel):
    date: str
    total_sales: int
    total_cost: int
    gross_profit: int
    net_profit: int
    modal_in_total: int
    expense_total: int
    sale_count: int
    item_count: int
    by_method: dict
    top_products: List[dict]


@api.get("/reports/daily", response_model=DailyReport)
async def daily_report(
    _: Annotated[dict, Depends(current_user)],
    date: Optional[str] = None,  # YYYY-MM-DD
):
    if date:
        try:
            day = datetime.fromisoformat(date).replace(tzinfo=JKT)
        except Exception:
            raise HTTPException(400, "Format tanggal salah")
    else:
        day = datetime.now(JKT)
    start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    start_utc, end_utc = start.astimezone(timezone.utc), end.astimezone(timezone.utc)
    docs = await db.transactions.find({"$or": [
        {"created_at": {"$gte": start_utc.isoformat(), "$lt": end_utc.isoformat()}},
        {"created_at": {"$gte": start_utc, "$lt": end_utc}},
    ]}, {"_id": 0}).to_list(None)
    total_sales = total_cost = modal_in = expense = sale_count = item_count = 0
    by_method = {"tunai": 0, "qris": 0, "transfer": 0}
    prod_counter: dict = {}
    for d in docs:
        dt = _parse_dt(d.get("created_at"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if d.get("voided") or not (start <= dt < end):
            continue
        kind = d.get("kind")
        if kind == "sale":
            sale_count += 1
            total_sales += int(d.get("subtotal", 0))
            total_cost += int(d.get("cost_total", 0))
            m = d.get("payment_method") or "tunai"
            by_method[m] = by_method.get(m, 0) + int(d.get("subtotal", 0))
            for it in d.get("items", []):
                item_count += int(it.get("qty", 0))
                key = it.get("name", "?")
                prod_counter[key] = prod_counter.get(key, 0) + int(it.get("qty", 0))
        elif kind == "modal_in":
            modal_in += int(d.get("amount", 0))
        elif kind == "expense":
            expense += int(d.get("amount", 0))

    gross = total_sales - total_cost
    net = gross - expense
    top = sorted(prod_counter.items(), key=lambda x: x[1], reverse=True)[:5]
    return DailyReport(
        date=start.date().isoformat(),
        total_sales=total_sales,
        total_cost=total_cost,
        gross_profit=gross,
        net_profit=net,
        modal_in_total=modal_in,
        expense_total=expense,
        sale_count=sale_count,
        item_count=item_count,
        by_method=by_method,
        top_products=[{"name": k, "qty": v} for k, v in top],
    )


# -------- Seed --------
async def ensure_seed():
    # users
    for key_u, key_p, role in [
        ("SEED_OWNER_USERNAME", "SEED_OWNER_PASSWORD", "owner"),
        ("SEED_CASHIER_USERNAME", "SEED_CASHIER_PASSWORD", "cashier"),
    ]:
        username = os.environ.get(key_u, "").lower()
        password = os.environ.get(key_p, "")
        if not username or not password:
            continue
        existing = await db.users.find_one({"username": username}, {"_id": 0})
        if existing:
            update = {"role": role}
            if os.environ.get("SEED_FORCE_RESET") == "1":  # setel =1 hanya untuk mengembalikan password awal
                update["password_hash"] = hash_pw(password)
            await db.users.update_one({"username": username}, {"$set": update})
            continue
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": username,
            "password_hash": hash_pw(password),
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    # categories
    base_cats = ["Nasi", "Mie", "Kopi", "Es & Minuman", "Camilan"]
    for name in base_cats:
        await db.categories.update_one(
            {"name": name},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "name": name}},
            upsert=True,
        )
    # products if empty
    count = await db.products.count_documents({})
    if count == 0:
        seed_products = [
            {"name": "Nasi Ayam Geprek", "category": "Nasi", "price": 15000, "cost": 9000, "description": "Ayam krispi, sambal bawang", "stock": 25, "icon": "coffee"},
            {"name": "Mie Goreng Telur", "category": "Mie", "price": 13000, "cost": 7500, "description": "Mie goreng, telur mata sapi", "stock": 20, "icon": "coffee"},
            {"name": "Es Kopi Susu", "category": "Kopi", "price": 12000, "cost": 6000, "description": "Kopi, susu, gula aren", "stock": 30, "icon": "coffee"},
            {"name": "Es Teh Lemon", "category": "Es & Minuman", "price": 6000, "cost": 2500, "description": "Teh dingin yang segar", "stock": 40, "icon": "droplet"},
            {"name": "Roti Bakar Cokelat", "category": "Camilan", "price": 10000, "cost": 5000, "description": "Cokelat dan keju", "stock": 15, "icon": "coffee"},
            {"name": "Pisang Goreng", "category": "Camilan", "price": 8000, "cost": 3500, "description": "Renyah, lima potong", "stock": 18, "icon": "coffee"},
        ]
        for p in seed_products:
            pr = Product(**p)
            await db.products.insert_one(pr.model_dump())


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("username", unique=True)
    await db.products.create_index("id", unique=True)
    await db.transactions.create_index("created_at")
    await ensure_seed()


app.include_router(api)

# Static web version (HTML/CSS/JS) + downloadable zip
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

WEB_DIR = ROOT_DIR.parent / "web-export" / "kantin-insya" / "public"
WEB_ZIP = ROOT_DIR.parent / "web-export" / "kantin-insya.zip"

# Hanya dipasang jika filenya ada, agar server tidak gagal start.
if WEB_ZIP.exists():
    @app.get("/api/download/kantin-insya.zip", include_in_schema=False)
    async def download_zip():
        return FileResponse(WEB_ZIP, filename="kantin-insya.zip", media_type="application/zip")

if WEB_DIR.is_dir():
    app.mount("/api/web", StaticFiles(directory=WEB_DIR, html=True), name="web")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
