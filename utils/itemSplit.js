import { ApiHelper } from './apiHelper'

/**
 * Split an item into two records: decrement original qty and create a new item with splitQty.
 * @param {string|number} itemId
 * @param {number} splitQty
 * @returns {Promise<object>} created item response
 */
export async function splitItem(itemId, splitQty) {
  if (!itemId) throw new Error('missing itemId')
  if (!splitQty || splitQty < 1) throw new Error('invalid splitQty')

  // load original item
  const res = await ApiHelper.get(`/items/${itemId}`)
  const orig = (res && res.code === 1 && res.data) ? res.data : (res || {})
  const origQty = Number(orig.qty ?? orig.quantity ?? 0)
  if (!origQty || splitQty >= origQty) throw new Error('splitQty must be less than current qty')

  // 1) update original item qty
  const updatePayload = { itemId, qty: origQty - splitQty }
  const updateRes = await ApiHelper.put('/items', updatePayload)
  if (!(updateRes && updateRes.code === 1)) {
    throw new Error(updateRes?.msg || 'failed to update original item')
  }

  // 2) prepare new item payload copying most fields but removing identifiers and fees
  const copy = { ...orig }
  // remove server identifiers / fields that should not be duplicated
  delete copy.itemId
  delete copy.sendPackageNo
  delete copy.sendParcelId
  delete copy.inspectFee
  delete copy.keepFee
  delete copy.packingFee
  delete copy.otherFee
  delete copy.ispaid
  delete copy.feeRemarks
  delete copy.paymentDate

  // set quantity for new item
  copy.qty = splitQty

  // keep storage slot if present
  if (orig.slot) copy.slot = orig.slot

  // ensure category and isGood preserved
  if (orig.dictId) copy.dictId = orig.dictId
  if (typeof orig.isGood !== 'undefined') copy.isGood = orig.isGood

  // ensure paid flags default to 0
  if (typeof copy.ispaid === 'undefined' || copy.ispaid === null) copy.ispaid = 0
  if (typeof copy.isPaid === 'undefined' || copy.isPaid === null) copy.isPaid = 0

  // 3) create new item
  const addRes = await ApiHelper.post('/items', copy)
  if (!(addRes && addRes.code === 1)) {
    // attempt to rollback original qty when creation fails
    try { await ApiHelper.put('/items', { itemId, qty: origQty }) } catch (e) { /* ignore rollback errors */ }
    throw new Error(addRes?.msg || 'failed to create split item')
  }

  return addRes
}
