/**
 * Title: Reverse Attachment Order
 * Version: 1.0.0
 * License: MIT
 * Author: Justin Barrett
 * Site: http://allaboutthatbase.tips
 * Support: https://ko-fi.com/allaboutthatbase
 * Source: https://github.com/justinsbarrett/airtable-scripts/tree/main/scripting-extension/reverseAttachmentOrder
 * 
 * Description: Reverses the attachment order of files in a specified field.
 * Only records with more than one attachment in the field will be updated.
 */

const settings = input.config({
  title: "Reverse Attachment Order",
  description: "v1.0.0 - Reverses the attachment order of files in a specified field. Only records with more than one attachment in the field will be updated.",
  items: [
      input.config.table("table", {
          label: "Table"
      }),
      input.config.field("field", {
          parentTable: "table",
          label: "Field"
      })
  ]
})

const {table, field} = settings

/**
* Main
*/
const main = async () => {
  output.clear()

  // Check the field type
  if (field.type !== "multipleAttachments") {
      output.text(`❌ Unable to proceed. Selected field is not an attachment field.`)
      return
  }

  output.clear()
  output.markdown("# Retrieving records")
  const query = await table.selectRecordsAsync({fields: [field.name]})

  output.clear()
  output.markdown("# Processing records")
  const recordsWithAttachments = query.records.filter(rec => rec.getCellValue(field) && rec.getCellValue(field).length > 1)
  const updates = recordsWithAttachments.map(rec => {
      const index = recordsWithAttachments.indexOf(rec)
      if (!(index % 100)) {
          output.clear()
          output.markdown("# Processing records")
          output.text(`${index} of ${recordsWithAttachments.length} records processed...`)
      }
      return {
          id: rec.id,
          fields: {
              [field.name]: rec.getCellValue(field).reverse().map(att => {
                  return {
                      filename: att.filename,
                      url: att.url
                  }
              })
          }
      }
  })

  while (updates.length) {
      output.clear()
      output.markdown("# Updating records")
      output.text(`${updates.length} records left to update...`)
      await table.updateRecordsAsync(updates.splice(0, 50))
  }
}

await main()
output.clear()
output.markdown("# Update complete!")
