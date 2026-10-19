const express = require('express')
const {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun
} = require('docx')
const QRCode = require('qrcode')

const supabase = require('../supabase')
const { verifyItemDocumentToken } = require('../itemDocumentToken')

const router = express.Router()

function displayClassification(classification) {
  if (classification === 'PAR') {
    return 'Property Acknowledgement Receipt'
  }

  if (classification === 'ICS High') {
    return 'Inventory Custodian Slip - High Value'
  }

  if (classification === 'ICS Low') {
    return 'Inventory Custodian Slip - Low Value'
  }

  return classification || '-'
}

function safeFileName(propertyNumber) {
  const safePropertyNumber = (propertyNumber || 'item')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[. ]+$/g, '')

  return `property-${safePropertyNumber || 'item'}.docx`
}

router.get('/:itemId/:token/details', async (req, res) => {
  let origin

  try {
    origin = verifyItemDocumentToken(req.params.itemId, req.params.token)
  } catch (error) {
    if (error.code === 'QR_DOCUMENT_SECRET_MISSING') {
      console.error('Public item details are unavailable: QR_DOCUMENT_SECRET is not configured')
      return res.status(503).json({ error: 'Item details are temporarily unavailable.' })
    }

    console.error('Failed to validate public item details link:', error)
    return res.status(500).json({ error: 'Unable to validate the item link.' })
  }

  if (!origin) {
    return res.status(404).json({ error: 'Item details not found.' })
  }

  try {
    const { data: item, error } = await supabase
      .from('items')
      .select('id, property_number, description, serial_number, quantity, cost, acquisition_date, classification, condition, status, accountable_employee, responsibility_center')
      .eq('id', req.params.itemId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load public item details:', error)
      return res.status(500).json({ error: 'Unable to load item details.' })
    }

    if (!item) {
      return res.status(404).json({ error: 'Item details not found.' })
    }

    res.set('Cache-Control', 'private, no-store')
    return res.json(item)
  } catch (error) {
    console.error('Failed to load public item details:', error)
    return res.status(500).json({ error: 'Unable to load item details.' })
  }
})

router.get('/:itemId/:token', async (req, res) => {
  let origin

  try {
    origin = verifyItemDocumentToken(req.params.itemId, req.params.token)
  } catch (error) {
    if (error.code === 'QR_DOCUMENT_SECRET_MISSING') {
      console.error('QR document downloads are unavailable: QR_DOCUMENT_SECRET is not configured')
      return res.status(503).send('Document downloads are temporarily unavailable.')
    }

    console.error('Failed to validate item document link:', error)
    return res.status(500).send('Unable to validate the document link.')
  }

  if (!origin) {
    return res.status(404).send('Document not found.')
  }

  try {
    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.itemId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load item for document download:', error)
      return res.status(500).send('Unable to create the item document.')
    }

    if (!item) {
      return res.status(404).send('Document not found.')
    }

    const itemDetailsUrl = new URL(
      `/public-item/${encodeURIComponent(req.params.itemId)}?token=${encodeURIComponent(req.params.token)}`,
      origin
    ).toString()
    const qrImage = await QRCode.toBuffer(itemDetailsUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      type: 'png'
    })
    const itemDetails = [
      ['Property Number', item.property_number || '-'],
      ['Description', item.description || '-'],
      ['Serial Number', item.serial_number || '-'],
      ['Quantity', item.quantity ?? 0],
      [
        'Unit Cost',
        `PHP ${Number(item.cost || 0).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      ],
      ['Date Acquired', item.acquisition_date || '-'],
      ['Classification', displayClassification(item.classification)],
      ['Condition', item.condition || '-'],
      ['Status', item.status || '-'],
      ['Accountable Employee', item.accountable_employee || '-'],
      ['Responsibility Center / Office', item.responsibility_center || '-']
    ]
    const documentFile = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Property Item Details',
              heading: HeadingLevel.TITLE
            }),
            ...itemDetails.map(
              ([label, value]) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${label}: `, bold: true }),
                    new TextRun(String(value))
                  ]
                })
            ),
            new Paragraph({
              children: [
                new ImageRun({
                  data: qrImage,
                  transformation: { width: 220, height: 220 }
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        }
      ]
    })
    const documentBuffer = await Packer.toBuffer(documentFile)

    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    res.attachment(safeFileName(item.property_number))
    res.send(documentBuffer)
  } catch (error) {
    console.error('Failed to create item document:', error)
    res.status(500).send('Unable to create the item document.')
  }
})

module.exports = router
