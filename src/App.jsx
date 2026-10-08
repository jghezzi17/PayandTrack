import { useState } from 'react'
import { Home, PlusCircle, PieChart, Settings } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Pay & Track</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Bentornato, Jacopo</p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          J
        </div>
      </header>

      {/* Main Content Area */}
      <main className="animate-fade-in">
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', border: 'none' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '4px' }}>Spesa Mensile</p>
              <h2 style={{ fontSize: '2.5rem', color: 'white', margin: 0 }}>€ 0,00</h2>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
                <span>Budget: € 0,00</span>
                <span>Rimanente: € 0,00</span>
              </div>
            </div>
            
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Ultime Spese</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>Nessuna spesa registrata.</p>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Aggiungi Spesa</h2>
            <div className="form-group">
              <label className="form-label">Importo (€)</label>
              <input type="number" className="form-control" placeholder="0.00" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Titolo</label>
              <input type="text" className="form-control" placeholder="Es. Caffè" />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-control">
                <option value="">Seleziona...</option>
                <option value="cibo">Cibo</option>
                <option value="amazon">Amazon</option>
                <option value="sigarette">Sigarette</option>
              </select>
            </div>
            <button className="btn" style={{ width: '100%', marginTop: '16px' }}>
              Salva Spesa
            </button>
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
