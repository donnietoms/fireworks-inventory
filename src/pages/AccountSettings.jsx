import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './AccountSettings.css';

const SUBSCRIPTION_LIMITS = {
  starter: 500,
  advanced: 1500,
  professional: Infinity
};

const TIER_FEATURES = {
  starter: [
    'Up to 500 inventory items',
    'Basic inventory tracking',
    'Order management',
    'Show tracking',
    'CSV/Excel export'
  ],
  advanced: [
    'Up to 1,500 inventory items',
    'Advanced inventory tracking',
    'Order management',
    'Show tracking',
    'CSV/Excel/JSON export',
    'Priority support',
    'Advanced reporting'
  ],
  professional: [
    'Unlimited inventory items',
    'Full inventory tracking',
    'Order management',
    'Show tracking',
    'All export formats',
    'Priority support',
    'Advanced reporting',
    'Custom integrations',
    'API access'
  ]
};

function AccountSettings() {
  const { user, getUserProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  
  // Subscription state
  const [inventoryCount, setInventoryCount] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState('starter');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  
  // Delete account state
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Load profile and inventory data
  useEffect(() => {
    loadProfileData();
    loadInventoryCount();
  }, []);
  
  const loadProfileData = async () => {
    setProfileLoading(true);
    try {
      const { data, error } = await getUserProfile();
      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setSubscriptionTier(data.subscription_tier || 'starter');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfileMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setProfileLoading(false);
    }
  };
  
  const loadInventoryCount = async () => {
    try {
      // Get all inventory items for this user
      const { data, error } = await supabase
        .from('inventory')
        .select('part_number')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Count unique part numbers
      const uniquePartNumbers = new Set(data?.map(item => item.part_number) || []);
      setInventoryCount(uniquePartNumbers.size);
    } catch (error) {
      console.error('Error loading inventory count:', error);
    }
  };
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMessage(null);
    
    try {
      const { data, error } = await updateUserProfile({
        full_name: fullName
      });
      
      if (error) throw error;
      
      setProfile(data);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      // First, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordMessage(null), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleExportAllData = async () => {
    try {
      // Get all user data
      const [inventoryRes, ordersRes, showsRes] = await Promise.all([
        supabase.from('inventory').select('*').eq('user_id', user.id),
        supabase.from('orders').select('*').eq('user_id', user.id),
        supabase.from('shows').select('*').eq('user_id', user.id)
      ]);
      
      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          email: user.email,
          fullName: profile?.full_name,
          subscriptionTier: profile?.subscription_tier
        },
        inventory: inventoryRes.data || [],
        orders: ordersRes.data || [],
        shows: showsRes.data || []
      };
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fireworks-inventory-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data: ' + error.message);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (subscriptionTier !== 'starter') {
      alert('Please cancel your subscription before deleting your account.');
      return;
    }
    
    if (deleteConfirmEmail !== user.email) {
      alert('Email does not match. Please type your email to confirm deletion.');
      return;
    }
    
    if (!confirm('Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.')) {
      return;
    }
    
    setDeleteLoading(true);
    
    try {
      // Delete user account (cascade deletes should handle related data)
      const { error } = await supabase.rpc('delete_user');
      
      if (error) {
        // If RPC doesn't exist, try direct auth deletion
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
        if (authError) throw authError;
      }
      
      // Sign out and redirect
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account: ' + error.message);
      setDeleteLoading(false);
    }
  };
  
  const handleUpgradePlan = () => {
    alert('Upgrade functionality coming soon! Please contact support for pricing and upgrade options.');
  };
  
  const getUsagePercentage = () => {
    const limit = SUBSCRIPTION_LIMITS[subscriptionTier];
    if (limit === Infinity) return 0;
    return Math.min((inventoryCount / limit) * 100, 100);
  };
  
  const formatTierName = (tier) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };
  
  if (profileLoading) {
    return <div className="loading">Loading account settings...</div>;
  }

  return (
    <div className="account-settings">
      <div className="settings-header">
        <button onClick={() => navigate('/app')} className="back-button">
          ← Back to Inventory
        </button>
        <h1>Account Settings</h1>
      </div>
      
      <div className="settings-container">
        {/* Profile Information */}
        <section className="settings-section">
          <h2>Profile Information</h2>
          
          {profileMessage && (
            <div className={`message message-${profileMessage.type}`}>
              {profileMessage.text}
            </div>
          )}
          
          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input-disabled"
              />
              <small>Email cannot be changed</small>
            </div>
            
            <div className="form-group">
              <label>Account Created</label>
              <input
                type="text"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                disabled
                className="input-disabled"
              />
            </div>
            
            <div className="form-group">
              <label>Email Verified</label>
              <input
                type="text"
                value={user?.email_confirmed_at ? 'Yes' : 'No'}
                disabled
                className="input-disabled"
              />
            </div>
            
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>
        
        {/* Subscription & Billing */}
        <section className="settings-section">
          <h2>Subscription & Billing</h2>
          
          <div className="subscription-info">
            <div className="tier-badge tier-badge-{subscriptionTier}">
              {formatTierName(subscriptionTier)} Plan
            </div>
            
            <div className="usage-stats">
              <div className="usage-header">
                <span className="usage-label">Inventory Usage</span>
                <span className="usage-count">
                  {inventoryCount} / {SUBSCRIPTION_LIMITS[subscriptionTier] === Infinity ? '∞' : SUBSCRIPTION_LIMITS[subscriptionTier]} items
                </span>
              </div>
              
              {SUBSCRIPTION_LIMITS[subscriptionTier] !== Infinity && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${getUsagePercentage()}%` }}
                  />
                </div>
              )}
            </div>
            
            <div className="features-list">
              <h3>Current Plan Features</h3>
              <ul>
                {TIER_FEATURES[subscriptionTier].map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>
            
            {subscriptionTier !== 'professional' && (
              <button onClick={handleUpgradePlan} className="btn-upgrade">
                Upgrade Plan
              </button>
            )}
          </div>
        </section>
        
        {/* Security */}
        <section className="settings-section">
          <h2>Security</h2>
          
          {passwordMessage && (
            <div className={`message message-${passwordMessage.type}`}>
              {passwordMessage.text}
            </div>
          )}
          
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            
            <button type="submit" className="btn-primary" disabled={passwordLoading}>
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </section>
        
        {/* Danger Zone */}
        <section className="settings-section danger-zone">
          <h2>Danger Zone</h2>
          
          <div className="danger-section">
            <h3>Export All Data</h3>
            <p>Download all your inventory, orders, and show data as a JSON file.</p>
            <button onClick={handleExportAllData} className="btn-secondary">
              Export All Data
            </button>
          </div>
          
          <div className="danger-section">
            <h3>Delete Account</h3>
            
            {subscriptionTier !== 'starter' ? (
              <div className="warning-box">
                <p><strong>Cannot delete account:</strong> You must cancel your subscription before deleting your account.</p>
              </div>
            ) : (
              <>
                <div className="warning-box">
                  <p><strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.</p>
                </div>
                
                <div className="form-group">
                  <label>Type your email ({user?.email}) to confirm:</label>
                  <input
                    type="email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                
                <button
                  onClick={handleDeleteAccount}
                  className="btn-danger"
                  disabled={deleteLoading || deleteConfirmEmail !== user?.email}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Account Permanently'}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AccountSettings;
