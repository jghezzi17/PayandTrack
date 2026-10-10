import { useState, useEffect } from 'react'
import { Home, PlusCircle, PieChart, Settings, Loader2, Edit2, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from './lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend)

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Filtering states
  const [timeRange, setTimeRange] = useState('day') // 'day', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Add Expense State
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const autoCategorize = async (uncategorizedExpenses, fetchedCats, categorizedExpenses) => {
    if (uncategorizedExpenses.length === 0) return false;

    let updatesMade = false;
    const catMap = {}
    fetchedCats.forEach(c => catMap[c.name.toLowerCase()] = c.id)

    const learnedMap = {}
    categorizedExpenses.forEach(e => {
      learnedMap[e.title.toLowerCase().trim()] = e.category_id
    })

    const rules = {
      'cibo': ['mcdonald', 'bar', 'ristorante', 'pizzeria', 'caffè', 'starbucks', 'kfc', 'sushi', 'deliveroo', 'justeat', 'glovo', 'burger'],
      'spesa': ['esselunga', 'coop', 'conad', 'carrefour', 'pam', 'lidl', 'eurospin', 'supermercato', 'spesa'],
      'trasporti': ['trenitalia', 'uber', 'taxi', 'eni', 'q8', 'ip', 'treno', 'italo', 'atm', 'biglietto', 'benzina', 'diesel', 'transport', 'flight', 'ryanair', 'easyjet'],
      'amazon': ['amazon', 'prime'],
    }

    const updates = uncategorizedExpenses.map(exp => {
      const lowerTitle = exp.title.toLowerCase().trim()

      if (learnedMap[lowerTitle]) {
        updatesMade = true;
        return supabase.from('expenses').update({ category_id: learnedMap[lowerTitle] }).eq('id', exp.id)
      }

      let matchedCategoryName = 'altro'
      for (const [catName, keywords] of Object.entries(rules)) {
        if (keywords.some(kw => lowerTitle.includes(kw))) {
          matchedCategoryName = catName
          break
        }
      }

      const assignedCatId = catMap[matchedCategoryName] || catMap['altro']
      if (assignedCatId) {
        updatesMade = true;
        return supabase.from('expenses').update({ category_id: assignedCatId }).eq('id', exp.id)
      }
      return null
    }).filter(Boolean)

    if (updates.length > 0) {
      await Promise.all(updates)
    }
    return updatesMade;
  }

  const fetchData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true)
      else setLoading(true)
      
      const { data: cats, error: catError } = await supabase.from('categories').select('*')
      if (catError) throw catError
      setCategories(cats || [])

      const { data: exp, error: expError } = await supabase
        .from('expenses')
        .select(`*, category:categories(*)`)
        .order('created_at', { ascending: true }) 
        
      if (expError) throw expError
      
      const sortedExp = (exp || []).reverse()
      const uncategorized = sortedExp.filter(e => !e.category_id)
      const chronologicalCategorized = (exp || []).filter(e => e.category_id)
      
      const wasUpdated = await autoCategorize(uncategorized, cats || [], chronologicalCategorized)
      
      if (wasUpdated) {
        const { data: updatedExp } = await supabase
          .from('expenses')
          .select(`*, category:categories(*)`)
          .order('date', { ascending: false })
        setExpenses(updatedExp || [])
      } else {
        const finalSorted = [...sortedExp].sort((a,b) => new Date(b.date) - new Date(a.date))
        setExpenses(finalSorted)
      }
    } catch (error) {
      console.error('Error fetching data:', error.message)
      alert('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!amount || !title || !categoryId) return alert('Compila tutti i campi')

    try {
      setIsSubmitting(true)
      // Seleziona la data attuale mostrata, o usa quella di oggi se l'utente non è su 'day'
      const dateToSave = timeRange === 'day' ? selectedDate : new Date().toISOString().split('T')[0]
      
      const { error } = await supabase.from('expenses').insert([
        {
          title,
          amount: parseFloat(amount),
          category_id: categoryId,
          date: dateToSave
        }
      ])
      if (error) throw error
      setAmount('')
      setTitle('')
      setCategoryId('')
      await fetchData()
      setActiveTab('dashboard')
    } catch (error) {
      alert('Errore nel salvataggio della spesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (expense) => {
    setEditingExpense(expense)
    setEditTitle(expense.title)
    setEditAmount(expense.amount)
    setEditCategoryId(expense.category_id || '')
  }

  const handleUpdateExpense = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const { error } = await supabase.from('expenses').update({
        title: editTitle,
        amount: parseFloat(editAmount),
        category_id: editCategoryId
      }).eq('id', editingExpense.id)
      
      if (error) throw error
      setEditingExpense(null)
      await fetchData()
    } catch (error) {
      alert('Errore nella modifica della spesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!window.confirm("Vuoi davvero eliminare questa spesa?")) return;
    try {
      setIsSubmitting(true)
      const { error } = await supabase.from('expenses').delete().eq('id', editingExpense.id)
      if (error) throw error
      setEditingExpense(null)
      await fetchData()
    } catch (error) {
      alert('Errore nell\'eliminazione della spesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeDate = (daysToAdd) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + daysToAdd)
    setSelectedDate(d.toISOString().split('T')[0])
    setTimeRange('day')
  }

  const getDisplayDate = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (selectedDate === todayStr) return 'Oggi'
    if (selectedDate === yesterdayStr) return 'Ieri'
    return new Date(selectedDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getFilteredExpenses = () => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    return expenses.filter(exp => {
      const expDate = new Date(exp.date)
      if (timeRange === 'day') return exp.date === selectedDate
      if (timeRange === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return expDate >= weekAgo && expDate <= now
      }
      if (timeRange === 'month') {
        const monthAgo = new Date(now)
        monthAgo.setDate(now.getDate() - 30)
        return expDate >= monthAgo && expDate <= now
      }
      return true
    })
  }

  const filteredExpenses = getFilteredExpenses()
  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0)

  // --- ANALISI & STATISTICHE LOGIC ---
  const calculateAverages = () => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const weekExp = expenses.filter(e => new Date(e.date) >= weekAgo && new Date(e.date) <= now)
    const weekTotal = weekExp.reduce((sum, e) => sum + Number(e.amount), 0)
    
    const monthAgo = new Date(now)
    monthAgo.setDate(now.getDate() - 30)
    const monthExp = expenses.filter(e => new Date(e.date) >= monthAgo && new Date(e.date) <= now)
    const monthTotal = monthExp.reduce((sum, e) => sum + Number(e.amount), 0)

    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const thisMonthExp = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const thisMonthTotal = thisMonthExp.reduce((sum, e) => sum + Number(e.amount), 0)
    
    const today = now.getDate()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const prediction = today > 0 ? (thisMonthTotal / today) * daysInMonth : 0

    return {
      avg7: weekTotal / 7,
      avg30: monthTotal / 30,
      prediction,
      monthTotal,
      weekExp,
      monthExp
    }
  }

  const stats = calculateAverages()

  const getLineChartData = () => {
    const days = []
    const totals = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      days.push(d.toLocaleDateString('it-IT', { weekday: 'short' }))
      
      const dayTotal = expenses
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + Number(e.amount), 0)
      totals.push(dayTotal)
    }
    return {
      labels: days,
      datasets: [
        {
          label: 'Spesa Giornaliera (€)',
          data: totals,
          borderColor: '#5e6ad2',
          backgroundColor: 'rgba(94, 106, 210, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    }
  }

  const getDoughnutChartData = () => {
    const categoryTotals = {}
    stats.monthExp.forEach(e => {
      const catName = e.category?.name || 'Altro'
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(e.amount)
    })
    const bgColors = ['#ff4d4d', '#9b59b6', '#f1c40f', '#e67e22', '#3498db', '#2ecc71', '#8b8d98']
    return {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: bgColors.slice(0, Object.keys(categoryTotals).length),
          borderWidth: 0,
        }
      ]
    }
  }

  // Modal Styles
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px'
  }
  const modalContentStyle = {
    background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)',
    width: '100%', maxWidth: '400px', border: '1px solid var(--border)'
  }

  const getCardTitle = () => {
    if (timeRange === 'day') return `Spesa del ${getDisplayDate()}`
    if (timeRange === 'week') return 'Spesa Ultimi 7 Giorni'
    if (timeRange === 'month') return 'Spesa Ultimi 30 Giorni'
    return 'Spesa'
  }

  return (
    <div className="app-container">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Pay & Track</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Bentornato</p>
        </div>
        <button 
          onClick={() => fetchData(true)} 
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer', transition: 'background 0.2s' }}
          className={isRefreshing ? 'animate-spin' : ''}
          aria-label="Aggiorna dati"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Edit Modal */}
      {editingExpense && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem' }}>Modifica Spesa</h2>
              <button onClick={() => setEditingExpense(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleUpdateExpense}>
              <div className="form-group">
                <label className="form-label">Titolo</label>
                <input type="text" className="form-control" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Importo (€)</label>
                <input type="number" step="0.01" className="form-control" value={editAmount} onChange={e => setEditAmount(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-control" value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)} required>
                  <option value="">Seleziona...</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button type="submit" className="btn" style={{ flex: 2 }} disabled={isSubmitting}>Salva</button>
                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteExpense} disabled={isSubmitting}>Elimina</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="animate-fade-in">
        {loading && !isRefreshing ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} color="var(--primary)" /></div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Time Range Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={`btn ${timeRange === 'day' ? '' : 'btn-outline'}`} onClick={() => {setTimeRange('day'); setSelectedDate(new Date().toISOString().split('T')[0]);}} style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}>Oggi</button>
                    <button className={`btn ${timeRange === 'week' ? '' : 'btn-outline'}`} onClick={() => {setTimeRange('week');}} style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}>7 Giorni</button>
                    <button className={`btn ${timeRange === 'month' ? '' : 'btn-outline'}`} onClick={() => {setTimeRange('month');}} style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}>30 Giorni</button>
                  </div>
                  
                  {timeRange === 'day' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={20} />
                      </button>
                      
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{getDisplayDate()}</span>
                        <input 
                          type="date" 
                          value={selectedDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedDate(e.target.value)
                              setTimeRange('day')
                            }
                          }}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        />
                      </div>

                      <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', border: 'none' }}>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '4px' }}>
                    {getCardTitle()}
                  </p>
                  <h2 style={{ fontSize: '2.5rem', color: 'white', margin: 0 }}>€ {totalExpense.toFixed(2)}</h2>
                </div>
                
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                    {timeRange === 'day' ? `Spese del ${getDisplayDate()}` : 'Ultime Spese'}
                  </h3>
                  {filteredExpenses.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>Nessuna spesa trovata.</p>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--danger)' }}>-€ {Number(expense.amount).toFixed(2)}</div>
                            <button onClick={() => openEditModal(expense)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                              <Edit2 size={16} />
                            </button>
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
                  <div className="form-group"><label className="form-label">Importo (€)</label><input type="number" className="form-control" placeholder="0.00" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Titolo</label><input type="text" className="form-control" placeholder="Es. Caffè" required value={title} onChange={e => setTitle(e.target.value)} /></div>
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select className="form-control" required value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                      <option value="">Seleziona...</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px' }} disabled={isSubmitting}>{isSubmitting ? 'Salvataggio...' : 'Salva Spesa'}</button>
                </form>
              </div>
            )}

            {activeTab === 'insights' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card">
                  <h2 style={{ marginBottom: '16px' }}>Andamento (Ultimi 7 gg)</h2>
                  <Line 
                    data={getLineChartData()} 
                    options={{ 
                      plugins: { legend: { display: false } }, 
                      scales: { 
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8d98' } }, 
                        x: { grid: { display: false }, ticks: { color: '#8b8d98' } } 
                      } 
                    }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Media 7 Giorni</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>€ {stats.avg7.toFixed(2)} <span style={{fontSize:'0.8rem', fontWeight:'normal'}}>/gg</span></p>
                  </div>
                  <div className="card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Media 30 Giorni</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>€ {stats.avg30.toFixed(2)} <span style={{fontSize:'0.8rem', fontWeight:'normal'}}>/gg</span></p>
                  </div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Predizione spesa di questo mese</p>
                  <h3 style={{ fontSize: '1.8rem', margin: '4px 0' }}>€ {stats.prediction.toFixed(2)}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Basata sulla tua spesa media attuale di {stats.monthTotal.toFixed(2)}€ fino ad oggi.</p>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '16px' }}>Categorie (Ultimi 30 gg)</h3>
                  {stats.monthExp.length > 0 ? (
                    <div style={{ width: '80%', margin: '0 auto' }}>
                      <Doughnut 
                        data={getDoughnutChartData()} 
                        options={{ plugins: { legend: { position: 'bottom', labels: { color: '#f0f0f2' } } }, cutout: '70%', borderDash: [2] }} 
                      />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Dati insufficienti.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="card">
                <h2>Impostazioni</h2>
                <div style={{ marginTop: '20px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Questa app è connessa al tuo database privato Supabase.</p>
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

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><Home /><span>Dashboard</span></button>
        <button className={`nav-item ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}><PlusCircle /><span>Aggiungi</span></button>
        <button className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}><PieChart /><span>Analisi</span></button>
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings /><span>Impostazioni</span></button>
      </nav>
    </div>
  )
}
