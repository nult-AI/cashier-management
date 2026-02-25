from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, database
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
import enum
import unicodedata
import datetime

def normalize_unit_str(s):
    if not s: return ""
    # Lowercase, strip, and remove accents
    s = s.lower().strip()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s

def get_product_stock_base(product, db: Session):
    # Rule: 1 [Base Unit] = [Multiplier] * [Converted Unit]
    # So: [Base Unit] = [Converted Quantity] / [Multiplier]
    
    transactions = db.query(models.Transaction).filter(models.Transaction.product_id == product.id).all()
    conversions = db.query(models.UnitConversion).filter(models.UnitConversion.product_id == product.id).all()
    
    total_base = 0.0
    base_unit_norm = normalize_unit_str(product.base_unit)
    
    # Pre-normalize conversions for faster lookup
    conv_map = {}
    for c in conversions:
        conv_map[normalize_unit_str(c.to_unit)] = c.multiplier

    for t in transactions:
        t_unit_norm = normalize_unit_str(t.unit)
        qty = t.quantity
        multiplier = 1.0
        
        if t_unit_norm == base_unit_norm:
            multiplier = 1.0
        elif t_unit_norm in conv_map:
            multiplier = 1.0 / conv_map[t_unit_norm]
        else:
            # Fallback if unit doesn't match base or conversion, assume base for consistency
            multiplier = 1.0
            
        final_qty = qty * multiplier
        
        if t.transaction_type in [models.TransactionType.IN, models.TransactionType.OPENING]:
            total_base += final_qty
        elif t.transaction_type in [models.TransactionType.OUT, models.TransactionType.SALE]:
            total_base -= final_qty
            
    return total_base

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nult Cashier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Nult Cashier API"}

# Product Endpoints
@app.get("/products", response_model=List[dict])
def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    active_board = db.query(models.PriceBoard).filter(models.PriceBoard.is_active == True).first()
    result = []
    for p in products:
        # Calculate real stock from history
        stock_quantity_base = get_product_stock_base(p, db)
        
        # Get latest purchase price
        latest_trans = db.query(models.Transaction).filter(
            models.Transaction.product_id == p.id,
            models.Transaction.transaction_type.in_(['IN', 'OPENING'])
        ).order_by(models.Transaction.created_at.desc()).first()
        
        # Get active selling price
        active_price = 0.0
        if active_board:
            price_item = db.query(models.PriceBoardItem).filter(
                models.PriceBoardItem.board_id == active_board.id,
                models.PriceBoardItem.product_id == p.id
            ).first()
            if price_item:
                active_price = price_item.price
        
        result.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "base_unit": p.base_unit,
            "stock_quantity": stock_quantity_base,
            "min_stock_limit": p.min_stock_limit,
            "latest_purchase_price": latest_trans.price if latest_trans else 0.0,
            "active_price": active_price,
            "needs_alert": stock_quantity_base <= p.min_stock_limit,
            "conversions": [{"id": c.id, "from_unit": c.from_unit, "to_unit": c.to_unit, "multiplier": c.multiplier} for c in p.conversions]
        })
    return result

@app.post("/products")
def create_product(product: dict, db: Session = Depends(get_db)):
    db_product = models.Product(
        code=product['code'],
        name=product['name'],
        base_unit=product['base_unit'],
        min_stock_limit=product.get('min_stock_limit', 10.0)
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.post("/unit-conversions")
def create_unit_conversion(conv: dict, db: Session = Depends(get_db)):
    db_conv = models.UnitConversion(
        product_id=conv['product_id'],
        from_unit=conv['from_unit'],
        to_unit=conv['to_unit'],
        multiplier=conv['multiplier']
    )
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv

# Transaction Endpoints (Stock In/Out/Opening)
@app.post("/transactions")
def create_transaction(trans: dict, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == trans['product_id']).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_trans = models.Transaction(
        product_id=trans['product_id'],
        transaction_type=trans['type'],
        quantity=trans['quantity'],
        unit=trans.get('unit', product.base_unit),
        price=trans.get('price', 0.0)
    )
    db.add(db_trans)
    db.commit()
    
    # Return dynamic stock
    new_stock = get_product_stock_base(product, db)
    return {"message": "Transaction recorded", "new_stock": new_stock}

# Sales Endpoints
@app.post("/sales")
def create_sale(sale_data: dict, db: Session = Depends(get_db)):
    db_sale = models.Sale(
        total_amount=sale_data['total_amount'],
        payment_method=sale_data.get('payment_method', 'Cash')
    )
    db.add(db_sale)
    db.flush()
    
    for item in sale_data['items']:
        product = db.query(models.Product).filter(models.Product.id == item['product_id']).first()
        if not product:
            continue
        
        db_item = models.SaleItem(
            sale_id=db_sale.id,
            product_id=item['product_id'],
            quantity=item['quantity'],
            unit=item.get('unit', product.base_unit),
            price=item['price']
        )
        db.add(db_item)
        
        # Also record in transactions for history
        db_trans = models.Transaction(
            product_id=item['product_id'],
            transaction_type='SALE',
            quantity=item['quantity'],
            unit=item.get('unit', product.base_unit),
            price=item['price']
        )
        db.add(db_trans)
        
    db.commit()
    return {"message": "Sale completed", "sale_id": db_sale.id}

# Alerts
@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    alerts = []
    for p in products:
        real_stock = get_product_stock_base(p, db)
        if real_stock <= p.min_stock_limit:
            alerts.append({
                "product_id": p.id,
                "name": p.name,
                "quantity": real_stock,
                "limit": p.min_stock_limit
            })
    return alerts

# Filtered Transactions
@app.get("/transactions")
def list_transactions(
    product_id: Optional[int] = None,
    type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)
    if product_id:
        query = query.filter(models.Transaction.product_id == product_id)
    if type:
        query = query.filter(models.Transaction.transaction_type == type)
    if date_from:
        # If date_from is YYYY-MM-DD, fromisoformat handles it as 00:00:00
        d_from = datetime.datetime.fromisoformat(date_from)
        query = query.filter(models.Transaction.created_at >= d_from)
    if date_to:
        # If date_to is YYYY-MM-DD, we want to include the whole day
        d_to = datetime.datetime.fromisoformat(date_to)
        # Advance to the last microsecond of the day
        d_to = d_to.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(models.Transaction.created_at <= d_to)
    
    transactions = query.order_by(models.Transaction.created_at.desc()).all()
    return [{
        "id": t.id,
        "product_name": t.product.name,
        "type": t.transaction_type.value,
        "quantity": t.quantity,
        "unit": t.unit,
        "price": t.price,
        "created_at": t.created_at
    } for t in transactions]

# Price Boards
@app.get("/price-boards")
def get_price_boards(db: Session = Depends(get_db)):
    return db.query(models.PriceBoard).all()

@app.post("/price-boards")
def create_price_board(board: dict, db: Session = Depends(get_db)):
    db_board = models.PriceBoard(name=board['name'])
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board

@app.get("/price-boards/{board_id}/items")
def get_price_items(board_id: int, db: Session = Depends(get_db)):
    return db.query(models.PriceBoardItem).filter(models.PriceBoardItem.board_id == board_id).all()

@app.post("/price-boards/{board_id}/activate")
def activate_price_board(board_id: int, db: Session = Depends(get_db)):
    # Deactivate all
    db.query(models.PriceBoard).update({models.PriceBoard.is_active: False})
    # Activate target
    board = db.query(models.PriceBoard).filter(models.PriceBoard.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Price board not found")
    board.is_active = True
    db.commit()
    return {"message": "Price board activated", "id": board_id}

@app.post("/price-boards/{board_id}/items")
def add_price_item(board_id: int, item: dict, db: Session = Depends(get_db)):
    # Update if exists
    existing = db.query(models.PriceBoardItem).filter(
        models.PriceBoardItem.board_id == board_id,
        models.PriceBoardItem.product_id == item['product_id']
    ).first()
    if existing:
        existing.price = item['price']
        db.commit()
        return existing
        
    db_item = models.PriceBoardItem(
        board_id=board_id,
        product_id=item['product_id'],
        price=item['price']
    )
    db.add(db_item)
    db.commit()
    return db_item

# Stock Report with Calculation based on Price Board
@app.get("/reports/stock")
def get_stock_report(board_id: Optional[int] = None, use_conversion: bool = False, db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    report = []
    
    for p in products:
        price = 0.0
        if board_id:
            price_item = db.query(models.PriceBoardItem).filter(
                models.PriceBoardItem.board_id == board_id,
                models.PriceBoardItem.product_id == p.id
            ).first()
            if price_item:
                price = price_item.price
        
        base_qty = get_product_stock_base(p, db)
        display_qty = base_qty
        display_unit = p.base_unit
        display_price = price
        
        if use_conversion:
            # Our rule: 1 [Base Unit] = [Multiplier] * [Converted Unit]
            # So: Converted Quantity = Base Quantity * Multiplier
            # And: Converted Price = Base Price / Multiplier
            conversion = db.query(models.UnitConversion).filter(models.UnitConversion.product_id == p.id).first()
            if conversion:
                display_qty = base_qty * conversion.multiplier
                display_unit = conversion.to_unit
                if conversion.multiplier > 0:
                    display_price = price / conversion.multiplier
                
        report.append({
            "product_id": p.id,
            "name": p.name,
            "quantity": display_qty,
            "unit": display_unit,
            "price": display_price,
            "value": base_qty * price  # Value is always calculated on base qty * base price
        })
    return report
