import { useState, useEffect } from 'react'
import { LayoutGrid, ShoppingCart, BarChart3, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAlerts } from './api'
import POS from './components/POS'
import Admin from './components/Admin'

function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'admin'>('pos')
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  // Lifted POS States
  const [cart, setCart] = useState<any[]>([])
  const [drafts, setDrafts] = useState<any[][]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showDrafts, setShowDrafts] = useState(false)

  const fetchAlerts = async () => {
    try {
      const { data } = await getAlerts()
      setAlerts(data)
    } catch (error) {
      console.error("Failed to fetch alerts", error)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadDraft = (selectedDraft: any[]) => {
    let shouldSaveCurrent = false
    if (cart.length > 0) {
      shouldSaveCurrent = window.confirm("Giỏ hàng hiện tại đang có sản phẩm. Bạn có muốn lưu tạm đơn hiện tại trước khi tải đơn khác không?")
    }

    setDrafts(prev => {
      const filtered = prev.filter(d => d !== selectedDraft)
      return shouldSaveCurrent ? [...filtered, cart] : filtered
    })

    setCart(selectedDraft)
    setActiveTab('pos')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/5 glass-card sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutGrid className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl gradient-text hidden sm:block">Nult Cashier</span>
        </div>

        {/* Scrolling Marquee - Ultra Premium Glow */}
        <div className="flex-1 mx-16 overflow-hidden relative hidden lg:block h-8">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background via-background/90 to-transparent z-10"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background via-background/90 to-transparent z-10"></div>
          <motion.div
            animate={{ x: [800, -1500] }}
            transition={{
              repeat: Infinity,
              duration: 40,
              ease: "linear"
            }}
            className="whitespace-nowrap flex gap-24 items-center h-full text-[11px] font-black tracking-[0.5em] uppercase"
          >
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex items-center gap-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
            >
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_#6366f1]"></span>
              <span className="bg-gradient-to-r from-white via-primary-light to-white bg-clip-text text-transparent italic">
                Chào mừng tới không gian quản lý Nult Cashier
              </span>
            </motion.span>

            <motion.span
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              className="flex items-center gap-3 text-white/80 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]"
            >
              <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_15px_#ec4899]"></span>
              <span>Đẳng cấp công nghệ vận hành bán lẻ thông minh</span>
            </motion.span>

            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              className="flex items-center gap-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
            >
              <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_15px_#f43f5e]"></span>
              <span className="bg-gradient-to-r from-white via-accent-light to-white bg-clip-text text-transparent italic">
                Chúc quý đối tác một ngày giao dịch thành công rực rỡ
              </span>
            </motion.span>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alerts Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center relative hover:bg-white/10 transition-colors"
            >
              <Bell size={20} className={alerts.length > 0 ? "text-accent animate-bell" : "text-gray-400"} />
              {alerts.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
              )}
            </button>

            <AnimatePresence>
              {showAlerts && alerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 glass-card rounded-2xl p-4 shadow-2xl border-accent/20"
                >
                  <h3 className="text-sm font-bold text-accent mb-3 flex items-center gap-2">
                    <Bell size={16} /> Cảnh báo tồn kho
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {alerts.map((alert, i) => (
                      <div key={i} className="p-3 bg-accent/5 rounded-xl border border-accent/10">
                        <p className="text-sm font-medium text-gray-200">{alert.name}</p>
                        <div className="flex justify-between text-xs mt-1 text-gray-400">
                          <span>Tồn: <span className="text-accent font-bold">{alert.quantity.toFixed(2)}</span></span>
                          <span>Giới hạn: {alert.limit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div
            className="relative"
            onMouseEnter={() => setShowDrafts(true)}
            onMouseLeave={() => setShowDrafts(false)}
          >
            <button
              onClick={() => setActiveTab('pos')}
              title="Bán hàng"
              className={`w-10 h-10 rounded-full flex items-center justify-center relative transition-all ${activeTab === 'pos' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
            >
              <ShoppingCart size={20} />
              {drafts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-[10px] font-bold text-white rounded-full border-2 border-background flex items-center justify-center shadow-lg">
                  {drafts.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showDrafts && drafts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 glass-card rounded-2xl p-3 shadow-2xl border-white/5 z-50"
                >
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Đơn hàng tạm</h3>
                  <div className="space-y-1">
                    {drafts.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => loadDraft(d)}
                        className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="text-xs font-bold text-gray-200 group-hover:text-primary transition-colors">Đơn hàng #{i + 1}</div>
                        <div className="text-[10px] text-gray-500">{d.length} mặt hàng - {d.reduce((s, item) => s + (item.quantity * (item.useConversion && item.conversions?.[0] ? item.price / item.conversions[0].multiplier : item.price)), 0).toLocaleString()}đ</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setActiveTab('admin')}
            title="Quản trị"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeTab === 'admin' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
          >
            <BarChart3 size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'pos' ? (
          <POS
            cart={cart}
            setCart={setCart}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            onSaveDraft={() => {
              if (cart.length > 0) {
                setDrafts(prev => [...prev, cart])
                setCart([])
                setSelectedProduct(null)
                alert("Đã lưu đơn hàng tạm!")
              }
            }}
          />
        ) : (
          <Admin />
        )}
      </main>
    </div>
  )
}

export default App
