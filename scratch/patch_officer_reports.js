const fs = require('fs');
let s = fs.readFileSync('src/components/views/OfficerReportsAndAuditView.tsx', 'utf8');
const isCrlf = s.includes('\r\n');
let norm = s.replace(/\r\n/g, '\n');

const oldFilter = `  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;

    return matchesSearch && matchesEntity;
  });`;

const newFilter = `  const filteredLogs = auditLogs.filter((log) => {
    const desc = (
      log.description ||
      ((log as any).metadata
        ? typeof (log as any).metadata === 'object'
          ? JSON.stringify((log as any).metadata)
          : String((log as any).metadata)
        : '')
    ).toLowerCase();
    const uName = (log.userName || (log as any).actor?.displayName || (log as any).actor?.email || '').toLowerCase();
    const act = (log.action || '').toLowerCase();
    const entId = (log.entityId || (log as any).resourceId || '').toLowerCase();
    const q = (searchTerm || '').toLowerCase();

    const matchesSearch = !q || desc.includes(q) || uName.includes(q) || act.includes(q) || entId.includes(q);

    const logEntity = log.entityType || (log as any).resourceType;
    const matchesEntity = entityFilter === 'all' || logEntity === entityFilter;

    return matchesSearch && matchesEntity;
  });`;

if (!norm.includes(oldFilter)) {
  console.error('Filter target not found!');
  process.exit(1);
}
norm = norm.replace(oldFilter, newFilter);

const oldRow = `                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-emerald-800 font-semibold whitespace-nowrap">
                      {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}`;

const newRow = `                {filteredLogs.map((log) => {
                  const displayTime = log.timestamp || ((log as any).createdAt ? new Date((log as any).createdAt).toLocaleString('th-TH') : '-');
                  const displayName = log.userName || (log as any).actor?.displayName || (log as any).actor?.email || 'ระบบ';
                  const displayAction = log.action || '-';
                  const displayEntity = log.entityId || (log as any).resourceId || '-';
                  const displayDesc = log.description || (((log as any).metadata) ? (typeof (log as any).metadata === 'object' ? JSON.stringify((log as any).metadata) : String((log as any).metadata)) : '-');
                  const displayIp = log.ipAddress || '-';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {displayTime}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {displayName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {displayAction}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-emerald-800 font-semibold whitespace-nowrap">
                        {displayEntity}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={displayDesc}>
                        {displayDesc}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {displayIp}
                      </td>
                    </tr>
                  );
                })}`;

if (!norm.includes(oldRow)) {
  console.error('Row target not found!');
  process.exit(1);
}
norm = norm.replace(oldRow, newRow);

if (isCrlf) {
  norm = norm.replace(/\n/g, '\r\n');
}

fs.writeFileSync('src/components/views/OfficerReportsAndAuditView.tsx', norm, 'utf8');
console.log('OfficerReportsAndAuditView updated successfully!');

