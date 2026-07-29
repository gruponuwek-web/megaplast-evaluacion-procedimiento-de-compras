/* ============================================================
   EXPORTAR PDF
   Genera el reporte de evaluación en PDF con jsPDF + AutoTable
   y lo sube como respaldo a Google Drive vía Apps Script.
   ============================================================ */

async function generarPDF(descargar = true) {
  const btn = document.querySelector(".btn-green");
  const msg = document.getElementById("pdf-msg");
  btn.textContent = "⏳ Generando PDF..."; btn.disabled = true; msg.textContent = "";
  await new Promise(r => setTimeout(r, 80));
  try {
    if (!window.jspdf) throw new Error("jsPDF no disponible. Verifica conexión a internet.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth(), M = 14;
    let y = 0;

    doc.setFillColor(27, 63, 139); doc.rect(0, 0, W, 26, "F");
    doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.setFont(undefined, "bold");
    doc.text(PROC.nombre, M, 11);
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    doc.text("Mega Plast Materias Primas · Evaluación de cumplimiento operativo", M, 18);
    y = 32;

    const D = [
      ["Evaluador", document.getElementById("e-nombre").value || "—", "Puesto", document.getElementById("e-puesto").value || "—"],
      ["Fecha", document.getElementById("e-fecha").value || "—", "UDN", document.getElementById("e-udn").value || "—"],
      ["Periodo", document.getElementById("e-periodo").value || "—", "Tipo", document.getElementById("e-tipo").value || "—"],
    ];
    doc.autoTable({ startY: y, margin: { left: M, right: M }, body: D, theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [26, 42, 58] },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [240, 244, 248], cellWidth: 22 }, 1: { cellWidth: 62 }, 2: { fontStyle: "bold", fillColor: [240, 244, 248], cellWidth: 22 }, 3: { cellWidth: 62 } } });
    y = doc.lastAutoTable.finalY + 7;

    PROC.fases.forEach(f => {
      if (y > 250) { doc.addPage(); y = 14; }
      doc.setFillColor(...f.rgb);
      doc.roundedRect(M, y, W - 2 * M, 7, 2, 2, "F");
      doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont(undefined, "bold");
      doc.text(f.nombre.toUpperCase(), M + 3, y + 4.8);
      let fs = 0, fm = 0;
      f.pasos.forEach(p => { const v = SC[p.n]; if (v !== undefined && v !== "na") { fs += parseInt(v); fm += 2; } });
      doc.text(`${fs}/${fm || f.pasos.length * 2}`, W - M - 3, y + 4.8, { align: "right" });
      y += 10;
      const rows = f.pasos.map(p => {
        const v = SC[p.n];
        let est = "Sin evaluar", pts = "—";
        if (v === "na") { est = "No aplica"; pts = "N/A"; }
        else if (v !== undefined) { const iv = parseInt(v); pts = String(iv); est = iv === 2 ? "Se cumple" : iv === 1 ? "Cumple parcialmente" : "No se cumple"; }
        const com = (document.getElementById("com-" + PROC_ID + "-" + p.n)?.value || "").trim();
        const nar = (document.getElementById("nar-" + PROC_ID + "-" + p.n)?.value || "").trim();
        return [p.n, p.t, p.r, est, pts, v === "na" && nar ? `N/A: ${nar}` : com];
      });
      doc.autoTable({ startY: y, margin: { left: M, right: M },
        head: [["#", "Actividad", "Responsable", "Resultado", "Pts", "Comentarios"]],
        body: rows, theme: "striped",
        headStyles: { fillColor: f.rgb, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [26, 42, 58], overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 7, halign: "center" }, 1: { cellWidth: 60 }, 2: { cellWidth: 30 }, 3: { cellWidth: 28 }, 4: { cellWidth: 7, halign: "center" }, 5: { cellWidth: 50 } },
        didParseCell(d) {
          if (d.section === "body" && d.column.index === 3) {
            if (d.cell.text[0] === "Se cumple") d.cell.styles.textColor = [22, 101, 52];
            if (d.cell.text[0] === "Cumple parcialmente") d.cell.styles.textColor = [133, 77, 14];
            if (d.cell.text[0] === "No se cumple") d.cell.styles.textColor = [153, 27, 27];
          }
        }
      });
      y = doc.lastAutoTable.finalY + 5;
    });

    // Resumen
    if (y > 220) { doc.addPage(); y = 14; }
    const { total, max, pct } = calcData();
    doc.setFillColor(27, 63, 139); doc.rect(M, y, W - 2 * M, 7, "F");
    doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont(undefined, "bold");
    doc.text("RESUMEN DE RESULTADOS", M + 3, y + 4.8); y += 10;
    doc.setFontSize(11); doc.setTextColor(27, 63, 139); doc.setFont(undefined, "bold");
    doc.text(`${total} / ${max}  (${pct}%)`, M, y); y += 5;
    const bW = W - 2 * M;
    doc.setFillColor(226, 232, 240); doc.roundedRect(M, y, bW, 3.5, 1.5, 1.5, "F");
    const fc = pct >= 70 ? [42, 140, 35] : pct >= 45 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(...fc); doc.roundedRect(M, y, bW * (pct / 100), 3.5, 1.5, 1.5, "F"); y += 7;

    const fRows = PROC.fases.map(f => {
      let fs = 0, fm = 0;
      f.pasos.forEach(p => { const v = SC[p.n]; if (v !== undefined && v !== "na") { fs += parseInt(v); fm += 2; } });
      return [f.nombre, `${fs}/${fm || "—"}`, `${fm ? Math.round(fs / fm * 100) : 0}%`];
    });
    doc.autoTable({ startY: y, margin: { left: M, right: M }, head: [["Etapa", "Puntaje", "%"]], body: fRows, theme: "grid",
      headStyles: { fillColor: [240, 244, 248], textColor: [27, 63, 139], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [26, 42, 58] },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 20, halign: "center" }, 2: { cellWidth: 18, halign: "center" } } });
    y = doc.lastAutoTable.finalY + 4;

    const obs = (document.getElementById("e-obs")?.value || "").trim();
    if (obs) {
      if (y > 240) { doc.addPage(); y = 14; }
      doc.setFontSize(9); doc.setTextColor(27, 63, 139); doc.setFont(undefined, "bold");
      doc.text("OBSERVACIONES GENERALES", M, y); y += 4;
      doc.setFont(undefined, "normal"); doc.setTextColor(26, 42, 58);
      const lines = doc.splitTextToSize(obs, W - 2 * M);
      doc.text(lines, M, y);
    }

    const np = doc.internal.getNumberOfPages();
    for (let i = 1; i <= np; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5); doc.setTextColor(148, 163, 184); doc.setFont(undefined, "normal");
      doc.text("Mega Plast · " + PROC.nombre, M, 291);
      doc.text(`Pág. ${i} / ${np}`, W - M, 291, { align: "right" });
    }

    // Nombre del archivo con fecha y UDN
    const udn = (document.getElementById("e-udn").value || "UDN").replace(/[^a-zA-Z0-9]/g, "_");
    const fecha = (document.getElementById("e-fecha").value || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
    const evalNombre = (document.getElementById("e-nombre").value || "eval").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = "Eval_" + PROC_ID + "_" + udn + "_" + fecha + "_" + evalNombre + ".pdf";

    // Descargar en el dispositivo (solo si se pide explícitamente)
    if (descargar) {
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
    }

    const okMsg = descargar ? "✓ PDF descargado. Subiendo a Drive..." : "⏳ Subiendo PDF a Drive...";
    const doneMsg = descargar ? "✓ PDF descargado y enviado a Drive." : "✓ PDF enviado a Drive.";
    const failMsg = descargar ? "⚠ PDF descargado. Sin conexión a Drive: " : "⚠ Sin conexión a Drive: ";
    msg.innerHTML = `<span style="color:#2A8C23;font-weight:600">${okMsg}</span>`;

    // Subir a Google Drive via Apps Script
    const base64 = doc.output("datauristring").split(",")[1];
    fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento: "pdf", base64: base64, filename: filename })
    })
    .then(function () {
      msg.innerHTML = `<span style="color:#2A8C23;font-weight:600">${doneMsg}</span>`;
      setTimeout(function () { msg.textContent = ""; }, 6000);
    })
    .catch(function (err) {
      msg.innerHTML = `<span style="color:#eab308;font-weight:600">${failMsg}${err.message}</span>`;
      setTimeout(function () { msg.textContent = ""; }, 8000);
    });
  } catch (err) {
    console.error(err);
    msg.innerHTML = `<span style="color:#ef4444">Error: ${err.message}</span>`;
  }
  btn.textContent = "⬇ Exportar PDF"; btn.disabled = false;
}
