import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cachedBusiness, loadBusiness } from '../lib/cache'
import { draftKeyFor, saveDraft } from '../lib/drafts'
import { reportError } from '../lib/errorReporting'
import { ImportError, parseWorkbook } from '../lib/excelImport'
import { newId } from '../lib/ids'
import { ACCEPT, readSpreadsheetFile } from '../lib/spreadsheetFile'
import Icon from './Icon'
import Sheet from './Sheet'
import css from './ImportSheet.module.css'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Reads an Excel or CSV quote and opens it as a new quote to review. Nothing is saved here: the
// builder shows what was read, and only "Confirm and save" there creates the quote.
export default function ImportSheet({ open, onClose }) {
  const navigate = useNavigate()
  const input = useRef(null)
  const business = useRef(null)
  const [state, setState] = useState({ phase: 'idle' }) // idle | reading | choose | error
  const [dragging, setDragging] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)

  // The business's own phones and address, so a letterhead is never taken for the customer.
  useEffect(() => {
    if (!open || business.current) return
    const stored = cachedBusiness()
    if (stored) business.current = stored
    else loadBusiness().then((b) => (business.current = b)).catch(() => {})
  }, [open])

  function close() {
    setState({ phase: 'idle' })
    onClose()
  }

  function start(candidate, fileName) {
    const importId = newId()
    saveDraft(draftKeyFor({ importId }), {
      importPatch: candidate.patch,
      importInfo: {
        fileName,
        label: candidate.label,
        warnings: candidate.warnings,
        stats: candidate.stats,
        sheetTotal: candidate.patch.sheetTotal,
      },
      clientRequestId: newId(),
    })
    setState({ phase: 'idle' })
    onClose()
    navigate(`/quotes/new?import=${encodeURIComponent(importId)}`)
  }

  async function read(file) {
    if (!file) return
    setState({ phase: 'reading', fileName: file.name })
    try {
      const sheets = await readSpreadsheetFile(file)
      const b = business.current
      const candidates = parseWorkbook(sheets, {
        ignorePhones: b ? [b.phonePrimary, b.phoneSecondary] : [],
        ignoreText: b ? [b.name, b.address] : [],
      })
      if (candidates.length === 1) start(candidates[0], file.name)
      else setState({ phase: 'choose', fileName: file.name, candidates })
    } catch (err) {
      if (!(err instanceof ImportError)) reportError(err, 'excel import')
      setState({
        phase: 'error',
        fileName: file.name,
        message: err instanceof ImportError ? err.message : "Couldn't read this file. Save it as an Excel workbook (.xlsx) and try again.",
      })
    } finally {
      if (input.current) input.current.value = '' // picking the same file again still works
    }
  }

  async function template() {
    setTemplateBusy(true)
    try {
      const { downloadTemplate } = await import('../lib/excelTemplate')
      await downloadTemplate()
    } catch (err) {
      reportError(err, 'excel template')
      setState({ phase: 'error', message: "Couldn't create the template. Check the internet connection and try again." })
    } finally {
      setTemplateBusy(false)
    }
  }

  const reading = state.phase === 'reading'

  return (
    <Sheet open={open} title="Import from Excel" onClose={close} labelledBy="import-title">
      <p className={css.lead}>Opens the sheet as a new quote. You check every room and rate before it's saved.</p>

      {state.phase === 'choose' ? (
        <div className={css.choose}>
          <p className={css.chooseTitle}>
            {state.fileName} has {state.candidates.length} quotes. Which one?
          </p>
          <ul className={css.candidates}>
            {state.candidates.map((c) => (
              <li key={c.id}>
                <button type="button" className={css.candidate} onClick={() => start(c, state.fileName)}>
                  <span className={css.candidateName}>{c.label}</span>
                  <span className={css.candidateMeta}>
                    {plural(c.stats.items, 'item')} in {plural(c.stats.rooms, 'room')}
                  </span>
                  <Icon name="chevronRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--ghost" onClick={() => setState({ phase: 'idle' })}>
            Pick a different file
          </button>
        </div>
      ) : (
        <label
          className={`${css.drop} ${dragging ? css.dragging : ''} ${reading ? css.busy : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            read(e.dataTransfer.files?.[0])
          }}
        >
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="visually-hidden"
            disabled={reading}
            onChange={(e) => read(e.target.files?.[0])}
          />
          {reading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span className={css.dropTitle} role="status">
                Reading {state.fileName}…
              </span>
            </>
          ) : (
            <>
              <span className={css.dropIcon}>
                <Icon name="upload" size={22} />
              </span>
              <span className={css.dropTitle}>Choose an Excel file</span>
              <span className={css.dropHint}>.xlsx or .csv, one quote per sheet</span>
            </>
          )}
        </label>
      )}

      {state.phase === 'error' && (
        <div className={`banner banner--danger ${css.error}`} role="alert">
          <Icon name="alert" size={18} />
          <div className="banner__body">
            {state.fileName && <strong className={css.errorFile}>{state.fileName}</strong>}
            {state.message}
          </div>
        </div>
      )}

      <div className={css.template}>
        <div>
          <p className={css.templateTitle}>No sheet yet?</p>
          <p className={css.templateHint}>
            Fill in the template on a computer. Your own quote sheets work too if they have a heading row such as
            Item, Size, Qty, Rate.
          </p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={template} disabled={templateBusy}>
          <Icon name="download" size={18} />
          {templateBusy ? 'Preparing…' : 'Template'}
        </button>
      </div>
    </Sheet>
  )
}
