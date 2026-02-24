import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Package, ArrowDownLeft, BarChart3, Calculator, Scale, Save, Trash2, Search, Filter, History, X, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
    getProducts, createProduct, createTransaction, getStockReport,
    getPriceBoards, createPriceBoard, createUnitConversion, addPriceItem,
    getPriceBoardItems, getTransactions, activatePriceBoard
} from '../api'

export default function Admin() {
    const [subTab, setSubTab] = useState<'products' | 'inventory' | 'prices' | 'reports' | 'conversions'>('products')
    const [products, setProducts] = useState<any[]>([])
    const [report, setReport] = useState<any[]>([])
    const [useConversion, setUseConversion] = useState(false)
    const [priceBoards, setPriceBoards] = useState<any[]>([])
    const [selectedBoard, setSelectedBoard] = useState<number | undefined>()

    const fetchData = async () => {
        try {
            const { data: prodData } = await getProducts()
            setProducts(prodData)
            const { data: boardData } = await getPriceBoards()
            setPriceBoards(boardData)
            if (boardData.length > 0 && !selectedBoard) {
                const active = boardData.find((b: any) => b.is_active)
                setSelectedBoard(active ? active.id : boardData[0].id)
            }
        } catch (e) { console.error(e) }
    }

    const fetchReport = async () => {
        const { data } = await getStockReport(selectedBoard, useConversion)
        setReport(data)
    }

    useEffect(() => { fetchData() }, [])
    useEffect(() => { if (subTab === 'reports') fetchReport() }, [subTab, selectedBoard, useConversion])

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Admin Nav */}
            <div className="flex border-b border-white/5 px-6 gap-6 bg-surface/50 overflow-x-auto">
                {[
                    { id: 'products', label: 'Hàng hóa', icon: Package },
                    { id: 'inventory', label: 'Kho (Nhập/Xuất)', icon: ArrowDownLeft },
                    { id: 'conversions', label: 'Quy đổi', icon: Scale },
                    { id: 'prices', label: 'Bảng giá', icon: Calculator },
                    { id: 'reports', label: 'Báo cáo tồn', icon: BarChart3 },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id as any)}
                        className={`py-4 flex items-center gap-2 border-b-2 transition-all text-sm font-medium whitespace-nowrap ${subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {subTab === 'products' && <ProductList products={products} onRefresh={fetchData} />}
                {subTab === 'inventory' && <InventoryManager products={products} onRefresh={fetchData} />}
                {subTab === 'conversions' && <ConversionTable products={products} onRefresh={fetchData} />}
                {subTab === 'prices' && <PriceBoardEditor priceBoards={priceBoards} products={products} onRefresh={fetchData} />}
                {subTab === 'reports' && (
                    <StockReport report={report} priceBoards={priceBoards} selectedBoard={selectedBoard} setSelectedBoard={setSelectedBoard} useConversion={useConversion} setUseConversion={setUseConversion} />
                )}
            </div>
        </div>
    )
}

// --- SUB COMPONENTS ---

function ProductList({ products, onRefresh }: { products: any[], onRefresh: () => void }) {
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({ code: '', name: '', base_unit: '', min_stock_limit: '10' })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.code || !formData.name || !formData.base_unit) return

        setLoading(true)
        try {
            await createProduct({
                ...formData,
                min_stock_limit: parseFloat(formData.min_stock_limit) || 0
            })
            setFormData({ code: '', name: '', base_unit: '', min_stock_limit: '10' })
            setShowForm(false)
            onRefresh()
            alert("Thêm hàng hóa thành công!")
        } catch (error) {
            alert("Lỗi khi thêm hàng hóa. Có thể mã hàng đã tồn tại.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-sans">Danh sách hàng hóa</h2>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <Plus size={18} /> Thêm hàng hóa
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border-white/5 space-y-4 mb-6 relative">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Thông tin hàng hóa mới</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-500 ml-1">Mã hàng hóa</label>
                                    <input
                                        required
                                        placeholder="vd: HH001"
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5 ">
                                    <label className="text-xs text-gray-500 ml-1">Tên sản phẩm</label>
                                    <input
                                        required
                                        placeholder="vd: Sữa tươi Vinamilk"
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-500 ml-1">Đơn vị gốc</label>
                                    <input
                                        required
                                        placeholder="vd: Lon, Cái, Kg..."
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm"
                                        value={formData.base_unit}
                                        onChange={e => setFormData({ ...formData, base_unit: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-500 ml-1">Định mức tồn</label>
                                    <input
                                        type="number"
                                        placeholder="vd: 10"
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm"
                                        value={formData.min_stock_limit}
                                        onChange={e => setFormData({ ...formData, min_stock_limit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-primary px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? "Đang lưu..." : "Lưu hàng hóa"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="glass-card rounded-2xl overflow-hidden border-white/5">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">Mã</th>
                            <th className="p-4 text-center">QR Code</th>
                            <th className="p-4">Tên hàng</th>
                            <th className="p-4">ĐVT Gốc</th>
                            <th className="p-4 text-right">Tồn hiện tại</th>
                            <th className="p-4 text-right">Định mức</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {products.map(p => (
                            <tr key={p.id} className="hover:bg-white/5 group">
                                <td className="p-4 font-mono text-primary">{p.code}</td>
                                <td className="p-4">
                                    <div className="flex justify-center bg-white p-2 rounded-lg w-fit mx-auto shadow-sm group-hover:scale-110 transition-transform">
                                        <QRCodeSVG value={p.code} size={48} level="H" />
                                    </div>
                                </td>
                                <td className="p-4 font-bold">{p.name}</td>
                                <td className="p-4">{p.base_unit}</td>
                                <td className="p-4 text-right font-bold">{p.stock_quantity.toFixed(2)}</td>
                                <td className="p-4 text-right text-gray-400">{p.min_stock_limit.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ConversionTable({ products, onRefresh }: { products: any[], onRefresh: () => void }) {
    const [edits, setEdits] = useState<Record<number, { multiplier: string, to_unit: string }>>({})

    const handleSave = async (pId: number) => {
        const edit = edits[pId]
        if (!edit || !edit.multiplier || !edit.to_unit) return
        const prod = products.find(p => p.id === pId)
        await createUnitConversion({
            product_id: pId,
            from_unit: prod.base_unit,
            to_unit: edit.to_unit,
            multiplier: parseFloat(edit.multiplier)
        })
        alert("Đã lưu quy đổi!")
        onRefresh()
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Quản lý quy đổi đơn vị</h2>
            <p className="text-sm text-gray-400 italic">Quy tắc: 1 [Đơn vị Gốc] = [Hệ số] * [Đơn vị quy đổi]</p>
            <div className="glass-card rounded-2xl overflow-hidden border-white/5">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">Sản phẩm</th>
                            <th className="p-4 text-center">1 [Đơn vị Gốc]</th>
                            <th className="p-4 text-center">=</th>
                            <th className="p-4 text-center">Hệ số</th>
                            <th className="p-4 text-center">*</th>
                            <th className="p-4">Đơn vị quy đổi</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {products.map(p => {
                            const currentConv = p.conversions?.[0]
                            const edit = edits[p.id] || { multiplier: currentConv?.multiplier?.toString() || '', to_unit: currentConv?.to_unit || '' }

                            return (
                                <tr key={p.id} className="hover:bg-white/5">
                                    <td className="p-4 font-bold">{p.name}</td>
                                    <td className="p-4 text-center">1 <span className="text-primary font-bold">{p.base_unit}</span></td>
                                    <td className="p-4 text-center text-gray-500">=</td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            placeholder="Hệ số"
                                            value={edit.multiplier}
                                            onChange={e => setEdits({ ...edits, [p.id]: { ...edit, multiplier: e.target.value } })}
                                            className="w-20 bg-background border border-white/10 rounded-lg p-2 text-center outline-none focus:border-primary"
                                        />
                                    </td>
                                    <td className="p-4 text-center text-gray-500">*</td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            placeholder="vd: Mét, Lon..."
                                            value={edit.to_unit}
                                            onChange={e => setEdits({ ...edits, [p.id]: { ...edit, to_unit: e.target.value } })}
                                            className="w-full bg-background border border-white/10 rounded-lg p-2 outline-none focus:border-primary"
                                        />
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleSave(p.id)}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                            <Save size={20} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function PriceBoardEditor({ products, priceBoards, onRefresh }: { products: any[], priceBoards: any[], onRefresh: () => void }) {
    const [selectedBoardId, setSelectedBoardId] = useState<number | ''>('')
    const [boardItems, setBoardItems] = useState<Record<number, number>>({})
    const [search, setSearch] = useState('')

    useEffect(() => {
        if (priceBoards.length > 0 && !selectedBoardId) {
            const activeBoard = priceBoards.find(b => b.is_active)
            setSelectedBoardId(activeBoard ? activeBoard.id : priceBoards[0].id)
        }
    }, [priceBoards])

    useEffect(() => {
        if (selectedBoardId) fetchPrices(Number(selectedBoardId))
    }, [selectedBoardId])

    const fetchPrices = async (boardId: number) => {
        const { data } = await getPriceBoardItems(boardId)
        const mapping: Record<number, number> = {}
        data.forEach((item: any) => mapping[item.product_id] = item.price)
        setBoardItems(mapping)
    }

    const handleUpdatePrice = async (pId: number, price: number) => {
        if (!selectedBoardId) return
        await addPriceItem(Number(selectedBoardId), { product_id: pId, price })
        setBoardItems({ ...boardItems, [pId]: price })
    }

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))

    const [showBoardForm, setShowBoardForm] = useState(false)
    const [newBoardName, setNewBoardName] = useState('')

    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBoardName) return
        await createPriceBoard({ name: newBoardName })
        setNewBoardName('')
        setShowBoardForm(false)
        onRefresh()
        alert("Đã tạo bảng giá mới!")
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-sans">Cài đặt giá bán</h2>
                {!showBoardForm && (
                    <button
                        onClick={() => setShowBoardForm(true)}
                        className="bg-primary/20 text-primary border border-primary/20 px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/30 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={18} /> Tạo bảng giá mới
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showBoardForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <form onSubmit={handleCreateBoard} className="glass-card p-4 rounded-xl border-white/5 flex items-center gap-4 bg-surface/30">
                            <div className="flex-1">
                                <input
                                    required
                                    autoFocus
                                    placeholder="Nhập tên bảng giá mới (vd: Giá sỉ, Giá bán lẻ...)"
                                    className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-primary transition-colors text-sm"
                                    value={newBoardName}
                                    onChange={e => setNewBoardName(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-primary px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-indigo-500 transition-all"
                            >
                                Lưu bảng giá
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBoardForm(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-end items-center gap-6 bg-surface/30 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm whitespace-nowrap">Đang xem bảng giá:</span>
                    <select
                        value={selectedBoardId}
                        onChange={(e) => setSelectedBoardId(Number(e.target.value))}
                        className="bg-background border border-white/10 rounded-xl px-4 py-2 outline-none min-w-[200px] text-sm font-bold"
                    >
                        {priceBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="h-8 w-px bg-white/10"></div>

                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={priceBoards.find(b => b.id === selectedBoardId)?.is_active || false}
                            onChange={async () => {
                                if (selectedBoardId) {
                                    await activatePriceBoard(Number(selectedBoardId))
                                    onRefresh()
                                    alert("Đã kích hoạt bảng giá này cho hệ thống bán hàng!")
                                }
                            }}
                        />
                        <div className="w-10 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Kích hoạt bảng giá này</span>
                </label>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    placeholder="Tìm sản phẩm..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 outline-none"
                />
            </div>

            <div className="glass-card rounded-2xl overflow-hidden border-white/5">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-500 text-xs uppercase text-center">
                        <tr>
                            <th className="p-4 text-left">Sản phẩm</th>
                            <th className="p-4">Giá nhập mới nhất</th>
                            <th className="p-4">Giá bán hiện tại</th>
                            <th className="p-4">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredProducts.map(p => {
                            const sellingPrice = boardItems[p.id] !== undefined ? boardItems[p.id] : p.latest_purchase_price
                            return (
                                <tr key={p.id} className="hover:bg-white/5">
                                    <td className="p-4">
                                        <div className="font-bold">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.code}</div>
                                    </td>
                                    <td className="p-4 text-center font-mono text-gray-400">
                                        {p.latest_purchase_price?.toLocaleString()}đ
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="number"
                                                className="bg-background border border-white/10 rounded-lg p-2 w-32 text-center font-bold text-primary outline-none"
                                                value={sellingPrice}
                                                onChange={(e) => setBoardItems({ ...boardItems, [p.id]: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="text-gray-500 text-xs">đ</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleUpdatePrice(p.id, sellingPrice)}
                                            className="bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/30 transition-all"
                                        >
                                            Lưu giá bán
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function InventoryManager({ products, onRefresh }: { products: any[], onRefresh: () => void }) {
    const [view, setView] = useState<'create' | 'history'>('create')
    const [type, setType] = useState<string>('IN')
    const [drafts, setDrafts] = useState<Record<string, any[]>>({ 'IN': [], 'OUT': [], 'OPENING': [] })

    // Current draft item form
    const [selectedProd, setSelectedProd] = useState<string>('')
    const [qty, setQty] = useState<string>('')
    const [price, setPrice] = useState<string>('')

    // History filters
    const [logParams, setLogParams] = useState({ type: '', date_from: '', date_to: '' })
    const [logs, setLogs] = useState<any[]>([])

    const addDraft = () => {
        if (!selectedProd || !qty) return
        const prod = products.find(p => p.id === Number(selectedProd))
        const item = {
            product_id: prod.id,
            name: prod.name,
            quantity: parseFloat(qty),
            price: parseFloat(price) || 0,
            unit: prod.base_unit
        }
        setDrafts({ ...drafts, [type]: [...drafts[type], item] })
        setQty(''); setPrice('');
    }

    const removeDraft = (idx: number) => {
        const list = [...drafts[type]]
        list.splice(idx, 1)
        setDrafts({ ...drafts, [type]: list })
    }

    const saveAll = async () => {
        const list = drafts[type]
        if (list.length === 0) return
        try {
            for (const item of list) {
                await createTransaction({
                    product_id: item.product_id,
                    type: type,
                    quantity: item.quantity,
                    price: item.price
                })
            }
            setDrafts({ ...drafts, [type]: [] })
            onRefresh()
            alert("Đã lưu tất cả giao dịch!")
        } catch (e) { alert("Lỗi khi lưu") }
    }

    const fetchLogs = async () => {
        const { data } = await getTransactions(logParams)
        setLogs(data)
    }

    useEffect(() => { if (view === 'history') fetchLogs() }, [view, logParams])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-surface p-1 rounded-xl w-fit border border-white/5">
                <button onClick={() => setView('create')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${view === 'create' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>
                    <Plus size={16} /> Nhập giao dịch mới
                </button>
                <button onClick={() => setView('history')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${view === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>
                    <History size={16} /> Lịch sử giao dịch
                </button>
            </div>

            {view === 'create' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="glass-card p-6 rounded-2xl border-white/5 h-fit lg:sticky lg:top-4">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18} className="text-primary" /> Thêm sản phẩm vào danh sách</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Loại giao dịch</label>
                                <select
                                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                >
                                    <option value="IN">Nhập hàng (IN)</option>
                                    <option value="OUT">Xuất hàng (OUT)</option>
                                    <option value="OPENING">Tồn đầu kỳ (OPENING)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Chọn sản phẩm</label>
                                <select
                                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                    value={selectedProd}
                                    onChange={e => setSelectedProd(e.target.value)}
                                >
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Số lượng</label>
                                    <input
                                        type="number"
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none text-center font-bold"
                                        value={qty}
                                        onChange={e => setQty(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Giá nhập/xuất</label>
                                    <input
                                        type="number"
                                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none text-center font-bold"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={addDraft}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> Thêm vào danh sách tạm
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="glass-card rounded-2xl border-white/5 overflow-hidden flex-1 flex flex-col">
                            <div className="p-4 bg-white/5 flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${type === 'IN' ? 'bg-green-500' : type === 'OUT' ? 'bg-red-500' : 'bg-primary'}`}></span>
                                    Danh sách chờ: <span className="text-primary">{type}</span>
                                </h3>
                                <span className="text-xs text-gray-500">{drafts[type].length} sản phẩm</span>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-[10px] text-gray-500 uppercase">
                                        <tr>
                                            <th className="p-4">Sản phẩm</th>
                                            <th className="p-4 text-center">Số lượng</th>
                                            <th className="p-4 text-right">Giá</th>
                                            <th className="p-4 text-right">Tổng</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {drafts[type].map((item, i) => (
                                            <tr key={i} className="hover:bg-white/5 group">
                                                <td className="p-4 font-bold text-sm">{item.name}</td>
                                                <td className="p-4 text-center font-mono">{item.quantity} {item.unit}</td>
                                                <td className="p-4 text-right font-mono text-gray-400">{item.price.toLocaleString()}</td>
                                                <td className="p-4 text-right font-bold text-primary">{(item.quantity * item.price).toLocaleString()}đ</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => removeDraft(i)} className="text-gray-600 hover:text-accent opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {drafts[type].length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-20 text-center text-gray-600 italic">Chưa có sản phẩm nào trong danh sách chờ {type}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tổng giá trị phiếu</div>
                                    <div className="text-2xl font-bold gradient-text">
                                        {drafts[type].reduce((sum, it) => sum + (it.quantity * it.price), 0).toLocaleString()}đ
                                    </div>
                                </div>
                                <button
                                    onClick={saveAll}
                                    disabled={drafts[type].length === 0}
                                    className="bg-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-indigo-500 transition-all disabled:opacity-50"
                                >
                                    Lưu vào kho dữ liệu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* History Filters */}
                    <div className="glass-card p-6 rounded-2xl border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Loại</label>
                            <select className="w-full bg-background border border-white/10 rounded-lg p-2 outline-none" value={logParams.type} onChange={e => setLogParams({ ...logParams, type: e.target.value })}>
                                <option value="">Tất cả</option>
                                <option value="IN">Nhập (IN)</option>
                                <option value="OUT">Xuất (OUT)</option>
                                <option value="SALE">Bán (SALE)</option>
                                <option value="OPENING">Đầu kỳ</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Từ ngày</label>
                            <input type="date" className="w-full bg-background border border-white/10 rounded-lg p-2 outline-none" value={logParams.date_from} onChange={e => setLogParams({ ...logParams, date_from: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Đến ngày</label>
                            <input type="date" className="w-full bg-background border border-white/10 rounded-lg p-2 outline-none" value={logParams.date_to} onChange={e => setLogParams({ ...logParams, date_to: e.target.value })} />
                        </div>
                        <button onClick={fetchLogs} className="bg-surface border border-white/10 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-white/5 transition-colors">
                            <Filter size={16} /> Lọc kết quả
                        </button>
                    </div>

                    <div className="glass-card rounded-2xl overflow-hidden border-white/5">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] text-gray-500 uppercase">
                                <tr>
                                    <th className="p-4">Ngày</th>
                                    <th className="p-4">Sản phẩm</th>
                                    <th className="p-4">Loại</th>
                                    <th className="p-4 text-center">Số lượng</th>
                                    <th className="p-4 text-right">Giá</th>
                                    <th className="p-4 text-right">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-white/5">
                                        <td className="p-4 text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="p-4 font-bold">{log.product_name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === 'IN' ? 'bg-green-500/20 text-green-500' : log.type === 'OUT' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-mono">{log.quantity} {log.unit}</td>
                                        <td className="p-4 text-right font-mono">{log.price.toLocaleString()}</td>
                                        <td className="p-4 text-right font-bold text-primary">{(log.quantity * log.price).toLocaleString()}đ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function StockReport({ report, priceBoards, selectedBoard, setSelectedBoard, useConversion, setUseConversion }: any) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Bảng giá:</span>
                        <select
                            value={selectedBoard}
                            onChange={(e) => setSelectedBoard(Number(e.target.value))}
                            className="bg-background border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none"
                        >
                            {priceBoards.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="w-4 h-4 accent-primary"
                            checked={useConversion}
                            onChange={(e) => setUseConversion(e.target.checked)}
                        />
                        <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Xem theo quy đổi</span>
                    </label>
                </div>
                <div className="bg-primary/10 px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-primary uppercase font-bold">Tổng giá trị tồn</div>
                    <div className="text-xl font-bold text-primary">
                        {report.reduce((sum: any, item: any) => sum + item.value, 0).toLocaleString()}đ
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden border-white/5">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">Sản phẩm</th>
                            <th className="p-4 text-right">Tồn kho</th>
                            <th className="p-4">Đơn vị</th>
                            <th className="p-4 text-right">Giá (Theo bảng)</th>
                            <th className="p-4 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {report.map((item: any) => (
                            <tr key={item.product_id} className="hover:bg-white/5">
                                <td className="p-4 font-bold">{item.name}</td>
                                <td className="p-4 text-right font-mono">{typeof item.quantity === 'number' ? item.quantity.toFixed(2) : item.quantity}</td>
                                <td className="p-4 text-gray-400">{item.unit}</td>
                                <td className="p-4 text-right font-mono">{item.price.toLocaleString()}đ</td>
                                <td className="p-4 text-right font-bold text-primary">{item.value.toLocaleString()}đ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
