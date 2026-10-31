# Kantin Insya backend API regression tests (auth, products, sales, modal, transactions, daily report)
import os
from pathlib import Path
import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / "frontend" / ".env")
BASE_URL = (os.environ.get("EXPO_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


def _login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=20)
    return r


@pytest.fixture(scope="module")
def owner_h():
    r = _login("owner", "owner123")
    if r.status_code != 200:
        pytest.skip("owner login failed")
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def kasir_h():
    r = _login("kasir", "kasir123")
    if r.status_code != 200:
        pytest.skip("kasir login failed")
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def test_product(owner_h):
    r = requests.post(f"{API}/products", headers=owner_h, json={
        "name": "TEST_Produk", "category": "TEST_Kat", "price": 10000, "cost": 6000, "stock": 20})
    assert r.status_code == 200
    p = r.json()
    yield p
    requests.delete(f"{API}/products/{p['id']}", headers=owner_h)


# ---- Auth ----
class TestAuth:
    def test_owner_login(self):
        r = _login("owner", "owner123")
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "owner" and d["access_token"]

    def test_kasir_login(self):
        r = _login("kasir", "kasir123")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "cashier"

    def test_wrong_password(self):
        assert _login("owner", "wrong").status_code == 401

    def test_me(self, owner_h):
        r = requests.get(f"{API}/auth/me", headers=owner_h)
        assert r.status_code == 200 and r.json()["username"] == "owner"

    def test_me_no_token(self):
        assert requests.get(f"{API}/auth/me").status_code == 401


# ---- Products / Categories ----
class TestProducts:
    def test_list_products(self, kasir_h):
        r = requests.get(f"{API}/products", headers=kasir_h)
        assert r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) > 0
        assert "_id" not in r.json()[0]

    def test_list_categories(self, kasir_h):
        r = requests.get(f"{API}/categories", headers=kasir_h)
        assert r.status_code == 200 and len(r.json()) > 0

    def test_kasir_cannot_create(self, kasir_h):
        r = requests.post(f"{API}/products", headers=kasir_h, json={"name": "TEST_x", "category": "x", "price": 1})
        assert r.status_code == 403

    def test_kasir_cannot_update_delete(self, kasir_h, test_product):
        assert requests.put(f"{API}/products/{test_product['id']}", headers=kasir_h,
                            json={"name": "x", "category": "x", "price": 1}).status_code == 403
        assert requests.delete(f"{API}/products/{test_product['id']}", headers=kasir_h).status_code == 403

    def test_create_persist_and_category(self, owner_h, kasir_h, test_product):
        prods = requests.get(f"{API}/products", headers=kasir_h).json()
        assert any(p["id"] == test_product["id"] and p["price"] == 10000 for p in prods)
        cats = [c["name"] for c in requests.get(f"{API}/categories", headers=kasir_h).json()]
        assert "TEST_Kat" in cats

    def test_update_product(self, owner_h, test_product):
        body = {"name": "TEST_Produk2", "category": "TEST_Kat", "price": 12000, "cost": 6000, "stock": 20}
        r = requests.put(f"{API}/products/{test_product['id']}", headers=owner_h, json=body)
        assert r.status_code == 200 and r.json()["price"] == 12000
        prods = requests.get(f"{API}/products", headers=owner_h).json()
        assert any(p["id"] == test_product["id"] and p["name"] == "TEST_Produk2" for p in prods)
        # revert price for sale tests
        body.update(price=10000, name="TEST_Produk")
        requests.put(f"{API}/products/{test_product['id']}", headers=owner_h, json=body)

    def test_update_404(self, owner_h):
        r = requests.put(f"{API}/products/nonexist", headers=owner_h, json={"name": "x", "category": "x", "price": 1})
        assert r.status_code == 404

    def test_delete_archives(self, owner_h):
        p = requests.post(f"{API}/products", headers=owner_h, json={"name": "TEST_Del", "category": "TEST_Kat", "price": 1}).json()
        assert requests.delete(f"{API}/products/{p['id']}", headers=owner_h).status_code == 200
        prods = requests.get(f"{API}/products", headers=owner_h).json()
        assert not any(x["id"] == p["id"] for x in prods)


def _item(p, qty=2):
    return {"product_id": p["id"], "name": p["name"], "price": p["price"], "cost": p["cost"], "qty": qty}


# ---- Sales / Modal / Reports ----
class TestSalesAndReports:
    def test_sale_tunai_change_and_stock(self, kasir_h, test_product):
        before = next(p for p in requests.get(f"{API}/products", headers=kasir_h).json() if p["id"] == test_product["id"])["stock"]
        r = requests.post(f"{API}/sales", headers=kasir_h, json={
            "items": [_item(test_product, 2)], "payment_method": "tunai", "paid_amount": 50000})
        assert r.status_code == 200
        d = r.json()
        assert d["subtotal"] == 20000 and d["change_amount"] == 30000 and d["cost_total"] == 12000
        after = next(p for p in requests.get(f"{API}/products", headers=kasir_h).json() if p["id"] == test_product["id"])["stock"]
        assert after == before - 2

    def test_sale_insufficient_cash(self, kasir_h, test_product):
        r = requests.post(f"{API}/sales", headers=kasir_h, json={
            "items": [_item(test_product, 2)], "payment_method": "tunai", "paid_amount": 1000})
        assert r.status_code == 400

    def test_sale_empty_cart(self, kasir_h):
        r = requests.post(f"{API}/sales", headers=kasir_h, json={"items": [], "payment_method": "tunai", "paid_amount": 0})
        assert r.status_code == 400

    def test_sale_qris(self, kasir_h, test_product):
        r = requests.post(f"{API}/sales", headers=kasir_h, json={
            "items": [_item(test_product, 1)], "payment_method": "qris", "paid_amount": 0})
        assert r.status_code == 200
        d = r.json()
        assert d["paid_amount"] == 10000 and d["change_amount"] == 0 and d["payment_method"] == "qris"

    def test_modal_owner_only(self, kasir_h):
        r = requests.post(f"{API}/modal", headers=kasir_h, json={"kind": "modal_in", "amount": 1000})
        assert r.status_code == 403

    def test_modal_and_expense(self, owner_h):
        r1 = requests.post(f"{API}/modal", headers=owner_h, json={"kind": "modal_in", "amount": 100000, "note": "TEST_modal"})
        r2 = requests.post(f"{API}/modal", headers=owner_h, json={"kind": "expense", "amount": 5000, "note": "TEST_exp"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["kind"] == "modal_in" and r2.json()["amount"] == 5000

    def test_transactions_filter(self, owner_h):
        for k in ["sale", "modal_in", "expense"]:
            r = requests.get(f"{API}/transactions", headers=owner_h, params={"kind": k})
            assert r.status_code == 200
            assert all(t["kind"] == k for t in r.json()) and len(r.json()) > 0

    def test_daily_report_formula(self, owner_h):
        r = requests.get(f"{API}/reports/daily", headers=owner_h)
        assert r.status_code == 200
        d = r.json()
        assert d["net_profit"] == d["total_sales"] - d["total_cost"] - d["expense_total"]
        assert d["gross_profit"] == d["total_sales"] - d["total_cost"]
        assert d["sale_count"] >= 2 and d["expense_total"] >= 5000

    def test_daily_report_bad_date(self, owner_h):
        assert requests.get(f"{API}/reports/daily", headers=owner_h, params={"date": "xx"}).status_code == 400

    def test_negative_qty_rejected(self, kasir_h, test_product):
        # validation edge case: negative qty should be rejected (money leak risk)
        r = requests.post(f"{API}/sales", headers=kasir_h, json={
            "items": [_item(test_product, -3)], "payment_method": "qris", "paid_amount": 0})
        assert r.status_code in (400, 422), f"negative qty accepted: {r.status_code}"

    def test_price_tamper_rejected(self, kasir_h, test_product):
        # cashier sends price=1 for a 10000 product; server should use DB price
        it = _item(test_product, 1)
        it["price"] = 1
        r = requests.post(f"{API}/sales", headers=kasir_h, json={"items": [it], "payment_method": "tunai", "paid_amount": 1})
        assert not (r.status_code == 200 and r.json()["subtotal"] == 1), "server trusts client price"

    def test_price_tamper_uses_db_price(self, kasir_h, test_product):
        it = _item(test_product, 1)
        it["price"] = 1
        it["cost"] = 99999
        r = requests.post(f"{API}/sales", headers=kasir_h, json={"items": [it], "payment_method": "qris", "paid_amount": 0})
        assert r.status_code == 200
        d = r.json()
        assert d["subtotal"] == 10000 and d["cost_total"] == 6000 and d["items"][0]["price"] == 10000

    def test_zero_qty_422(self, kasir_h, test_product):
        r = requests.post(f"{API}/sales", headers=kasir_h, json={"items": [_item(test_product, 0)], "payment_method": "qris", "paid_amount": 0})
        assert r.status_code == 422

    def test_negative_paid_422(self, kasir_h, test_product):
        r = requests.post(f"{API}/sales", headers=kasir_h, json={"items": [_item(test_product, 1)], "payment_method": "qris", "paid_amount": -5})
        assert r.status_code == 422

    def test_modal_amount_invalid_422(self, owner_h):
        for amt in (0, -100):
            r = requests.post(f"{API}/modal", headers=owner_h, json={"kind": "expense", "amount": amt})
            assert r.status_code == 422

    def test_daily_report_jakarta_date(self, owner_h):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        r = requests.get(f"{API}/reports/daily", headers=owner_h)
        assert r.json()["date"] == datetime.now(ZoneInfo("Asia/Jakarta")).date().isoformat()


# ---- Void (replaces DELETE /transactions) ----
class TestVoid:
    def _stock(self, h, pid):
        return next(p for p in requests.get(f"{API}/products", headers=h).json() if p["id"] == pid)["stock"]

    def test_void_flow(self, owner_h, kasir_h, test_product):
        rep0 = requests.get(f"{API}/reports/daily", headers=owner_h).json()
        s0 = self._stock(owner_h, test_product["id"])
        sale = requests.post(f"{API}/sales", headers=kasir_h, json={"items": [_item(test_product, 3)], "payment_method": "transfer", "paid_amount": 0}).json()
        assert self._stock(owner_h, test_product["id"]) == s0 - 3
        rep1 = requests.get(f"{API}/reports/daily", headers=owner_h).json()
        assert rep1["total_sales"] == rep0["total_sales"] + 30000
        tid = sale["id"]
        # kasir forbidden
        assert requests.post(f"{API}/transactions/{tid}/void", headers=kasir_h, json={"reason": "salah input"}).status_code == 403
        # reason too short
        assert requests.post(f"{API}/transactions/{tid}/void", headers=owner_h, json={"reason": "ab"}).status_code == 422
        # ok
        r = requests.post(f"{API}/transactions/{tid}/void", headers=owner_h, json={"reason": "TEST salah input"})
        assert r.status_code == 200 and r.json()["ok"] is True
        # double void
        assert requests.post(f"{API}/transactions/{tid}/void", headers=owner_h, json={"reason": "again"}).status_code == 400
        # stock restored
        assert self._stock(owner_h, test_product["id"]) == s0
        # excluded from report
        rep2 = requests.get(f"{API}/reports/daily", headers=owner_h).json()
        assert rep2["total_sales"] == rep0["total_sales"] and rep2["sale_count"] == rep0["sale_count"]
        assert rep2["by_method"]["transfer"] == rep0["by_method"]["transfer"]
        # persisted in audit
        t = next(x for x in requests.get(f"{API}/transactions", headers=owner_h).json() if x["id"] == tid)
        assert t["voided"] is True and t["void_reason"] == "TEST salah input" and t["voided_by"] == "owner" and t["voided_at"]

    def test_void_404(self, owner_h):
        assert requests.post(f"{API}/transactions/nonexist/void", headers=owner_h, json={"reason": "abcd"}).status_code == 404

    def test_delete_transaction_removed(self, owner_h):
        r = requests.delete(f"{API}/transactions/whatever", headers=owner_h)
        assert r.status_code in (404, 405)

    def test_void_modal_excluded(self, owner_h):
        rep0 = requests.get(f"{API}/reports/daily", headers=owner_h).json()
        t = requests.post(f"{API}/modal", headers=owner_h, json={"kind": "expense", "amount": 7777, "note": "TEST_void_exp"}).json()
        assert requests.post(f"{API}/transactions/{t['id']}/void", headers=owner_h, json={"reason": "TEST batal"}).status_code == 200
        rep1 = requests.get(f"{API}/reports/daily", headers=owner_h).json()
        assert rep1["expense_total"] == rep0["expense_total"]
