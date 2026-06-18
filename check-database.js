// Script to check Supabase database data
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = 'https://mvqmagweusujymmzympo.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cW1hZ3dldXN1anltbXp5bXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc0NTI0OSwiZXhwIjoyMDk3MzIxMjQ5fQ.SNH_ItOf9NzoGw7rAxIGBuN8ccOtBv7vj7ClvXwxtuA'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    transport: ws
  }
})

async function checkDatabase() {
  console.log('Checking Supabase database...\n')

  // Check profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
  
  console.log('=== PROFILES ===')
  console.log(`Count: ${profiles?.length || 0}`)
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`  - ${p.email} (${p.subscription_tier})`)
    })
  }
  console.log()

  // Check orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  
  console.log('=== ORDERS ===')
  console.log(`Count: ${orders?.length || 0}`)
  if (orders && orders.length > 0) {
    orders.forEach(o => {
      console.log(`  - Order #${o.order_number} (${o.vendor}) - $${o.total}`)
    })
  }
  console.log()

  // Check inventory
  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log('=== INVENTORY (last 10) ===')
  console.log(`Count: ${inventory?.length || 0}`)
  if (inventory && inventory.length > 0) {
    inventory.forEach(i => {
      console.log(`  - ${i.part_number}: ${i.description} (qty: ${i.quantity}, cost: $${i.cost})`)
    })
  }
  console.log()

  // Check shows
  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select('*')
    .order('created_at', { ascending: false })
  
  console.log('=== SHOWS ===')
  console.log(`Count: ${shows?.length || 0}`)
  if (shows && shows.length > 0) {
    shows.forEach(s => {
      console.log(`  - ${s.show_name} on ${s.show_date} - $${s.total_value}`)
    })
  }
  console.log()

  // Check show items
  const { data: showItems, error: showItemsError } = await supabase
    .from('show_items')
    .select('*')
    .limit(10)
  
  console.log('=== SHOW ITEMS (last 10) ===')
  console.log(`Count: ${showItems?.length || 0}`)
  if (showItems && showItems.length > 0) {
    showItems.forEach(i => {
      console.log(`  - ${i.part_number}: ${i.quantity} @ $${i.cost} (show_id: ${i.show_id})`)
    })
  }
  console.log()

  console.log('✓ Database check complete!')
}

checkDatabase()
