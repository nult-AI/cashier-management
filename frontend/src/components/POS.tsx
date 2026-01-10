import { useState, useRef, useEffect } from 'react'
import { Search, ShoppingCart, Trash2, CreditCard, Box, AlertCircle, Package, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProducts, createSale } from '../api'

interface POSProps {
    cart: any[]
    setCart: React.Dispatch<React.SetStateAction<any[]>>
    selectedProduct: any
    setSelectedProduct: React.Dispatch<any>
    onSaveDraft: () => void
}

export default function POS({ cart, setCart, selectedProduct, setSelectedProduct, onSaveDraft }: POSProps) {
    const [query, setQuery] = useState('')
    const [products, setProducts] = useState<any[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        const { data } = await getProducts()
        setProducts(data)
    }

    const normalizeUnit = (unit: string) => {
        return unit?.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            || ''
    }

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        const q = normalizeUnit(query)
        // Strict match first (for barcode scanners)
        const exactMatch = products.find(p => normalizeUnit(p.code) === q)

        if (exactMatch) {
            addToCart(exactMatch)
            setSelectedProduct(exactMatch)
            setQuery('')
        } else {
            // If no exact match, try fuzzy match on Enter
            const fuzzyMatch = products.find(p => normalizeUnit(p.name).includes(q))
            if (fuzzyMatch) {
                addToCart(fuzzyMatch)
                setSelectedProduct(fuzzyMatch)
                setQuery('')
            } else {
                alert("Không tìm thấy hàng hóa")
            }
        }
    }

    const filteredResults = query.trim() ? products.filter(p =>
        normalizeUnit(p.code).includes(normalizeUnit(query)) ||
        normalizeUnit(p.name).includes(normalizeUnit(query))
    ).slice(0, 8) : []

    const addToCart = (product: any) => {
        const newItem = {
            ...product,
            cartItemId: Date.now() + Math.random(),
            quantity: 1,
            price: product.active_price || 0, // Using active price from board
            useConversion: false,
            displayUnit: product.base_unit
        }
        setCart(prev => [...prev, newItem])
        setSelectedProduct(product)
    }

    const removeFromCart = (cartItemId: number) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId))
    }

    const toggleConversion = (cartItemId: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                const newUseConv = !item.useConversion
                const conv = item.conversions?.[0]
                if (newUseConv && conv) {
                    return {
                        ...item,
                        useConversion: true,
                        displayUnit: conv.to_unit
                    }
                } else {
                    return {
                        ...item,
                        useConversion: false,
                        displayUnit: item.base_unit
                    }
                }
            }
            return item
        }))
    }

    const getItemPrice = (item: any) => {
        if (item.useConversion && item.conversions?.[0]) {
            return item.price / item.conversions[0].multiplier
        }
        return item.price
    }

    const total = cart.reduce((sum, item) => sum + item.quantity * getItemPrice(item), 0)

    const handleCheckout = async () => {
        if (cart.length === 0) return
        try {
            await createSale({
                total_amount: total,
                payment_method: 'Tiền mặt',
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price: getItemPrice(item),
                    unit: item.displayUnit
                }))
            })
            alert("Thanh toán thành công!")
            setCart([])
            setSelectedProduct(null)
            fetchProducts()
        } catch (error) {
            alert("Lỗi khi thanh toán")
        }
    }

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left: Cart & Payment */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="mb-6 relative">
                    <form onSubmit={handleScan} className="relative z-20">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            ref={inputRef}
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Quét mã vạch hoặc nhập tên sản phẩm..."
                            className="w-full h-14 bg-surface border border-white/5 rounded-2xl pl-12 pr-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </form>

                    <AnimatePresence>
                        {filteredResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl border-white/10 shadow-2xl overflow-hidden z-10"
                            >
                                <div className="p-2 space-y-1">
                                    {filteredResults.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                addToCart(p)
                                                setQuery('')
                                                inputRef.current?.focus()
                                            }}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                    {p.base_unit.substring(0, 2)}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-200 group-hover:text-primary transition-colors">{p.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">{(p.active_price || 0).toLocaleString()}đ</div>
                                                <div className="text-[10px] text-gray-500">Tồn: {p.stock_quantity.toFixed(2)} {p.base_unit}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 glass-card rounded-2xl border-white/5 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h2 className="font-bold flex items-center gap-2">
                            <ShoppingCart size={18} className="text-primary" /> Giỏ hàng
                        </h2>
                        <span className="text-sm text-gray-400">{cart.length} dòng</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase">
                                    <th className="p-3">Sản phẩm</th>
                                    <th className="p-3 text-center">Quy đổi?</th>
                                    <th className="p-3">Số lượng / Đơn giá</th>
                                    <th className="p-3 text-right">Thành tiền</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {cart.map((item) => {
                                    const currentPrice = getItemPrice(item)
                                    return (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            key={item.cartItemId}
                                            onClick={() => setSelectedProduct(products.find(p => p.id === item.id))}
                                            className={`group cursor-pointer transition-colors ${selectedProduct?.id === item.id ? 'bg-primary/10' : 'hover:bg-white/5'}`}
                                        >
                                            <td className="p-3">
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.conversions?.length > 0 && (
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-primary"
                                                        checked={item.useConversion}
                                                        onChange={() => toggleConversion(item.cartItemId)}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0
                                                                setCart(prev => prev.map(it => it.cartItemId === item.cartItemId ? { ...it, quantity: val } : it))
                                                            }}
                                                            className="w-12 bg-transparent text-center focus:outline-none text-sm font-bold"
                                                        />
                                                        <span className="text-xs text-gray-400 font-bold">{item.displayUnit}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-medium">
                                                        * {currentPrice.toLocaleString()}đ/{item.displayUnit}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-bold text-primary">
                                                {(item.quantity * currentPrice).toLocaleString()}đ
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => removeFromCart(item.cartItemId)}
                                                    className="p-2 text-gray-500 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {cart.length === 0 && (
                            <div className="h-40 flex flex-col items-center justify-center text-gray-500 gap-2">
                                <Box size={32} strokeWidth={1} />
                                <p className="text-sm">Chưa có sản phẩm nào</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-white/5 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-400">Tổng tiền thanh toán</span>
                            <span className="text-3xl font-bold gradient-text">{total.toLocaleString()}đ</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onSaveDraft}
                                disabled={cart.length === 0}
                                className="flex-1 h-14 bg-white/5 text-gray-300 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                <Save size={20} /> Lưu đơn tạm
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={cart.length === 0}
                                className="flex-[2] h-14 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <CreditCard size={20} /> Thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Stock Info */}
            <div className="w-80 border-l border-white/5 p-6 bg-surface/50 backdrop-blur-sm">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-6">Thông tin hàng hóa</h3>

                <AnimatePresence mode="wait">
                    {(() => {
                        const displayProd = cart.length > 0
                            ? (selectedProduct || products.find(p => p.id === cart[cart.length - 1].id))
                            : null

                        return displayProd ? (
                            <motion.div
                                key={displayProd.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                                    <div className="text-sm text-primary mb-1">Tên sản phẩm</div>
                                    <div className="text-xl font-bold">{displayProd.name}</div>
                                    <div className="text-sm text-gray-500 mt-1">Mã: {displayProd.code}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 glass-card rounded-2xl">
                                        <div className="text-xs text-gray-500 mb-1">Tồn kho</div>
                                        <div className={`text-2xl font-mono font-bold ${displayProd.needs_alert ? 'text-accent' : 'text-primary'}`}>
                                            {displayProd.stock_quantity.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500">{displayProd.base_unit}</div>
                                    </div>
                                    <div className="p-4 glass-card rounded-2xl">
                                        <div className="text-xs text-gray-500 mb-1">Giới hạn</div>
                                        <div className="text-2xl font-mono font-bold">{displayProd.min_stock_limit.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">Cảnh báo khi dưới</div>
                                    </div>
                                </div>

                                {displayProd.needs_alert && (
                                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="text-accent shrink-0" size={20} />
                                        <div>
                                            <div className="text-sm font-bold text-accent">Hàng sắp hết!</div>
                                            <div className="text-xs text-gray-400 mt-0.5">Vui lòng liên hệ quản kho để nhập thêm hàng hóa.</div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-gray-600 gap-2 border-2 border-dashed border-white/5 rounded-2xl">
                                <Package size={32} strokeWidth={1} />
                                <p className="text-xs text-center px-6 italic">Quét sản phẩm để xem chi tiết tồn kho</p>
                            </div>
                        )
                    })()}
                </AnimatePresence>
            </div>
        </div>
    )
}
