import { useState, useEffect } from 'react'
import { Home, PlusCircle, PieChart, Settings, Loader2 } from 'lucide-react'
import { supabase } from './lib/supabase'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('today') // 'today', 'week', 'month'
  
  // Form state
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch categories
      const { data: cats, error: catError } = await supabase.from('categories').select('*')
      if (catError) throw catError
      setCategories(cats || [])

      // Fetch expenses with category info
      const { data: exp, error: expError } = await supabase
        .from('expenses')
        .select(`*, category:categories(*)`)
        .order('date', { ascending: false })
      if (expError) throw expError
      setExpenses(exp || [])
    } catch (error) {
      console.error('Error fetching data:', error.message)
      alert('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!amount || !title || !categoryId) {
      alert('Compila tutti i campi')
      return
    }

    try {
      setIsSubmitting(true)
      const { error } = await supabase.from('expenses').insert([
        {
          title,
          amount: parseFloat(amount),
          category_id: categoryId,
          date: new Date().toISOString().split('T')[0]
        }
      ])

      if (error) throw error

      // Reset form
      setAmount('')
      setTitle('')
      setCategoryId('')
      
      // Refresh data and go to dashboard
      await fetchData()
      setActiveTab('dashboard')
    } catch (error) {
      console.error('Error saving expense:', error.message)
      alert('Errore nel salvataggio della spesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFilteredExpenses = () => {
    const now = new Date()
    // Normalizziamo l'ora alla fine della giornata odierna
    now.setHours(23, 59, 59, 999)
    
    return expenses.filter(exp => {
      const expDate = new Date(exp.date)
      
      if (timeRange === 'today') {
        // Confrontiamo solo la data (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0]
        return exp.date === todayStr
      } else if (timeRange === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return expDate >= weekAgo && expDate <= now
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now)
        monthAgo.setDate(now.getDate() - 30)
        return expDate >= monthAgo && expDate <= now
      }
      return true
    })
  }

  const filteredExpenses = getFilteredExpenses()
  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0)

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Pay & Track</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Bentornato</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="animate-fade-in">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Time Range Selector */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`btn ${timeRange === 'today' ? '' : 'btn-outline'}`} 
                    onClick={() => setTimeRange('today')} 
                    style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}
                  >
                    Oggi
                  </button>
                  <button 
                    className={`btn ${timeRange === 'week' ? '' : 'btn-outline'}`} 
                    onClick={() => setTimeRange('week')} 
                    style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}
                  >
                    7 Giorni
                  </button>
                  <button 
                    className={`btn ${timeRange === 'month' ? '' : 'btn-outline'}`} 
                    onClick={() => setTimeRange('month')} 
                    style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}
                  >
                    30 Giorni
                  </button>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', border: 'none' }}>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '4px' }}>
                    {timeRange === 'today' ? 'Spesa di Oggi' : timeRange === 'week' ? 'Spesa Ultimi 7 Giorni' : 'Spesa Ultimi 30 Giorni'}
                  </p>
                  <h2 style={{ fontSize: '2.5rem', color: 'white', margin: 0 }}>€ {totalExpense.toFixed(2)}</h2>
                </div>
                
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                    {timeRange === 'today' ? 'Spese di Oggi' : 'Ultime Spese'}
                  </h3>
                  {filteredExpenses.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>Nessuna spesa in questo periodo.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredExpenses.map(expense => (
                        <div key={expense.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <p style={{ fontWeight: '500', fontSize: '0.95rem' }}>{expense.title}</p>
                            <span style={{ fontSize: '0.75rem', color: expense.category?.color || 'var(--text-muted)' }}>
                              {expense.category?.name || 'Senza Categoria'} • {new Date(expense.date).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <div style={{ fontWeight: '600', color: 'var(--danger)' }}>
                            -€ {Number(expense.amount).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'add' && (
              <div className="card">
                <h2 style={{ marginBottom: '20px' }}>Aggiungi Spesa</h2>
                <form onSubmit={handleAddExpense}>
                  <div className="form-group">
                    <label className="form-label">Importo (€)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="0.00" 
                      step="0.01" 
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Titolo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Es. Caffè" 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select 
                      className="form-control" 
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Seleziona...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Salvataggio...' : 'Salva Spesa'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="card">
                <h2>Statistiche</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Presto disponibile...</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="card">
                <h2>Impostazioni</h2>
                <div style={{ marginTop: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Budget Mensile (€)</label>
                    <input type="number" className="form-control" placeholder="0.00" />
                  </div>
                  <button className="btn btn-outline" style={{ width: '100%' }}>Aggiorna Budget</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Home />
          <span>Dashboard</span>
        </button>
        <button className={`nav-item ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
          <PlusCircle />
          <span>Aggiungi</span>
        </button>
        <button className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
          <PieChart />
          <span>Analisi</span>
        </button>
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings />
          <span>Impostazioni</span>
        </button>
      </nav>
    </div>
  )
}

export default App
