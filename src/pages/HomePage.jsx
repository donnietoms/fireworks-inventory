// Marketing homepage
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const { user } = useAuth();
  
  const popularFaqs = [
    {
      q: "How do I get started with Fireworks Inventory Manager?",
      a: "Sign up for a free 14-day trial (no credit card required). Once logged in, you can start adding inventory manually, upload CSV/Excel files, or parse PDF invoices from supported vendors."
    },
    {
      q: "Which vendors are supported for PDF invoice parsing?",
      a: "We support PDF invoices from: Wisley (two-pass parsing for accuracy), Spirit of 76, American Wholesale, and Fireworks Forever. Upload the PDF and the system will automatically extract items, prices, quantities, and packing information."
    },
    {
      q: "What is FIFO and how does it work?",
      a: "FIFO (First In, First Out) means the oldest inventory items are used first when calculating show costs. Each time you add inventory from an order, those items are tracked separately. When you create a show, the system pulls from the oldest stock first, ensuring accurate cost tracking for your events."
    },
    {
      q: "How are 'unique items' counted for subscription limits?",
      a: "Unique items are counted by distinct part numbers, not total inventory records. For example, if you have 10 orders of the same firework (creating 10 FIFO records), it only counts as 1 unique item toward your limit."
    },
    {
      q: "Is my data secure?",
      a: "Yes, all data is stored in Supabase (PostgreSQL) with Row Level Security (RLS), ensuring your data is completely isolated from other users. We use industry-standard encryption for data in transit (HTTPS/SSL) and at rest."
    }
  ];
  
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };
  
  const pricingPlans = [
    {
      name: 'Starter',
      features: [
        'Up to 500 inventory items',
        'Single user access',
        'CSV/Excel import & export',
        'Shoot list tracking',
        'Manual entry forms',
        'Email support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Advanced',
      features: [
        'Up to 1,500 inventory items',
        'Single user access',
        'Everything in Starter, plus:',
        'PDF invoice parsing',
        'YouTube video integration',
        'Finale 3D exports'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Professional',
      features: [
        'Unlimited inventory items',
        'Single user access',
        'Everything in Advanced, plus:',
        'Team collaboration & inventory sharing',
        'Cloud backup & sync',
        'Priority email support'
      ],
      cta: 'Start Free Trial',
      popular: false
    }
  ];

  return (
    <div className="homepage">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <h1>🎆 Fireworks Inventory Manager</h1>
          </div>
          <nav className="nav">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link to="/faq">FAQ</Link>
            {user ? (
              <Link to="/app" className="btn-signup">Go to App</Link>
            ) : (
              <>
                <Link to="/login" className="btn-login">Login</Link>
                <Link to="/signup" className="btn-signup">Sign Up Free</Link>
              </>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <Link to="/faq" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
            {user ? (
              <Link to="/app" className="btn-signup" onClick={() => setMobileMenuOpen(false)}>Go to App</Link>
            ) : (
              <>
                <Link to="/login" className="btn-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link to="/signup" className="btn-signup" onClick={() => setMobileMenuOpen(false)}>Sign Up Free</Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Manage Your Fireworks Inventory Like a Pro
            </h1>
            <p className="hero-subtitle">
              Track orders, manage shows, and keep perfect inventory records. 
              Built specifically for professional pyrotechnicians.
            </p>
            <div className="hero-cta">
              <Link to={user ? "/app" : "/signup"} className="btn-primary">
                {user ? "Go to App" : "Start Free 14-Day Trial"}
              </Link>
              <a href="#demo" className="btn-secondary">
                Watch Demo
              </a>
            </div>
            <p className="hero-note">
              No credit card required • Cancel anytime
            </p>
          </div>
          <div className="hero-image">
            <div className="app-preview">
              <div className="preview-header">Current Inventory</div>
              <div className="preview-table">
                <div className="preview-row">SE172 • Shell Effect • 100 units</div>
                <div className="preview-row">WPI-6-GTW • 6" Titanium Willow • 50 units</div>
                <div className="preview-row">AM-3-BGC • 3" Brocade Crown • 200 units</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Everything You Need</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>PDF Invoice Parsing</h3>
              <p>Upload PDF invoices from your favorite vendors. Automatic extraction of items, quantities, and pricing.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>FIFO Inventory Tracking</h3>
              <p>First-in, first-out inventory management ensures accurate costing and stock rotation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Shoot List Management</h3>
              <p>Track what you've used in each show. Automatically deducts from inventory and calculates show costs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📺</div>
              <h3>YouTube Integration</h3>
              <p>Search YouTube for product demos and effect videos. Preview what you already own before using it in a show.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Finale 3D Export</h3>
              <p>Export your inventory and show quotas to CSV format for import into Finale 3D for show design.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">☁️</div>
              <h3>Cloud Sync</h3>
              <p>Access your inventory from anywhere. Automatic backup and sync across all devices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Start free, upgrade when you need to</p>
          
          <div className="pricing-grid">
            {pricingPlans.map((plan, idx) => (
              <div key={idx} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <h3 className="plan-name">{plan.name}</h3>
                <ul className="plan-features">
                  {plan.features.map((feature, i) => (
                    <li key={i}>✓ {feature}</li>
                  ))}
                </ul>
                <Link 
                  to="/signup" 
                  className={`btn-plan ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section id="faq" className="faq-preview">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Get answers to common questions</p>
          
          <div className="faq-preview-items">
            {popularFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              
              return (
                <div key={index} className={`faq-preview-item ${isOpen ? 'open' : ''}`}>
                  <button
                    className="faq-preview-question"
                    onClick={() => toggleFaq(index)}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-preview-toggle">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-preview-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="faq-preview-cta">
            <Link to="/faq" className="btn-secondary">
              View All FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join hundreds of pyrotechnicians managing their inventory better.</p>
          <Link to="/signup" className="btn-primary btn-large">
            Start Your Free Trial
          </Link>
          <p className="cta-note">14 days free • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link to="/signup">Sign Up</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><Link to="/faq">FAQ</Link></li>
                <li><a href="/docs">Documentation</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/api">API</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/privacy">Privacy</a></li>
                <li><a href="/terms">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Fireworks Inventory Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
