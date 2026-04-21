
import React, { useState } from "react";

const BackupData = ({ data }) => {
  const [openTables, setOpenTables] = useState({});

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return (
      <div className="mt-6 border rounded p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Backup Data</h3>
        <p className="text-gray-500">No backup data available.</p>
      </div>
    );
  }

  const toggleTable = (table) => {
    setOpenTables((prev) => ({ ...prev, [table]: !prev[table] }));
  };

  return (
    <div className="mt-6 border rounded p-4 bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Backup Data (All Tables)</h3>
      {Object.entries(data).map(([table, rows]) => (
        <div key={table} className="mb-4">
          <button
            className="font-semibold text-blue-600 hover:underline mb-1"
            onClick={() => toggleTable(table)}
            type="button"
          >
            {openTables[table] ? "▼" : "►"} {table} ({Array.isArray(rows) ? rows.length : 0})
          </button>
          {openTables[table] && (
            <div className="overflow-x-auto border rounded bg-white p-2 mt-1">
              {Array.isArray(rows) && rows.length > 0 ? (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col} className="px-2 py-1 border-b text-left bg-gray-100">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="odd:bg-gray-50">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-2 py-1 border-b">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-gray-400 italic">No data</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BackupData;
