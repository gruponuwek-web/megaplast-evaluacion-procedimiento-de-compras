/* ============================================================
   EXPORTAR CSV
   Genera y descarga el historial completo de evaluaciones
   en formato CSV (compatible con Excel, con BOM UTF-8).
   ============================================================ */

function exportCSV() {
  const hist = getHist();
  if (!hist.length) { alert("No hay evaluaciones guardadas."); return; }

  const cols = ["ID", "Procedimiento", "Evaluador", "Puesto", "Fecha", "UDN", "Periodo", "Tipo", "Puntaje", "Máximo", "Porcentaje", "Evaluadas", "No Aplican", "Fase", "#Actividad", "Actividad", "Responsable", "Resultado", "Puntaje_Actividad", "Comentario", "Razón_NA", "Observaciones_Generales", "Guardado_En"];

  const rows = [cols];
  hist.forEach(r => {
    r.detalle.forEach(d => {
      rows.push([
        r.id, r.procNombre, r.evaluador, r.puesto, r.fecha, r.udn, r.periodo, r.tipo,
        r.total, r.max, r.pct + "%", r.answered, r.naCount,
        d.fase, d.n, d.actividad, d.responsable, d.resultado, d.puntaje,
        d.comentario, d.razonNA, r.obs, r.guardadoEn
      ].map(v => { const s = String(v || ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; }));
    });
  });

  const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n"); // BOM para Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Historial_Evaluaciones_MegaPlast_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
}
