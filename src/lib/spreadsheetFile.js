// Turns a picked file into sheets of cell values for the importer. The Excel reader is loaded
// only when a file is actually imported.
import { ImportError, parseCsv } from './excelImport'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ACCEPT = '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'

export async function readSpreadsheetFile(file) {
  if (!file) throw new ImportError('No file was picked.')
  if (file.size > MAX_FILE_BYTES) throw new ImportError('This file is over 10 MB. A quote sheet is usually far smaller: check it is the right file.')
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.xls')) {
    throw new ImportError('This is an old .xls file. Open it in Excel or Google Sheets, save it as .xlsx, then import that.')
  }
  if (name.endsWith('.numbers') || name.endsWith('.ods')) {
    throw new ImportError('Export this sheet as Excel (.xlsx) first, then import that file.')
  }
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return [{ sheet: file.name.replace(/\.csv$/i, ''), data: parseCsv(await file.text()) }]
  }
  let readExcelFile
  try {
    ;({ default: readExcelFile } = await import('read-excel-file/browser'))
  } catch {
    throw new ImportError("Couldn't load the Excel reader. Check the internet connection and try again.")
  }
  try {
    return await readExcelFile(file)
  } catch {
    throw new ImportError("Couldn't read this file. Save it as an Excel workbook (.xlsx) and try again.")
  }
}
