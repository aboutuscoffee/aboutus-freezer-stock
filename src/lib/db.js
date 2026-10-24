import { supabase } from './supabase';

export async function fetchAll() {
  const [items, lots] = await Promise.all([
    supabase.from('fs_items').select('*').order('sort_order').order('created_at'),
    supabase.from('fs_lots').select('*').gt('quantity', 0).order('made_on'),
  ]);
  if (items.error) throw items.error;
  if (lots.error) throw lots.error;
  return { items: items.data, lots: lots.data };
}

export async function saveItem(item) {
  const row = { name: item.name, shelf_life_days: item.shelf_life_days, sort_order: item.sort_order ?? 0 };
  const q = item.id
    ? supabase.from('fs_items').update(row).eq('id', item.id)
    : supabase.from('fs_items').insert(row);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteItem(id) {
  const { error } = await supabase.from('fs_items').delete().eq('id', id);
  if (error) throw error;
}

export async function addLot({ item_id, made_on, expires_on, quantity }) {
  const { error } = await supabase.from('fs_lots').insert({ item_id, made_on, expires_on, quantity });
  if (error) throw error;
}

export async function updateLot(id, fields) {
  const { error } = await supabase
    .from('fs_lots')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function adjustLot(id, delta) {
  const { data, error } = await supabase.rpc('fs_adjust_lot', { p_lot_id: id, p_delta: delta });
  if (error) throw error;
  return data;
}

export async function deleteLot(id) {
  const { error } = await supabase.from('fs_lots').delete().eq('id', id);
  if (error) throw error;
}
