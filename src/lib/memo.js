import QRCode from "qrcode";

const DIGIT_MAP = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const moneyFormatter = new Intl.NumberFormat("bn-BD", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("bn-BD", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const companyInfo = {
  name: import.meta.env.VITE_COMPANY_NAME || "M/s Sadia Auto Parts",
  address: import.meta.env.VITE_COMPANY_ADDRESS || "Kanaipur, Faridpur",
  proprietor: import.meta.env.VITE_COMPANY_PROPRIETOR || "Owner",
  phone: import.meta.env.VITE_COMPANY_PHONE || "+8800000000000",
};

const measurementLabels = {
  piece: "পিস",
  pieces: "পিস",
  pic: "পিস",
  pics: "পিস",
  pc: "পিস",
  pcs: "পিস",
  unit: "ইউনিট",
  dozen: "ডজন",
  set: "সেট",
  kg: "কেজি",
  gram: "গ্রাম",
  litre: "লিটার",
  liter: "লিটার",
  ml: "এমএল",
  foot: "ফুট",
  feet: "ফুট",
  inch: "ইঞ্চি",
  box: "বক্স",
  pair: "জোড়া",
  packet: "প্যাকেট",
  bundle: "বান্ডিল",
  roll: "রোল",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function toBanglaDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => DIGIT_MAP[Number(digit)] || digit);
}

export function formatMemoAmount(value) {
  return toBanglaDigits(moneyFormatter.format(Number(value || 0)));
}

export function formatMemoDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toBanglaDigits(dateFormatter.format(date));
}

function formatMeasurement(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "-";
  }

  return measurementLabels[normalized] || toBanglaDigits(value);
}

function createBlankRows(items, minimumRows) {
  const rows = [...items];
  const missingRows = Math.max(minimumRows - rows.length, 0);

  for (let index = 0; index < missingRows; index += 1) {
    rows.push({
      serial: "",
      quantity: "",
      description: "",
      measurement: "",
      rate: "",
      amount: "",
    });
  }

  return rows;
}

function buildRowHtml(row) {
  return `
    <tr>
      <td class="memo-cell memo-cell-center memo-cell-serial">${escapeHtml(row.serial || "")}</td>
      <td class="memo-cell memo-cell-center">${escapeHtml(row.quantity || "")}</td>
      <td class="memo-cell memo-cell-description">${escapeHtml(row.description || "")}</td>
      <td class="memo-cell memo-cell-center">${escapeHtml(row.measurement || "")}</td>
      <td class="memo-cell memo-cell-right">${row.rate === "" ? "" : formatMemoAmount(row.rate)}</td>
      <td class="memo-cell memo-cell-right">${row.amount === "" ? "" : formatMemoAmount(row.amount)}</td>
    </tr>
  `;
}

function buildSummaryHtml(summaryRows) {
  return summaryRows
    .map(
      (row) => `
        <div class="summary-card${row.highlight ? " summary-card-highlight" : ""}${row.emphasis ? " summary-card-emphasis" : ""}">
          <span>${escapeHtml(row.label)}</span>
          <strong>${formatMemoAmount(row.value)}</strong>
        </div>
      `
    )
    .join("");
}

function buildFooterLinesHtml(lines) {
  return lines
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
}

function buildMemoHtml({
  browserTitle,
  title,
  memoNo,
  date,
  customerName,
  customerAddress,
  items,
  summaryRows,
  note,
  footerLines,
  leftSignatureLabel,
  rightSignatureLabel,
  qrDataUrl,
  qrCaption,
}) {
  const memoRows = createBlankRows(items, 15).map(buildRowHtml).join("");
  const summaryHtml = buildSummaryHtml(summaryRows);
  const footerHtml = buildFooterLinesHtml(footerLines);
  const noteText = note ? nl2br(note) : "";
  const totalForWords = summaryRows[0]?.value ?? 0;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(browserTitle || "Memo")}</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 portrait; margin: 10mm; }
          body {
            margin: 0;
            background: #f2efe4;
            font-family: "Noto Serif Bengali", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", serif;
            color: #1f2937;
          }
          .sheet {
            width: 100%;
            max-width: 920px;
            margin: 0 auto;
            position: relative;
            overflow: hidden;
            border: 1px solid #7f96c8;
            background:
              radial-gradient(circle at 14% 18%, rgba(74, 141, 63, 0.08), transparent 26%),
              radial-gradient(circle at 86% 24%, rgba(76, 63, 146, 0.08), transparent 24%),
              radial-gradient(circle at 50% 70%, rgba(122, 45, 22, 0.07), transparent 26%),
              linear-gradient(180deg, #f6efb4 0%, #f8f2c7 100%);
          }
          .watermark {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.08;
            background-image:
              linear-gradient(45deg, rgba(76, 63, 146, 0.7) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(76, 63, 146, 0.7) 25%, transparent 25%);
            background-size: 160px 160px;
            background-position: 28px 40px, 96px 108px;
            mask-image: radial-gradient(circle at center, black 35%, transparent 78%);
          }
          .header {
            position: relative;
            padding: 16px 22px 12px;
            border-bottom: 2px solid #5d78b5;
            background: linear-gradient(180deg, rgba(227,208,109,0.9) 0%, rgba(247,239,197,0.72) 100%);
          }
          .bismillah {
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .memo-pill {
            display: inline-block;
            padding: 4px 20px;
            border-radius: 999px;
            background: #4a8d3f;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
          }
          .memo-pill-wrap {
            text-align: center;
          }
          .company-name {
            margin-top: 8px;
            text-align: center;
            font-size: 33px;
            line-height: 1.18;
            font-weight: 700;
            color: #7a2d16;
            padding: 0 120px;
          }
          .proprietor {
            margin-top: 10px;
            text-align: center;
          }
          .proprietor span {
            display: inline-block;
            background: #333;
            color: #fff;
            padding: 5px 18px;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 700;
          }
          .address-line {
            margin-top: 10px;
            text-align: center;
            font-size: 15px;
            line-height: 1.6;
            font-weight: 600;
            padding: 0 110px;
            color: #3f355b;
          }
          .phone-block {
            margin-top: 8px;
            text-align: center;
            font-size: 14px;
            font-weight: 700;
            color: #374151;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 96px 1fr 118px 1fr;
            border-bottom: 1px solid #6d86be;
          }
          .meta-label {
            background: #4c3f92;
            color: #fff;
            font-weight: 700;
            padding: 9px 12px;
            border-right: 1px solid #6d86be;
          }
          .meta-value {
            min-height: 42px;
            padding: 9px 14px;
            border-right: 1px solid #6d86be;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          .meta-value:last-child {
            border-right: 0;
            font-size: 16px;
            letter-spacing: 0;
            font-weight: 600;
          }
          .wide-meta {
            display: grid;
            grid-template-columns: 96px 1fr;
            border-bottom: 1px solid #6d86be;
          }
          .wide-meta-value {
            min-height: 42px;
            padding: 10px 14px;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            position: relative;
            z-index: 1;
          }
          thead tr {
            background: #43368e;
            color: #fff;
          }
          th {
            border: 1px solid #6d86be;
            padding: 9px 8px;
            font-size: 15px;
            font-weight: 700;
          }
          .memo-cell {
            height: 38px;
            border: 1px solid #6d86be;
            padding: 7px 8px;
            background: rgba(255,255,255,0.08);
            font-size: 15px;
          }
          .memo-cell-center {
            text-align: center;
          }
          .memo-cell-right {
            text-align: right;
          }
          .memo-cell-serial {
            width: 64px;
          }
          .memo-cell-description {
            width: 38%;
          }
          .summary-wrap {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 14px;
            align-items: stretch;
            padding: 14px 18px 10px;
            border-top: 1px solid #6d86be;
          }
          .words-box {
            min-height: 88px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: rgba(255,255,255,0.24);
            padding: 12px 14px;
          }
          .words-box strong {
            color: #4c3f92;
          }
          .summary-grid {
            display: grid;
            gap: 10px;
          }
          .summary-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding: 12px 14px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: rgba(255,255,255,0.28);
            font-size: 15px;
            font-weight: 700;
          }
          .summary-card strong {
            font-size: 18px;
            color: #4c3f92;
          }
          .summary-card-highlight {
            background: rgba(76, 63, 146, 0.1);
          }
          .summary-card-emphasis strong {
            color: #9a3412;
          }
          .note-box {
            margin: 0 18px;
            padding: 12px 14px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: rgba(255,255,255,0.2);
            font-size: 14px;
            line-height: 1.6;
          }
          .bottom-strip {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-end;
            padding: 18px 18px 14px;
            min-height: 92px;
          }
          .footer-note {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.7;
          }
          .qr-box {
            text-align: right;
          }
          .qr-box img {
            width: 88px;
            height: 88px;
            border: 1px solid rgba(109, 134, 190, 0.7);
            background: #fff;
            padding: 6px;
          }
          .qr-box div {
            margin-top: 6px;
            font-size: 12px;
            font-weight: 700;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 16px 18px 22px;
            font-size: 14px;
            font-weight: 700;
          }
          .signature-row div {
            width: 220px;
            text-align: center;
            padding-top: 28px;
            border-top: 1px dashed #4b5563;
          }
          @media print {
            body {
              background: #fff;
            }
            .sheet {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="watermark"></div>

          <div class="header">
            <div class="bismillah">বিসমিল্লাহির রাহমানির রাহিম</div>
            <div class="memo-pill-wrap">
              <span class="memo-pill">${escapeHtml(title)}</span>
            </div>
            <div class="company-name">${escapeHtml(companyInfo.name)}</div>
            <div class="proprietor">
              <span>প্রোঃ ${escapeHtml(companyInfo.proprietor)}</span>
            </div>
            <div class="address-line">${escapeHtml(companyInfo.address)}</div>
            <div class="phone-block">মোবাইল: ${escapeHtml(companyInfo.phone)}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-label">নং</div>
            <div class="meta-value">${escapeHtml(toBanglaDigits(memoNo || ""))}</div>
            <div class="meta-label">তারিখ</div>
            <div class="meta-value">${escapeHtml(formatMemoDate(date))}</div>
          </div>

          <div class="wide-meta">
            <div class="meta-label">নাম</div>
            <div class="wide-meta-value">${nl2br(customerName || "")}</div>
          </div>

          <div class="wide-meta">
            <div class="meta-label">ঠিকানা</div>
            <div class="wide-meta-value">${nl2br(customerAddress || "")}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 64px;">নং</th>
                <th style="width: 92px;">সংখ্যা</th>
                <th>মালের বিবরণ</th>
                <th style="width: 120px;">পরিমাপ</th>
                <th style="width: 120px;">দর</th>
                <th style="width: 140px;">টাকা</th>
              </tr>
            </thead>
            <tbody>${memoRows}</tbody>
          </table>

          <div class="summary-wrap">
            <div class="words-box">
              <strong>কথায় :</strong> ${formatMemoAmount(totalForWords)} টাকা
            </div>
            <div class="summary-grid">${summaryHtml}</div>
          </div>

          ${
            noteText
              ? `<div class="note-box"><strong>নোট :</strong> ${noteText}</div>`
              : ""
          }

          <div class="bottom-strip">
            <div class="footer-note">${footerHtml}</div>
            ${
              qrDataUrl
                ? `
                  <div class="qr-box">
                    <img src="${qrDataUrl}" alt="Memo QR" />
                    <div>${escapeHtml(qrCaption || "")}</div>
                  </div>
                `
                : ""
            }
          </div>

          <div class="signature-row">
            <div>${escapeHtml(leftSignatureLabel || "ক্রেতার স্বাক্ষর")}</div>
            <div>${escapeHtml(rightSignatureLabel || "বিক্রেতার স্বাক্ষর")}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function waitForPrintAssets(printWindow) {
  await new Promise((resolve) => {
    const images = Array.from(printWindow.document.images || []);
    if (!images.length) {
      resolve();
      return;
    }

    let loaded = 0;
    const done = () => {
      loaded += 1;
      if (loaded >= images.length) {
        resolve();
      }
    };

    images.forEach((image) => {
      if (image.complete) {
        done();
        return;
      }

      image.onload = done;
      image.onerror = done;
    });

    window.setTimeout(resolve, 2000);
  });
}

export async function printMemoSheet(config) {
  const qrDataUrl = config.qrText
    ? await QRCode.toDataURL(config.qrText, {
        width: 140,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
    : "";

  const printableHtml = buildMemoHtml({ ...config, qrDataUrl });
  const printWindow = window.open("", "_blank", "width=980,height=820");
  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(printableHtml);
  printWindow.document.close();

  await waitForPrintAssets(printWindow);

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 120);
}

export function createSaleMemoItems(items = []) {
  return items.map((item, index) => ({
    serial: toBanglaDigits(index + 1),
    quantity: toBanglaDigits(Number(item.quantity || 0)),
    description: item.product?.name || item.product_name || "পণ্য",
    measurement: formatMeasurement(item.product?.unit_type || item.unit_type),
    rate: Number(item.product?.price ?? item.unit_price ?? item.unitPrice ?? 0),
    amount: Number(item.lineTotal ?? item.total_price ?? item.total ?? 0),
  }));
}

export function createSingleMemoItem({
  serial = 1,
  quantity = 1,
  description = "",
  measurement = "",
  rate = 0,
  amount = 0,
}) {
  return {
    serial: serial === "" ? "" : toBanglaDigits(serial),
    quantity: toBanglaDigits(quantity),
    description,
    measurement: formatMeasurement(measurement),
    rate: Number(rate || 0),
    amount: Number(amount || 0),
  };
}
