"""
Payment processing routes.

Flow (simulated — drop-in Razorpay when ready):
  1. POST /api/v1/payments/initiate   → creates a payment order, returns order_id + amount
  2. POST /api/v1/payments/verify     → verifies payment, marks session/booking as paid
  3. GET  /api/v1/payments/history    → user's payment history
  4. GET  /api/v1/payments/{txn_id}   → single transaction detail

To switch to real Razorpay:
  - pip install razorpay
  - Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
  - Uncomment the razorpay lines in initiate_payment() and verify_payment()
"""
import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import setup_logging
from ..database import get_db
from .. import models
from ..auth_utils import get_current_user_id

setup_logging()
logger = logging.getLogger(__name__)
router = APIRouter(tags=["Payments"])

# ── Config ────────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID     = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_DEMO_KEY")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "demo_secret")
PAYMENT_MODE        = os.environ.get("PAYMENT_MODE", "simulated")  # "simulated" | "razorpay"


# ── DB Table (created via SQLAlchemy on startup) ──────────────────────────────
# See models.py — PaymentTransaction model

# ── Helpers ───────────────────────────────────────────────────────────────────

def _gen_order_id() -> str:
    return "ORD-" + str(uuid.uuid4())[:8].upper()

def _gen_txn_id() -> str:
    return "TXN-" + str(uuid.uuid4())[:10].upper()

def _fmt(dt) -> Optional[str]:
    return dt.strftime("%Y-%m-%dT%H:%M:%S") if dt else None

def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay webhook signature."""
    msg = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(), msg.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class InitiatePaymentRequest(BaseModel):
    """
    payment_for: "session" | "booking"
    reference_id: ticket_id (session) or booking_id (booking)
    payment_method: "upi" | "card" | "netbanking" | "wallet"
    upi_id: optional, required if payment_method == "upi"
    """
    payment_for:    str          # "session" | "booking"
    reference_id:   str          # ticket_id or booking_id
    payment_method: str          # upi | card | netbanking | wallet
    upi_id:         Optional[str] = None
    card_last4:     Optional[str] = None
    wallet_name:    Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    order_id:   str
    payment_id: str              # from Razorpay SDK / simulated
    signature:  Optional[str] = None   # Razorpay signature (not needed in sim mode)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/v1/payments/initiate")
def initiate_payment(
    body: InitiatePaymentRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Step 1: Initiate a payment.
    Returns order_id, amount, currency and (in Razorpay mode) the Razorpay order object.
    """
    # ── Validate payment_for ──────────────────────────────────────────────────
    if body.payment_for not in ("session", "booking"):
        raise HTTPException(400, detail={"success": False, "error": "payment_for must be 'session' or 'booking'"})

    valid_methods = {"upi", "card", "netbanking", "wallet", "cash"}
    if body.payment_method not in valid_methods:
        raise HTTPException(400, detail={"success": False, "error": f"Invalid payment method. Use: {', '.join(sorted(valid_methods))}"})

    # ── Resolve amount ────────────────────────────────────────────────────────
    amount = 0.0
    description = ""
    parking_lot_name = ""

    if body.payment_for == "session":
        session = db.query(models.ParkingSession).filter_by(
            ticket_id=body.reference_id, user_id=user_id
        ).first()
        if not session:
            raise HTTPException(404, detail={"success": False, "error": "Session not found"})
        if session.payment_status == "completed":
            raise HTTPException(409, detail={"success": False, "error": "Session already paid"})

        # Calculate amount if not set
        if session.total_amount and float(session.total_amount) > 0:
            amount = float(session.total_amount)
        elif session.end_time and session.start_time:
            hours = (session.end_time - session.start_time).total_seconds() / 3600
            amount = round(hours * 20.0, 2)  # default Rs.20/hr
        else:
            # Active session — calculate current cost
            hours = (datetime.utcnow() - session.start_time).total_seconds() / 3600
            amount = round(hours * 20.0, 2)

        lot = db.get(models.ParkingLotDetails, session.parkinglot_id)
        parking_lot_name = lot.name if lot else "Parking Lot"
        description = f"Parking at {parking_lot_name} | Ticket: {body.reference_id}"

    elif body.payment_for == "booking":
        booking = db.query(models.ParkingBooking).filter_by(
            booking_id=body.reference_id, user_id=user_id
        ).first()
        if not booking:
            raise HTTPException(404, detail={"success": False, "error": "Booking not found"})
        if booking.payment_status == "paid":
            raise HTTPException(409, detail={"success": False, "error": "Booking already paid"})

        amount = float(booking.estimated_amount)
        lot = db.get(models.ParkingLotDetails, booking.parkinglot_id)
        parking_lot_name = lot.name if lot else "Parking Lot"
        description = f"Booking at {parking_lot_name} | {booking.scheduled_start} | ID: {body.reference_id}"

    if amount <= 0:
        amount = 1.0  # minimum Rs.1

    # ── Create order ──────────────────────────────────────────────────────────
    order_id = _gen_order_id()

    # ── RAZORPAY MODE (uncomment when you have real keys) ─────────────────────
    # import razorpay
    # client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    # razorpay_order = client.order.create({
    #     "amount": int(amount * 100),  # Razorpay uses paise
    #     "currency": "INR",
    #     "receipt": order_id,
    #     "notes": {"reference_id": body.reference_id, "payment_for": body.payment_for}
    # })
    # order_id = razorpay_order["id"]  # use Razorpay's order ID

    # ── Save pending transaction ──────────────────────────────────────────────
    txn = models.PaymentTransaction(
        txn_id          = _gen_txn_id(),
        order_id        = order_id,
        user_id         = user_id,
        payment_for     = body.payment_for,
        reference_id    = body.reference_id,
        amount          = amount,
        currency        = "INR",
        payment_method  = body.payment_method,
        upi_id          = body.upi_id,
        card_last4      = body.card_last4,
        wallet_name     = body.wallet_name,
        status          = "pending",
        description     = description,
        parking_lot_name= parking_lot_name,
        created_at      = datetime.utcnow(),
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    logger.info(f"Payment initiated: {txn.txn_id} | {body.payment_for} {body.reference_id} | Rs.{amount}")

    return {
        "success": True,
        "data": {
            "order_id":       order_id,
            "txn_id":         txn.txn_id,
            "amount":         amount,
            "amount_paise":   int(amount * 100),
            "currency":       "INR",
            "description":    description,
            "parking_lot_name": parking_lot_name,
            "payment_method": body.payment_method,
            "razorpay_key_id": RAZORPAY_KEY_ID,   # Android needs this to open Razorpay SDK
            "mode":           PAYMENT_MODE,
        }
    }


@router.post("/api/v1/payments/verify")
def verify_payment(
    body: VerifyPaymentRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Step 2: Verify payment after user completes it.
    In simulated mode: always succeeds.
    In Razorpay mode: verifies signature before marking as paid.
    """
    # Find the pending transaction
    txn = db.query(models.PaymentTransaction).filter_by(
        order_id=body.order_id, user_id=user_id
    ).first()
    if not txn:
        raise HTTPException(404, detail={"success": False, "error": "Transaction not found"})
    if txn.status == "paid":
        raise HTTPException(409, detail={"success": False, "error": "Payment already verified"})

    # ── RAZORPAY SIGNATURE VERIFICATION (uncomment for real mode) ─────────────
    # if PAYMENT_MODE == "razorpay":
    #     if not body.signature:
    #         raise HTTPException(400, detail={"success": False, "error": "Signature required"})
    #     if not _verify_razorpay_signature(body.order_id, body.payment_id, body.signature):
    #         txn.status = "failed"
    #         db.commit()
    #         raise HTTPException(400, detail={"success": False, "error": "Payment verification failed"})

    # ── Mark transaction as paid ──────────────────────────────────────────────
    txn.status       = "paid"
    txn.payment_id   = body.payment_id
    txn.paid_at      = datetime.utcnow()

    # ── Update the session or booking ─────────────────────────────────────────
    if txn.payment_for == "session":
        session = db.query(models.ParkingSession).filter_by(
            ticket_id=txn.reference_id
        ).first()
        if session:
            session.payment_status = "completed"
            session.payment_method = txn.payment_method
            if not session.total_amount or float(session.total_amount) == 0:
                session.total_amount = txn.amount

    elif txn.payment_for == "booking":
        booking = db.query(models.ParkingBooking).filter_by(
            booking_id=txn.reference_id
        ).first()
        if booking:
            booking.payment_status = "paid"
            booking.payment_method = txn.payment_method

    db.commit()
    db.refresh(txn)

    logger.info(f"Payment verified: {txn.txn_id} | Rs.{txn.amount} | {txn.payment_method}")

    return {
        "success": True,
        "message": "Payment successful",
        "data": {
            "txn_id":         txn.txn_id,
            "order_id":       txn.order_id,
            "payment_id":     txn.payment_id,
            "amount":         float(txn.amount),
            "currency":       txn.currency,
            "status":         txn.status,
            "payment_method": txn.payment_method,
            "paid_at":        _fmt(txn.paid_at),
            "description":    txn.description,
            "parking_lot_name": txn.parking_lot_name,
        }
    }


@router.get("/api/v1/payments/history")
def payment_history(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all payments made by the user."""
    txns = (db.query(models.PaymentTransaction)
            .filter_by(user_id=user_id)
            .order_by(models.PaymentTransaction.created_at.desc())
            .all())
    return {
        "success": True,
        "count": len(txns),
        "data": [{
            "txn_id":         t.txn_id,
            "order_id":       t.order_id,
            "payment_for":    t.payment_for,
            "reference_id":   t.reference_id,
            "amount":         float(t.amount),
            "currency":       t.currency,
            "payment_method": t.payment_method,
            "status":         t.status,
            "description":    t.description,
            "parking_lot_name": t.parking_lot_name,
            "created_at":     _fmt(t.created_at),
            "paid_at":        _fmt(t.paid_at),
        } for t in txns]
    }


@router.get("/api/v1/payments/{txn_id}")
def get_payment(
    txn_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get a single payment transaction."""
    txn = db.query(models.PaymentTransaction).filter_by(
        txn_id=txn_id, user_id=user_id
    ).first()
    if not txn:
        raise HTTPException(404, detail={"success": False, "error": "Transaction not found"})
    return {
        "success": True,
        "data": {
            "txn_id":         txn.txn_id,
            "order_id":       txn.order_id,
            "payment_for":    txn.payment_for,
            "reference_id":   txn.reference_id,
            "amount":         float(txn.amount),
            "currency":       txn.currency,
            "payment_method": txn.payment_method,
            "upi_id":         txn.upi_id,
            "card_last4":     txn.card_last4,
            "wallet_name":    txn.wallet_name,
            "status":         txn.status,
            "description":    txn.description,
            "parking_lot_name": txn.parking_lot_name,
            "created_at":     _fmt(txn.created_at),
            "paid_at":        _fmt(txn.paid_at),
        }
    }
