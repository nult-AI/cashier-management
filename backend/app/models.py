from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from .database import Base
import datetime
import enum

class TransactionType(enum.Enum):
    IN = "IN"
    OUT = "OUT"
    SALE = "SALE"
    OPENING = "OPENING"

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    name = Column(String)
    base_unit = Column(String) # e.g., "Cái", "Kg"
    stock_quantity = Column(Float, default=0.0)
    min_stock_limit = Column(Float, default=10.0)
    
    conversions = relationship("UnitConversion", back_populates="product")
    stock_history = relationship("Transaction", back_populates="product")
    price_items = relationship("PriceBoardItem", back_populates="product")

class UnitConversion(Base):
    __tablename__ = "unit_conversions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    from_unit = Column(String) # e.g., "Thùng"
    to_unit = Column(String)   # e.g., "Lon"
    multiplier = Column(Float) # e.g., 24

    product = relationship("Product", back_populates="conversions")

class PriceBoard(Base):
    __tablename__ = "price_boards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("PriceBoardItem", back_populates="board")

class PriceBoardItem(Base):
    __tablename__ = "price_board_items"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("price_boards.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price = Column(Float)

    board = relationship("PriceBoard", back_populates="items")
    product = relationship("Product", back_populates="price_items")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    transaction_type = Column(Enum(TransactionType))
    quantity = Column(Float) # In base unit
    unit = Column(String)     # Unit used in transaction
    price = Column(Float)     # Price at transaction time
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="stock_history")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    total_amount = Column(Float)
    payment_method = Column(String) # e.g., "Cash", "Transfer"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    items = relationship("SaleItem", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float)
    unit = Column(String)
    price = Column(Float)

    sale = relationship("Sale", back_populates="items")
