const supabase = require('../supabase')

async function createAuditLog(
  action,
  item_id,
  old_value,
  new_value,
  description,
  user_id
) {

  const { error } = await supabase
    .from('audit_logs')
    .insert([
      {
        action: action,
        item_id: item_id || null,
        old_value: old_value || null,
        new_value: new_value || null,
        description: description || null,
        user_id: user_id || null
      }
    ])

  if (error) {
    console.log('AUDIT LOG ERROR:')
    console.log(error)
  }

}

module.exports = createAuditLog