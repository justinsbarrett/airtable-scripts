# Get Table IDs

This script creates boilerplate code that can be copied and pasted into an Airtable script
to provide an easier and safer mechanism for accessing table, field, and view IDs.

## Version

The current version is 1.0.4. See the changelog file for a complete history of changes.

## History

As an Airtable developer, I love all of the features of Airtable's scripting environments. However, 
accessing fields on records can be a hair tedious. For example, the recommended way of retrieving
a table query includes specifying exactly which fields you want to access. This is most often done
by name. However, if a user changes a field name, the code will no longer work. This means that
the developer must:

* Update the code to change all references to the renamed field to use the new name, or
* Update the code to use field IDs instead of field names

The latter is the better option, but now there are new problems:

* *Nobody* just knows those IDs off the top of their head
* Digging up the IDs you need means toggling between your code and the "Manage fields" sidebar tool as
you copy and paste values manually.
* You have to add comments to the code to remind yourself what all those IDs refer to.
* You *still* have to build an array of field IDs for use in the table querying process.

I wrote this script to solve as many of those problems as possible.

## Installation

* Add a new Scripting extension to your Airtable base
* Delete the starting code provided for you
* Copy the entire script from this repository
* Paste it into the extension

## Script usage

* Adjust the settings
* Run the script

The script generates the following boilerplate code based on the active table:

* A `TB` object
* A `FL` object (optional, based on settings)
* A `VW` object (optional, based on settings)
* A line that assigns the table to a variable
* A line that builds a query based on the `FL` contents.

The `TB`, `FL`, and `VW` objects will be described in the following section.

*NOTE: My earliest version used `TABLE` and `FIELD` for the object variable names, but I shortened them so that
their use in the main code would be a bit more compact. If you would like the option of choosing which name style
to use, [let me know](https://airtable.com/shrNjNF9xUX3PFF8H).*

## Generated code usage

*Whether you intend to use the generated code in one of Airtable's scriping environments—a Scripting extension
or an automation script action—or in a custom extension, the basic process is the same.*

The `TB`, `FL`, and `VW` objects provide you with a way to use table, field, and view references (respectively)
in a more convenient way than the default behavior.

* The name of each property is a camel-case representation of the name of the original table, field, or view.
For example, a table named "My Table" will have its `TB` property named `myTable`.[^1]
* The value of each property is the appropriate table, field, or view ID

[^1] NOTE: The name conversion process begins by stripping out all non-alphanumeric characters. This will remove things like
emojis and accented alphabetic characters. Any name that's effectively empty after this initial pass will
be named "unknown", with a number appended in case there are several such properties in the final object.

### Table references

To insert the table ID into any part of your code where you would normally use the table name, use this syntax:
`TB.myTable`

For example, the following is a generic representation of the table variable assignment that's provided for you
by the script:

```JS
const myTable = base.getTable(TB.myTable)
```

### Field and view references

The general structure of the `FL` and `VW` objects is identical. In each case, the root property of the object is
named based on the table, with its value being an object containing name-to-ID associations for all fields or
views on the table.

For example, say that the table "My Table" has a "Name" primary field, plus two other fields: "First Name" and
"Last Name". Based on that, the `FL` object definition would look something like this:

```JS
const FL = {
  myTable: {
    firstName: "fldXXXXXXXXXXXXXX",
    lastName: "fldYYYYYYYYYYYYYY",
    name: "fldZZZZZZZZZZZZZZ"
  }
}
```

The script lists all field/view properties in alphabetical order. This makes it easier to find a field/view reference
if you know its original name.

To get a field value from a record using the `FL` object, it would look something like this:

```JS
const lastName = record.getCellValue(FL.myTable.lastName)
```

While `FL.myTable.lastName` is longer than just referring to the field by `"Last Name"`, I've come to
appreciate the fact that this structure reminds me of not only the field name, but also the table where it resides.

The `FL` object can also be used when referring to a field for record creation or updating.

```JS
await myTable.updateRecordAsync(recordId, {
  [FL.myTable.firstName]: newFirstName,
  [FL.myTable.lastName]: newLastName
})
```

## Managing large field lists

If you don't need all field/view references generated by the script, it's fairly easy to strip out the ones
that you don't need. What I'll often do is move the references that I want to keep up to the top of the list,
then delete the rest.

Another option is to comment out the unwanted lines, and version 1.0.4 adds support for this feature
directly. If "Include comment lines around field properties?" is set to "Yes," it will wrap comment lines
around the field properties. Making any property "active" is as easy as moving its line outside of the comment
block. You can permanently delete the comment block at any time, or leave it in if you feel that you might
make further changes later that require fields you're not currently using.

Either way you go, the created query line won't need to be updated if the field list changes because
it's designed to work with whatever data is provided in the object.

## Multiple tables

While this script can't automatically combine data for different tables into its output
(see below for my plans for that), it's fairly easy to copy and paste the relevant pieces from subsequent
script runs into the code made when running it for the first table.

*NOTE: Because the last key-value pair in an object is allowed to have a trailing comma, I've put that
in the script output to make combining output from multiple script runs a little easier. Feel free to
strip it if it bugs you.*

Here's a simple example of two tables' data combined:

```JS
const TB = {
  myTable: "tblAAAAAAAAAAAAAA",
  nutherTable: "tblBBBBBBBBBBBBBB",
}

const FL = {
  myTable: {
    firstName: "fldXXXXXXXXXXXXXX",
    lastName: "fldYYYYYYYYYYYYYY",
    name: "fldZZZZZZZZZZZZZZ",
  },
  nutherTable: {
    firstField: "fldGGGGGGGGGGGGGG",
    secondField: "fldHHHHHHHHHHHHHH",
    thirdField: "fldIIIIIIIIIIIIII",
  },
}
```

## Future

I've got plans to expand this into a custom extension with many more features, including things like:

* User control over which fields are included before the code is generated
* Allow for custom name overrides for the generated object properties
* Generate boilerplate code from multiple tables at once
* Save settings for all of the above so they're remembered between sessions

To be notified of when this extension is available, [subscribe to the Base Notes newsletter](https://airtable.com/shr4mckEBKVZtsw2T)