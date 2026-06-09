# Generic CSV Import

## Format
The app supports generic CSV imports with the following columns:

- **Part Number** (required) - Product ID/SKU
- **Description** (required) - Product name/description  
- **Quantity** (required) - Total number of items
- **Cost** (optional) - Cost per individual item

## Column Name Variations Supported
The CSV parser automatically detects column names with variations:

### Part Number
- Part Number, PartNumber, Part #, P/N
- SKU, Item Number, Item #, Product Number

### Description
- Description, Desc, Name, Title, Product Name

### Quantity  
- Quantity, Qty, Count, Amount

### Cost
- Cost, Price, Unit Cost, Unit Price, Total

## Example CSV

```csv
Part Number,Description,Quantity,Cost
SE172,Shell Effect,100,2.50
WPI-6-GTW,6" Titanium Willow Shell,50,15.00
AM-3-BGC,3" Brocade Crown,200,3.75
```

## How It Works

1. **Upload** - Drag and drop or click to upload your CSV file
2. **Preview** - Review the parsed data before importing
3. **Import** - Confirm to add items to inventory

### Default Behavior
- **Packing**: Defaults to 1/1 (individual items, not cases)
- **Cases**: Each quantity represents individual items
- **Line Total**: Automatically calculated as Cost × Quantity
- **Order Date**: Uses current date if not specified

## Sample File
A sample CSV file is included: `sample_inventory.csv`

## Notes
- For vendor-specific invoices with case packing (e.g., 24/12), use PDF upload instead
- Generic CSV is best for simple inventory lists where quantity = individual items
- Excel files (.xlsx) are also supported with the same column format
