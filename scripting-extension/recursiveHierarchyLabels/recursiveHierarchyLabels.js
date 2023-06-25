/**
 * Title: Recursive Hierarchy Labels
 * Version: 1.3.1
 * License: MIT
 * Author: Justin Barrett
 * Site: http://www.allaboutthatbase.tips
 * Support: https://ko-fi.com/allaboutthatbase
 * Source: https://github.com/justinsbarrett/airtable-scripts/tree/main/scripting-extension/recursiveHierarchyLabels
 * 
 * Description: Generate labels for records linked in a hierarchical structure
 */

const settings = input.config({
    title: "Recursive Hierarchy Labels v1.3.1",
    description: `When tracking items that are part of a hierarchy, it's often
    desirable to have an ID (1.2.1.1) or path (Paul->Peter->Mary) that outlines
    the hierarchy tree. This script parses records in a single table to build
    hierarchy labels, with the hierarchy established by record links. Labels
    may be built in either direction: parent-to-child or child-to-parent.`,
    items: [
        input.config.table("table", {
            label: "Table",
            description: "The table where the hierarchy is established"
        }),
        input.config.view("view", {
            label: "View",
            description: "Because record order is important for this operation, and only views can be used to specify such order, a view is required.",
            parentTable: "table"
        }),
        input.config.field("linkField", {
            label: "Link field",
            description: "The field linking to other table records",
            parentTable: "table"
        }),
        input.config.select("direction", {
            label: "Parse direction",
            description: `Which direction should be used to parse the links.
            "Parent-to-Child" is used when each parent record is linked to one or more child records.
            "Child-to-Parent" is used when each child record is linked to a single parent.`,
            options: [
                {value: "Parent-to-Child"},
                {value: "Child-to-Parent"}
            ]
        }),
        input.config.select("mode", {
            label: "Mode",
            description: `How should the labels be built?
            "Index" uses a numerical index based on the hierarchy depth of each item (e.g. 1.2.1.1).
            "Path" uses the value from the "Label field" option selected below (e.g. Paul>Peter>Mary).`,
            options: [
                {value: "Index"},
                {value: "Path"}
            ]
        }),
        input.config.field("labelField", {
            label: "Label field",
            description: `The field containing the label to use for each item. This could be the primary field, or some other field if desired.
            
            NOTE: If you choose the "Index" mode above, this setting will be ignored.`,
            parentTable: "table"
        }),
        input.config.text("separator", {
            label: "Separator",
            description: "The separator between items. Be sure to include spaces around the separator if desired."
        }),
        input.config.field("outputField", {
            label: "Output field",
            description: "The field (single line or long text) where the script will create the item labels",
            parentTable: "table"
        }),
    ]
})

const { table, view, linkField, mode, labelField, separator, outputField, direction } = settings

// Collect the records
const query = await view.selectRecordsAsync({
    fields: [linkField, labelField, outputField]
})

const updates = []

const parse_childToParent = (parent=null, parentLabel="") => {
    // Find all records with the specified parent
    let matches = query.records.filter(record => {
        let parentLink = record.getCellValue(linkField)
        if (!parent)
            return !parentLink
        else if (parentLink)
            return record.getCellValue(linkField)[0].id == parent
        return false
    })
    // If we haven't found any records, we're done with this level
    if (!matches.length)
        return
    // Set the record's label, adding its parent's label (if any)
    matches.forEach((match, index) => {
        let itemLabel = mode === "Index" ? String(index + 1) : match.getCellValueAsString(labelField)
        let fullLabel = !parentLabel ? itemLabel : parentLabel + itemLabel
        updates.push({
            id: match.id,
            fields: {
                [outputField.name]: fullLabel
            }
        })
        // Make a recursive call to find and label children of this item
        parse_childToParent(match.id, fullLabel + separator)
    })
}

const parse_parentToChild = () => {
    const parseChildren = (childId, childIndex, labels=[]) => {
        // Get the child record and its label
        const childRecord = query.getRecord(childId)
        const childLabel = mode === "Index" ? (childIndex + 1).toString() : childRecord.getCellValue(labelField);
        labels.push(childLabel)
        updates.push({
            id: childRecord.id,
            fields: {[outputField.name]: labels.join(separator)}
        });
        // Parse children
        (childRecord.getCellValue(linkField) || []).map(link => link.id).forEach((id, index) => parseChildren(id, index, [...labels]))        
    }

    // Find root records
    const roots = query.records.filter(rootRecord => {
        const parents = query.records.filter(rec => {
            return (rec.getCellValue(linkField) || []).map(link => link.id).includes(rootRecord.id)
        })
        return parents.length === 0
    })

    // Parse branches based on roots
    roots.forEach((rootRecord, index) => {
        const rootLabel = mode === "Index" ? (index + 1).toString() : rootRecord.getCellValue(labelField);
        (rootRecord.getCellValue(linkField) || []).map(link => link.id).forEach((id, childIndex) => parseChildren(id, childIndex, [rootLabel]))
        updates.push({
            id: rootRecord.id,
            fields: {[outputField.name]: rootLabel}
        })
    })
}

/**
 * Main
 */
const main = async () => {
    output.markdown("# Building hierarchy labels")
    output.markdown(`Mode: **${mode}**`);
    output.markdown(`Direction: **${direction}**`);
    
    switch(settings.direction) {
        case "Child-to-Parent":
            parse_childToParent();
            break
    
        case "Parent-to-Child":
            parse_parentToChild();
            break
    }
    
    // Save all labels to the specified field
    if (updates.length) {
        output.markdown("---")
        output.markdown(`## Hierarchy parsing complete.`)
        output.text(`Updating ${updates.length} records...`)
        while (updates.length)
            await table.updateRecordsAsync(updates.splice(0, 50))
    
        output.markdown("---")
        output.markdown("## Update complete")
    } else {
        output.text("No changes to apply")
    }  
}

await main()
