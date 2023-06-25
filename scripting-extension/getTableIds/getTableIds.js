/**
 * Title: Get Table IDs
 * Version: 1.0.4
 * License: MIT
 * Author: Justin Barrett
 * Site: http://www.allaboutthatbase.tips
 * Support: https://ko-fi.com/allaboutthatbase
 * Source: https://github.com/justinsbarrett/airtable-scripts/tree/main/scripting-extension/getTableIds
 * 
 * Description: Get IDs from base, table, fields, and views. Output either for scripts or custom extensions
 */
const settings = input.config({
    title: "Get Table IDs",
    description: "v1.0.4",
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
        }),
        input.config.select("commentFieldProps", {
            label: "Include comment lines around field properties?",
            options: [{value: "Yes"}, {value: "No"}]
        })
    ]
})

const { includeFields, includeViews, indentSize, commentFieldProps } = settings

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
${indent(1)}${newTableName}: {${commentFieldProps === "Yes" ? "\n" + indent(2) + "/*" : "" }
${indent(2)}${fieldIds.join(`\n${indent(2)}`)}${commentFieldProps === "Yes" ? "\n" + indent(2) + "*/" : "" }
${indent(1)}},
}`)
    }

    if (viewIds.length && settings.mode === "Script") {
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