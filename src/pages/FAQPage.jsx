import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './FAQPage.css';

function FAQPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(null);

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqSections = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "How do I get started with Fireworks Inventory Manager?",
          a: "Sign up for a free 14-day trial (no credit card required). Once logged in, you can start adding inventory manually, upload CSV/Excel files, or parse PDF invoices from supported vendors (Wisley, Spirit of 76, American Wholesale, Fireworks Forever)."
        },
        {
          q: "What file formats can I import?",
          a: "You can import CSV files, Excel spreadsheets (.xlsx, .xls), and PDF invoices from supported vendors. For manual data entry, simply use the 'Add Item' button in the Current Inventory tab."
        },
        {
          q: "Do I need to enter part numbers for every item?",
          a: "Yes, part numbers are required for accurate inventory tracking and unique item counting. When importing files, the system will prompt you to fill in any missing part numbers before completing the import."
        },
        {
          q: "How do I track a show or event?",
          a: "Go to the 'Shows' tab and create a new show. You can import a shoot list (CSV/Excel) or manually add items. The system automatically calculates costs using FIFO (First In, First Out) pricing and deducts items from your inventory when you finalize the show."
        },
        {
          q: "Can I undo a show if I made a mistake?",
          a: "Currently, shows are permanent once created. As a workaround, you can manually add items back to inventory or create an offsetting inventory adjustment. We're working on adding an 'undo show' feature in a future update."
        }
      ]
    },
    {
      category: "Features & Functionality",
      questions: [
        {
          q: "What is FIFO and how does it work?",
          a: "FIFO (First In, First Out) means the oldest inventory items are used first when calculating show costs. Each time you add inventory from an order, those items are tracked separately. When you create a show, the system pulls from the oldest stock first, ensuring accurate cost tracking for your events."
        },
        {
          q: "Which vendors are supported for PDF invoice parsing?",
          a: "We support PDF invoices from: Wisley (two-pass parsing for accuracy), Spirit of 76, American Wholesale, and Fireworks Forever. Upload the PDF and the system will automatically extract items, prices, quantities, and packing information."
        },
        {
          q: "How does the YouTube integration work?",
          a: "Add YouTube video links to your inventory items to preview what the product looks like in action. This helps you plan shows and remember what you own before using it. Simply paste a YouTube URL when editing an item."
        },
        {
          q: "What does 'packing' mean?",
          a: "Packing format (e.g., '24/1' or '4/12') shows how items are packaged. The format is 'packages per case / items per package'. For example, '24/1' means 24 packages in a case with 1 item per package (24 total units). '4/12' means 4 packages with 12 items each (48 total units)."
        },
        {
          q: "Can I export my data to Finale 3D?",
          a: "Yes! Use the 'Export CSV' feature to download your inventory or show data in CSV format, which can be imported into Finale 3D for advanced show planning and visualization."
        },
        {
          q: "What does 'Resync Show Costs' do?",
          a: "If you add older inventory (backdated orders) after creating a show, the show costs may be incorrect. The 'Resync' button recalculates show costs using FIFO with the updated inventory data, ensuring accurate pricing."
        },
        {
          q: "Can inventory go negative?",
          a: "Yes, the system allows zero and negative inventory to track oversold situations. This helps you identify when you've promised more items than you have in stock."
        }
      ]
    },
    {
      category: "Billing & Subscriptions",
      questions: [
        {
          q: "How does the free trial work?",
          a: "All new accounts get a 14-day free trial with full access to Starter tier features (up to 500 unique items). No credit card required. After the trial, you can choose to upgrade or continue with free tier limitations."
        },
        {
          q: "How are 'unique items' counted for subscription limits?",
          a: "Unique items are counted by distinct part numbers, not total inventory records. For example, if you have 10 orders of the same firework (creating 10 FIFO records), it only counts as 1 unique item toward your limit."
        },
        {
          q: "What are the subscription tiers?",
          a: "Starter (Free): 500 unique items, manual entry, CSV/Excel import/export. Advanced ($29/month): 1,500 items + PDF parsing + YouTube integration. Professional ($79/month): Unlimited items + priority support + advanced features."
        },
        {
          q: "Can I upgrade or downgrade my plan?",
          a: "Yes, you can upgrade anytime from your Account Settings page. Downgrades take effect at the end of your current billing period. If you exceed your new tier's item limit, you'll be prompted to remove items before downgrading."
        },
        {
          q: "What happens if I exceed my item limit?",
          a: "The system will notify you when you're approaching your limit. Once reached, you won't be able to add new unique part numbers until you upgrade or remove items. Existing inventory and shows remain accessible."
        },
        {
          q: "Can I cancel anytime?",
          a: "Yes, cancel anytime from Account Settings. Your account remains active until the end of your current billing period. Your data is retained for 30 days after cancellation in case you want to reactivate."
        },
        {
          q: "Is there a refund policy?",
          a: "We offer a 30-day money-back guarantee on all paid subscriptions. If you're not satisfied within the first 30 days, contact support for a full refund."
        }
      ]
    },
    {
      category: "Account & Security",
      questions: [
        {
          q: "Is my data secure?",
          a: "Yes, all data is stored in Supabase (PostgreSQL) with Row Level Security (RLS), ensuring your data is completely isolated from other users. We use industry-standard encryption for data in transit (HTTPS/SSL) and at rest."
        },
        {
          q: "Can I use Google to sign in?",
          a: "Yes, Google OAuth is available on the production site (fireworksinventory.com). Simply click 'Continue with Google' on the login or signup page. Your Google account will be securely linked to your inventory account."
        },
        {
          q: "How do I change my password?",
          a: "Go to Account Settings → Security section and click 'Change Password'. You'll receive an email with a password reset link. For Google accounts, password changes are managed through Google."
        },
        {
          q: "Can I export all my data?",
          a: "Yes, go to Account Settings → Danger Zone → 'Export All Data'. This downloads a JSON file containing all your inventory, orders, shows, and settings. You can use this for backups or to migrate data."
        },
        {
          q: "How do I delete my account?",
          a: "Go to Account Settings → Danger Zone → 'Delete Account'. You'll need to type your email to confirm. Note: Account deletion is only available for free tier users. Paid subscribers must cancel and wait for billing to end before deletion."
        }
      ]
    },
    {
      category: "Troubleshooting",
      questions: [
        {
          q: "My PDF invoice didn't parse correctly. What should I do?",
          a: "First, ensure the PDF is from a supported vendor (Wisley, Spirit of 76, American Wholesale, Fireworks Forever). If it still fails, you can manually review and edit the parsed data before importing, or use CSV import as a fallback."
        },
        {
          q: "Why are my show costs different after adding inventory?",
          a: "Show costs are calculated using FIFO at the time of creation. If you add older inventory (backdated orders) later, you need to click 'Resync Show Costs' to recalculate with the updated FIFO order."
        },
        {
          q: "I can't add more items. Why?",
          a: "You've likely reached your subscription tier's unique item limit. Check Account Settings → Subscription & Billing to see your current usage. Upgrade to a higher tier or remove unused items to continue."
        },
        {
          q: "Where did my invoice PDF go?",
          a: "Invoice PDFs are stored in Supabase Storage. You can view them by clicking the PDF button in the Orders table. If you don't see the button, the PDF may not have uploaded successfully—try re-uploading the order."
        },
        {
          q: "How do I contact support?",
          a: "Email support is available for all tiers. Professional subscribers get priority support with faster response times. Contact us at support@fireworksinventory.com."
        }
      ]
    }
  ];

  return (
    <div className="faq-page">
      <header className="faq-header">
        <div className="faq-header-content">
          <h1>Frequently Asked Questions</h1>
          <p>Everything you need to know about Fireworks Inventory Manager</p>
        </div>
        <div className="faq-header-actions">
          {user ? (
            <button onClick={() => navigate('/app')} className="btn-primary">
              Back to App
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Login</Link>
              <Link to="/signup" className="btn-primary">Sign Up Free</Link>
            </>
          )}
        </div>
      </header>

      <div className="faq-container">
        {faqSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="faq-section">
            <h2 className="faq-category">{section.category}</h2>
            <div className="faq-items">
              {section.questions.map((item, itemIndex) => {
                const globalIndex = `${sectionIndex}-${itemIndex}`;
                const isOpen = openIndex === globalIndex;
                
                return (
                  <div key={globalIndex} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      className="faq-question"
                      onClick={() => toggleQuestion(globalIndex)}
                    >
                      <span>{item.q}</span>
                      <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="faq-answer">
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="faq-footer">
        <div className="faq-footer-content">
          <h3>Still have questions?</h3>
          <p>Can't find what you're looking for? Contact our support team.</p>
          <a href="mailto:support@fireworksinventory.com" className="btn-primary">
            Contact Support
          </a>
        </div>
      </div>

      <div className="faq-nav-footer">
        <Link to="/">← Back to Home</Link>
      </div>
    </div>
  );
}

export default FAQPage;
