/**
 * Get Table IDs
 * 
 * Author: Justin Barrett
 * Version: 1.0.3
 * 
 * Get IDs from base, table, fields, and views
 * Output either for scripts or custom extensions
 * 
 * Version history:
 * 1.0.0    2022-09-04  Initial tracked version
 *                      Created function for key sorting
 *                      Updated regex to include numbers
 * 1.0.1    2023-02-02  Added table and query variable definition
 * 1.0.2    2023-02-14  Use cursor to detect active table
 *                      Added version number to display
 * 1.0.3    2023-02-24  Added setting for indent size
 *                      Field property names become "unknown" when no alphanumeric characters are in the name
 * 
 */
const settings = input.config({
    title: `Get IDs from Active Table`,
    description: "v1.0.3",
    items: [
        input.config.select("includeFields", {
            label: "Include fields?",
            options: [{value: "Yes"}, {value: "No"}]
        }),
        input.config.select("includeViews", {
            label: "Include views?",
            options: [{value: "Yes"}, {value: "No"}]
        }),
        input.config.select("mode", {
            label: "Output mode",
            options: [{value: "Script"}, {value: "Custom extension"}]
        }),
        input.config.select("indentSize", {
            label: "Indent size (spaces)",
            options: [{value: "2"}, {value: "4"}]
        })
    ]
})

const { includeFields, includeViews, indentSize } = settings

const table = base.getTable(cursor.activeTableId ?? "")
const indent = (count) => (" ".repeat(Number(indentSize))).repeat(count)

const TABLE_EXTENSION_PRE = settings.mode === "Script" ? "" : "base.getTableIfExists("
const TABLE_EXTENSION_POST = settings.mode === "Script" ? "" : ")"

let unknownCount = 1

const convertName = (name) => {
    let newName = ""
    const nameParts = name.replace(/[^ A-Za-z0-9]/g, "").trim().toLowerCase().split(" ")
    nameParts.forEach((part, index) => {
        if (part.length) {
            if (index === 0)
                newName += part.toLowerCase()
            else
                newName += part.replace(part[0], part[0].toUpperCase())
        }
    })
    if (!newName) {
        newName = `unknown${unknownCount}_${name}`
        unknownCount++
    }
    return newName
}

const sortIds = (a, b) => {
    const aStart = a.split(":")[0]
    const bStart = b.split(":")[0]
    if (aStart < bStart) return -1
    if (aStart > bStart) return 1
    return 0
}

/**
* Main
*/
const main = async () => {
    if (!table) {
        output.text("No table active.")
        return
    }
    const newTableName = convertName(table.name)
    const FIELD_EXTENSION_PRE = settings.mode === "Script" ? "" : `TB.${newTableName}.getFieldIfExists(`
    const FIELD_EXTENSION_POST = settings.mode === "Script" ? "" : ")"
    const fieldIds = includeFields === "Yes"
        ? table.fields.map(item => `${convertName(item.name)}: ${FIELD_EXTENSION_PRE}"${item.id}"${FIELD_EXTENSION_POST},`)
        : []
    const viewIds = includeViews === "Yes"
        ? table.views.map(item => `${convertName(item.name)}: "${item.id}",`)
        : []

    if (settings.mode === "Custom extension")
        output.text("import { base } from '@airtable/blocks'")
    output.text(`const TB = {
${indent(1)}${newTableName}: ${TABLE_EXTENSION_PRE}"${table.id}"${TABLE_EXTENSION_POST},
}`)

    if (fieldIds.length) {
        fieldIds.sort(sortIds)
        output.text(`const FL = {
${indent(1)}${newTableName}: {
${indent(2)}${fieldIds.join(`\n${indent(2)}`)}
${indent(1)}},
}`)
    }

    if (viewIds.length) {
        viewIds.sort(sortIds)
        output.text(`const VW = {
${indent(1)}${newTableName}: {
${indent(2)}${viewIds.join(`\n${indent(2)}`)}
${indent(1)}},
}`)
    }

    if (settings.mode === "Script") {
        output.text([
            `const ${newTableName}Table = base.getTable(TB.${newTableName})`,
            `const ${newTableName}Query = await ${newTableName}Table.selectRecordsAsync({fields: Object.values(FL.${newTableName})})`
        ].join("\n"))
    }
}

await main()